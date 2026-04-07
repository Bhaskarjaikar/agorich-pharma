import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAuth } from '@/lib/api-security'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Lazy initialization - client created inside POST function
let supabase: ReturnType<typeof createClient> | null = null

function getSupabaseClient() {
  if (!supabase) {
    if (!supabaseUrl || !supabaseServiceKey) {
      return null
    }
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
  return supabase
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { user, error: authError } = await verifyAuth(request)
    if (authError) {
      return authError
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, userData } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Ensure users can only create/update their own profile unless they're admin
    if (user.id !== userId && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'You can only manage your own profile' },
        { status: 403 }
      )
    }

    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      )
    }

    const supabase = getSupabaseClient() as any
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database client initialization failed' },
        { status: 500 }
      )
    }

    // Create user profile with better error handling
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        user_name: userData.name || null,
        phone: userData.phone || null,
        business_name: userData.business_name || null,
        business_type: userData.business_type || null,
        role: 'RETAILER', // Default role for new users
        is_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating profile:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      
      // If profile already exists, try to update it
      if (error.code === '23505') { // Unique constraint violation
        const { data: updatedData, error: updateError } = await supabase
          .from('profiles')
          .update({
            user_name: userData.name || null,
            phone: userData.phone || null,
            business_name: userData.business_name || null,
            business_type: userData.business_type || null,
            role: userData.role || 'RETAILER', // Default to RETAILER if not specified
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()
          .single()

        if (updateError) {
          console.error('Error updating existing profile:', {
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            code: updateError.code
          })
          return NextResponse.json(
            { error: 'Failed to create/update profile', details: updateError.message },
            { status: 500 }
          )
        }

        return NextResponse.json(
          { 
            success: true, 
            profile: updatedData,
            message: 'Profile updated successfully' 
          },
          { status: 200 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to create profile', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        success: true, 
        profile: data,
        message: 'Profile created successfully' 
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error in profile creation API:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
