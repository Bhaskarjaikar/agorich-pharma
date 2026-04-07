import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/api-security'
import { createClient } from '@supabase/supabase-js'

// POST /api/invoices/[id]/confirm-order - Confirm order after call (SENT → PROCESSING)
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params

    // Verify authentication - only admin can confirm orders
    const { user, error: authError } = await verifyAdmin(request)
    if (authError || !user) {
      return authError as NextResponse
    }

    // Use service role client to bypass RLS for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('Service role key check:', {
      hasServiceKey: !!supabaseServiceKey,
      serviceKeyLength: supabaseServiceKey?.length || 0,
      supabaseUrl: supabaseUrl
    })
    
    let supabase
    if (supabaseServiceKey && supabaseUrl) {
      // Use service role client (bypasses RLS) for admin operations
      supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { 
          autoRefreshToken: false, 
          persistSession: false 
        }
      })
      console.log('✅ Using service role client for admin invoice update (RLS bypassed)')
    } else {
      // Fallback to regular client
      supabase = await createServerClient()
      console.warn('⚠️ Using regular client - Service role key not found. RLS may block admin updates!')
      console.warn('⚠️ Please add SUPABASE_SERVICE_ROLE_KEY to .env.local')
    }

    const { id } = params

    // Get current invoice (without .single() to avoid coercion error)
    const { data: invoiceList, error: initialFetchError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .limit(1)

    if (initialFetchError) {
      console.error('Error fetching invoice:', initialFetchError)
      return NextResponse.json(
        { error: `Error fetching invoice: ${initialFetchError.message || 'Unknown error'}` },
        { status: 500 }
      )
    }

    if (!invoiceList || invoiceList.length === 0) {
      console.error('Invoice not found:', id)
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    const invoice = invoiceList[0]

    console.log('Current invoice status:', invoice.status, 'Invoice ID:', id)

    // Only allow if status is SENT
    if (invoice.status !== 'SENT') {
      return NextResponse.json(
        { error: `Invoice must be in SENT status. Current status: ${invoice.status}` },
        { status: 400 }
      )
    }

    // Update invoice status to PROCESSING and set processing_started_at timestamp
    const processingStartedAt = new Date().toISOString()
    const statusUpdatedAt = new Date().toISOString()
    
    console.log('Updating invoice:', {
      id,
      status: 'PROCESSING',
      processing_started_at: processingStartedAt,
      status_updated_at: statusUpdatedAt
    })

    // Update invoice - using .maybeSingle() or handling array manually
    console.log('Attempting to update invoice with ID:', id)
    
    // CRITICAL FIX: Use .select() to get updated data directly from update query
    // This avoids race conditions and verification issues
    const { data: updatedInvoiceData, error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'PROCESSING',
        processing_started_at: processingStartedAt,
        status_updated_at: statusUpdatedAt
      })
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) {
      console.error('❌ Update error:', {
        error: updateError,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code,
        invoiceId: id
      })
      return NextResponse.json(
        { 
          error: 'Failed to update invoice status',
          details: updateError.message || 'Unknown database error',
          hint: updateError.hint || 'Check RLS policies and database permissions',
          code: updateError.code
        },
        { status: 500 }
      )
    }

    // If update succeeded but no data returned, try fetching separately
    let updatedInvoice = updatedInvoiceData
    
    if (!updatedInvoice) {
      console.warn('⚠️ Update succeeded but no data returned. Fetching separately...')
      
      // Wait briefly for transaction commit
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Fetch updated invoice
      const { data: fetchedInvoice, error: fetchErr } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
        .single()

      if (fetchErr) {
        console.error('❌ Error fetching invoice after update:', fetchErr)
        // Update might have succeeded, return success with warning
      return NextResponse.json({
        success: true,
          message: 'Order confirmed and processing started. Invoice status updated (verification unavailable).',
          warning: 'Could not verify update due to fetch error'
      })
    }

      updatedInvoice = fetchedInvoice
    }

    if (!updatedInvoice) {
      console.error('❌ Invoice not found after update:', id)
      return NextResponse.json(
        { 
          error: 'Invoice update verification failed',
          details: 'Update operation completed but invoice could not be retrieved. The update may have succeeded - please refresh to verify.'
        },
        { status: 500 }
      )
    }

    // Verify status was actually updated
    if (updatedInvoice.status !== 'PROCESSING') {
      console.error('❌ CRITICAL: Invoice status was NOT updated to PROCESSING. Current status:', updatedInvoice.status)
      return NextResponse.json(
        { 
          error: 'Invoice status update failed',
          details: `Expected PROCESSING but got ${updatedInvoice.status}. Database update may have failed or been reverted.`,
          currentStatus: updatedInvoice.status
        },
        { status: 500 }
      )
    }
    
    console.log('✅ Invoice updated successfully and verified:', {
      id: updatedInvoice.id,
      status: updatedInvoice.status,
      processing_started_at: updatedInvoice.processing_started_at,
      status_updated_at: updatedInvoice.status_updated_at
    })

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      message: 'Order confirmed and processing started.'
    })

  } catch (error) {
    console.error('Error in confirm-order API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


