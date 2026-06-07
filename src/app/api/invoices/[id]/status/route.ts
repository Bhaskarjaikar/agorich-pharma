import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { generateInvoiceNumber } from '@/lib/invoice-sequence'
import {
  guardInvoiceTransition,
  logStatusTransition
} from '@/lib/status-engine'
import { createNotification } from '@/lib/notifications'
import { verifyAdmin } from '@/lib/api-security'
import { VALID_INVOICE_STATUSES } from '@/lib/constants'

const MAX_STATUS_LENGTH = 30
const MAX_NAME_LENGTH = 200

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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const errorId = generateErrorId()

  try {
    const authResult = await verifyAdmin(request)
    if ('headers' in authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const bodyResult = await readBodySafely(request)
    if (!bodyResult.success) {
      return NextResponse.json(
        { success: false, error: bodyResult.error },
        { status: bodyResult.status }
      )
    }

    let body: Record<string, unknown>
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

    const newStatusRaw = body.newStatus
    const normalizedStatus = sanitizeString(newStatusRaw, MAX_STATUS_LENGTH).toUpperCase()

    if (!normalizedStatus) {
      return NextResponse.json(
        { success: false, error: 'newStatus is required' },
        { status: 400 }
      )
    }

    if (!(VALID_INVOICE_STATUSES as readonly string[]).includes(normalizedStatus)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${VALID_INVOICE_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const params = await context.params
    const { id } = params

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    let supabase
    if (supabaseUrl && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    } else {
      supabase = await createServerClient()
    }

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

    const currentStatus = String(invoice.status || '')

    const transitionResult = guardInvoiceTransition(currentStatus, normalizedStatus)
    if (!transitionResult.valid) {
      return NextResponse.json(
        {
          success: false,
          error: transitionResult.error,
          from: transitionResult.from,
          to: transitionResult.to
        },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {
      status: normalizedStatus,
      status_updated_at: new Date().toISOString()
    }

    if (currentStatus === 'DRAFT' &&
        (normalizedStatus === 'SENT' || normalizedStatus === 'PACKING' || normalizedStatus === 'PAID') &&
        !invoice.invoice_number) {
      try {
        const result = await generateInvoiceNumber(supabase)
        updateData.invoice_number = result.invoiceNo
      } catch (err) {
        console.error(JSON.stringify({
          errorId,
          context: 'invoice_number_generation_failed',
          invoiceId: id,
          error: err instanceof Error ? err.message : 'Unknown'
        }))
        return NextResponse.json(
          { success: false, error: 'Failed to generate invoice number' },
          { status: 500 }
        )
      }
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
        context: 'invoice_status_update_failed',
        invoiceId: id,
        newStatus: normalizedStatus,
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
      toStatus: normalizedStatus,
      metadata: {
        source: 'api/invoices/[id]/status'
      }
    }).catch(err => {
      console.error(JSON.stringify({
        errorId,
        context: 'audit_log_failed',
        error: err instanceof Error ? err.message : 'Unknown'
      }))
    })

    const customerName = invoice.customer_data?.business_name || invoice.customer_data?.user_name || 'Unknown'
    const invoiceNo = invoice.invoice_number || invoice.order_id || id

    if (normalizedStatus === 'SENT') {
      await createNotification({
        supabase,
        type: 'INFO',
        category: 'INVOICE',
        title: 'Invoice Sent',
        message: `Invoice ${invoiceNo} sent to ${customerName} - ₹${Number(invoice.grand_total || 0).toLocaleString('en-IN')}`,
        link: `/admin/invoice-flow?search=${invoiceNo}`,
        createdForRole: 'SUPER_ADMIN',
        metadata: { invoice_id: id, order_id: invoice.order_id }
      }).catch(() => { })
    } else if (normalizedStatus === 'PAID') {
      await createNotification({
        supabase,
        type: 'SUCCESS',
        category: 'PAYMENT',
        title: 'Payment Received',
        message: `Payment received for invoice ${invoiceNo} from ${customerName} - ₹${Number(invoice.grand_total || 0).toLocaleString('en-IN')}`,
        link: `/admin/invoice-flow?search=${invoiceNo}`,
        createdForRole: 'SUPER_ADMIN',
        metadata: { invoice_id: id, order_id: invoice.order_id }
      }).catch(() => { })
    } else if (normalizedStatus === 'OVERDUE') {
      await createNotification({
        supabase,
        type: 'WARNING',
        category: 'PAYMENT',
        title: 'Invoice Overdue',
        message: `Invoice ${invoiceNo} from ${customerName} is overdue - ₹${Number(invoice.grand_total || 0).toLocaleString('en-IN')}`,
        link: `/admin/accounts-receivable`,
        createdForRole: 'SUPER_ADMIN',
        metadata: { invoice_id: id, order_id: invoice.order_id }
      }).catch(() => { })
    }

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      message: `Invoice status updated to ${normalizedStatus}`
    })

  } catch (error) {
    console.error(JSON.stringify({
      errorId,
      context: 'invoice_status_crash',
      message: error instanceof Error ? error.message : 'Unknown error'
    }))
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
