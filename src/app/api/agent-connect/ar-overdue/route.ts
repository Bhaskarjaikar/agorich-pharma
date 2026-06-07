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

interface OverdueCustomer {
  customer_id: string
  business_name: string
  name: string
  phone: string
  overdue_amount: number
  overdue_invoices_count: number
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const emergencyCheck = await checkEmergencyStatus('/api/agent-connect/ar-overdue')
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

    const today = new Date()

    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        id,
        customer_id,
        balance_due,
        due_date,
        profiles:customer_id (
          user_name,
          business_name,
          phone
        )
      `)
      .eq('is_cancelled', false)
      .gt('balance_due', 0)
      .lt('due_date', today.toISOString())
      .in('payment_status', ['PENDING', 'PARTIALLY_PAID'])

    if (invoicesError) {
      console.error('Error fetching overdue AR:', invoicesError)
      return NextResponse.json(
        { success: false, error: `Failed to fetch data: ${invoicesError.message}` },
        { status: 500 }
      )
    }

    const customerMap = new Map<string, OverdueCustomer>()
    ;(invoices || []).forEach((invoice: any) => {
      const profile = Array.isArray(invoice.profiles) ? invoice.profiles[0] : invoice.profiles
      const customerId = invoice.customer_id

      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          customer_id: customerId,
          business_name: profile?.business_name || profile?.user_name || 'Unknown',
          name: profile?.user_name || 'Unknown',
          phone: profile?.phone || '',
          overdue_amount: 0,
          overdue_invoices_count: 0
        })
      }

      const customer = customerMap.get(customerId)!
      customer.overdue_amount += invoice.balance_due
      customer.overdue_invoices_count += 1
    })

    const overdueCustomers = Array.from(customerMap.values()).filter(
      (c) => c.overdue_amount > 0
    )

    return NextResponse.json({
      success: true,
      data: overdueCustomers
    })

  } catch (error) {
    console.error('Error in GET /api/agent-connect/ar-overdue:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
