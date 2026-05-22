import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyRetailerOrAdmin } from '@/lib/api-security'
import { createClient } from '@supabase/supabase-js'
import { generateOrderNumber } from '@/lib/invoice-sequence'
import { createNotification } from '@/lib/notifications'

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
  invoice_date: string
  due_date: string
  delivery_date?: string | null
  order_number?: string | null
  order_date?: string | null
  payment_terms?: string | null
  local_draft_id?: string | null
  items: InvoiceItemInput[]
  notes?: string | null
}

// GET /api/invoices - List all invoices
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
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
    const userId = searchParams.get('user_id')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Ensure users can only access their own invoices unless they're admin
    const targetUserId = user.role === 'SUPER_ADMIN' ? userId : user.id

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

    // Filter by deleted_at only if the query succeeds (column exists)
    // If column doesn't exist, Supabase will return all rows anyway
    query = query.is('deleted_at', null)

    if (targetUserId) {
      query = query.or(`user_id.eq.${targetUserId},customer_id.eq.${targetUserId}`)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1)

    if (error) {
      console.error('❌ Supabase query error in /api/invoices:', error)
      // Return empty array instead of error for better UX
      return NextResponse.json({ 
        invoices: [], 
        error: error.message,
        pagination: { page, limit, total: 0, totalPages: 0 }
      }, { status: 200 })
    }

    // Attach paid_amount and balance_due from invoice_payments if table exists
    const invoices = (data || []) as InvoiceWithTotalsBase[]
    let invoicesWithTotals = invoices
    const paidById: Record<string, number> = {}
    try {
      const ids = invoices.map(inv => inv.id).filter(Boolean)
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
          paidById[k] = (paidById[k] || 0) + amt
        })
      }
    } catch (paymentError) {
      console.warn('⚠️ Unable to load invoice payments, using invoice payment_amount fallback', paymentError)
    }

    invoicesWithTotals = invoices.map(inv => {
      const paidFromPayments = paidById[inv.id] || 0
      const paidFromInvoice = Number(inv.payment_amount ?? 0)
      const paid = Math.max(paidFromPayments, paidFromInvoice)
      const dueRaw = Number(inv.grand_total ?? 0) - paid
      const balanceDue = dueRaw > 0 ? dueRaw : 0
      return {
        ...inv,
        paid_amount: paid,
        balance_due: balanceDue
      }
    })

    return NextResponse.json({
      invoices: invoicesWithTotals || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error: unknown) {
    console.error('❌ Internal error in /api/invoices:', error)
    // Return empty array instead of error for graceful degradation
    const message =
      error instanceof Error ? error.message : 'Failed to load invoices'
    return NextResponse.json({ 
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
      // user_id (ignored - derived from session)
      invoice_date,
      due_date,
      delivery_date,
      order_number,
      order_date,
      payment_terms,
      local_draft_id,
      items,
      notes
    } = body

    // Validate required fields
    if (!customer_id || !invoice_date || !due_date || !items || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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
        // Use service role client if available (bypasses RLS)
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

    // Create invoice with customer data stored as JSON
    const invoiceInsertData = {
        invoice_number: null,
        order_id: orderId,
        customer_id,
        user_id: authenticatedUserId,
        invoice_date,
        due_date,
        delivery_date,
        order_number,
        order_date,
        payment_terms: payment_terms || 'NET 30 DAYS',
        subtotal,
        total_gst: totalGst,
        grand_total: grandTotal,
        notes,
        status: 'DRAFT',
        ...(customerData ? { customer_data: customerData } : {})
    }

    // Store customer data in invoice if available (for guaranteed access)
    if (customerData) {
      console.log('✅ Customer data stored with invoice:', customerData.user_name || customerData.business_name)
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










