import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const rawPage = parseInt(searchParams.get('page') || '1', 10)
    const rawLimit = parseInt(searchParams.get('limit') || '20', 10)

    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 && rawLimit <= 100 ? rawLimit : 20

    // Calculate pagination
    const from = (page - 1) * limit
    const to = from + limit - 1

    // Get earnings history
    const { data: earnings, error: earningsError } = await supabase
      .from('referral_earnings')
      .select(`
        *,
        referral:referrals(
          referral_code,
          referral_type,
          referred_profile:profiles!referrals_referred_id_fkey(
            business_name,
            user_name
          )
        )
      `)
      .eq('user_id', user.id)
      .order('earning_date', { ascending: false })
      .range(from, to)

    if (earningsError) {
      return NextResponse.json({ error: 'Failed to fetch earnings history' }, { status: 500 })
    }

    // Get total count
    const { count, error: countError } = await supabase
      .from('referral_earnings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (countError) {
      return NextResponse.json({ error: 'Failed to fetch earnings count' }, { status: 500 })
    }

    // Get summary statistics
    const { data: allEarnings, error: summaryError } = await supabase
      .from('referral_earnings')
      .select('amount, bonus_type, is_paid, earning_date')
      .eq('user_id', user.id)

    if (summaryError) {
      return NextResponse.json({ error: 'Failed to fetch summary data' }, { status: 500 })
    }

    const earningsList = Array.isArray(allEarnings) ? allEarnings : []

    const toAmount = (value: unknown) => {
      const n = typeof value === 'number' ? value : Number(value)
      return Number.isFinite(n) ? n : 0
    }

    // Calculate summary
    const totalEarned = earningsList
      .filter(e => e.is_paid)
      .reduce((sum, e) => sum + toAmount(e.amount), 0)

    const pendingAmount = earningsList
      .filter(e => !e.is_paid)
      .reduce((sum, e) => sum + toAmount(e.amount), 0)

    // Calculate this month's earnings
    const currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)
    
    const thisMonthEarned = earningsList
      .filter(e => e.is_paid && new Date(e.earning_date) >= currentMonth)
      .reduce((sum, e) => sum + toAmount(e.amount), 0)

    // Group by referral type
    const typeBreakdown = earningsList.reduce((acc, earning) => {
      const type = earning.bonus_type || 'unknown'
      if (!acc[type]) {
        acc[type] = { count: 0, amount: 0 }
      }
      acc[type].count += 1
      acc[type].amount += toAmount(earning.amount)
      return acc
    }, {} as Record<string, { count: number; amount: number }>)

    // Transform earnings data
    const transformedEarnings = earnings?.map(earning => ({
      ...earning,
      referredName: earning.referral?.referred_profile?.business_name || 
                   earning.referral?.referred_profile?.user_name || 
                   'Unknown',
      referralCode: earning.referral?.referral_code || 'Unknown',
      referralType: earning.referral?.referral_type || 'unknown'
    })) || []

    return NextResponse.json({
      earnings: transformedEarnings,
      summary: {
        totalEarned,
        thisMonthEarned,
        pendingAmount,
        typeBreakdown
      },
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Error in earnings history API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
