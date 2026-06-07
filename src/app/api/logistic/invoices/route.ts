import { NextRequest, NextResponse } from 'next/server'
import { verifyLogisticOrAdmin } from '@/lib/api-security'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'

function sanitizeString(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (trimmed.length === 0) return '';
  return trimmed.slice(0, maxLength).replace(/[<>\"\'`;\\]/g, '');
}

function generateErrorId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function GET(request: NextRequest) {
  const errorId = generateErrorId();

  try {
    const authResult = await verifyLogisticOrAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    let supabase
    if (supabaseServiceKey && supabaseUrl) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    } else {
      supabase = await createServerClient()
    }

    const { searchParams } = new URL(request.url)
    const statusParam = sanitizeString(searchParams.get('status'), 20)
    const validStatuses = ['PROCESSING', 'PACKING', 'DISPATCHED', 'DELIVERED']
    const effectiveStatus = statusParam && validStatuses.includes(statusParam) ? statusParam : null

    let query = supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        order_id,
        grand_total,
        balance_due,
        status,
        created_at,
        status_updated_at,
        customer_data,
        customer_profile:profiles!customer_id (
          id,
          user_name,
          business_name,
          phone,
          address,
          city,
          state,
          pincode
        )
      `)
      .order('status_updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (effectiveStatus) {
      query = query.eq('status', effectiveStatus)
    } else {
      query = query.in('status', ['PROCESSING', 'PACKING', 'DISPATCHED'])
    }

    const { data: invoices, error: fetchError } = await query

    if (fetchError) {
      console.error(JSON.stringify({
        errorId,
        context: 'logistic_invoices_fetch_failed',
        userId: user.id,
        statusFilter: effectiveStatus,
        error: fetchError.message
      }));
      return NextResponse.json(
        { success: false, error: 'Failed to fetch invoices' },
        { status: 500 }
      )
    }

    const formattedInvoices = (invoices || []).map((inv: any) => ({
      id: inv.id,
      invoice_number: inv.invoice_number || inv.order_id || 'N/A',
      grand_total: Number(inv.grand_total || 0),
      balance_due: Number(inv.balance_due || 0),
      status: inv.status,
      created_at: inv.created_at,
      status_updated_at: inv.status_updated_at,
      customer_name: inv.customer_profile?.business_name || inv.customer_profile?.user_name || inv.customer_data?.business_name || 'Unknown',
      customer_phone: inv.customer_profile?.phone || inv.customer_data?.phone || null,
      customer_address: inv.customer_profile?.address || inv.customer_data?.address || null,
      customer_city: inv.customer_profile?.city || inv.customer_data?.city || null,
      customer_state: inv.customer_profile?.state || inv.customer_data?.state || null,
      customer_pincode: inv.customer_profile?.pincode || inv.customer_data?.pincode || null
    }))

    // MOCK DATA: If no invoices, return test data for development
    const finalInvoices = formattedInvoices.length > 0 ? formattedInvoices : [
      {
        id: 'mock-invoice-1',
        invoice_number: 'MOCK-INV-001',
        grand_total: 1500,
        balance_due: 1500,
        status: 'DISPATCHED',
        created_at: new Date().toISOString(),
        status_updated_at: new Date().toISOString(),
        customer_name: 'Test Retail Shop',
        customer_phone: '+91 8409725206',
        customer_address: 'Test Address, Main Road',
        customer_city: 'Muzaffarpur',
        customer_state: 'Bihar',
        customer_pincode: '842001'
      },
      {
        id: 'mock-invoice-2',
        invoice_number: 'MOCK-INV-002',
        grand_total: 2500,
        balance_due: 2500,
        status: 'DISPATCHED',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        status_updated_at: new Date(Date.now() - 3600000).toISOString(),
        customer_name: 'Demo Medical Store',
        customer_phone: '+91 8409725207',
        customer_address: 'Station Road',
        customer_city: 'Muzaffarpur',
        customer_state: 'Bihar',
        customer_pincode: '842002'
      }
    ]

    const grouped = formattedInvoices.length > 0 ? {
      PROCESSING: formattedInvoices.filter((inv: any) => inv.status === 'PROCESSING'),
      PACKING: formattedInvoices.filter((inv: any) => inv.status === 'PACKING'),
      DISPATCHED: formattedInvoices.filter((inv: any) => inv.status === 'DISPATCHED')
    } : {
      PROCESSING: [],
      PACKING: [],
      DISPATCHED: finalInvoices
    }

    return NextResponse.json({
      success: true,
      invoices: finalInvoices,
      grouped,
      counts: {
        PROCESSING: grouped.PROCESSING.length,
        PACKING: grouped.PACKING.length,
        DISPATCHED: grouped.DISPATCHED.length,
        total: finalInvoices.length
      },
      is_mock_data: formattedInvoices.length === 0
    })

  } catch (error) {
    console.error(JSON.stringify({
      errorId,
      context: 'logistic_invoices_crash',
      message: error instanceof Error ? error.message : 'Unknown error'
    }));
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
