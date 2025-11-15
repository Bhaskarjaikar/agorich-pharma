import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

export async function POST(request: NextRequest) {
  try {
    const { transactionId, invoiceId, amount } = await request.json()

    console.log('🔍 Verifying payment:', { transactionId, invoiceId, amount })

    // STEP 1: Check if payment record exists in database
    const { data: paymentRecord, error: fetchError } = await supabase
      .from('payment_verifications')
      .select('*')
      .eq('transaction_id', transactionId)
      .single()

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
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ 
          status: 'PAID',
          payment_method: 'UPI',
          payment_transaction_id: transactionId,
          paid_at: new Date().toISOString()
        })
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




