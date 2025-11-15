import { NextRequest, NextResponse } from 'next/server'
import { verifyLogisticOrAdmin } from '@/lib/api-security'
import { createClient } from '@supabase/supabase-js'
import {
  decrementStockForInvoice,
  restoreStockAdjustments,
  StockAdjustmentError,
} from '@/lib/stock-adjustments'
import type { AppliedStockAdjustment } from '@/lib/stock-adjustments'

// POST /api/logistic/pack-order - Mark invoice as packed (PROCESSING → PACKING)
export async function POST(request: NextRequest) {
  try {
    // Verify logistic or admin authentication
    const { user, error: authError } = await verifyLogisticOrAdmin(request)
    if (authError || !user) {
      return authError as NextResponse
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      )
    }

    // Use service role client to bypass RLS for consistent data access
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
      console.log('✅ Pack order API: Using service role client (RLS bypassed)')
    } else {
      const { createServerClient } = await import('@/lib/supabase/server')
      supabase = await createServerClient()
      console.warn('⚠️ Pack order API: Using regular client')
    }

    // Get current invoice
    const { data: invoiceList, error: fetchError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .limit(1)

    if (fetchError) {
      console.error('Error fetching invoice:', fetchError)
      return NextResponse.json(
        { error: `Error fetching invoice: ${fetchError.message || 'Unknown error'}` },
        { status: 500 }
      )
    }

    if (!invoiceList || invoiceList.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    const invoice = invoiceList[0]

    // Only allow if status is PROCESSING
    if (invoice.status !== 'PROCESSING') {
      return NextResponse.json(
        { error: `Invoice must be in PROCESSING status. Current status: ${invoice.status}` },
        { status: 400 }
      )
    }

    // Reserve stock before marking as packed
    let stockAdjustments: AppliedStockAdjustment[] = []
    try {
      const result = await decrementStockForInvoice(supabase, id)
      stockAdjustments = result.adjustments
    } catch (error) {
      if (error instanceof StockAdjustmentError) {
        console.error('Stock adjustment failed while packing order', {
          invoiceId: id,
          details: error.details,
        })

        const statusCode =
          error.details.code === 'INSUFFICIENT_STOCK' ? 409 : 400

        return NextResponse.json(
          {
            error: error.message,
            details: error.details,
          },
          { status: statusCode }
        )
      }

      console.error('Unexpected error while decrementing stock', {
        invoiceId: id,
        error,
      })

      return NextResponse.json(
        { error: 'Failed to reserve stock for invoice' },
        { status: 500 }
      )
    }

    // Update invoice status to PACKING
    const statusUpdatedAt = new Date().toISOString()

    console.log('Marking invoice as packed:', {
      id,
      invoiceNumber: invoice.invoice_number,
      oldStatus: invoice.status,
      newStatus: 'PACKING'
    })

    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'PACKING',
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
        invoiceId: id
      })

      if (stockAdjustments.length > 0) {
        const rollbackResult = await restoreStockAdjustments(supabase, stockAdjustments)
        if (rollbackResult.errors.length > 0) {
          console.error('Failed to rollback stock adjustments after invoice update error', {
            invoiceId: id,
            rollbackErrors: rollbackResult.errors,
          })
        }
      }

      return NextResponse.json(
        { 
          error: 'Failed to update invoice status',
          details: updateError.message || 'Unknown database error',
          code: updateError.code
        },
        { status: 500 }
      )
    }

    if (!updatedInvoice) {
      if (stockAdjustments.length > 0) {
        const rollbackResult = await restoreStockAdjustments(supabase, stockAdjustments)
        if (rollbackResult.errors.length > 0) {
          console.error('Failed to rollback stock adjustments when invoice not returned after update', {
            invoiceId: id,
            rollbackErrors: rollbackResult.errors,
          })
        }
      }

      return NextResponse.json(
        { 
          error: 'Invoice update verification failed',
          details: 'Update completed but invoice could not be retrieved.'
        },
        { status: 500 }
      )
    }

    // Verify status was actually updated
    if (updatedInvoice.status !== 'PACKING') {
      console.error('❌ CRITICAL: Invoice status was NOT updated to PACKING. Current status:', updatedInvoice.status)
      return NextResponse.json(
        { 
          error: 'Invoice status update failed',
          details: `Expected PACKING but got ${updatedInvoice.status}`,
          currentStatus: updatedInvoice.status
        },
        { status: 500 }
      )
    }
    
    console.log('✅ Invoice marked as packed successfully:', {
      id: updatedInvoice.id,
      invoiceNumber: updatedInvoice.invoice_number,
      status: updatedInvoice.status
    })

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      message: 'Invoice marked as packed successfully.'
    })

  } catch (error) {
    console.error('Error in pack-order API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

