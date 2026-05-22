import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { user_id, device_token, device_type } = await request.json()

    if (!user_id || !device_token) {
      return NextResponse.json(
        { error: 'user_id and device_token are required' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { error } = await supabase
      .from('fcm_device_tokens')
      .upsert({
        user_id,
        device_token,
        device_type: device_type || 'web',
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,device_token'
      })

    if (error) {
      console.error('FCM token save error:', error)
      return NextResponse.json(
        { error: 'Failed to save device token' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('FCM token API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')
    const device_token = searchParams.get('device_token')

    if (!user_id || !device_token) {
      return NextResponse.json(
        { error: 'user_id and device_token are required' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    await supabase
      .from('fcm_device_tokens')
      .update({ is_active: false })
      .eq('user_id', user_id)
      .eq('device_token', device_token)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('FCM token delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
