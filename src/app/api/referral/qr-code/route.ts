import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateQRCode } from '@/lib/qr-generator'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { referralCode } = await request.json()

    if (!referralCode) {
      return NextResponse.json({ error: 'Referral code is required' }, { status: 400 })
    }

    // Verify the referral code belongs to the user
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .select('referral_code')
      .eq('referrer_id', user.id)
      .eq('referral_code', referralCode)
      .single()

    if (referralError || !referral) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 })
    }

    // Generate referral link
    const referralLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/join?ref=${referralCode}`

    // Generate QR code
    const qrCodeDataURL = await generateQRCode(referralLink)

    // Update the referral record with QR code URL
    const { error: updateError } = await supabase
      .from('referrals')
      .update({ qr_code_url: qrCodeDataURL })
      .eq('referrer_id', user.id)
      .eq('referral_code', referralCode)

    if (updateError) {
      console.error('Failed to update QR code URL:', updateError)
      // Don't fail the request, just log the error
    }

    return NextResponse.json({ 
      qrCode: qrCodeDataURL,
      referralLink
    })

  } catch (error) {
    console.error('Error in QR code API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
