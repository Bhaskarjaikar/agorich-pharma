import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyLogisticOrAdmin } from '@/lib/api-security'
import { createClient } from '@supabase/supabase-js'
import {
  guardInvoiceTransition,
  logStatusTransition
} from '@/lib/status-engine'

interface DeliveryConfirmBody {
  payment_amount_received: number
  payment_mode: string
  remaining_balance: number
  authorized_person_name: string
}

// POST /api/invoices/[id]/delivery-confirm - Delivery partner confirms delivery with payment details
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    // Verify logistic or admin authentication
    const authResult = await verifyLogisticOrAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

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
      console.log('✅ Delivery confirm API: Using service role client (RLS bypassed)')
    } else {
      supabase = await createServerClient()
      console.warn('⚠️ Delivery confirm API: Using regular client')
    }
    const { id } = params
    const body = (await request.json()) as DeliveryConfirmBody

    const {
      payment_amount_received,
      payment_mode,
      remaining_balance,
      authorized_person_name
    } = body

    // Validation
    if (!payment_amount_received || payment_amount_received < 0) {
      return NextResponse.json(
        { error: 'Valid payment amount is required' },
        { status: 400 }
      )
    }

    if (!payment_mode) {
      return NextResponse.json(
        { error: 'Payment mode is required (Cash, UPI, Card, etc.)' },
        { status: 400 }
      )
    }

    if (remaining_balance === undefined || remaining_balance < 0) {
      return NextResponse.json(
        { error: 'Remaining balance is required (can be 0)' },
        { status: 400 }
      )
    }

    if (!authorized_person_name || authorized_person_name.trim() === '') {
      return NextResponse.json(
        { error: 'Authorized person name is required' },
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

    // Verify payment amounts
    const totalAmount = Number(invoice.grand_total || 0)
    const receivedAmount = Number(payment_amount_received)
    const remaining = Number(remaining_balance)

    const currentStatus = String(invoice.status || '')
    const targetStatus = remaining <= 0 ? 'PAID' : 'DELIVERED'

    // Validate status transition using canonical engine
    const transitionResult = guardInvoiceTransition(currentStatus, targetStatus)
    if (!transitionResult.valid) {
      return NextResponse.json(
        { error: transitionResult.error, from: transitionResult.from, to: transitionResult.to },
        { status: 400 }
      )
    }
    
    if (Math.abs(receivedAmount + remaining - totalAmount) > 0.01) {
      return NextResponse.json(
        { error: `Payment amounts don't match. Total: ₹${totalAmount}, Received: ₹${receivedAmount}, Remaining: ₹${remaining}` },
        { status: 400 }
      )
    }

    // Update invoice status to DELIVERED/PAID and record payment details
    const updateData: Record<string, unknown> = {
      status: targetStatus,
      delivery_confirmed_at: new Date().toISOString(),
      status_updated_at: new Date().toISOString(),
      authorized_person_name: authorized_person_name.trim(),
      payment_amount: receivedAmount,
      payment_method: payment_mode,
      payment_date: new Date().toISOString()
    }

    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update(updateData)
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

    // Log status transition audit
    await logStatusTransition(supabase, {
      entityType: 'INVOICE',
      entityId: id,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      metadata: {
        source: 'api/invoices/[id]/delivery-confirm',
        paymentAmountReceived: receivedAmount,
        paymentMode: payment_mode,
        remainingBalance: remaining
      }
    })

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      message: remaining > 0 
        ? `Delivery confirmed. Payment received: ₹${receivedAmount}. Remaining balance: ₹${remaining}`
        : 'Delivery confirmed and payment received in full.'
    })

  } catch (error) {
    console.error('Error in delivery-confirm API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


