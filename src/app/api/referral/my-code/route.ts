import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateReferralCode } from '@/lib/referral-utils'

export async function GET(request: NextRequest) {
  try {
    // Request object currently unused, reserved for future query params / headers
    void request
    const supabase = await createServerClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user already has a referral code
    const { data: existingReferral, error: fetchError } = await supabase
      .from('referrals')
      .select('referral_code')
      .eq('referrer_id', user.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Failed to fetch referral code' }, { status: 500 })
    }

    let referralCode = existingReferral?.referral_code

    // Generate new code if user doesn't have one
    if (!referralCode) {
      referralCode = generateReferralCode()
      
      // Insert new referral record
      const { error: insertError } = await supabase
        .from('referrals')
        .insert({
          referrer_id: user.id,
          referral_code: referralCode,
          referral_type: 'pharmacy_to_pharmacy', // Default type, can be updated
          status: 'pending',
          expiry_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days from now
        })

      if (insertError) {
        return NextResponse.json({ error: 'Failed to create referral code' }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      referralCode,
      referralLink: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/join?ref=${referralCode}`
    })

  } catch (error) {
    console.error('Error in my-code API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
