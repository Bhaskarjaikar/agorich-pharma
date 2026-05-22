import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdmin } from '@/lib/api-security'
import { initFirebaseAdmin } from '@/lib/notifications/fcm-admin'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const diagnosticResult: any = {
      timestamp: new Date().toISOString(),
      environment: {},
      database: {},
      firebase: {},
      issues: [],
      recommendations: []
    }

    // Check environment variables
    diagnosticResult.environment = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_FIREBASE_API_KEY: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_VAPID_KEY: !!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
    }

    // Check database connection and tables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!supabaseUrl || !supabaseServiceKey) {
      diagnosticResult.issues.push('Missing Supabase credentials in environment variables')
      diagnosticResult.recommendations.push('Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env.local file')
    } else {
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })

      // Check notifications table
      try {
        const { data: notifications, error, count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact' })
          .limit(1)

        diagnosticResult.database.notifications_table = {
          exists: !error,
          error: error?.message,
          count: count || 0
        }

        if (error) {
          diagnosticResult.issues.push(`Notifications table error: ${error.message}`)
          diagnosticResult.recommendations.push('Run the notification setup API: POST /api/admin/notifications/setup')
        }
      } catch (error: any) {
        diagnosticResult.database.notifications_table = {
          exists: false,
          error: error.message
        }
        diagnosticResult.issues.push(`Notifications table check failed: ${error.message}`)
      }

      // Check fcm_device_tokens table
      try {
        const { data: tokens, error, count } = await supabase
          .from('fcm_device_tokens')
          .select('*', { count: 'exact' })
          .limit(1)

        diagnosticResult.database.fcm_tokens_table = {
          exists: !error,
          error: error?.message,
          count: count || 0
        }

        if (error) {
          diagnosticResult.issues.push(`FCM device tokens table error: ${error.message}`)
          diagnosticResult.recommendations.push('Run the migration: supabase/migrations/003_advanced_notifications.sql')
        }
      } catch (error: any) {
        diagnosticResult.database.fcm_tokens_table = {
          exists: false,
          error: error.message
        }
      }
    }

    // Check Firebase Admin initialization
    try {
      const firebaseApp = initFirebaseAdmin()
      diagnosticResult.firebase.admin_initialized = !!firebaseApp
      
      if (!firebaseApp) {
        diagnosticResult.issues.push('Firebase Admin SDK not initialized')
        diagnosticResult.recommendations.push('Check FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL environment variables')
      }
    } catch (error: any) {
      diagnosticResult.firebase.admin_initialized = false
      diagnosticResult.firebase.admin_error = error.message
      diagnosticResult.issues.push(`Firebase Admin initialization error: ${error.message}`)
    }

    // Check Firebase client configuration
    diagnosticResult.firebase.client_config = {
      apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      vapidKey: !!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
    }

    // Add specific recommendations based on issues
    if (!diagnosticResult.environment.NEXT_PUBLIC_FIREBASE_API_KEY) {
      diagnosticResult.recommendations.push('Add Firebase configuration: Get API keys from Firebase Console → Project Settings → General → Your apps')
    }

    if (!diagnosticResult.environment.NEXT_PUBLIC_FIREBASE_VAPID_KEY) {
      diagnosticResult.recommendations.push('Add Firebase VAPID key: Get from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates')
    }

    if (!diagnosticResult.environment.FIREBASE_PRIVATE_KEY) {
      diagnosticResult.recommendations.push('Add Firebase Admin SDK private key: Generate from Firebase Console → Project Settings → Service accounts')
    }

    return NextResponse.json(diagnosticResult)
  } catch (error: any) {
    console.error('Diagnostic error:', error)
    return NextResponse.json({
      error: error.message || 'Internal error',
      stack: error.stack
    }, { status: 500 })
  }
}