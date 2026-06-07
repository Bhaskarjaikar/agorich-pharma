import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyRetailerOrAdmin } from '@/lib/api-security'
import { createClient } from '@supabase/supabase-js'
import { generateOrderNumber } from '@/lib/invoice-sequence'
import { createNotification } from '@/lib/notifications'
import {
  VALID_INVOICE_STATUSES,
  isValidInvoiceTransition,
  type InvoiceStatus
} from '@/lib/constants'

interface InvoiceWithTotalsBase {
  id: string
  payment_amount?: number | null
  grand_total?: number | null
  [key: string]: unknown
}

interface InvoicePaymentRow {
  invoice_id: string
  amount: number | string | null
}

interface InvoiceItemInput {
  product_id?: string | null
  product_name: string
  hsn_code?: string | null
  quantity: number
  unit: string
  rate_per_unit: number
  gst_percentage?: number | null
  pack_size?: string | null
  batch_number?: string | null
  expiry_date?: string | null
  mfg_date?: string | null
  mrp?: number | string | null
  manufacturer?: string | null
}

interface CreateInvoiceBody {
  customer_id: string
  distributor_id?: string | null
  invoice_date: string
  due_date: string
  delivery_date?: string | null
  order_number?: string | null
  order_date?: string | null
  payment_terms?: string | null
  payment_method?: string | null
  local_draft_id?: string | null
  items: InvoiceItemInput[]
  notes?: string | null
}

const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

const sanitizeString = (str: string | null | undefined, maxLength: number = 100): string => {
  if (!str) return ''
  return String(str).trim().slice(0, maxLength)
}

const sanitizeNumericParam = (value: string | null, fallback: number, min: number, max: number): number => {
  const parsed = parseInt(value || '', 10)
  if (isNaN(parsed) || parsed < min) return fallback
  if (parsed > max) return max
  return parsed
}

interface SafeInvoiceData {
  id: string
  user_id?: string
  customer_id?: string
  invoice_number?: string | null
  grand_total?: number | null
  balance_due?: number | null
  status?: string | null
  invoice_items?: SafeInvoiceItem[] | null
  created_at?: string | null
  invoice_date?: string | null
  [key: string]: unknown
}

interface SafeInvoiceItem {
  id?: string
  product_name?: string | null
  quantity?: number | null
  rate_per_unit?: number | null
  total_with_tax?: number | null
  pack_size?: string | null
  batch_number?: string | null
  mfg_date?: string | null
  expiry_date?: string | null
  mrp?: number | null
  [key: string]: unknown
}

const sanitizeInvoiceData = (invoice: SafeInvoiceData): SafeInvoiceData => {
  return {
    ...invoice,
    id: sanitizeString(invoice.id),
    user_id: invoice.user_id ? sanitizeString(invoice.user_id) : undefined,
    customer_id: invoice.customer_id ? sanitizeString(invoice.customer_id) : undefined,
    invoice_number: invoice.invoice_number ? sanitizeString(invoice.invoice_number) : null,
    grand_total: typeof invoice.grand_total === 'number' ? Math.round(invoice.grand_total * 100) / 100 : null,
    balance_due: typeof invoice.balance_due === 'number' ? Math.round(invoice.balance_due * 100) / 100 : null,
    status: (VALID_INVOICE_STATUSES as readonly string[]).includes(String(invoice.status)) ? invoice.status as InvoiceStatus : 'DRAFT',
    invoice_items: Array.isArray(invoice.invoice_items)
      ? invoice.invoice_items.map((item: SafeInvoiceItem) => ({
          ...item,
          id: item.id ? sanitizeString(item.id) : undefined,
          product_name: item.product_name ? sanitizeString(item.product_name, 500) : null,
          quantity: typeof item.quantity === 'number' && item.quantity > 0 ? Math.floor(item.quantity) : 0,
          rate_per_unit: typeof item.rate_per_unit === 'number' ? Math.round(item.rate_per_unit * 100) / 100 : 0,
          total_with_tax: typeof item.total_with_tax === 'number' ? Math.round(item.total_with_tax * 100) / 100 : 0,
          mrp: typeof item.mrp === 'number' ? Math.round(item.mrp * 100) / 100 : null,
          pack_size: item.pack_size ? sanitizeString(item.pack_size, 50) : null,
          batch_number: item.batch_number ? sanitizeString(item.batch_number, 50) : null,
        }))
      : []
  }
}

// GET /api/invoices - List all invoices
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyRetailerOrAdmin(request)
    if ('headers' in authResult) {
      console.error('❌ Auth error in /api/invoices:', authResult)
      return authResult
    }
    const user = authResult

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    let supabase
    if (supabaseUrl && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }) as any
    } else {
      supabase = await createServerClient()
      console.warn('⚠️ Invoices API (GET): Falling back to cookie-based client because SUPABASE_SERVICE_ROLE_KEY is missing. RLS may restrict invoice results.')
    }
    const { searchParams } = new URL(request.url)
    const userIdParam = searchParams.get('user_id')
    const statusParam = searchParams.get('status')
    const pageStr = searchParams.get('page')
    const limitStr = searchParams.get('limit')

    const page = sanitizeNumericParam(pageStr, 1, 1, 10000)
    const limit = sanitizeNumericParam(limitStr, 10, 1, 1000)

    if (statusParam && !VALID_INVOICE_STATUSES.includes(statusParam.toUpperCase() as any)) {
      return NextResponse.json({
        success: false,
        error: `Invalid status parameter. Allowed values: ${VALID_INVOICE_STATUSES.join(', ')}`
      }, { status: 400 })
    }

    const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'SUPPORT'
    let targetUserId: string

    if (isAdmin && userIdParam && isValidUUID(userIdParam)) {
      targetUserId = userIdParam
    } else if (isAdmin && userIdParam) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid user_id format for admin query' 
      }, { status: 400 })
    } else {
      targetUserId = user.id
    }

    if (!isValidUUID(targetUserId)) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid target user identifier' 
      }, { status: 400 })
    }

    let query = supabase
      .from('invoices')
      .select(`
        *,
        invoice_items (
          id,
          product_name,
          quantity,
          rate_per_unit,
          total_with_tax,
          pack_size,
          batch_number,
          mfg_date,
          expiry_date,
          mrp
        )
      `)
      .order('created_at', { ascending: false })

    query = query.is('deleted_at', null)

    query = query.or(`user_id.eq.${targetUserId},customer_id.eq.${targetUserId}`)

    if (statusParam) {
      query = query.eq('status', statusParam.toUpperCase())
    }

    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1)

    if (error) {
      console.error('❌ Supabase query error in /api/invoices:', error)
      return NextResponse.json({ 
        success: true,
        invoices: [], 
        error: error.message,
        pagination: { page, limit, total: 0, totalPages: 0 }
      }, { status: 200 })
    }

    const rawInvoices = (data || []) as SafeInvoiceData[]
    const sanitizedInvoices = rawInvoices.map(sanitizeInvoiceData)

    const paidById: Record<string, number> = {}
    try {
      const ids = sanitizedInvoices.map(inv => inv.id).filter(Boolean)
      if (ids.length > 0) {
        const supabase2 = await createServerClient()
        const { data: payRows } = await supabase2
          .from('invoice_payments')
          .select('invoice_id, amount')
          .in('invoice_id', ids)
        const payments = (payRows || []) as InvoicePaymentRow[]
        payments.forEach(r => {
          const k = r.invoice_id
          const amt = Number(r.amount ?? 0)
          if (!isNaN(amt) && isFinite(amt)) {
            paidById[k] = (paidById[k] || 0) + amt
          }
        })
      }
    } catch (paymentError) {
      console.warn('⚠️ Unable to load invoice payments, using invoice payment_amount fallback', paymentError)
    }

    const invoicesWithTotals = sanitizedInvoices.map(inv => {
      const paidFromPayments = paidById[inv.id] || 0
      const paidFromInvoice = typeof inv.payment_amount === 'number' ? inv.payment_amount : 0
      const paid = Math.max(paidFromPayments, paidFromInvoice)
      const dueRaw = typeof inv.grand_total === 'number' ? inv.grand_total - paid : 0
      const balanceDue = dueRaw > 0 ? Math.round(dueRaw * 100) / 100 : 0
      return {
        ...inv,
        paid_amount: Math.round(paid * 100) / 100,
        balance_due: balanceDue
      }
    })

    return NextResponse.json({
      success: true,
      invoices: invoicesWithTotals,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error: unknown) {
    console.error('❌ Internal error in /api/invoices:', error)
    const message = error instanceof Error ? error.message : 'Failed to load invoices'
    return NextResponse.json({ 
      success: false,
      invoices: [],
      error: message,
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    }, { status: 200 })
  }
}

// POST /api/invoices - Create new invoice
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyRetailerOrAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const allowedRoles = new Set(['SUPER_ADMIN', 'RETAILER', 'SUPPORT', 'DISTRIBUTOR'])
    if (!allowedRoles.has(user.role)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    let supabase
    if (supabaseUrl && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }) as any
    } else {
      supabase = await createServerClient()
      console.warn('⚠️ Invoices API (POST): Using cookie-based client because SUPABASE_SERVICE_ROLE_KEY is missing. Invoice creation may be blocked by RLS.')
    }

    const authenticatedUserId = user.id

    const body = (await request.json()) as CreateInvoiceBody
    const {
      customer_id,
      distributor_id,
      invoice_date,
      due_date,
      delivery_date,
      order_number,
      order_date,
      payment_terms,
      payment_method,
      local_draft_id,
      items,
      notes
    } = body

    // Validate required fields
    if (!customer_id || !invoice_date || !due_date || !items || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Calculate totals for minimum order check
    let grandTotalForCheck = 0
    items.forEach(item => {
      const amountBeforeTax = item.quantity * item.rate_per_unit
      const gstRate = item.gst_percentage ?? 5
      const gstAmount = amountBeforeTax * (gstRate / 100)
      grandTotalForCheck += amountBeforeTax + gstAmount
    })

    // Minimum order amount validation
    const MINIMUM_ORDER_AMOUNT = 500
    if (grandTotalForCheck < MINIMUM_ORDER_AMOUNT) {
      return NextResponse.json(
        { error: `Minimum order amount is ₹${MINIMUM_ORDER_AMOUNT}. Current order value is ₹${grandTotalForCheck.toFixed(2)}.` },
        { status: 400 }
      )
    }

    // Validate distributor selection for retailer orders
    if (user.role === 'RETAILER' && distributor_id) {
      if (!isValidUUID(distributor_id)) {
        return NextResponse.json(
          { error: 'Invalid distributor selection. Please select a distributor from the Order Now page.' },
          { status: 400 }
        )
      }
    }

    // Validate max field lengths
    const MAX_FIELD_LENGTHS = {
      notes: 2000,
      order_number: 100,
      payment_terms: 50,
      local_draft_id: 100
    }

    if (notes && notes.length > MAX_FIELD_LENGTHS.notes) {
      return NextResponse.json(
        { error: `Notes exceeds maximum length of ${MAX_FIELD_LENGTHS.notes} characters` },
        { status: 400 }
      )
    }

    if (order_number && order_number.length > MAX_FIELD_LENGTHS.order_number) {
      return NextResponse.json(
        { error: `Order number exceeds maximum length of ${MAX_FIELD_LENGTHS.order_number} characters` },
        { status: 400 }
      )
    }

    if (payment_terms && payment_terms.length > MAX_FIELD_LENGTHS.payment_terms) {
      return NextResponse.json(
        { error: `Payment terms exceeds maximum length of ${MAX_FIELD_LENGTHS.payment_terms} characters` },
        { status: 400 }
      )
    }

    // Validate each item strictly
    for (const item of items) {
      if (!item.product_name || item.product_name.trim() === '') {
        return NextResponse.json(
          { error: 'Product name is required for all items' },
          { status: 400 }
        )
      }

      const quantity = Number(item.quantity)
      const ratePerUnit = Number(item.rate_per_unit)

      if (isNaN(quantity) || quantity <= 0) {
        return NextResponse.json(
          { error: `Invalid quantity for ${item.product_name}: must be a positive number` },
          { status: 400 }
        )
      }

      if (!Number.isInteger(quantity)) {
        return NextResponse.json(
          { error: `Invalid quantity for ${item.product_name}: must be a whole number` },
          { status: 400 }
        )
      }

      if (quantity > 1000000) {
        return NextResponse.json(
          { error: `Invalid quantity for ${item.product_name}: exceeds maximum allowed (1,000,000)` },
          { status: 400 }
        )
      }

      if (isNaN(ratePerUnit) || ratePerUnit < 0) {
        return NextResponse.json(
          { error: `Invalid rate for ${item.product_name}: must be a non-negative number` },
          { status: 400 }
        )
      }
    }

    // Use frontend's local_draft_id if provided, otherwise generate one
    // This ensures consistency between what user sees and what's stored
    let orderId = local_draft_id || `ORD-${Date.now()}`
    if (!local_draft_id) {
      try {
        orderId = await generateOrderNumber(supabase)
      } catch (orderIdError) {
        console.warn('⚠️ Failed to generate sequential order number, using fallback:', orderIdError)
      }
    } else {
      console.log(`✅ Using frontend's local draft ID: ${local_draft_id}`)
    }

    // PERMANENT FIX: Fetch customer profile data and store in invoice
    // This ensures customer data is always available even if join fails
    let customerData = null
    if (customer_id) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_name, business_name, business_type, address, city, state, pincode, gst_number, phone, aadhar_number, pan_number, fssai_license, business_registration')
          .eq('id', customer_id)
          .single()

        if (profile) customerData = profile
      } catch (err) {
        console.error('Error fetching customer data:', err)
      }
    }

    // Fetch distributor profile data and store in invoice
    // This ensures distributor (FROM address) data is always available for invoices
    let distributorData = null
    if (distributor_id && isValidUUID(distributor_id)) {
      try {
        const { data: distProfile } = await supabase
          .from('profiles')
          .select('user_name, business_name, business_type, address, city, state, pincode, gst_number, phone, drug_license_20b, drug_license_21b')
          .eq('id', distributor_id)
          .single()

        if (distProfile) distributorData = distProfile
      } catch (err) {
        console.error('Error fetching distributor data:', err)
      }
    }

    // Sanitize notes to prevent XSS
    const sanitizeNotes = (input: string | null | undefined): string | null => {
      if (!input) return null
      return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
    }

    const sanitizedNotes = notes ? sanitizeNotes(notes) : null

    // Calculate totals
    let subtotal = 0
    let totalGst = 0
    let grandTotal = 0

    items.forEach(item => {
      const amountBeforeTax = item.quantity * item.rate_per_unit
      const gstRate = item.gst_percentage ?? 5
      const gstAmount = amountBeforeTax * (gstRate / 100)
      const totalWithTax = amountBeforeTax + gstAmount

      subtotal += amountBeforeTax
      totalGst += gstAmount
      grandTotal += totalWithTax
    })

    // Create invoice with customer and distributor data stored as JSON
    const invoiceInsertData = {
        invoice_number: null,
        order_id: orderId,
        customer_id,
        distributor_id,
        user_id: authenticatedUserId,
        invoice_date,
        due_date,
        delivery_date,
        order_number,
        order_date,
        payment_terms: payment_terms || 'NET 30 DAYS',
        payment_method: payment_method || null,
        subtotal,
        total_gst: totalGst,
        grand_total: grandTotal,
        notes: sanitizedNotes,
        status: 'DRAFT',
        ...(customerData ? { customer_data: customerData } : {}),
        ...(distributorData ? { distributor_data: distributorData } : {})
    }

    // Store data in invoice if available (for guaranteed access)
    if (customerData) {
      console.log('✅ Customer data stored with invoice:', customerData.user_name || customerData.business_name)
    }
    if (distributorData) {
      console.log('✅ Distributor data stored with invoice:', distributorData.business_name)
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert(invoiceInsertData)
      .select()
      .single()

    if (invoiceError) {
      return NextResponse.json({ error: invoiceError.message }, { status: 400 })
    }

    // Create notification for admin when new invoice is created
    const customerName = customerData?.business_name || customerData?.user_name || 'Unknown'
    await createNotification({
      supabase,
      type: 'INFO',
      category: 'INVOICE',
      title: 'New Invoice Created',
      message: `${customerName} created invoice ${orderId} worth ₹${grandTotal.toLocaleString('en-IN')}`,
      link: `/admin/invoice-flow?search=${orderId}`,
      createdForRole: 'SUPER_ADMIN',
      metadata: {
        invoice_id: invoice.id,
        order_id: orderId,
        customer_id,
        grand_total: grandTotal,
        created_by_user_id: authenticatedUserId
      }
    })

    // Create invoice items with all product details
    const invoiceItems = items.map(item => ({
      invoice_id: invoice.id,
      product_id: item.product_id || null,
      product_name: item.product_name,
      hsn_code: item.hsn_code || '30049',
      quantity: item.quantity,
      unit: item.unit,
      rate_per_unit: item.rate_per_unit,
      amount_before_tax: item.quantity * item.rate_per_unit,
      gst_percentage: item.gst_percentage || 5,
      gst_amount: (item.quantity * item.rate_per_unit) * ((item.gst_percentage || 5) / 100),
      total_with_tax: (item.quantity * item.rate_per_unit) * (1 + (item.gst_percentage || 5) / 100),
      // Store product details for invoice display (exactly as in preview)
      pack_size: item.pack_size || null,
      batch_number: item.batch_number || null,
      expiry_date: item.expiry_date || null,
      mfg_date: item.mfg_date || null,
      mrp: item.mrp || null,
      manufacturer: item.manufacturer || null
    }))

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(invoiceItems)

    if (itemsError) {
      // Rollback invoice creation
      await supabase.from('invoices').delete().eq('id', invoice.id)
      return NextResponse.json({ error: itemsError.message }, { status: 400 })
    }

    // Create routed order if distributor_id is provided
    if (distributor_id && isValidUUID(distributor_id)) {
      try {
        const { error: routedOrderError } = await supabase
          .from('routed_orders')
          .insert({
            order_id: invoice.id,
            distributor_id: distributor_id,
            status: 'ASSIGNED',
            assigned_by: authenticatedUserId
          })

        if (routedOrderError) {
          console.error('Error creating routed order:', routedOrderError)
        } else {
          console.log('✅ Routed order created for distributor:', distributor_id)

          // Create notification for distributor
          await createNotification({
            supabase,
            type: 'INFO',
            category: 'INVOICE',
            title: 'New Order Assigned',
            message: `New order ${orderId} worth ₹${grandTotal.toLocaleString('en-IN')} has been assigned to you. Please accept or reject.`,
            link: `/distributor/routed-orders`,
            createdForRole: 'DISTRIBUTOR',
            metadata: {
              invoice_id: invoice.id,
              order_id: orderId,
              grand_total: grandTotal
            }
          })
        }
      } catch (routedErr) {
        console.error('Error in routed order creation:', routedErr)
      }
    }

    // Fetch complete invoice with items
    const { data: completeInvoice, error: fetchError } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items (*)
      `)
      .eq('id', invoice.id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      invoice: completeInvoice,
      order_id: orderId,
      message: `Invoice saved successfully! Your Order ID is: ${orderId}. Please note this ID to track your invoice.`
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('❌ Internal error in /api/invoices (POST):', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}










