import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ actionId: string }> }
) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, user_id')
      .eq('user_id', user.id)
      .single()

    if (profile?.role !== 'DISTRIBUTOR') {
      return NextResponse.json(
        { success: false, error: 'Only distributors can access this endpoint' },
        { status: 403 }
      )
    }

    const { data: credits } = await supabase
      .from('distributor_credits')
      .select('*')
      .eq('distributor_id', user.id)
      .single()

    const { data: pendingSettlements, count } = await supabase
      .from('pending_settlements')
      .select('*', { count: 'exact' })
      .eq('distributor_id', user.id)
      .eq('status', 'PENDING')
      .order('release_time', { ascending: true })

    const { data: creditLogs } = await supabase
      .from('credit_adjustment_logs')
      .select('*')
      .eq('distributor_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    const totalPending = pendingSettlements?.reduce(
      (sum: number, s: any) => sum + Number(s.net_payout || 0),
      0
    ) || 0

    const nextSettlementTime = pendingSettlements?.[0]?.release_time || null

    return NextResponse.json({
      success: true,
      data: {
        credits: credits || { total_owed: 0 },
        pendingSettlements: pendingSettlements || [],
        totalPending,
        nextSettlementTime,
        pendingCount: count || 0,
        creditLogs: creditLogs || []
      }
    })
  } catch (error) {
    console.error('Error fetching credit info:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ actionId: string }> }
) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, user_id')
      .eq('user_id', user.id)
      .single()

    if (profile?.role !== 'DISTRIBUTOR') {
      return NextResponse.json(
        { success: false, error: 'Only distributors can adjust credits' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { settlement_id, amount, action } = body

    if (!settlement_id || !amount || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: settlement_id, amount, action' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be positive' },
        { status: 400 }
      )
    }

    const { data: settlement } = await supabase
      .from('pending_settlements')
      .select('*')
      .eq('id', settlement_id)
      .eq('distributor_id', user.id)
      .single()

    if (!settlement) {
      return NextResponse.json(
        { success: false, error: 'Settlement not found' },
        { status: 404 }
      )
    }

    if (settlement.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Can only adjust pending settlements' },
        { status: 400 }
      )
    }

    const { data: credits } = await supabase
      .from('distributor_credits')
      .select('total_owed')
      .eq('distributor_id', user.id)
      .single()

    const currentCredit = Number(credits?.total_owed || 0)

    if (action === 'APPLY_CREDIT') {
      if (amount > currentCredit) {
        return NextResponse.json(
          { success: false, error: `Insufficient credit. Available: ₹${currentCredit.toFixed(2)}` },
          { status: 400 }
        )
      }

      if (amount > settlement.net_payout) {
        return NextResponse.json(
          { success: false, error: `Amount exceeds settlement net payout of ₹${settlement.net_payout}` },
          { status: 400 }
        )
      }

      const newCreditOwed = currentCredit - amount
      const newCreditDeducted = Number(settlement.credit_deducted || 0) + amount
      const newNetPayout = Number(settlement.net_payout || 0) - amount

      await supabase
        .from('distributor_credits')
        .update({
          total_owed: newCreditOwed,
          last_adjustment_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('distributor_id', user.id)

      await supabase
        .from('pending_settlements')
        .update({
          credit_deducted: newCreditDeducted,
          net_payout: Math.max(0, newNetPayout),
          updated_at: new Date().toISOString()
        })
        .eq('id', settlement_id)

      await supabase
        .from('credit_adjustment_logs')
        .insert({
          distributor_id: user.id,
          adjustment_type: 'DEDUCT',
          amount: amount,
          reference_id: settlement_id,
          reference_type: 'SETTLEMENT',
          notes: `Applied to settlement ${settlement_id} - credit recovery`
        })

      return NextResponse.json({
        success: true,
        message: `Applied ₹${amount.toFixed(2)} credit to settlement`,
        data: {
          new_credit_owed: newCreditOwed,
          new_net_payout: Math.max(0, newNetPayout),
          credit_deducted: newCreditDeducted
        }
      })
    } else if (action === 'ADD_CREDIT') {
      const newCreditOwed = currentCredit + amount

      await supabase
        .from('distributor_credits')
        .update({
          total_owed: newCreditOwed,
          last_adjustment_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('distributor_id', user.id)

      await supabase
        .from('credit_adjustment_logs')
        .insert({
          distributor_id: user.id,
          adjustment_type: 'ADD',
          amount: amount,
          reference_id: settlement_id,
          reference_type: 'SETTLEMENT',
          notes: `Manual credit addition for settlement ${settlement_id}`
        })

      return NextResponse.json({
        success: true,
        message: `Added ₹${amount.toFixed(2)} to credit balance`,
        data: {
          new_credit_owed: newCreditOwed
        }
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use APPLY_CREDIT or ADD_CREDIT' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error adjusting credit:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
