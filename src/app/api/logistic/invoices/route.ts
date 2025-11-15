import { NextRequest, NextResponse } from 'next/server'
import { verifyLogisticOrAdmin } from '@/lib/api-security'
import { createClient } from '@supabase/supabase-js'

// GET /api/logistic/invoices - Fetch PROCESSING and PACKING invoices for logistic dashboard
export async function GET(request: NextRequest) {
  try {
    // Verify logistic or admin authentication
    const { user, error: authError } = await verifyLogisticOrAdmin(request)
    if (authError || !user) {
      return authError as NextResponse
    }

    // Use service role client to bypass RLS for consistent data access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    let supabase
    if (supabaseServiceKey && supabaseUrl) {
      // Use service role client (bypasses RLS) for admin operations
      supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { 
          autoRefreshToken: false, 
          persistSession: false 
        }
      })
      console.log('✅ Logistic API: Using service role client (RLS bypassed)')
    } else {
      // Fallback to regular client (will use RLS policies)
      const { createServerClient } = await import('@/lib/supabase/server')
      supabase = await createServerClient()
      console.warn('⚠️ Logistic API: Using regular client - Service role key not found')
    }

    // Fetch only PROCESSING and PACKING invoices
    const { data: invoices, error: fetchError } = await supabase
      .from('invoices')
      .select(`
        *,
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
      .in('status', ['PROCESSING', 'PACKING'])
      .order('status_updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching logistic invoices:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch invoices' },
        { status: 500 }
      )
    }

    // Group by status for kanban board
    const grouped = {
      PROCESSING: (invoices || []).filter(inv => inv.status === 'PROCESSING'),
      PACKING: (invoices || []).filter(inv => inv.status === 'PACKING')
    }

    return NextResponse.json({
      success: true,
      invoices: invoices || [],
      grouped,
      counts: {
        PROCESSING: grouped.PROCESSING.length,
        PACKING: grouped.PACKING.length
      }
    })

  } catch (error) {
    console.error('Error in logistic invoices API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

