import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyRetailerOrAdmin } from '@/lib/api-security'
import { generateInvoiceNumber } from '@/lib/invoice-sequence'
import { determineGSTType, getPlaceOfSupply } from '@/lib/gst-utils'
import { logInvoiceGenerated, logOrderConfirmed } from '@/lib/audit-logger'

interface GenerateInvoiceBody {
  order_id: string
  payment_id: string
  razorpay_payment_id: string
  amount_paid: number
}

interface InvoiceResponse {
  success: boolean
  invoice?: {
    id: string
    invoice_no: string
    order_id: string
    grand_total: number
    advance_paid: number
    balance_due: number
    payment_status: string
    gst_type: 'B2B' | 'B2C'
    customer_gstin: string | null
    place_of_supply: string
    status: string
    created_at: string
    pdf_url?: string
  }
  error?: string
}

/**
 * POST /api/invoices/generate
 * Generate an invoice after successful payment
 * This is the "Official Seal" step in the Golden Sequence
 */
export async function POST(request: NextRequest): Promise<NextResponse<InvoiceResponse>> {
  try {
    // Verify authentication
    const authResult = await verifyRetailerOrAdmin(request)
    if ('headers' in authResult) {
      return authResult as NextResponse<InvoiceResponse>
    }
    const user = authResult

    // Parse request body
    const body: GenerateInvoiceBody = await request.json()
    const { order_id, payment_id, razorpay_payment_id, amount_paid } = body

    // Validate required fields
    if (!order_id) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      )
    }

    // Initialize Supabase with service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Fetch the order by order_number (TEXT identifier)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // Verify order is in DRAFT status
    if (order.order_status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, error: `Order is already ${order.order_status}. Cannot generate invoice.` },
        { status: 400 }
      )
    }

    // Verify payment amount matches expected (100% of grand total)
    const expectedAmount = order.grand_total
    const tolerance = 1 // Allow 1 rupee difference for rounding

    if (Math.abs(amount_paid - expectedAmount) > tolerance) {
      return NextResponse.json(
        { success: false, error: `Payment amount mismatch. Expected: ${expectedAmount}, Received: ${amount_paid}` },
        { status: 400 }
      )
    }

    // Fetch customer details
    const { data: customer, error: customerError } = await supabase
      .from('profiles')
      .select('id, user_name, business_name, gst_number, state, address, city, pincode, phone')
      .eq('id', order.customer_id)
      .single()

    if (customerError || !customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Determine GST type and place of supply
    const gstType = determineGSTType(customer.gst_number)
    const placeOfSupply = getPlaceOfSupply(customer.state || 'Bihar')

    // Generate sequential invoice number with locking
    let invoiceNo: string
    try {
      const result = await generateInvoiceNumber(supabase)
      invoiceNo = result.invoiceNo
    } catch (err) {
      console.error('❌ Failed to generate invoice number:', err)
      return NextResponse.json(
        { success: false, error: 'Failed to generate invoice number. Please try again.' },
        { status: 500 }
      )
    }

    // Prepare invoice items from order items
    const orderItems: Array<{
      product_id?: string
      product_name: string
      hsn_code: string
      quantity: number
      unit: string
      rate_per_unit: number
      gst_percentage: number
      amount_before_tax: number
      gst_amount: number
      total_with_tax: number
      pack_size?: string
      batch_number?: string
      expiry_date?: string
      mfg_date?: string
      mrp?: number
      manufacturer?: string
    }> = order.items || []
    const invoiceItems = orderItems.map((item) => ({
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

    // Calculate SGST/CGST/IGST based on place of supply
    const isIntraState = placeOfSupply.toLowerCase() === 'bihar'
    let sgstAmount = 0
    let cgstAmount = 0
    let igstAmount = 0
    let totalGST = 0

    orderItems.forEach((item: { amount_before_tax: number; gst_amount: number }) => {
      totalGST += item.gst_amount
      if (isIntraState) {
        sgstAmount += item.gst_amount / 2
        cgstAmount += item.gst_amount / 2
      } else {
        igstAmount += item.gst_amount
      }
    })

    // Get current date for invoice
    const today = new Date().toISOString().split('T')[0]
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_no: invoiceNo,
        order_id: order.id,  // UUID foreign key to orders table
        customer_id: order.customer_id,
        user_id: order.user_id,
        invoice_date: today,
        due_date: dueDate,
        status: 'CONFIRMED',
        payment_status: 'FULLY_PAID',
        advance_paid: amount_paid,
        balance_due: 0,
        grand_total: order.grand_total,
        subtotal: order.grand_total - totalGST,
        total_gst: totalGST,
        sgst_amount: parseFloat(sgstAmount.toFixed(2)),
        cgst_amount: parseFloat(cgstAmount.toFixed(2)),
        igst_amount: parseFloat(igstAmount.toFixed(2)),
        gst_type: gstType,
        customer_gstin: customer.gst_number || null,
        place_of_supply: placeOfSupply,
        payment_method: 'RAZORPAY',
        payment_transaction_id: razorpay_payment_id,
        paid_at: new Date().toISOString(),
        notes: order.notes || null
      })
      .select()
      .single()

    if (invoiceError) {
      console.error('❌ Error creating invoice:', invoiceError)
      return NextResponse.json(
        { success: false, error: `Failed to create invoice: ${invoiceError.message}` },
        { status: 500 }
      )
    }

    // Create invoice items
    const invoiceItemsWithInvoiceId = invoiceItems.map(item => ({
      ...item,
      invoice_id: invoice.id
    }))

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(invoiceItemsWithInvoiceId)

    if (itemsError) {
      console.error('❌ Error creating invoice items:', itemsError)
      // Don't fail the whole request, but log the error
    }

    // Update order status to CONFIRMED and link to invoice
    const previousOrderStatus = order.order_status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        order_status: 'CONFIRMED',
        invoice_id: invoice.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)  // Use order.id (UUID) not order_id (TEXT)

    if (updateError) {
      console.error('❌ Error updating order status:', updateError)
    }

    // Update payment_verification record with invoice_id
    if (payment_id) {
      await supabase
        .from('payment_verifications')
        .update({
          invoice_id: invoice.id,
          order_id: order.id,  // Use order.id (UUID) not order_id (TEXT)
          payment_type: 'FULL',
          cod_amount: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment_id)
    }

    // Log audit entries
    await logInvoiceGenerated(
      supabase,
      invoice.id,
      {
        invoice_no: invoiceNo,
        order_id: order_id,
        customer_id: order.customer_id,
        grand_total: order.grand_total,
        advance_paid: amount_paid,
        balance_due: 0,
        gst_type: gstType,
        place_of_supply: placeOfSupply
      },
      user.id,
      {
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        metadata: {
          razorpay_payment_id,
          payment_id
        }
      }
    )

    await logOrderConfirmed(
      supabase,
      order_id,
      { order_status: previousOrderStatus },
      { order_status: 'CONFIRMED', invoice_id: invoice.id },
      user.id,
      {
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      }
    )

    console.log(`✅ Invoice generated: ${invoiceNo} for order ${order_id}`)

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoice_no: invoiceNo,
        order_id: order_id,
        grand_total: order.grand_total,
        advance_paid: amount_paid,
        balance_due: 0,
        payment_status: 'FULLY_PAID',
        gst_type: gstType,
        customer_gstin: customer.gst_number || null,
        place_of_supply: placeOfSupply,
        status: 'CONFIRMED',
        created_at: invoice.created_at,
        pdf_url: invoice.pdf_url
      }
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Error in POST /api/invoices/generate:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
