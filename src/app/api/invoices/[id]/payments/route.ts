import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyRetailerOrAdmin } from '@/lib/api-security'
import {
  writePaymentToCanonicalLedger,
  normalizePaymentStatus,
  normalizePaymentType
} from '@/lib/payment-ledger/ledger'

interface InvoicePaymentAggRow {
  amount: number | string | null
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const authResult = await verifyRetailerOrAdmin(request)
    if ('headers' in authResult) return authResult

    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('invoice_payments')
      .select('*')
      .eq('invoice_id', params.id)
      .order('received_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ payments: data || [] })
  } catch (error: unknown) {
    console.error('Error loading invoice payments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const authResult = await verifyRetailerOrAdmin(request)
    if ('headers' in authResult) return authResult
    const user = authResult

    const supabase = await createServerClient()
    const invoiceId = params.id
    const body = await request.json()
    const { amount, method = 'CASH', reference_no, note } = body || {}

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 })
    }

    // Ensure invoice exists
    const { data: inv, error: invErr } = await supabase
      .from('invoices')
      .select('id, grand_total, status, order_id')
      .eq('id', invoiceId)
      .single()
    if (invErr || !inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

    // Insert payment
    const { error: payErr } = await supabase.from('invoice_payments').insert({
      invoice_id: invoiceId,
      amount: Number(amount),
      method,
      reference_no,
      note,
      received_by: user!.id,
    })
    if (payErr) return NextResponse.json({ error: payErr.message }, { status: 400 })

    // ============================================
    // DUAL-WRITE: Write to canonical payment ledger
    // ============================================
    const canonicalResult = await writePaymentToCanonicalLedger(supabase, {
      invoice_id: invoiceId,
      order_id: inv.order_id || null,
      amount: Number(amount),
      payment_method: method,
      transaction_id: `INVPAY-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      razorpay_payment_id: null,
      razorpay_order_id: null,
      status: normalizePaymentStatus('SUCCESS'),
      payment_type: normalizePaymentType('PARTIAL', Number(amount), Number(inv.grand_total || 0)),
      recorded_by: user!.id,
      metadata: { 
        source: 'invoices_id_payments_route', 
        original_table: 'invoice_payments',
        reference_no: reference_no || null,
        note: note || null
      }
    })

    if (!canonicalResult.success) {
      console.warn('⚠️ Failed to write to canonical payment ledger (continuing anyway):', canonicalResult.error)
    }

    // Compute totals
    let paidAmount = 0
    const { data: paymentsAgg, error: aggErr } = await supabase
      .from('invoice_payments')
      .select('invoice_id, amount')
      .eq('invoice_id', invoiceId)
    if (!aggErr && paymentsAgg) {
      const rows = paymentsAgg as InvoicePaymentAggRow[]
      paidAmount = rows.reduce((s: number, p) => s + Number(p.amount ?? 0), 0)
    }
    const balanceDue = Math.max(0, Number(inv.grand_total || 0) - paidAmount)

    // Auto status update
    if (balanceDue <= 0 && inv.status !== 'PAID') {
      await supabase
        .from('invoices')
        .update({ status: 'PAID', status_updated_at: new Date().toISOString() })
        .eq('id', invoiceId)
    } else if (paidAmount > 0 && (inv.status === 'DRAFT' || inv.status === 'SENT')) {
      await supabase
        .from('invoices')
        .update({ status: 'DELIVERED', status_updated_at: new Date().toISOString() })
        .eq('id', invoiceId)
    }

    return NextResponse.json({
      success: true,
      paid_amount: paidAmount,
      balance_due: balanceDue,
    })
  } catch (error: unknown) {
    console.error('Error recording invoice payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

