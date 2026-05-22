import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    checks: {
      supabase: { status: 'unknown', details: null as any },
      firebaseConfig: { status: 'unknown', details: null as any },
      fcmTokens: { status: 'unknown', details: null as any },
      notifications: { status: 'unknown', details: null as any },
    }
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      diagnostics.checks.supabase = {
        status: 'error',
        details: 'Missing Supabase URL or Service Role Key'
      }
    } else {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })

      const { data, error } = await supabase.from('profiles').select('count').limit(1)
      
      if (error) {
        diagnostics.checks.supabase = {
          status: 'error',
          details: `Supabase query error: ${error.message}`
        }
      } else {
        diagnostics.checks.supabase = {
          status: 'success',
          details: 'Connected successfully'
        }
      }
    }
  } catch (error: any) {
    diagnostics.checks.supabase = {
      status: 'error',
      details: `Exception: ${error.message}`
    }
  }

  try {
    const firebaseVars = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_CLIENT_EMAIL', 
      'FIREBASE_PRIVATE_KEY',
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'NEXT_PUBLIC_FIREBASE_VAPID_KEY'
    ]

    const configStatus: Record<string, string> = {}
    let allConfigured = true
    
    for (const varName of firebaseVars) {
      const value = process.env[varName]
      if (value) {
        if (varName.includes('PRIVATE_KEY')) {
          configStatus[varName] = value.includes('-----BEGIN') ? '[SET - valid format]' : '[SET - invalid format]'
        } else if (varName.includes('KEY')) {
          configStatus[varName] = '[SET - hidden]'
        } else {
          configStatus[varName] = value
        }
      } else {
        configStatus[varName] = '[NOT SET]'
        allConfigured = false
      }
    }

    diagnostics.checks.firebaseConfig = {
      status: allConfigured ? 'success' : 'error',
      details: configStatus
    }
  } catch (error: any) {
    diagnostics.checks.firebaseConfig = {
      status: 'error',
      details: `Exception: ${error.message}`
    }
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })

      const { data: tokens, error: tokensError } = await supabase
        .from('fcm_device_tokens')
        .select('id, user_id, device_type, is_active, created_at')
        .eq('is_active', true)
        .limit(10)

      if (tokensError) {
        diagnostics.checks.fcmTokens = {
          status: 'error',
          details: `Query error: ${tokensError.message}`
        }
      } else {
        diagnostics.checks.fcmTokens = {
          status: 'success',
          details: {
            count: tokens?.length || 0,
            tokens: tokens
          }
        }
      }
    }
  } catch (error: any) {
    diagnostics.checks.fcmTokens = {
      status: 'error',
      details: `Exception: ${error.message}`
    }
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })

      const { data: notifications, error: notifError } = await supabase
        .from('notifications')
        .select('id, title, message, created_for_role, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      if (notifError) {
        diagnostics.checks.notifications = {
          status: 'error',
          details: `Query error: ${notifError.message}`
        }
      } else {
        diagnostics.checks.notifications = {
          status: 'success',
          details: {
            count: notifications?.length || 0,
            notifications: notifications
          }
        }
      }
    }
  } catch (error: any) {
    diagnostics.checks.notifications = {
      status: 'error',
      details: `Exception: ${error.message}`
    }
  }

  return NextResponse.json(diagnostics)
}
