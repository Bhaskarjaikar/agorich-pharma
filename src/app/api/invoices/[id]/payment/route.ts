import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyRetailerOrAdmin } from '@/lib/api-security'

interface PaymentBody {
  payment_amount: number
  payment_method: string
  payment_date?: string
  payment_notes?: string | null
  authorized_person_name?: string
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { user, error: authError } = await verifyRetailerOrAdmin(request)
    if (authError || !user) {
      return authError as NextResponse
    }

    const supabase = await createServerClient()
    const { id } = params
    const body = (await request.json()) as PaymentBody
    const rawAmount = body?.payment_amount
    const paymentAmount = Number(rawAmount)
    const paymentMethod = typeof body?.payment_method === 'string'
      ? body.payment_method.trim()
      : ''
    const paymentDate = body?.payment_date
    const paymentNotes = body?.payment_notes
    const authorizedPersonName = body?.authorized_person_name

    // Validation
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return NextResponse.json(
        { error: 'Valid payment amount is required' },
        { status: 400 }
      )
    }

    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method is required' },
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

    // Check if already paid
    if (invoice.status === 'PAID') {
      return NextResponse.json(
        { error: 'Invoice is already marked as paid' },
        { status: 400 }
      )
    }

    // Check if invoice can be paid (must be SENT, DELIVERED, or OVERDUE)
    const payableStatuses = ['SENT', 'DELIVERED', 'OVERDUE']
    if (!payableStatuses.includes(invoice.status)) {
      return NextResponse.json(
        { 
          error: `Cannot record payment for invoice with status ${invoice.status}`,
          hint: 'Invoice must be SENT, DELIVERED, or OVERDUE to record payment'
        },
        { status: 400 }
      )
    }

    // Update invoice with payment details and status
    const updateData: Record<string, unknown> = {
      status: 'PAID',
      payment_amount: paymentAmount,
      payment_method: paymentMethod,
      payment_date: paymentDate || new Date().toISOString(),
      payment_notes: paymentNotes || null,
      status_updated_at: new Date().toISOString()
    }
    
    // Add authorized person name if provided
    if (authorizedPersonName && authorizedPersonName.trim()) {
      updateData.authorized_person_name = authorizedPersonName.trim()
    }

    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error recording payment:', updateError)
      return NextResponse.json(
        { error: 'Failed to record payment' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      message: 'Payment recorded successfully'
    })

  } catch (error) {
    console.error('Error in payment recording API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

