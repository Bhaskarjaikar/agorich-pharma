import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyDistributor } from '@/lib/api-security'

interface PayablePaymentBody {
  invoice_id: string
  payment_amount: number
  payment_method: 'UPI' | 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | 'NEFT' | 'RTGS'
  payment_reference?: string
  payment_notes?: string
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyDistributor(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const supabase = await createServerClient()
    const body = (await request.json()) as PayablePaymentBody

    const { invoice_id, payment_amount, payment_method, payment_reference, payment_notes } = body

    if (!invoice_id || !payment_amount || !payment_method) {
      return NextResponse.json(
        { error: 'invoice_id, payment_amount, and payment_method are required' },
        { status: 400 }
      )
    }

    if (payment_amount <= 0) {
      return NextResponse.json(
        { error: 'Payment amount must be greater than 0' },
        { status: 400 }
      )
    }

    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*, profiles!distributor_id(*)')
      .eq('id', invoice_id)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    if (invoice.profiles?.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You are not authorized to pay this invoice' },
        { status: 403 }
      )
    }

    const currentBalanceDue = Number(invoice.balance_due || 0)
    const grandTotal = Number(invoice.grand_total || 0)
    const currentPaid = Number(invoice.payment_amount || 0)

    if (payment_amount > currentBalanceDue) {
      return NextResponse.json(
        { error: `Payment amount cannot exceed balance due: ${currentBalanceDue}` },
        { status: 400 }
      )
    }

    const newTotalPaid = currentPaid + payment_amount
    const isFullyPaid = newTotalPaid >= grandTotal

    const updateData: Record<string, unknown> = {
      payment_amount: newTotalPaid,
      payment_method: payment_method,
      payment_date: new Date().toISOString(),
      balance_due: grandTotal - newTotalPaid,
      status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
      updated_at: new Date().toISOString()
    }

    if (payment_reference) {
      updateData.payment_transaction_id = payment_reference
    }

    if (payment_notes) {
      updateData.payment_notes = payment_notes
    }

    const { error: updateError } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoice_id)

    if (updateError) {
      console.error('Error updating invoice:', updateError)
      return NextResponse.json(
        { error: 'Failed to record payment' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: isFullyPaid ? 'Invoice fully paid' : 'Payment recorded successfully',
      data: {
        invoice_id,
        amount_paid: payment_amount,
        new_balance: grandTotal - newTotalPaid,
        status: updateData.status,
        is_fully_paid: isFullyPaid
      }
    })

  } catch (error) {
    console.error('Error processing payment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyDistributor(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const supabase = await createServerClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'DISTRIBUTOR')
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Distributor profile not found' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('invoices')
      .select('*')
      .eq('distributor_id', profile.id)
      .in('status', ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'])
      .order('due_date', { ascending: true })

    if (status === 'overdue') {
      query = supabase
        .from('invoices')
        .select('*')
        .eq('distributor_id', profile.id)
        .eq('status', 'OVERDUE')
        .order('due_date', { ascending: true })
    } else if (status === 'paid') {
      query = supabase
        .from('invoices')
        .select('*')
        .eq('distributor_id', profile.id)
        .eq('status', 'PAID')
        .order('updated_at', { ascending: false })
    }

    const { data: invoices, error } = await query

    if (error) {
      console.error('Error fetching payables:', error)
      return NextResponse.json(
        { error: 'Failed to fetch payables' },
        { status: 500 }
      )
    }

    const payables = (invoices || []).map((inv: any) => {
      const today = new Date()
      const dueDate = new Date(inv.due_date)
      const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const balanceDue = Number(inv.balance_due || 0)

      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        due_date: inv.due_date,
        total_amount: Number(inv.grand_total || 0),
        amount_paid: Number(inv.payment_amount || 0),
        balance_due: balanceDue,
        days_left: daysLeft,
        status: inv.status === 'PAID' ? 'PAID' : daysLeft < 0 ? 'OVERDUE' : 'PENDING',
        payment_method: inv.payment_method,
        payment_date: inv.payment_date
      }
    })

    return NextResponse.json({
      success: true,
      data: payables
    })

  } catch (error) {
    console.error('Error fetching payables:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}