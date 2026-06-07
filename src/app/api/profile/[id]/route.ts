import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// GET /api/profile/[id] - Get profile by ID (PUBLIC for invoice customer details)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const supabase = await createServerClient()
    const { id } = params

    console.log('🔍 Fetching profile from Supabase, ID:', id)

    // Get profile (PUBLIC access for invoice customer details)
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        id,
        user_name,
        business_name,
        address,
        city,
        state,
        pincode,
        gst_number,
        phone,
        drug_license_20b,
        drug_license_21b
      `)
      .eq('id', id)
      .single()

    if (error || !profile) {
      console.error('❌ Profile fetch error:', {
        error: error?.message || 'No data',
        code: error?.code,
        details: error?.details,
        profileId: id
      })
      
      return NextResponse.json(
        { 
          error: 'Profile not found',
          message: `Profile with ID "${id}" could not be found.`,
          profileId: id,
          errorCode: error?.code
        },
        { status: 404 }
      )
    }

    console.log('✅ Profile found:', profile.user_name || profile.business_name)

    return NextResponse.json({
      success: true,
      profile: profile
    })
  } catch (error: unknown) {
    console.error('❌ Error fetching profile:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to fetch profile'
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message
      },
      { status: 500 }
    )
  }
}


