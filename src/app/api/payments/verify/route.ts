import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { VerifyPaymentResponse } from '@/types/razorpay'
import {
  writePaymentToCanonicalLedger,
  normalizePaymentStatus,
  normalizePaymentType
} from '@/lib/payment-ledger/ledger'
import { verifyAdmin } from '@/lib/api-security'

const isMockMode = process.env.RAZORPAY_MOCK_MODE === 'true'

let supabase: ReturnType<typeof createClient> | null = null

function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are not set')
    }
    supabase = createClient(supabaseUrl, supabaseServiceKey)
  }
  return supabase
}

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

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch {
    return false
  }
}

function generateErrorId(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function readBodySafely(
  request: NextRequest,
  maxSizeBytes: number = 10000
): Promise<{ success: true; body: string } | { success: false; error: string; status: number }> {
  const contentLength = request.headers.get('content-length')
  let parsedContentLength: number | null = null

  if (contentLength) {
    parsedContentLength = parseInt(contentLength, 10)
    if (isNaN(parsedContentLength) || parsedContentLength === 0) {
      return { success: false, error: 'Invalid Content-Length header', status: 400 }
    }
    if (parsedContentLength > maxSizeBytes) {
      return { success: false, error: `Request body too large (max ${maxSizeBytes} bytes)`, status: 413 }
    }
  }

  const reader = request.body?.getReader()
  if (!reader) {
    return { success: false, error: 'Request body is not available', status: 400 }
  }

  const decoder = new TextDecoder()
  let totalLength = 0
  const chunks: string[] = []
  let cancelled = false

  try {
    while (true) {
      let readResult: ReadableStreamReadResult<Uint8Array>
      try {
        readResult = await reader.read()
      } catch (readErr) {
        if (cancelled) {
          return { success: false, error: 'Request body too large', status: 413 }
        }
        return { success: false, error: 'Failed to read request body', status: 400 }
      }

      const { done, value } = readResult

      if (done) {
        if (parsedContentLength !== null && totalLength !== parsedContentLength) {
          return { success: false, error: 'Content-Length mismatch with actual body size', status: 400 }
        }
        break
      }

      if (!value) {
        return { success: false, error: 'Failed to read request body', status: 400 }
      }

      totalLength += value.byteLength

      if (totalLength > maxSizeBytes) {
        cancelled = true
        try {
          await reader.cancel()
        } catch {
        }
        return { success: false, error: 'Request body too large', status: 413 }
      }

      chunks.push(decoder.decode(value, { stream: true }))
    }

    chunks.push(decoder.decode())
    const body = chunks.join('')

    if (body.length > maxSizeBytes) {
      return { success: false, error: 'Request body too large', status: 413 }
    }

    return { success: true, body }
  } catch {
    return { success: false, error: 'Failed to read request body', status: 400 }
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<VerifyPaymentResponse>> {
  const errorId = generateErrorId()

  try {
    if (isMockMode) {
      const authResult = await verifyAdmin(request)
      if ('headers' in authResult) {
        return NextResponse.json(
          {
            success: false,
            verified: false,
            message: 'Unauthorized. Admin access required for mock payment verification.'
          },
          { status: 401 }
        )
      }
    }

    const bodyResult = await readBodySafely(request)
    if (!bodyResult.success) {
      return NextResponse.json(
        { success: false, verified: false, message: bodyResult.error },
        { status: bodyResult.status }
      )
    }

    let body: Record<string, unknown>
    try {
      body = JSON.parse(bodyResult.body)
    } catch {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          message: 'Invalid JSON body'
        },
        { status: 400 }
      )
    }

    const razorpay_payment_id = typeof body.razorpay_payment_id === 'string' ? body.razorpay_payment_id : ''
    const razorpay_order_id = typeof body.razorpay_order_id === 'string' ? body.razorpay_order_id : ''
    const razorpay_signature = typeof body.razorpay_signature === 'string' ? body.razorpay_signature : ''
    const invoice_id = typeof body.invoice_id === 'string' ? body.invoice_id : ''
    const amount = typeof body.amount === 'number' ? body.amount : 0

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

    if (isMockMode) {
      console.log(JSON.stringify({
        errorId,
        context: 'mock_payment_verification',
        invoiceId: invoice_id,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id
      }))
    } else {
      const secret = process.env.RAZORPAY_KEY_SECRET
      if (!secret) {
        console.error(JSON.stringify({
          errorId,
          context: 'razorpay_secret_not_configured'
        }))
        return NextResponse.json(
          {
            success: false,
            verified: false,
            message: 'Payment gateway not configured'
          },
          { status: 500 }
        )
      }

      const isValid = verifyRazorpaySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        secret
      )

      if (!isValid) {
        console.error(JSON.stringify({
          errorId,
          context: 'invalid_razorpay_signature',
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id
        }))
        return NextResponse.json(
          {
            success: false,
            verified: false,
            message: 'Payment verification failed: Invalid signature'
          },
          { status: 400 }
        )
      }
    }

    const client = getSupabaseClient()

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
      console.log(JSON.stringify({
        errorId,
        context: 'duplicate_payment_detected',
        paymentId: razorpay_payment_id
      }))
      return NextResponse.json({
        success: true,
        verified: true,
        message: 'Payment already verified',
        invoice_id,
        payment_id: razorpay_payment_id,
        status: 'SUCCESS'
      })
    }

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
      console.error(JSON.stringify({
        errorId,
        context: 'invoice_not_found',
        invoiceId: invoice_id
      }))
      return NextResponse.json(
        {
          success: false,
          verified: false,
          message: 'Invoice not found'
        },
        { status: 404 }
      )
    }

    const payableStatuses = ['DRAFT', 'SENT', 'DELIVERED', 'OVERDUE', 'PARTIALLY_PAID']
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

    const expectedAmount = Math.round(invoice.grand_total * 100)
    const actualAmount = Math.round(amount * 100)
    if (Math.abs(expectedAmount - actualAmount) > 1) {
      console.error(JSON.stringify({
        errorId,
        context: 'amount_mismatch',
        expected: expectedAmount,
        actual: actualAmount
      }))
      return NextResponse.json(
        {
          success: false,
          verified: false,
          message: 'Payment amount does not match invoice amount'
        },
        { status: 400 }
      )
    }

    const grandTotal = invoice.grand_total
    const isPartialPayment = amount < grandTotal
    const codAmount = isPartialPayment ? grandTotal - amount : 0

    const { error: paymentError } = await (client as any)
      .from('payment_verifications')
      .insert({
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
      console.error(JSON.stringify({
        errorId,
        context: 'payment_verification_record_failed',
        error: paymentError.message
      }))
    }

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
      console.warn(JSON.stringify({
        errorId,
        context: 'canonical_ledger_write_failed',
        error: canonicalResult.error
      }))
    }

    const newStatus = isPartialPayment ? 'PARTIALLY_PAID' : 'PAID'

    const updateData: Record<string, unknown> = {
      status: newStatus,
      status_updated_at: new Date().toISOString(),
      payment_method: 'RAZORPAY',
      payment_transaction_id: razorpay_payment_id,
      payment_amount: amount,
      paid_at: new Date().toISOString()
    }

    if (isPartialPayment) {
      updateData.partial_amount_paid = amount
      updateData.cod_amount_pending = codAmount
    }

    const { error: updateError } = await (client as any)
      .from('invoices')
      .update(updateData)
      .eq('id', invoice_id)

    if (updateError) {
      console.error(JSON.stringify({
        errorId,
        context: 'invoice_update_failed',
        invoiceId: invoice_id,
        error: updateError.message
      }))
      return NextResponse.json({
        success: true,
        verified: true,
        message: 'Payment verified but invoice update requires manual intervention.',
        invoice_id,
        payment_id: razorpay_payment_id,
        amount,
        is_partial_payment: isPartialPayment,
        cod_amount: codAmount,
        status: newStatus
      })
    }

    console.log(JSON.stringify({
      errorId,
      context: 'payment_verified_success',
      invoiceId: invoice_id,
      paymentId: razorpay_payment_id,
      amount,
      isPartialPayment,
      codAmount,
      status: newStatus
    }))

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
    console.error(JSON.stringify({
      errorId,
      context: 'payment_verification_crash',
      message: error instanceof Error ? error.message : 'Unknown error'
    }))
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
