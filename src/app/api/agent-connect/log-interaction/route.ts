import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkEmergencyStatus, createEmergencyBlockResponse } from '@/lib/middleware/emergency-check'
import { timingSafeEqual } from 'crypto'

function secureCompare(a: string | null | undefined, b: string | undefined): boolean {
  if (!a || !b) return false
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}

interface LogInteractionRequest {
  interaction_type: string
  customer_id?: string
  customer_name?: string
  customer_phone?: string
  transcript?: string
  sentiment?: string
  promised_payment_date?: string
  metadata?: any
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const emergencyCheck = await checkEmergencyStatus('/api/agent-connect/log-interaction')
    if (!emergencyCheck.allowed) {
      return createEmergencyBlockResponse(emergencyCheck)
    }

    const apiKey = request.headers.get('x-agent-api-key')
    if (!secureCompare(apiKey, process.env.AGENT_API_KEY)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid API key' },
        { status: 401 }
      )
    }

    const body: LogInteractionRequest = await request.json()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

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

    const { data, error } = await supabase
      .from('ai_interaction_logs')
      .insert({
        interaction_type: body.interaction_type,
        customer_id: body.customer_id,
        customer_name: body.customer_name,
        customer_phone: body.customer_phone,
        transcript: body.transcript,
        sentiment: body.sentiment,
        promised_payment_date: body.promised_payment_date,
        metadata: body.metadata || {}
      })
      .select()
      .single()

    if (error) {
      console.error('Error logging interaction:', error)
      return NextResponse.json(
        { success: false, error: `Failed to log interaction: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    console.error('Error in POST /api/agent-connect/log-interaction:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
