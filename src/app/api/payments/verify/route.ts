import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Payment Verification API
 * 
 * This endpoint checks if a payment has been completed
 * It simulates real payment gateway verification
 * 
 * In production, this would:
 * 1. Call payment gateway API (Razorpay/Cashfree/PayU)
 * 2. Verify transaction status
 * 3. Update database only if payment is confirmed
 */

interface PaymentRecord {
  id: string
  transaction_id: string
  status: 'SUCCESS' | 'PENDING' | 'FAILED'
  amount: number
  invoice_id: string
  created_at: string
  updated_at: string
}

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

export async function POST(request: NextRequest) {
  try {
    const { transactionId, invoiceId, amount } = await request.json()

    console.log('🔍 Verifying payment:', { transactionId, invoiceId, amount })

    // Get Supabase client (lazy initialization)
    const client = getSupabaseClient()

    // STEP 1: Check if payment record exists in database
    const { data: paymentRecord, error: fetchError } = await client
      .from('payment_verifications')
      .select('*')
      .eq('transaction_id', transactionId)
      .single() as { data: PaymentRecord | null, error: Error & { code?: string } | null }

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching payment:', fetchError)
      return NextResponse.json({ 
        success: false, 
        verified: false,
        message: 'Error checking payment status' 
      }, { status: 500 })
    }

    // STEP 2: If payment record exists and is verified
    if (paymentRecord && paymentRecord.status === 'SUCCESS') {
      console.log('✅ Payment verified from database:', paymentRecord)
      
      // Update invoice status to PAID
      const updatePayload = { 
        status: 'PAID',
        payment_method: 'UPI',
        payment_transaction_id: transactionId,
        paid_at: new Date().toISOString()
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (client as any)
        .from('invoices')
        .update(updatePayload)
        .eq('id', invoiceId)

      if (updateError) {
        console.error('Error updating invoice:', updateError)
      }

      return NextResponse.json({
        success: true,
        verified: true,
        status: 'SUCCESS',
        message: 'Payment verified successfully',
        paymentDetails: paymentRecord
      })
    }

    // STEP 3: Payment not yet verified - return pending status
    return NextResponse.json({
      success: true,
      verified: false,
      status: 'PENDING',
      message: 'Payment pending verification'
    })

  } catch (error) {
    console.error('Payment verification error:', error)
    return NextResponse.json({ 
      success: false, 
      verified: false,
      message: 'Payment verification failed' 
    }, { status: 500 })
  }
}




