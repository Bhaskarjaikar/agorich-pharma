import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyRetailerOrAdmin } from '@/lib/api-security'
import { logBalancePaymentReceived } from '@/lib/audit-logger'
import {
  writePaymentToCanonicalLedger,
  normalizePaymentStatus,
  normalizePaymentType
} from '@/lib/payment-ledger/ledger'

interface RecordBalanceBody {
  invoice_id: string
  amount: number
  payment_method: string
  notes?: string
}

interface RecordBalanceResponse {
  success: boolean
  payment?: {
    id: string
    amount: number
    payment_method: string
    status: string
    created_at: string
  }
  invoice?: {
    id: string
    payment_status: string
    advance_paid: number
    balance_due: number
  }
  error?: string
}

/**
 * POST /api/payments/record-balance
 * Record a balance payment (COD or manual payment) for an invoice
 * Only accessible by admin/sales/support users
 */
export async function POST(request: NextRequest): Promise<NextResponse<RecordBalanceResponse>> {
  try {
    // Verify authentication
    const authResult = await verifyRetailerOrAdmin(request)
    if ('headers' in authResult) {
      return authResult as NextResponse<RecordBalanceResponse>
    }
    const user = authResult

    // Parse request body
    const body: RecordBalanceBody = await request.json()
    const { invoice_id, amount, payment_method, notes } = body

    // Validate required fields
    if (!invoice_id) {
      return NextResponse.json(
        { success: false, error: 'Invoice ID is required' },
        { status: 400 }
      )
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid payment amount is required' },
        { status: 400 }
      )
    }

    if (!payment_method) {
      return NextResponse.json(
        { success: false, error: 'Payment method is required' },
        { status: 400 }
      )
    }

    // Initialize Supabase with service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verify user has admin/sales/support privileges
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 403 }
      )
    }

    const allowedRoles = ['SUPER_ADMIN', 'SALES', 'SUPPORT']
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Fetch the invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoice_id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Check if invoice can receive payment
    if (invoice.is_cancelled) {
      return NextResponse.json(
        { success: false, error: 'Cannot record payment for cancelled invoice' },
        { status: 400 }
      )
    }

    if (invoice.balance_due <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invoice is already fully paid' },
        { status: 400 }
      )
    }

    // Validate payment amount doesn't exceed balance due
    if (amount > invoice.balance_due) {
      return NextResponse.json(
        { success: false, error: `Payment amount exceeds balance due. Maximum: ${invoice.balance_due}` },
        { status: 400 }
      )
    }

    // Calculate new payment amounts
    const previousBalance = invoice.balance_due
    const newAdvancePaid = invoice.advance_paid + amount
    const newBalanceDue = invoice.grand_total - newAdvancePaid
    const isFullyPaid = newBalanceDue <= 0

    // Record the payment
    const { data: payment, error: paymentError } = await supabase
      .from('payment_verifications')
      .insert({
        invoice_id: invoice_id,
        amount: amount,
        payment_method: payment_method,
        payment_type: 'BALANCE',
        status: 'SUCCESS',
        notes: notes || null,
        verified_at: new Date().toISOString(),
        gateway_response: {
          recorded_by: user.id,
          recorded_at: new Date().toISOString(),
          manual_payment: true
        }
      })
      .select()
      .single()

    if (paymentError) {
      console.error('❌ Error recording payment:', paymentError)
      return NextResponse.json(
        { success: false, error: `Failed to record payment: ${paymentError.message}` },
        { status: 500 }
      )
    }

    // ============================================
    // DUAL-WRITE: Write to canonical payment ledger
    // ============================================
    const canonicalResult = await writePaymentToCanonicalLedger(supabase, {
      invoice_id: invoice_id,
      order_id: invoice.order_id || null,
      amount: amount,
      payment_method: payment_method as any,
      transaction_id: `MANUAL-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      razorpay_payment_id: null,
      razorpay_order_id: null,
      status: normalizePaymentStatus('SUCCESS'),
      payment_type: normalizePaymentType('BALANCE', amount, invoice.grand_total),
      recorded_by: user.id,
      metadata: { 
        source: 'payments_record_balance_route', 
        original_table: 'payment_verifications',
        payment_id: payment.id,
        notes: notes || null
      }
    })

    if (!canonicalResult.success) {
      console.warn('⚠️ Failed to write to canonical payment ledger (continuing anyway):', canonicalResult.error)
    }

    // Update invoice with new payment status
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        advance_paid: newAdvancePaid,
        balance_due: newBalanceDue > 0 ? newBalanceDue : 0,
        payment_status: isFullyPaid ? 'FULLY_PAID' : 'PARTIALLY_PAID',
        status: isFullyPaid ? 'PAID' : invoice.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoice_id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error updating invoice:', updateError)
      // Don't fail the whole request, but log the error
    }

    // Log audit entry
    await logBalancePaymentReceived(
      supabase,
      payment.id,
      invoice_id,
      amount,
      previousBalance,
      newBalanceDue > 0 ? newBalanceDue : 0,
      user.id,
      {
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        metadata: {
          payment_method,
          notes,
          previous_advance: invoice.advance_paid,
          new_advance: newAdvancePaid
        }
      }
    )

    console.log(`✅ Balance payment recorded: ${amount} for invoice ${invoice_id}`)

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        amount: amount,
        payment_method: payment_method,
        status: 'SUCCESS',
        created_at: payment.verified_at
      },
      invoice: {
        id: invoice_id,
        payment_status: isFullyPaid ? 'FULLY_PAID' : 'PARTIALLY_PAID',
        advance_paid: newAdvancePaid,
        balance_due: newBalanceDue > 0 ? newBalanceDue : 0
      }
    })

  } catch (error) {
    console.error('❌ Error in POST /api/payments/record-balance:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
