import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAuth } from '@/lib/api-security'

interface AccountsReceivableInvoice {
  id: string
  invoice_number: string
  customer_id: string
  customer_name: string
  customer_business_name?: string
  customer_phone?: string
  grand_total: number
  advance_paid: number
  balance_due: number
  payment_status: string
  gst_type: string
  place_of_supply: string
  invoice_date: string
  due_date: string
  status: string
  days_overdue: number
  created_at: string
}

interface AccountsReceivableResponse {
  success: boolean
  invoices?: AccountsReceivableInvoice[]
  summary?: {
    totalOutstanding: number
    totalAdvanceCollected: number
    totalCODPending: number
    invoiceCount: number
    partiallyPaidCount: number
    pendingCount: number
    overdueCount: number
  }
  error?: string
}

/**
 * GET /api/admin/accounts-receivable
 * Get all invoices with balance_due > 0 (Accounts Receivable)
 */
export async function GET(request: NextRequest): Promise<NextResponse<AccountsReceivableResponse>> {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request, ['SUPER_ADMIN', 'ADMIN', 'SALES', 'SUPPORT'])
    if ('headers' in authResult) {
      return authResult as NextResponse<AccountsReceivableResponse>
    }
    const user = authResult

    // Check if user is admin
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const sortBy = searchParams.get('sort_by') || 'due_date'
    const sortOrder = searchParams.get('sort_order') || 'asc'

    // Fetch invoices with balance_due > 0 that are not cancelled
    let query = supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        customer_id,
        grand_total,
        advance_paid,
        balance_due,
        payment_status,
        gst_type,
        place_of_supply,
        invoice_date,
        due_date,
        status,
        is_cancelled,
        created_at,
        profiles:customer_id (
          user_name,
          business_name,
          phone
        )
      `)
      .eq('is_cancelled', false)
      .gt('balance_due', 0)

    // Filter by status if provided
    if (status && ['PENDING', 'PARTIALLY_PAID'].includes(status)) {
      query = query.eq('payment_status', status)
    } else {
      // Default: show both PENDING and PARTIALLY_PAID
      query = query.in('payment_status', ['PENDING', 'PARTIALLY_PAID'])
    }

    // Order by
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    const { data: invoices, error: invoicesError } = await query

    if (invoicesError) {
      console.error('❌ Error fetching accounts receivable:', invoicesError)
      return NextResponse.json(
        { success: false, error: `Failed to fetch invoices: ${invoicesError.message}` },
        { status: 500 }
      )
    }

    // Calculate summary metrics
    let totalOutstanding = 0
    let totalAdvanceCollected = 0
    let partiallyPaidCount = 0
    let pendingCount = 0
    let overdueCount = 0
    const today = new Date()

    // Transform data and calculate days overdue
     
    const transformedInvoices: AccountsReceivableInvoice[] = (invoices || []).map((invoice: any) => {
      const dueDate = new Date(invoice.due_date)
      const daysOverdue = today > dueDate 
        ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0

      // Update counters
      totalOutstanding += invoice.balance_due
      totalAdvanceCollected += invoice.advance_paid

      if (invoice.payment_status === 'PARTIALLY_PAID') {
        partiallyPaidCount++
      } else if (invoice.payment_status === 'PENDING') {
        pendingCount++
      }

      if (daysOverdue > 0) {
        overdueCount++
      }

      // Handle profiles as array (Supabase returns array from join)
      const profile = Array.isArray(invoice.profiles) ? invoice.profiles[0] : invoice.profiles

      return {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        customer_id: invoice.customer_id,
        customer_name: profile?.user_name || 'N/A',
        customer_business_name: profile?.business_name || undefined,
        customer_phone: profile?.phone || undefined,
        grand_total: invoice.grand_total,
        advance_paid: invoice.advance_paid,
        balance_due: invoice.balance_due,
        payment_status: invoice.payment_status,
        gst_type: invoice.gst_type,
        place_of_supply: invoice.place_of_supply,
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date,
        status: invoice.status,
        days_overdue: daysOverdue,
        created_at: invoice.created_at
      }
    })

    const summary = {
      totalOutstanding,
      totalAdvanceCollected,
      totalCODPending: totalOutstanding,
      invoiceCount: transformedInvoices.length,
      partiallyPaidCount,
      pendingCount,
      overdueCount
    }

    console.log(`✅ Accounts receivable fetched: ${transformedInvoices.length} invoices, ${formatCurrency(totalOutstanding)} outstanding`)

    return NextResponse.json({
      success: true,
      invoices: transformedInvoices,
      summary
    })

  } catch (error) {
    console.error('❌ Error in GET /api/admin/accounts-receivable:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to format currency for logging
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount)
}
