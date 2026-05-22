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
    const rawPeriod = searchParams.get('period') || 'this_month'
    const rawCategory = searchParams.get('category') || 'all'
    const rawLimit = parseInt(searchParams.get('limit') || '10', 10)

    const allowedPeriods = new Set(['this_month', 'this_year', 'all_time'])
    const period = allowedPeriods.has(rawPeriod) ? rawPeriod : 'this_month'

    const category = rawCategory || 'all'
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 && rawLimit <= 100 ? rawLimit : 10

    // Calculate date range based on period
    let startDate: Date
    const endDate = new Date()

    switch (period) {
      case 'this_month':
        startDate = new Date()
        startDate.setDate(1)
        startDate.setHours(0, 0, 0, 0)
        break
      case 'this_year':
        startDate = new Date()
        startDate.setMonth(0, 1)
        startDate.setHours(0, 0, 0, 0)
        break
      case 'all_time':
        startDate = new Date('2020-01-01') // Far back date
        break
      default:
        startDate = new Date()
        startDate.setDate(1)
        startDate.setHours(0, 0, 0, 0)
    }

    // Build the query to get top referrers with their earnings
    let query = supabase
      .from('referral_earnings')
      .select(`
        user_id,
        amount,
        profiles!referral_earnings_user_id_fkey(
          user_name,
          business_name,
          business_type
        )
      `)
      .eq('is_paid', true)
      .gte('earning_date', startDate.toISOString())
      .lte('earning_date', endDate.toISOString())

    // Apply category filter
    if (category !== 'all') {
      query = query.eq('profiles.business_type', category)
    }

    const { data: earnings, error: earningsError } = await query

    if (earningsError) {
      return NextResponse.json({ error: 'Failed to fetch leaderboard data' }, { status: 500 })
    }

    // Helper to safely coerce to number
    const toAmount = (value: unknown) => {
      const n = typeof value === 'number' ? value : Number(value)
      return Number.isFinite(n) ? n : 0
    }

    const earningsList = Array.isArray(earnings) ? earnings : []

    // Group earnings by user and calculate totals
    const userEarnings = new Map()
    
    earningsList.forEach(earning => {
      const userId = earning.user_id
      const profiles = earning.profiles as { user_name?: string | null; business_name?: string | null; business_type?: string | null }[] | null
      const profile = profiles?.[0]
      
      if (!userEarnings.has(userId)) {
        userEarnings.set(userId, {
          user_id: userId,
          user_name: profile?.user_name || 'Unknown',
          business_name: profile?.business_name || 'Unknown',
          business_type: profile?.business_type || 'Unknown',
          total_earnings: 0,
          referral_count: 0
        })
      }
      
      const userData = userEarnings.get(userId)
      userData.total_earnings += earning.amount
      userData.referral_count += 1
    })

    // Convert to array and sort by earnings
    const leaderboard = Array.from(userEarnings.values())
      .sort((a, b) => b.total_earnings - a.total_earnings)
      .slice(0, limit)

    // Add rank to each entry
    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }))

    // Find current user's rank
    const currentUserRank = rankedLeaderboard.findIndex(entry => entry.user_id === user.id) + 1

    // Get current user's stats
    const { data: currentUserEarnings, error: currentUserError } = await supabase
      .from('referral_earnings')
      .select('amount')
      .eq('user_id', user.id)
      .eq('is_paid', true)
      .gte('earning_date', startDate.toISOString())
      .lte('earning_date', endDate.toISOString())

    if (currentUserError) {
      return NextResponse.json({ error: 'Failed to fetch current user stats' }, { status: 500 })
    }

    const currentList = Array.isArray(currentUserEarnings) ? currentUserEarnings : []

    const currentUserTotal = currentList.reduce((sum, earning) => sum + toAmount(earning.amount), 0)

    return NextResponse.json({
      leaderboard: rankedLeaderboard,
      currentUser: {
        rank: currentUserRank || null,
        totalEarnings: currentUserTotal,
        referralCount: currentUserEarnings?.length || 0
      },
      period,
      category
    })

  } catch (error) {
    console.error('Error in leaderboard API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
