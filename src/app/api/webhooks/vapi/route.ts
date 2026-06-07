import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const webhookSecret = request.headers.get('x-vapi-webhook-secret')
    const expectedSecret = process.env.VAPI_WEBHOOK_SECRET

    if (expectedSecret && expectedSecret.length > 0) {
      if (!webhookSecret || webhookSecret !== expectedSecret) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Invalid webhook secret' },
          { status: 401 }
        )
      }
    } else {
      console.warn(JSON.stringify({
        context: 'vapi_webhook_secret_not_configured',
        warning: 'Webhook endpoint is open because VAPI_WEBHOOK_SECRET is not set'
      }))
    }

    const body = await request.json()

    if (body.type !== 'call.ended') {
      return NextResponse.json({ success: true, message: 'Ignoring non-call-ended event' })
    }

    const call = body.call
    const transcript = call.transcript || ''
    const customerPhone = call.customer?.number || ''
    const customerName = call.customer?.name || ''

    let sentiment = 'neutral'
    let promisedPaymentDate: string | null = null

    if (transcript && process.env.OPENAI_API_KEY) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a helpful AI that extracts information from call transcripts.
              
              Extract these two things:
              1. sentiment: one of "positive", "angry", or "neutral"
              2. promised_payment_date: if the customer promised a payment date, return it in YYYY-MM-DD format. If no date promised, return null.
              
              Respond ONLY with JSON in this exact format: {"sentiment": "value", "promised_payment_date": "YYYY-MM-DD or null"}`
            },
            {
              role: 'user',
              content: transcript
            }
          ],
          response_format: { type: 'json_object' }
        })

        const result = JSON.parse(completion.choices[0].message.content || '{}')
        sentiment = result.sentiment || 'neutral'
        promisedPaymentDate = result.promised_payment_date
      } catch (aiError) {
        console.error('OpenAI extraction error:', aiError)
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    const agentApiKey = process.env.AGENT_API_KEY

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

    const { data: log, error: logError } = await supabase
      .from('ai_interaction_logs')
      .insert({
        interaction_type: 'vapi_call',
        customer_name: customerName,
        customer_phone: customerPhone,
        transcript: transcript,
        sentiment: sentiment,
        promised_payment_date: promisedPaymentDate,
        metadata: {
          call_id: call.id,
          duration: call.durationSeconds,
          status: call.status
        }
      })
      .select()
      .single()

    if (logError) {
      console.error('Error logging Vapi interaction:', logError)
      return NextResponse.json(
        { success: false, error: `Failed to log interaction: ${logError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: log
    })

  } catch (error) {
    console.error('Error in Vapi webhook:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
