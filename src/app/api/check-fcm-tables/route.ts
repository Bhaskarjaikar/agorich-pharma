import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'Missing Supabase credentials',
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const result: any = {
      timestamp: new Date().toISOString(),
      tables: {}
    }

    // Check notifications table
    try {
      const { data, error, count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .limit(1)

      result.tables.notifications = {
        exists: !error,
        error: error?.message,
        count: count || 0
      }
    } catch (error: any) {
      result.tables.notifications = {
        exists: false,
        error: error.message
      }
    }

    // Check fcm_device_tokens table
    try {
      const { data, error, count } = await supabase
        .from('fcm_device_tokens')
        .select('*', { count: 'exact' })
        .limit(1)

      result.tables.fcm_device_tokens = {
        exists: !error,
        error: error?.message,
        count: count || 0
      }
    } catch (error: any) {
      result.tables.fcm_device_tokens = {
        exists: false,
        error: error.message
      }
    }

    // Check Firebase environment variables
    result.firebase_env = {
      NEXT_PUBLIC_FIREBASE_API_KEY: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_VAPID_KEY: !!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL
    }

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Internal error',
      stack: error.stack
    }, { status: 500 })
  }
}