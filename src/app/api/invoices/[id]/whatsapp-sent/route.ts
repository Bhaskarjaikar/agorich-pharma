import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyRetailerOrAdmin } from '@/lib/api-security'

// POST /api/invoices/[id]/whatsapp-sent - Mark invoice as sent via WhatsApp
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    // Verify authentication
    const { user, error: authError } = await verifyRetailerOrAdmin(request)
    if (authError || !user) {
      return authError as NextResponse
    }
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

    // Only allow if status is DRAFT
    if (invoice.status !== 'DRAFT') {
      return NextResponse.json(
        { error: `Invoice must be in DRAFT status. Current status: ${invoice.status}` },
        { status: 400 }
      )
    }

    // Update invoice status to SENT and record WhatsApp sent timestamp
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'SENT',
        whatsapp_sent_at: new Date().toISOString(),
        status_updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating invoice:', updateError)
      return NextResponse.json(
        { error: 'Failed to update invoice status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      message: 'Invoice marked as sent via WhatsApp'
    })

  } catch (error) {
    console.error('Error in whatsapp-sent API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


