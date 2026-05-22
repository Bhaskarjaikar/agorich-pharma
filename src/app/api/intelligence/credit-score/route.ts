import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (userId) {
      const { data: history, error } = await supabase
        .from('credit_score_history')
        .select('*, user:profiles(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return NextResponse.json({
        success: true,
        data: history,
        message: 'Credit score history retrieved successfully'
      })
    }

    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, user_name, credit_score, credit_limit, role')
      .in('role', ['DISTRIBUTOR', 'RETAILER'])

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: users,
      message: 'Credit scores retrieved successfully'
    })
  } catch (error) {
    console.error('Error fetching credit scores:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { checkAll = true, userId } = body

    const adjustments = await checkAndAdjustCreditScores(supabase, checkAll ? undefined : userId)

    return NextResponse.json({
      success: true,
      data: adjustments,
      message: 'Credit score check completed'
    })
  } catch (error) {
    console.error('Error checking credit scores:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function checkAndAdjustCreditScores(supabase: any, specificUserId?: string) {
  const adjustments: any[] = []

  let query = supabase
    .from('profiles')
    .select('*')
    .in('role', ['DISTRIBUTOR', 'RETAILER'])

  if (specificUserId) {
    query = query.eq('id', specificUserId)
  }

  const { data: users } = await query

  for (const user of users || []) {
    const redZonePercentage = await calculateRedZonePercentage(supabase, user.id)

    if (redZonePercentage >= 40) {
      const previousScore = user.credit_score || 750
      const scoreDecrease = Math.min(100, Math.floor(redZonePercentage / 2))
      const newScore = Math.max(300, previousScore - scoreDecrease)

      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          credit_score: newScore,
          credit_score_updated_at: new Date().toISOString(),
          credit_limit: Math.max(10000, (user.credit_limit || 100000) * 0.7)
        })
        .eq('id', user.id)
        .select()
        .single()

      if (!updateError && updatedProfile) {
        const { data: historyEntry } = await supabase
          .from('credit_score_history')
          .insert({
            user_id: user.id,
            previous_score: previousScore,
            new_score: newScore,
            score_change: -(scoreDecrease),
            reason_code: 'RED_ZONE_BALANCE',
            reason_description: `${redZonePercentage}% of balance in Red Zone (over 90 days past due)`,
            metadata: { red_zone_percentage: redZonePercentage }
          })
          .select()
          .single()

        adjustments.push({
          user_id: user.id,
          user_name: user.user_name,
          previous_score: previousScore,
          new_score: newScore,
          red_zone_percentage: redZonePercentage,
          action: 'credit_score_lowered',
          alert_to_admin: true
        })
      }
    }
  }

  return adjustments
}

async function calculateRedZonePercentage(supabase: any, userId: string) {
  const { data: invoices } = await supabase
    .from('invoices')
    .select('grand_total, status, due_date, invoice_date')
    .eq('customer_id', userId)

  if (!invoices || invoices.length === 0) return 0

  const today = new Date()
  let totalBalance = 0
  let redZoneBalance = 0

  for (const invoice of invoices) {
    if (invoice.status === 'PAID') continue

    const invoiceAmount = invoice.grand_total || 0
    totalBalance += invoiceAmount

    const dueDate = new Date(invoice.due_date || invoice.invoice_date)
    const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysPastDue > 90) {
      redZoneBalance += invoiceAmount
    }
  }

  return totalBalance > 0 ? Math.round((redZoneBalance / totalBalance) * 100) : 0
}
