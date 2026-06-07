import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyLogisticOrAdmin } from '@/lib/api-security'
import { createClient } from '@supabase/supabase-js'
import {
  guardInvoiceTransition,
  logStatusTransition
} from '@/lib/status-engine'

const MAX_AUTHORIZED_NAME_LENGTH = 200
const MAX_PAYMENT_MODE_LENGTH = 50
const MAX_AMOUNT = 100000000

function sanitizeString(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') return ''
  const trimmed = input.trim()
  if (trimmed.length === 0) return ''
  return trimmed.slice(0, maxLength).replace(/[<>\"\'`;\\]/g, '')
}

function generateErrorId(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function readBodySafely(
  request: NextRequest,
  maxSizeBytes: number = 5000
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

interface DeliveryConfirmBody {
  payment_amount_received: number
  payment_mode: string
  remaining_balance: number
  authorized_person_name: string
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const errorId = generateErrorId()

  try {
    const authResult = await verifyLogisticOrAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }

    const bodyResult = await readBodySafely(request)
    if (!bodyResult.success) {
      return NextResponse.json(
        { success: false, error: bodyResult.error },
        { status: bodyResult.status }
      )
    }

    let body: DeliveryConfirmBody
    try {
      body = JSON.parse(bodyResult.body)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Request body must be a JSON object' },
        { status: 400 }
      )
    }

    const payment_mode = sanitizeString(body.payment_mode, MAX_PAYMENT_MODE_LENGTH)
    const authorized_person_name = sanitizeString(body.authorized_person_name, MAX_AUTHORIZED_NAME_LENGTH)

    const payment_amount_received = Number(body.payment_amount_received)
    const remaining_balance = Number(body.remaining_balance)

    if (!Number.isFinite(payment_amount_received) || payment_amount_received < 0) {
      return NextResponse.json(
        { success: false, error: 'Valid payment amount is required (must be >= 0)' },
        { status: 400 }
      )
    }

    if (!Number.isFinite(remaining_balance) || remaining_balance < 0) {
      return NextResponse.json(
        { success: false, error: 'Remaining balance is required (must be >= 0)' },
        { status: 400 }
      )
    }

    if (payment_amount_received > MAX_AMOUNT || remaining_balance > MAX_AMOUNT) {
      return NextResponse.json(
        { success: false, error: 'Amount exceeds maximum allowed' },
        { status: 400 }
      )
    }

    if (!payment_mode) {
      return NextResponse.json(
        { success: false, error: 'Payment mode is required' },
        { status: 400 }
      )
    }

    if (!authorized_person_name) {
      return NextResponse.json(
        { success: false, error: 'Authorized person name is required' },
        { status: 400 }
      )
    }

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
    } else {
      supabase = await createServerClient()
    }

    const params = await context.params
    const { id } = params

    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      )
    }

    const totalAmount = Number(invoice.grand_total || 0)
    const receivedAmount = Number(payment_amount_received)
    const remaining = Number(remaining_balance)

    const currentStatus = String(invoice.status || '')
    const targetStatus = remaining <= 0 ? 'PAID' : 'DELIVERED'

    const transitionResult = guardInvoiceTransition(currentStatus, targetStatus)
    if (!transitionResult.valid) {
      return NextResponse.json(
        { success: false, error: transitionResult.error, from: transitionResult.from, to: transitionResult.to },
        { status: 400 }
      )
    }

    if (Math.abs(receivedAmount + remaining - totalAmount) > 0.01) {
      return NextResponse.json(
        { success: false, error: `Payment amounts don't match. Total: ₹${totalAmount}, Received: ₹${receivedAmount}, Remaining: ₹${remaining}` },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {
      status: targetStatus,
      delivery_confirmed_at: new Date().toISOString(),
      status_updated_at: new Date().toISOString(),
      authorized_person_name: authorized_person_name,
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
      console.error(JSON.stringify({
        errorId,
        context: 'delivery_confirm_update_failed',
        invoiceId: id,
        error: updateError.message
      }))
      return NextResponse.json(
        { success: false, error: 'Failed to update invoice status' },
        { status: 500 }
      )
    }

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
    }).catch(() => { })

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      message: remaining > 0
        ? `Delivery confirmed. Payment received: ₹${receivedAmount}. Remaining balance: ₹${remaining}`
        : 'Delivery confirmed and payment received in full.'
    })

  } catch (error) {
    console.error(JSON.stringify({
      errorId,
      context: 'delivery_confirm_crash',
      message: error instanceof Error ? error.message : 'Unknown error'
    }))
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
