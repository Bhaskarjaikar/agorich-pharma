import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyRetailerOrAdmin } from '@/lib/api-security'
import { calculateInvoiceTaxes, type CalculatedItem } from '@/lib/tax-calculator'
import { determineGSTType, getPlaceOfSupply } from '@/lib/gst-utils'
import { logOrderCreated } from '@/lib/audit-logger'
import { generateDraftNumber } from '@/lib/draft-number-sequence'

interface OrderItem {
  product_id?: string
  product_name: string
  hsn_code: string
  quantity: number
  unit: string
  rate_per_unit: number
  gst_percentage: number
  pack_size?: string
  batch_number?: string
  expiry_date?: string
  mfg_date?: string
  mrp?: number
  manufacturer?: string
}

interface CreateOrderBody {
  customer_id: string
  items: OrderItem[]
  place_of_supply?: string
  notes?: string
}

interface OrderResponse {
  success: boolean
  order?: {
    id: string
    order_id: string
    draft_number: string
    order_status: string
    grand_total: number
    advance_amount: number
    balance_due: number
    gst_type: 'B2B' | 'B2C'
    place_of_supply: string
    items_count: number
    created_at: string
  }
  error?: string
}

interface FEFOAllocation {
  productId: string
  productName: string
  batchId: string
  batchNumber: string
  allocatedQty: number
  expiryDate: string
}

function daysUntilExpiry(expiryDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

async function allocateInventoryFEFO(
  supabase: any,
  items: { product_id: string; product_name: string; quantity: number }[],
  distributorId: string
): Promise<{ success: boolean; allocations: FEFOAllocation[]; errors: { product_id: string; product_name: string; message: string }[] }> {
  const allocations: FEFOAllocation[] = []
  const errors: { product_id: string; product_name: string; message: string }[] = []

  for (const item of items) {
    if (!item.product_id) continue

    let remainingQty = item.quantity
    const requiredQty = item.quantity

    const { data: batches, error: batchError } = await supabase
      .from('inventory_batches')
      .select('id, batch_number, expiry_date, available_qty, products(name)')
      .eq('product_id', item.product_id)
      .eq('distributor_id', distributorId)
      .gt('available_qty', 0)
      .order('expiry_date', { ascending: true })

    if (batchError || !batches || batches.length === 0) {
      errors.push({
        product_id: item.product_id,
        product_name: item.product_name,
        message: `No available inventory for ${item.product_name}`
      })
      continue
    }

    const batchResults: { batchId: string; batchNumber: string; allocatedQty: number; expiryDate: string }[] = []

    for (const batch of batches) {
      if (remainingQty <= 0) break

      const availableQty = Number(batch.available_qty) || 0
      const allocateQty = Math.min(remainingQty, availableQty)

      const { error: updateError } = await supabase
        .from('inventory_batches')
        .update({
          available_qty: availableQty - allocateQty,
          reserved_qty: (Number(batch.reserved_qty) || 0) + allocateQty
        })
        .eq('id', batch.id)

      if (updateError) {
        errors.push({
          product_id: item.product_id,
          product_name: item.product_name,
          message: `Failed to reserve batch ${batch.batch_number}`
        })
        continue
      }

      batchResults.push({
        batchId: batch.id,
        batchNumber: batch.batch_number,
        allocatedQty: allocateQty,
        expiryDate: batch.expiry_date
      })

      remainingQty -= allocateQty
    }

    if (remainingQty > 0) {
      errors.push({
        product_id: item.product_id,
        product_name: item.product_name,
        message: `Insufficient stock: need ${requiredQty}, could allocate ${requiredQty - remainingQty}`
      })
    }

    for (const result of batchResults) {
      allocations.push({
        productId: item.product_id,
        productName: item.product_name,
        batchId: result.batchId,
        batchNumber: result.batchNumber,
        allocatedQty: result.allocatedQty,
        expiryDate: result.expiryDate
      })
    }
  }

  return {
    success: errors.length === 0,
    allocations,
    errors
  }
}

async function rollbackFEFOAllocations(
  supabase: any,
  allocations: FEFOAllocation[]
): Promise<void> {
  for (const allocation of allocations) {
    const { data: batch } = await supabase
      .from('inventory_batches')
      .select('id, available_qty, reserved_qty')
      .eq('id', allocation.batchId)
      .single()

    if (batch) {
      await supabase
        .from('inventory_batches')
        .update({
          available_qty: (Number(batch.available_qty) || 0) + allocation.allocatedQty,
          reserved_qty: Math.max(0, (Number(batch.reserved_qty) || 0) - allocation.allocatedQty)
        })
        .eq('id', allocation.batchId)
    }
  }
}

async function cleanupFailedOrder(
  supabase: any,
  invoiceId: string | null,
  orderId: string | null
): Promise<void> {
  if (orderId) {
    await supabase.from('orders').delete().eq('id', orderId)
  }
  if (invoiceId) {
    await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId)
    await supabase.from('invoices').delete().eq('id', invoiceId)
  }
}

async function generateOrderNumber(supabase: any): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `AGR/${year}-${String(year + 1).slice(-2)}/`

  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `${prefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1)

  let nextNum = 1
  if (data && data.length > 0) {
    const lastNum = parseInt(data[0].invoice_number.replace(prefix, ''), 10)
    nextNum = lastNum + 1
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`
}

export async function POST(request: NextRequest): Promise<NextResponse<OrderResponse>> {
  let invoiceId: string | null = null
  let orderDbId: string | null = null
  let fefoAllocations: FEFOAllocation[] = []

  try {
    const authResult = await verifyRetailerOrAdmin(request)
    if ('headers' in authResult) return authResult as NextResponse<OrderResponse>
    const user = authResult

    const body: CreateOrderBody = await request.json()
    const { customer_id, items, place_of_supply, notes } = body

    if (!customer_id) {
      return NextResponse.json({ success: false, error: 'Customer ID is required' }, { status: 400 })
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one item is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: customer, error: customerError } = await supabase
      .from('profiles')
      .select('id, user_name, business_name, gst_number, state, address, city, pincode, phone')
      .eq('id', customer_id)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 })
    }

    const gstType = determineGSTType(customer.gst_number)
    const effectivePlaceOfSupply = place_of_supply || getPlaceOfSupply(customer.state || 'Bihar')
    const taxBreakdown = calculateInvoiceTaxes(items, effectivePlaceOfSupply)
    const calculatedItems = taxBreakdown.items || []

    let draftNumberResult
    try {
      draftNumberResult = await generateDraftNumber(supabase)
    } catch (error) {
      console.error('❌ Failed to generate draft number:', error)
      return NextResponse.json({ success: false, error: 'Failed to generate draft number. Please try again.' }, { status: 500 })
    }

    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    const draftNumber = draftNumberResult.draftNumber

    const orderItems = calculatedItems.map((item: CalculatedItem) => ({
      product_id: item.product_id || null,
      product_name: item.product_name,
      hsn_code: item.hsn_code || '3004',
      quantity: item.quantity,
      unit: item.unit,
      rate_per_unit: item.rate_per_unit,
      gst_percentage: item.gst_percentage || 5,
      amount_before_tax: item.amount_before_tax,
      gst_amount: item.gst_amount,
      total_with_tax: item.total_with_tax,
      pack_size: item.pack_size || null,
      batch_number: item.batch_number || null,
      expiry_date: item.expiry_date || null,
      mfg_date: item.mfg_date || null,
      mrp: item.mrp || null,
      manufacturer: item.manufacturer || null
    }))

    let subtotal = 0
    let totalGST = 0
    calculatedItems.forEach((item: CalculatedItem) => {
      const amountBeforeTax = item.amount_before_tax || item.quantity * item.rate_per_unit
      const gstAmount = item.gst_amount || amountBeforeTax * ((item.gst_percentage || 5) / 100)
      subtotal += amountBeforeTax
      totalGST += gstAmount
    })

    const today = new Date().toISOString().split('T')[0]
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: draftNumber,
        order_id: orderId,
        customer_id,
        user_id: user.id,
        invoice_date: today,
        due_date: dueDate,
        status: 'DRAFT',
        payment_amount: 0,
        grand_total: taxBreakdown.grandTotal,
        subtotal: subtotal,
        total_gst: totalGST,
        customer_data: customer
      })
      .select()
      .single()

    if (invoiceError) {
      console.error('❌ Error creating invoice:', invoiceError)
      return NextResponse.json({ success: false, error: `Failed to create invoice: ${invoiceError.message}` }, { status: 500 })
    }
    invoiceId = invoice.id

    const invoiceItemsWithInvoiceId = orderItems.map(item => ({ ...item, invoice_id: invoice.id }))
    const { error: invoiceItemsError } = await supabase
      .from('invoice_items')
      .insert(invoiceItemsWithInvoiceId)

    if (invoiceItemsError) {
      console.error('❌ Error creating invoice items, rolling back invoice:', invoiceItemsError)
      await cleanupFailedOrder(supabase, invoiceId, null)
      return NextResponse.json({ success: false, error: `Failed to create invoice items: ${invoiceItemsError.message}` }, { status: 500 })
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_id: orderId,
        draft_number: draftNumber,
        customer_id,
        user_id: user.id,
        items: orderItems,
        grand_total: taxBreakdown.grandTotal,
        order_status: 'DRAFT',
        invoice_id: invoice.id
      })
      .select()
      .single()

    if (orderError) {
      console.error('❌ Error creating order, rolling back:', orderError)
      await cleanupFailedOrder(supabase, invoiceId, null)
      return NextResponse.json({ success: false, error: `Failed to create order: ${orderError.message}` }, { status: 500 })
    }
    orderDbId = order.id

    let fefoResult: { success: boolean; allocations: FEFOAllocation[]; errors: { product_id: string; product_name: string; message: string }[] } | null = null
    const itemsWithProductId = calculatedItems
      .filter(item => item.product_id)
      .map(item => ({ product_id: item.product_id!, product_name: item.product_name, quantity: item.quantity }))

    if (itemsWithProductId.length > 0) {
      fefoResult = await allocateInventoryFEFO(supabase, itemsWithProductId, user.id)
      fefoAllocations = fefoResult.allocations

      if (!fefoResult.success) {
        console.warn('⚠️ FEFO allocation warnings:', fefoResult.errors)
      }
    }

    await logOrderCreated(
      supabase, order.id,
      { order_id: orderId, customer_id, grand_total: taxBreakdown.grandTotal, item_count: items.length, gst_type: gstType, place_of_supply: effectivePlaceOfSupply },
      user.id,
      { ipAddress: request.headers.get('x-forwarded-for') || undefined, userAgent: request.headers.get('user-agent') || undefined }
    )

    console.log(`✅ Draft order created: ${draftNumber} for customer ${customer_id}`)
    const responseData = {
      success: true,
      order: {
        id: order.id,
        order_id: orderId,
        draft_number: draftNumber,
        order_status: 'DRAFT',
        grand_total: Number(taxBreakdown.grandTotal),
        advance_amount: Number(taxBreakdown.grandTotal),
        balance_due: 0,
        gst_type: gstType,
        place_of_supply: effectivePlaceOfSupply,
        items_count: items.length,
        created_at: order.created_at
      },
      warnings: fefoAllocations.length > 0 ? fefoResult?.errors || [] : undefined
    }

    return NextResponse.json(responseData, { status: 201 })

  } catch (error) {
    console.error('❌ Error in POST /api/orders/create:', error)

    if (invoiceId || orderDbId) {
      console.log('🔄 Rolling back failed order creation...')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })
        await cleanupFailedOrder(supabase, invoiceId, orderDbId)
        if (fefoAllocations.length > 0) {
          await rollbackFEFOAllocations(supabase, fefoAllocations)
        }
      }
    }

    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
