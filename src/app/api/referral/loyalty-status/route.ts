import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Request is currently unused; kept for future query params / headers
    void request
    const supabase = await createServerClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's loyalty points
    const { data: loyaltyData, error: loyaltyError } = await supabase
      .from('loyalty_points')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (loyaltyError && loyaltyError.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Failed to fetch loyalty data' }, { status: 500 })
    }

    // If no loyalty record exists, create one
    if (!loyaltyData) {
      const { data: newLoyaltyData, error: createError } = await supabase
        .from('loyalty_points')
        .insert({
          user_id: user.id,
          points_balance: 0,
          tier_level: 'bronze',
          total_points_earned: 0,
          points_redeemed: 0
        })
        .select()
        .single()

      if (createError) {
        return NextResponse.json({ error: 'Failed to create loyalty record' }, { status: 500 })
      }

      return NextResponse.json({
        loyalty: newLoyaltyData,
        tierInfo: {
          current: 'bronze',
          next: 'silver',
          progress: 0,
          pointsToNext: 1000
        }
      })
    }

    // Calculate tier information
    const points = loyaltyData.points_balance
    let tierInfo

    if (points < 1000) {
      tierInfo = {
        current: 'bronze',
        next: 'silver',
        progress: (points / 1000) * 100,
        pointsToNext: 1000 - points
      }
    } else if (points < 5000) {
      tierInfo = {
        current: 'silver',
        next: 'gold',
        progress: ((points - 1000) / 4000) * 100,
        pointsToNext: 5000 - points
      }
    } else if (points < 15000) {
      tierInfo = {
        current: 'gold',
        next: 'platinum',
        progress: ((points - 5000) / 10000) * 100,
        pointsToNext: 15000 - points
      }
    } else {
      tierInfo = {
        current: 'platinum',
        next: 'platinum',
        progress: 100,
        pointsToNext: 0
      }
    }

    return NextResponse.json({
      loyalty: loyaltyData,
      tierInfo
    })

  } catch (error) {
    console.error('Error in loyalty status API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
