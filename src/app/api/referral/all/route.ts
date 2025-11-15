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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    // Build query
    let query = supabase
      .from('referrals')
      .select(`
        *,
        referred_profile:profiles!referrals_referred_id_fkey(
          user_name,
          business_name,
          business_type,
          phone_number
        )
      `)
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (type && type !== 'all') {
      query = query.eq('referral_type', type)
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: referrals, error: referralsError } = await query
      .range(from, to)

    if (referralsError) {
      return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', user.id)

    if (status && status !== 'all') {
      countQuery = countQuery.eq('status', status)
    }

    if (type && type !== 'all') {
      countQuery = countQuery.eq('referral_type', type)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      return NextResponse.json({ error: 'Failed to fetch referrals count' }, { status: 500 })
    }

    // Transform data to include calculated fields
    const transformedReferrals = referrals?.map(referral => {
      const now = new Date()
      const bonusExpiry = referral.bonus_expiry_date ? new Date(referral.bonus_expiry_date) : null

      // Calculate days remaining
      let daysRemaining = 0
      if (referral.status === 'active' && bonusExpiry) {
        const diffTime = bonusExpiry.getTime() - now.getTime()
        daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
      }

      // Calculate progress percentage
      let progress = 0
      if (referral.status === 'active' && referral.bonus_activation_date && bonusExpiry) {
        const activation = new Date(referral.bonus_activation_date)
        const totalDuration = bonusExpiry.getTime() - activation.getTime()
        const elapsed = now.getTime() - activation.getTime()
        progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
      }

      return {
        ...referral,
        daysRemaining,
        progress,
        referredName: referral.referred_profile?.business_name || referral.referred_profile?.user_name || 'Unknown',
        referredType: referral.referred_profile?.business_type || 'Unknown'
      }
    }) || []

    return NextResponse.json({
      referrals: transformedReferrals,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Error in all referrals API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
