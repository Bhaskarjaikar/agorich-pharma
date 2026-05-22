import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyRetailerOrAdmin } from '@/lib/api-security'
import { generateOrderNumber } from '@/lib/invoice-sequence'

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
    const authResult = await verifyRetailerOrAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

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
    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method is required' },
        { status: 400 }
      )
    }

    // Get current invoice
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*, profiles!customer_id(role)')
      .eq('id', id)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Get customer role
    const customerRole = invoice.profiles?.role

    // Update data object
    const updateData: Record<string, unknown> = {
      payment_notes: paymentNotes || null,
      status_updated_at: new Date().toISOString()
    }

    if (authorizedPersonName && authorizedPersonName.trim()) {
      updateData.authorized_person_name = authorizedPersonName.trim()
    }

    // Handle different cases
    if (paymentMethod.toLowerCase() === 'credit' && customerRole === 'DISTRIBUTOR') {
      // Distributor chooses Credit: set status to WAITING_FOR_APPROVAL
      updateData.status = 'WAITING_FOR_APPROVAL'
      updateData.payment_method = paymentMethod
      updateData.payment_date = paymentDate || new Date().toISOString()
    } else {
      // Normal payment flow
      if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
        return NextResponse.json(
          { error: 'Valid payment amount is required' },
          { status: 400 }
        )
      }

      // Calculate total paid so far including this payment
      const currentPaid = Number(invoice.payment_amount || 0)
      const newTotalPaid = currentPaid + paymentAmount
      const grandTotal = Number(invoice.grand_total || 0)

      updateData.payment_amount = newTotalPaid
      updateData.payment_method = paymentMethod
      updateData.payment_date = paymentDate || new Date().toISOString()

      // Check if we need to set status to SENT (for DRAFT invoices with >=50% payment)
      if (invoice.status === 'DRAFT' && customerRole === 'RETAILER') {
        const paymentPercentage = (newTotalPaid / grandTotal) * 100
        if (paymentPercentage >= 50) {
          // Generate invoice number and set status to SENT
          const invoiceNumber = await generateOrderNumber(supabase)
          updateData.invoice_number = invoiceNumber
          updateData.status = 'SENT'
        }
      }

      // Check if fully paid
      if (newTotalPaid >= grandTotal) {
        updateData.status = 'PAID'
      }
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

