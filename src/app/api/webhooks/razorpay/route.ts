import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { generateInvoiceNumber } from '@/lib/invoice-sequence'
import { determineGSTType, getPlaceOfSupply } from '@/lib/gst-utils'
import { logInvoiceGenerated } from '@/lib/audit-logger'

const isMockMode = process.env.RAZORPAY_MOCK_MODE === 'true'
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET

interface OrderRow {
  id: string
  order_id: string
  draft_number: string
  customer_id: string
  user_id: string
  items: any[]
  grand_total: number
  order_status: string
  razorpay_order_id: string | null
  notes: string | null
}

interface InvoiceRow {
  id: string
  invoice_no: string | null
  order_id: string | null
  status: string
  grand_total: number | null
  payment_status: string | null
}

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

function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!webhookSecret) {
    console.error('⚠️ RAZORPAY_WEBHOOK_SECRET not configured - skipping signature verification')
    return false
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
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

async function generateInvoiceFromOrder(
  client: any,
  order: OrderRow,
  paymentId: string,
  paymentMethod: string
): Promise<{ success: boolean; invoice?: any; error?: string }> {
  try {
    const { data: customer, error: customerError } = await client
      .from('profiles')
      .select('id, user_name, business_name, gst_number, state, address, city, pincode, phone')
      .eq('id', order.customer_id)
      .single()

    if (customerError || !customer) {
      return { success: false, error: 'Customer not found' }
    }

    const gstType = determineGSTType(customer.gst_number)
    const placeOfSupply = getPlaceOfSupply(customer.state || 'Bihar')

    let invoiceNo: string
    try {
      const result = await generateInvoiceNumber(client)
      invoiceNo = result.invoiceNo
      console.log(`✅ Generated invoice number: ${invoiceNo}`)
    } catch (err) {
      return { success: false, error: 'Failed to generate invoice number' }
    }

    const isIntraState = placeOfSupply.toLowerCase() === 'bihar'
    let sgstAmount = 0
    let cgstAmount = 0
    let igstAmount = 0
    let totalGST = 0
    let subtotal = 0

    order.items.forEach((item: any) => {
      subtotal += item.amount_before_tax || 0
      totalGST += item.gst_amount || 0
      if (isIntraState) {
        sgstAmount += (item.gst_amount || 0) / 2
        cgstAmount += (item.gst_amount || 0) / 2
      } else {
        igstAmount += item.gst_amount || 0
      }
    })

    const today = new Date().toISOString().split('T')[0]
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: invoice, error: invoiceError } = await client
      .from('invoices')
      .insert({
        invoice_number: invoiceNo,
        order_id: order.id,
        customer_id: order.customer_id,
        user_id: order.user_id,
        invoice_date: today,
        due_date: dueDate,
        status: 'PAID',
        payment_amount: order.grand_total,
        grand_total: order.grand_total,
        subtotal: parseFloat(subtotal.toFixed(2)),
        total_gst: parseFloat(totalGST.toFixed(2)),
        payment_method: paymentMethod?.toUpperCase() || 'RAZORPAY',
        payment_transaction_id: paymentId,
        paid_at: new Date().toISOString(),
        notes: order.notes || null
      })
      .select()
      .single()

    if (invoiceError) {
      return { success: false, error: `Failed to create invoice: ${invoiceError.message}` }
    }

    const invoiceItems = order.items.map((item: any) => ({
      invoice_id: invoice.id,
      product_id: item.product_id || null,
      product_name: item.product_name,
      hsn_code: item.hsn_code || '3004',
      quantity: item.quantity,
      unit: item.unit,
      rate_per_unit: item.rate_per_unit,
      gst_percentage: item.gst_percentage || 5,
      amount_before_tax: item.amount_before_tax,
      gst_amount: item.gst_amount,
      total_with_tax: item.total_with_tax,
      pack_size: item.pack_size || null,
      batch_number: item.batch_number || null,
      expiry_date: item.expiry_date || null,
      mfg_date: item.mfg_date || null,
      mrp: item.mrp || null,
      manufacturer: item.manufacturer || null
    }))

    const { error: itemsError } = await client
      .from('invoice_items')
      .insert(invoiceItems)

    if (itemsError) {
      console.error('⚠️ Error creating invoice items:', itemsError)
    }

    await client
      .from('orders')
      .update({
        order_status: 'CONFIRMED',
        invoice_id: invoice.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)

    try {
      await logInvoiceGenerated(
        client,
        invoice.id,
        {
          invoice_no: invoiceNo,
          order_id: order.id,
          customer_id: order.customer_id,
          grand_total: order.grand_total,
          advance_paid: order.grand_total,
          balance_due: 0,
          gst_type: gstType,
          place_of_supply: placeOfSupply
        },
        order.user_id,
        {
          metadata: {
            razorpay_payment_id: paymentId,
            razorpay_order_id: order.razorpay_order_id,
            webhook: true
          }
        }
      )
    } catch (auditError) {
      console.warn('⚠️ Audit logging failed:', auditError)
    }

    console.log(`🎉 Invoice generated via webhook: ${invoiceNo} for order ${order.id}`)
    return { success: true, invoice }

  } catch (error) {
    console.error('❌ Error generating invoice:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function handlePaymentCaptured(client: any, payload: any) {
  const paymentData = payload.payload?.payment?.entity
  if (!paymentData) {
    console.error('❌ No payment entity in webhook payload:', JSON.stringify(payload, null, 2))
    return { success: false, error: 'Invalid payload structure' }
  }
  
  const { id: paymentId, order_id: razorpayOrderId, amount, method } = paymentData
  const amountInRupees = amount / 100

  console.log('💰 Payment captured:', { paymentId, razorpayOrderId, amount, method })

  if (!razorpayOrderId) {
    console.error('❌ No razorpay_order_id in payment data')
    return { success: false, error: 'No order ID in payment' }
  }

  const { data: order, error: orderError } = await client
    .from('orders')
    .select('id, order_status, invoice_id, grand_total')
    .eq('razorpay_order_id', razorpayOrderId)
    .single()

  if (orderError || !order) {
    console.log('⚠️ No order found for razorpay_order_id:', razorpayOrderId)
    return { success: false, error: 'Order not found' }
  }

  console.log('✅ Found order:', order.id, 'invoice_id:', order.invoice_id, 'for payment:', paymentId)

  // Update the invoice if it exists (which it should, since we created it in /api/orders/create)
  if (order.invoice_id) {
    await client
      .from('invoices')
      .update({
        status: 'PAID',
        payment_amount: amountInRupees,
        payment_method: method || 'RAZORPAY',
        payment_transaction_id: paymentId,
        paid_at: new Date().toISOString()
      })
      .eq('id', order.invoice_id)

    // Update order status
    await client
      .from('orders')
      .update({
        order_status: 'CONFIRMED',
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)

    console.log('✅ Invoice updated to PAID:', order.invoice_id)
    return { success: true, message: 'Invoice updated to PAID', invoice_id: order.invoice_id }
  } else {
    // If no invoice exists, create it (fallback)
    console.log('⚠️ No invoice found, generating one now...')
    const fullOrder = await client.from('orders').select('*').eq('id', order.id).single()
    const result = await generateInvoiceFromOrder(client, fullOrder.data, paymentId, method || 'RAZORPAY')
    return result
  }
}

async function handlePaymentFailed(client: any, payload: any) {
  const paymentData = payload.payload?.payment?.entity
  if (!paymentData) {
    console.error('❌ No payment entity in webhook payload:', JSON.stringify(payload, null, 2))
    return { success: false, error: 'Invalid payload structure' }
  }
  
  const { id: paymentId, order_id: razorpayOrderId, error_code, error_description } = paymentData

  console.log('❌ Payment failed:', { paymentId, razorpayOrderId, error_code, error_description })

  if (!razorpayOrderId) {
    return { success: false, error: 'No order ID in payment' }
  }

  const { data: order, error: orderError } = await client
    .from('orders')
    .select('id, order_status, invoice_id')
    .eq('razorpay_order_id', razorpayOrderId)
    .single()

  if (orderError || !order) {
    console.log('⚠️ No order found for razorpay_order_id:', razorpayOrderId)
    return { success: false, error: 'Order not found' }
  }

  await client
    .from('orders')
    .update({
      order_status: 'PAYMENT_FAILED',
      updated_at: new Date().toISOString()
    })
    .eq('id', order.id)

  if (order.invoice_id) {
    await client
      .from('invoices')
      .update({
        status: 'DRAFT',
        payment_error_code: error_code,
        payment_error_message: error_description
      })
      .eq('id', order.invoice_id)
  }

  console.log('✅ Order marked as PAYMENT_FAILED:', order.id)
  return { success: true, order_id: order.id }
}

async function handleRefundEvent(
  client: any,
  payload: any,
  eventType: 'refund.created' | 'refund.processed' | 'refund.failed'
) {
  const refundData = payload.payload?.refund?.entity
  if (!refundData) {
    console.error('❌ No refund entity in webhook payload:', JSON.stringify(payload, null, 2))
    return { success: false, error: 'Invalid payload structure' }
  }
  const { id: refundId, payment_id: paymentId, amount, status, speed_processed } = refundData

  console.log(`💸 Refund event ${eventType}:`, { refundId, paymentId, amount, status })

  const { data: invoice, error: invoiceError } = await client
    .from('invoices')
    .select('id, status, grand_total')
    .eq('payment_transaction_id', paymentId)
    .single()

  if (invoiceError || !invoice) {
    console.log('⚠️ No invoice found for payment:', paymentId)
    return { success: false, error: 'Invoice not found' }
  }

  const amountInRupees = amount / 100
  const updateData: any = {
    refund_id: refundId,
    refund_amount: amountInRupees,
    refund_status: status?.toUpperCase() || eventType.replace('refund.', '').toUpperCase(),
    refund_initiated_at: new Date().toISOString()
  }

  if (eventType === 'refund.processed') {
    updateData.refund_processed_at = new Date().toISOString()
    updateData.refund_speed = speed_processed
    updateData.status = 'REFUNDED'
  } else if (eventType === 'refund.failed') {
    updateData.refund_failed_at = new Date().toISOString()
  }

  await client
    .from('invoices')
    .update(updateData)
    .eq('id', invoice.id)

  console.log(`✅ Invoice ${invoice.id} updated for refund event: ${eventType}`)
  return { success: true, invoice_id: invoice.id }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization')
  const expectedToken = process.env.PAYMENT_LOGS_API_KEY

  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    message: 'Razorpay Payment Webhook is running',
    mode: isMockMode ? 'MOCK' : 'LIVE',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-razorpay-signature') || ''
    const event = request.headers.get('x-razorpay-event') || ''

    if (isMockMode) {
      // Mock mode - webhook signature verification skipped
    } else {
      if (!verifyWebhookSignature(rawBody, signature)) {
        console.error('Invalid webhook signature')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 400 }
        )
      }
    }

    let payload: any
    try {
      payload = JSON.parse(rawBody)
    } catch (parseError) {
      console.error('Failed to parse webhook payload:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    const client = getSupabaseClient()
    let result: any = { success: true }

    switch (event) {
      case 'payment.captured':
        result = await handlePaymentCaptured(client, payload)
        break
      case 'payment.failed':
        result = await handlePaymentFailed(client, payload)
        break
      case 'refund.created':
        result = await handleRefundEvent(client, payload, 'refund.created')
        break
      case 'refund.processed':
        result = await handleRefundEvent(client, payload, 'refund.processed')
        break
      case 'refund.failed':
        result = await handleRefundEvent(client, payload, 'refund.failed')
        break
      case 'order.failed':
        result = await handlePaymentFailed(client, payload)
        break
      case 'payment.authorized':
        result = await handlePaymentCaptured(client, payload)
        break
      default:
        result = { success: true, message: 'Event ignored' }
    }

    const processingTime = Date.now() - startTime
    console.log(`✅ Webhook processed in ${processingTime}ms:`, result)
    console.log(`${'='.repeat(60)}\n`)

    return NextResponse.json({
      success: result.success,
      event,
      processing_time_ms: processingTime,
      ...result
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`❌ Webhook processing error:`, error)
    console.log(`${'='.repeat(60)}\n`)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: errorMessage
      },
      { status: 500 }
    )
  }
}
