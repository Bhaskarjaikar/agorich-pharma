import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/api-security'
import { createClient } from '@supabase/supabase-js'

interface InvoicePaymentRow {
  invoice_id: string | null
  amount: number | string | null
  payment_method: string | null
}

// GET /api/admin/invoice-flow - Fetch all invoices with status flow details
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    // Use service role client to bypass RLS for admin operations (consistent with confirm-order API)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    
    // CRITICAL: Check if service role key exists and is not empty
    const hasServiceKey = supabaseServiceKey && supabaseServiceKey.length > 0
    const hasUrl = supabaseUrl && supabaseUrl.length > 0
    
    let supabase
    if (hasServiceKey && hasUrl) {
      // Use service role client (bypasses RLS) for admin operations
      supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { 
          autoRefreshToken: false, 
          persistSession: false 
        }
      })
      console.log('✅ Invoice-flow API: Using service role client (RLS bypassed)')
    } else {
      // Fallback to regular client
      supabase = await createServerClient()
      console.warn('⚠️ Invoice-flow API: Using regular client - Service role key not found or empty!', {
        hasUrl,
        hasServiceKey,
        urlLength: supabaseUrl?.length || 0,
        keyLength: supabaseServiceKey?.length || 0,
        keyExists: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      })
      console.warn('⚠️ This may cause RLS to block admin reads. Please check .env.local and restart dev server.')
    }
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const searchTerm = searchParams.get('search')

    const MAX_SEARCH_LENGTH = 100

    // Build optimized query - select only needed fields for performance
    // Use limited fields instead of * to reduce data transfer
    // Note: paid_amount and balance_due are calculated from invoice_payments table, not direct columns
    let query = supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        order_id,
        invoice_date,
        due_date,
        customer_id,
        user_id,
        status,
        grand_total,
        payment_amount,
        payment_method,
        authorized_person_name,
        processing_started_at,
        delivery_confirmed_at,
        whatsapp_sent_at,
        status_updated_at,
        created_at,
        customer_data,
        customer_profile:profiles!customer_id (
          id,
          user_name,
          business_name,
          phone,
          role
        )
      `)
      .order('status_updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    // Filter by status if provided
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    // Search filter (by invoice number or customer name)
    if (searchTerm) {
      const sanitizedSearch = searchTerm
        .trim()
        .slice(0, MAX_SEARCH_LENGTH)
        .replace(/[%_\\]/g, (match) => `\\${match}`)
      query = query.or(`invoice_number.ilike.%${sanitizedSearch}%,customer_profile.user_name.ilike.%${sanitizedSearch}%,customer_profile.business_name.ilike.%${sanitizedSearch}%`)
    }

    const { data: invoices, error: fetchError } = await query

    if (fetchError) {
      console.error('❌ Error fetching invoices:', {
        error: fetchError,
        message: fetchError.message,
        details: fetchError.details,
        hint: fetchError.hint,
        code: fetchError.code
      })
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to fetch invoices',
          details: fetchError.message || 'Unknown database error',
          hint: fetchError.hint || 'Check RLS policies and database permissions'
        },
        { status: 500 }
      )
    }

    // No timer calculation needed - removed 45 min timing requirement
    const invoicesWithTimers = invoices || []

    const invoiceIds = invoicesWithTimers.map(inv => inv.id).filter(Boolean)

    const paymentsByInvoice: Record<string, { amount: number; modes: Record<string, number> }> = {}
    if (invoiceIds.length > 0) {
      try {
        const { data: paymentRows } = await supabase
          .from('invoice_payments')
          .select('invoice_id, amount, payment_method')
          .in('invoice_id', invoiceIds)

        const rows = (paymentRows || []) as InvoicePaymentRow[]
        rows.forEach(row => {
          const invoiceId = row.invoice_id
          if (!invoiceId) return
          const amount = Number(row.amount ?? 0)
          const method = (row.payment_method || 'UNKNOWN').toUpperCase()
          if (!paymentsByInvoice[invoiceId]) {
            paymentsByInvoice[invoiceId] = { amount: 0, modes: {} }
          }
          paymentsByInvoice[invoiceId].amount += amount
          paymentsByInvoice[invoiceId].modes[method] = (paymentsByInvoice[invoiceId].modes[method] || 0) + amount
        })
      } catch (paymentError) {
        console.warn('⚠️ Unable to load invoice_payments for metrics:', paymentError)
      }
    }

    let totalGrandTotal = 0
    let totalPaidAmount = 0
    let totalOutstanding = 0
    let partialDueCount = 0
    const paymentByMode: Record<string, number> = {}

    const invoicesWithPaymentStats = invoicesWithTimers.map(inv => {
      const grandTotal = Number(inv.grand_total || 0)
      const paymentInfo = paymentsByInvoice[inv.id] || { amount: 0, modes: {} }
      const paidFromPayments = paymentInfo.amount
      const paidFromInvoice = Number(inv.payment_amount || 0)
      const paidAmount = Math.max(paidFromPayments, paidFromInvoice)
      const outstanding = Math.max(0, grandTotal - paidAmount)

      totalGrandTotal += grandTotal
      totalPaidAmount += paidAmount
      totalOutstanding += outstanding
      if (outstanding > 0.01) {
        partialDueCount += 1
      }

      Object.entries(paymentInfo.modes).forEach(([mode, amount]) => {
        paymentByMode[mode] = (paymentByMode[mode] || 0) + amount
      })

      if (paidAmount > 0 && inv.payment_method) {
        const mode = String(inv.payment_method || 'UNKNOWN').toUpperCase()
        paymentByMode[mode] = (paymentByMode[mode] || 0) + Math.max(0, paidAmount - (paymentInfo.modes[mode] || 0))
      }

      const customerProfile = Array.isArray(inv.customer_profile) 
        ? inv.customer_profile[0] 
        : inv.customer_profile

      // Use customer_data JSON as fallback if profile join fails
      const customerData = customerProfile || inv.customer_data || null

      const customerName = customerData?.business_name || customerData?.user_name || 'Unknown Customer'

      const outstandingRecord = {
        id: inv.id,
        invoice_number: inv.invoice_number,
        customer_name: customerName,
        grand_total: grandTotal,
        paid_amount: paidAmount,
        outstanding_amount: outstanding,
        payment_method: inv.payment_method || null,
        status: inv.status,
        status_updated_at: inv.status_updated_at
      }

      return { invoice: inv, stats: outstandingRecord }
    })

    const outstandingInvoices = invoicesWithPaymentStats
      .filter(entry => entry.stats.outstanding_amount > 0.01)
      .map(entry => entry.stats)

    const invoicesWithTimersAndPayments = invoicesWithPaymentStats.map(entry => ({
      ...entry.invoice,
      paid_amount: entry.stats.paid_amount,
      outstanding_amount: entry.stats.outstanding_amount
    }))

    console.log('✅ Successfully fetched invoices:', {
      totalCount: invoicesWithTimers.length,
      hasServiceKey: !!hasServiceKey,
      usingServiceRole: hasServiceKey && hasUrl
    })

    // Group by status for kanban board
    const grouped = {
      DRAFT: invoicesWithTimersAndPayments.filter(inv => inv.status === 'DRAFT'),
      SENT: invoicesWithTimersAndPayments.filter(inv => inv.status === 'SENT'),
      PROCESSING: invoicesWithTimersAndPayments.filter(inv => inv.status === 'PROCESSING'),
      PACKING: invoicesWithTimersAndPayments.filter(inv => inv.status === 'PACKING'),
      DELIVERED: invoicesWithTimersAndPayments.filter(inv => inv.status === 'DELIVERED'),
      PAID: invoicesWithTimersAndPayments.filter(inv => inv.status === 'PAID')
    }

    return NextResponse.json({
      success: true,
      invoices: invoicesWithTimersAndPayments,
      grouped,
      counts: {
        DRAFT: grouped.DRAFT.length,
        SENT: grouped.SENT.length,
        PROCESSING: grouped.PROCESSING.length,
        PACKING: grouped.PACKING.length,
        DELIVERED: grouped.DELIVERED.length,
        PAID: grouped.PAID.length
      },
      metrics: {
        totalGrandTotal,
        totalPaidAmount,
        totalOutstanding,
        partialDueCount,
        paymentByMode,
        outstandingInvoices
      }
    })

  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred'
    const stack = error instanceof Error ? error.stack : undefined
    const name = error instanceof Error ? error.name : undefined
    console.error('❌ Error in invoice-flow API:', {
      error,
      message,
      stack,
      name
    })
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: message,
        hint: 'Please check server logs for more details'
      },
      { status: 500 }
    )
  }
}


