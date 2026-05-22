import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { createClient } from '@supabase/supabase-js'
import { CreateOrderResponse } from '@/types/razorpay'

const isMockMode = process.env.RAZORPAY_MOCK_MODE === 'true'

// Lazy initialization of Razorpay - only create when actually needed
let razorpayInstance: Razorpay | null = null

function getRazorpay(): Razorpay | null {
  if (isMockMode) {
    return null
  }
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || '',
      key_secret: process.env.RAZORPAY_KEY_SECRET || ''
    })
  }
  return razorpayInstance
}

export async function POST(request: NextRequest): Promise<NextResponse<CreateOrderResponse>> {
  try {
    console.log('🔍 /api/payments/create-order headers:', Object.fromEntries(request.headers.entries()))
    const rawBody = await request.text()
    console.log('🔍 /api/payments/create-order rawBody:', rawBody)
    let body
    try {
      body = JSON.parse(rawBody)
    } catch (parseErr) {
      console.error('❌ Failed to parse JSON body:', parseErr)
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      )
    }
    console.log('🔍 /api/payments/create-order received body:', body)
    const { amount: parsedAmount, invoice_id, order_id, customer_name, customer_email, customer_phone, notes } = body

    const amount = Number(parsedAmount)
    console.log('🔍 Converted amount:', amount, 'typeof:', typeof amount, 'isNaN:', isNaN(amount), 'body.amount was:', body.amount)

    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid amount is required' },
        { status: 400 }
      )
    }

    const hasInvoiceId = !!invoice_id
    const hasOrderId = !!order_id

    if (!hasInvoiceId && !hasOrderId) {
      return NextResponse.json(
        { success: false, error: 'Either invoice_id or order_id is required' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (hasOrderId && supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })

      await supabase
        .from('orders')
        .update({
          payment_status: 'PENDING',
          updated_at: new Date().toISOString()
        })
        .eq('id', order_id)
    }

    if (isMockMode) {
      const mockOrderId = `mock_order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      const amountInPaise = Math.round(amount * 100)

      if (hasOrderId && supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })

        await supabase
          .from('orders')
          .update({
            razorpay_order_id: mockOrderId,
            updated_at: new Date().toISOString()
          })
          .eq('id', order_id)
      }

      return NextResponse.json({
        success: true,
        order_id: mockOrderId,
        amount: amountInPaise,
        currency: 'INR',
        key_id: 'mock_key',
        mock_mode: true
      })
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('Razorpay credentials not configured')
      return NextResponse.json(
        { success: false, error: 'Payment gateway not configured' },
        { status: 500 }
      )
    }

    const amountInPaise = Math.round(amount * 100)

    const shortId = (order_id || invoice_id || '').slice(-30)
    const receipt = hasOrderId ? `ord_${shortId}` : `inv_${shortId}`
    const orderOptions = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: receipt,
      notes: {
        ...(hasOrderId && { internal_order_id: order_id }),
        ...(hasInvoiceId && { invoice_id: invoice_id }),
        customer_name: customer_name || '',
        customer_email: customer_email || '',
        customer_phone: customer_phone || '',
        ...notes
      }
    }

    const razorpay = getRazorpay()
    const order = await razorpay!.orders.create(orderOptions)

    if (!order || !order.id) {
      return NextResponse.json(
        { success: false, error: 'Failed to create payment order' },
        { status: 500 }
      )
    }

    if (hasOrderId && supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })

      await supabase
        .from('orders')
        .update({
          razorpay_order_id: order.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', order_id)

      console.log('✅ Stored Razorpay order ID in database:', order.id)
    }

    console.log('✅ Razorpay order created:', {
      order_id: order.id,
      amount: order.amount,
      invoice_id: invoice_id || null,
      internal_order_id: order_id || null
    })

    return NextResponse.json({
      success: true,
      order_id: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID
    })

  } catch (error) {
    console.error('❌ Error creating Razorpay order:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error
    })

    const errorMessage = error instanceof Error ? error.message : 'Failed to create payment order'

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
