import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// Status transition rules
const allowedTransitions: Record<string, string[]> = {
  DRAFT: ['SENT'],
  SENT: ['PROCESSING'],
  PROCESSING: ['PACKING'],
  PACKING: ['DELIVERED'],
  DELIVERED: ['PAID', 'OVERDUE'],
  OVERDUE: ['PAID'],
  PAID: [] // No transitions allowed from PAID
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const supabase = await createServerClient()
    const { id } = params
    const body = await request.json()
    const { newStatus } = body

    const normalizedStatus = typeof newStatus === 'string'
      ? newStatus.trim().toUpperCase()
      : ''

    if (!normalizedStatus) {
      return NextResponse.json(
        { error: 'New status is required' },
        { status: 400 }
      )
    }

    // Get current invoice
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    const currentStatus = String(invoice.status || '').toUpperCase()

    // Validate status transition
    const allowed = allowedTransitions[currentStatus] || []
    if (!allowed.includes(normalizedStatus)) {
      return NextResponse.json(
        { 
          error: `Invalid status transition from ${currentStatus} to ${normalizedStatus}`,
          allowedTransitions: allowed
        },
        { status: 400 }
      )
    }

    // Update invoice status
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        status: normalizedStatus,
        status_updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating invoice status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update invoice status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      message: `Invoice status updated to ${newStatus}`
    })

  } catch (error) {
    console.error('Error in status update API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

