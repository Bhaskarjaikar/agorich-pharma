import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { VerifyPaymentResponse } from '@/types/razorpay'
import {
  writePaymentToCanonicalLedger,
  normalizePaymentStatus,
  normalizePaymentType
} from '@/lib/payment-ledger'

const isMockMode = process.env.RAZORPAY_MOCK_MODE === 'true'

// Lazy initialization of Supabase client
let supabase: ReturnType<typeof createClient> | null = null

function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are not set')
    }
    supabase = createClient(supabaseUrl, supabaseServiceKey)
  }
  return supabase
}

/**
 * Verify Razorpay signature using HMAC-SHA256
 * Signature = HMAC-SHA256(order_id + "|" + payment_id, secret)
 */
function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  const body = `${orderId}|${paymentId}`
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch {
    return false
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<VerifyPaymentResponse>> {
  try {
    const body = await request.json()
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      invoice_id,
      amount
    } = body

    // Validate required fields
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !invoice_id) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          message: 'Missing required payment verification fields'
        },
        { status: 400 }
      )
    }

    // MOCK MODE: Skip signature verification and always accept mock payments
    if (isMockMode) {
      // Mock mode - signature verification skipped
    } else {
      // Check environment variables for real mode
      const secret = process.env.RAZORPAY_KEY_SECRET
      if (!secret) {
        console.error('RAZORPAY_KEY_SECRET not configured')
        return NextResponse.json(
          {
            success: false,
            verified: false,
            message: 'Payment gateway not configured'
          },
          { status: 500 }
        )
      }

      // Verify signature
      const isValid = verifyRazorpaySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        secret
      )

      if (!isValid) {
        console.error('Invalid Razorpay signature:', {
          order_id: razorpay_order_id,
          payment_id: razorpay_payment_id
        })
        return NextResponse.json(
          {
            success: false,
            verified: false,
            message: 'Payment verification failed: Invalid signature'
          },
          { status: 400 }
        )
      }

      console.log('✅ Signature verified successfully')
    }

    // Get Supabase client
    const client = getSupabaseClient()

    // Check for duplicate payment (idempotency)
    interface PaymentVerification {
      status: string
    }
    
    const { data: existingPayment } = await client
      .from('payment_verifications')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('razorpay_payment_id', razorpay_payment_id)
      .single<PaymentVerification>()

    if (existingPayment && existingPayment.status === 'SUCCESS') {
      console.log('⚠️ Duplicate payment detected, already processed:', razorpay_payment_id)
      return NextResponse.json({
        success: true,
        verified: true,
        message: 'Payment already verified',
        invoice_id,
        payment_id: razorpay_payment_id,
        status: 'SUCCESS'
      })
    }

    // Get invoice details to verify amount
    interface InvoiceData {
      id: string
      status: string
      grand_total: number
    }
    
    const { data: invoice, error: invoiceError } = await client
      .from('invoices')
      .select('*')
      .eq('id', invoice_id)
      .single<InvoiceData>()

    if (invoiceError || !invoice) {
      console.error('❌ Invoice not found:', invoice_id)
      return NextResponse.json(
        {
          success: false,
          verified: false,
          message: 'Invoice not found'
        },
        { status: 404 }
      )
    }

    // Verify invoice can be paid (must be DRAFT, SENT, DELIVERED, or OVERDUE)
    const payableStatuses = ['DRAFT', 'SENT', 'DELIVERED', 'OVERDUE']
    if (!payableStatuses.includes(invoice.status)) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          message: `Cannot record payment for invoice with status ${invoice.status}`
        },
        { status: 400 }
      )
    }

    // Verify amount matches (with small tolerance for floating point)
    const expectedAmount = Math.round(invoice.grand_total * 100) // Convert to paise
    const actualAmount = Math.round(amount * 100)
    if (Math.abs(expectedAmount - actualAmount) > 1) {
      console.error('❌ Amount mismatch:', { expected: expectedAmount, actual: actualAmount })
      return NextResponse.json(
        {
          success: false,
          verified: false,
          message: 'Payment amount does not match invoice amount'
        },
        { status: 400 }
      )
    }

    // Determine if this is partial payment or full payment
    const grandTotal = invoice.grand_total
    const isPartialPayment = amount < grandTotal
    const codAmount = isPartialPayment ? grandTotal - amount : 0

    // Record payment verification
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: paymentError } = await (client as any).from('payment_verifications').insert({
      transaction_id: razorpay_payment_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      invoice_id,
      amount: amount,
      status: 'SUCCESS',
      payment_method: 'RAZORPAY',
      gateway_response: body,
      verified_at: new Date().toISOString()
    })

    if (paymentError) {
      console.error('Error recording payment verification:', paymentError)
      // Continue to update invoice even if recording fails
    }

    // ============================================
    // DUAL-WRITE: Write to canonical payment ledger
    // ============================================
    const canonicalResult = await writePaymentToCanonicalLedger(client, {
      invoice_id: invoice_id,
      order_id: null,
      amount: amount,
      payment_method: 'RAZORPAY',
      transaction_id: razorpay_payment_id,
      razorpay_payment_id: razorpay_payment_id,
      razorpay_order_id: razorpay_order_id,
      status: normalizePaymentStatus('SUCCESS'),
      payment_type: normalizePaymentType(isPartialPayment ? 'PARTIAL' : 'FULL', amount, invoice.grand_total),
      recorded_by: null,
      metadata: { source: 'payments_verify_route', original_table: 'payment_verifications' }
    })

    if (!canonicalResult.success) {
      console.warn('⚠️ Failed to write to canonical payment ledger (continuing anyway):', canonicalResult.error)
    }

    // Set appropriate status based on payment type
    const newStatus = isPartialPayment ? 'PARTIALLY_PAID' : 'PAID'

    console.log(`💰 Payment type: ${isPartialPayment ? 'PARTIAL' : 'FULL'}`, {
      amount,
      grandTotal,
      codAmount,
      newStatus
    })

    // Update invoice with payment details - build update object dynamically
    const updateData: any = {
      status: newStatus,
      status_updated_at: new Date().toISOString()
    }
    
    // Add optional columns only if they might exist
    try {
      updateData.payment_method = 'RAZORPAY'
      updateData.payment_transaction_id = razorpay_payment_id
      updateData.payment_amount = amount
      updateData.partial_amount_paid = amount
      updateData.cod_amount_pending = codAmount
      updateData.paid_at = new Date().toISOString()
    } catch (e) {
      console.warn('Optional columns not available, skipping')
    }

    // Update invoice with payment details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (client as any)
      .from('invoices')
      .update(updateData)
      .eq('id', invoice_id)

    if (updateError) {
      console.error('❌ Error updating invoice:', updateError)
      // Even if invoice update fails, still return success because payment is verified
      return NextResponse.json({
        success: true,
        verified: true,
        message: 'Payment verified successfully! Invoice update may require manual intervention.',
        invoice_id,
        payment_id: razorpay_payment_id,
        amount,
        is_partial_payment: isPartialPayment,
        cod_amount: codAmount,
        status: newStatus
      })
    }

    console.log('✅ Payment verified and invoice updated:', {
      invoice_id,
      payment_id: razorpay_payment_id,
      amount,
      isPartialPayment,
      codAmount,
      status: newStatus
    })

    return NextResponse.json({
      success: true,
      verified: true,
      message: isPartialPayment 
        ? `Partial payment of ₹${amount} received. COD amount: ₹${codAmount}` 
        : 'Payment verified successfully',
      invoice_id,
      payment_id: razorpay_payment_id,
      amount,
      is_partial_payment: isPartialPayment,
      cod_amount: codAmount,
      status: newStatus
    })

  } catch (error) {
    console.error('❌ Payment verification error:', error)
    return NextResponse.json(
      {
        success: false,
        verified: false,
        message: 'Payment verification failed'
      },
      { status: 500 }
    )
  }
}




