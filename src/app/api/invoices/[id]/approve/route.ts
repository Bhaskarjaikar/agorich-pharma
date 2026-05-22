import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/api-security'
import { generateOrderNumber } from '@/lib/invoice-sequence'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const authResult = await verifyAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const supabase = await createServerClient()
    const { id } = params

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

    // Check if invoice is in WAITING_FOR_APPROVAL status
    if (invoice.status !== 'WAITING_FOR_APPROVAL') {
      return NextResponse.json(
        { error: 'Invoice is not waiting for approval' },
        { status: 400 }
      )
    }

    // Generate invoice number and set status to SENT
    const invoiceNumber = await generateOrderNumber(supabase)
    
    const updateData = {
      invoice_number: invoiceNumber,
      status: 'SENT',
      status_updated_at: new Date().toISOString()
    }

    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error approving invoice:', updateError)
      return NextResponse.json(
        { error: 'Failed to approve invoice' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      message: 'Invoice approved successfully'
    })

  } catch (error) {
    console.error('Error in invoice approval API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
