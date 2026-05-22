import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Request object currently not used but kept for future query params / headers
    void request
    const supabase = await createServerClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's achievements
    const { data: achievements, error: achievementsError } = await supabase
      .from('achievements_badges')
      .select('*')
      .eq('user_id', user.id)
      .order('unlocked_date', { ascending: false })

    if (achievementsError) {
      return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 })
    }

    // Get user's referral stats for progress calculation
    const { count: totalReferrals, error: referralsError } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', user.id)

    if (referralsError) {
      return NextResponse.json({ error: 'Failed to fetch referral stats' }, { status: 500 })
    }

    // Get user's total earnings
    const { data: earnings, error: earningsError } = await supabase
      .from('referral_earnings')
      .select('amount')
      .eq('user_id', user.id)
      .eq('is_paid', true)

    if (earningsError) {
      return NextResponse.json({ error: 'Failed to fetch earnings' }, { status: 500 })
    }

    const totalEarned = earnings?.reduce((sum, earning) => sum + earning.amount, 0) || 0

    // Define all possible achievements
    const allAchievements = [
      {
        badge_id: 'starter',
        badge_name: 'Starter',
        description: 'Joined the referral program',
        icon: '🌟',
        requirement: 1,
        type: 'referrals',
        points: 100
      },
      {
        badge_id: 'growth',
        badge_name: 'Growth',
        description: 'Made 5 successful referrals',
        icon: '🚀',
        requirement: 5,
        type: 'referrals',
        points: 250
      },
      {
        badge_id: 'power',
        badge_name: 'Power',
        description: 'Made 10 successful referrals',
        icon: '💪',
        requirement: 10,
        type: 'referrals',
        points: 500
      },
      {
        badge_id: 'leader',
        badge_name: 'Leader',
        description: 'Made 20 successful referrals',
        icon: '🏆',
        requirement: 20,
        type: 'referrals',
        points: 1000
      },
      {
        badge_id: 'champion',
        badge_name: 'Champion',
        description: 'Made 50 successful referrals',
        icon: '👑',
        requirement: 50,
        type: 'referrals',
        points: 2500
      },
      {
        badge_id: 'earner_10k',
        badge_name: 'Earner',
        description: 'Earned ₹10,000 from referrals',
        icon: '💰',
        requirement: 10000,
        type: 'earnings',
        points: 500
      },
      {
        badge_id: 'earner_50k',
        badge_name: 'Big Earner',
        description: 'Earned ₹50,000 from referrals',
        icon: '💎',
        requirement: 50000,
        type: 'earnings',
        points: 1000
      },
      {
        badge_id: 'earner_100k',
        badge_name: 'Mega Earner',
        description: 'Earned ₹100,000 from referrals',
        icon: '🎯',
        requirement: 100000,
        type: 'earnings',
        points: 2500
      }
    ]

    // Check which achievements are unlocked and which are locked
    const unlockedBadgeIds = new Set(achievements?.map(a => a.badge_id) || [])
    
    const achievementsWithStatus = allAchievements.map(achievement => {
      const isUnlocked = unlockedBadgeIds.has(achievement.badge_id)
      let progress = 0
      let currentValue = 0

      if (achievement.type === 'referrals') {
        currentValue = totalReferrals || 0
        progress = Math.min(100, (currentValue / achievement.requirement) * 100)
      } else if (achievement.type === 'earnings') {
        currentValue = totalEarned
        progress = Math.min(100, (currentValue / achievement.requirement) * 100)
      }

      return {
        ...achievement,
        isUnlocked,
        progress,
        currentValue,
        unlockedDate: isUnlocked ? achievements?.find(a => a.badge_id === achievement.badge_id)?.unlocked_date : null
      }
    })

    // Get recent achievement (most recently unlocked)
    const recentAchievement = achievements?.length > 0 ? achievements[0] : null

    return NextResponse.json({
      achievements: achievementsWithStatus,
      recentAchievement,
      stats: {
        totalReferrals: totalReferrals || 0,
        totalEarned,
        unlockedCount: achievements?.length || 0,
        totalCount: allAchievements.length
      }
    })

  } catch (error) {
    console.error('Error in achievements API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
