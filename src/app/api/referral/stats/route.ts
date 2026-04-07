import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Request currently unused; kept for future query params / headers
    void request
    const supabase = await createServerClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get total referrals count
    const { count: totalReferrals, error: totalError } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', user.id)

    if (totalError) {
      return NextResponse.json({ error: 'Failed to fetch total referrals' }, { status: 500 })
    }

    // Get active referrals count
    const { count: activeReferrals, error: activeError } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', user.id)
      .eq('status', 'active')

    if (activeError) {
      return NextResponse.json({ error: 'Failed to fetch active referrals' }, { status: 500 })
    }

    // Get total earnings
    const { data: earnings, error: earningsError } = await supabase
      .from('referral_earnings')
      .select('amount')
      .eq('user_id', user.id)
      .eq('is_paid', true)

    if (earningsError) {
      return NextResponse.json({ error: 'Failed to fetch earnings' }, { status: 500 })
    }

    const earningsList = Array.isArray(earnings) ? earnings : []

    const toAmount = (value: unknown) => {
      const n = typeof value === 'number' ? value : Number(value)
      return Number.isFinite(n) ? n : 0
    }

    const totalEarned = earningsList.reduce((sum, earning) => sum + toAmount(earning.amount), 0)

    // Get this month's earnings
    const currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)

    const { data: monthlyEarnings, error: monthlyError } = await supabase
      .from('referral_earnings')
      .select('amount')
      .eq('user_id', user.id)
      .eq('is_paid', true)
      .gte('earning_date', currentMonth.toISOString())

    if (monthlyError) {
      return NextResponse.json({ error: 'Failed to fetch monthly earnings' }, { status: 500 })
    }

    const monthlyList = Array.isArray(monthlyEarnings) ? monthlyEarnings : []

    const thisMonthEarned = monthlyList.reduce((sum, earning) => sum + toAmount(earning.amount), 0)

    // Get pending earnings
    const { data: pendingEarnings, error: pendingError } = await supabase
      .from('referral_earnings')
      .select('amount')
      .eq('user_id', user.id)
      .eq('is_paid', false)

    if (pendingError) {
      return NextResponse.json({ error: 'Failed to fetch pending earnings' }, { status: 500 })
    }

    const pendingList = Array.isArray(pendingEarnings) ? pendingEarnings : []

    const pendingAmount = pendingList.reduce((sum, earning) => sum + toAmount(earning.amount), 0)

    return NextResponse.json({
      totalReferrals: totalReferrals || 0,
      activeReferrals: activeReferrals || 0,
      totalEarned,
      thisMonthEarned,
      pendingAmount
    })

  } catch (error) {
    console.error('Error in stats API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
