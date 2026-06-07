import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdmin } from '@/lib/api-security'
import { initFirebaseAdmin, sendPushNotification } from '@/lib/notifications/fcm-admin'

interface BroadcastRequest {
  title: string
  body: string
  image?: string
  click_action?: string
  target_roles?: string[]
  target_user_ids?: string[]
  actions?: Array<{ action: string; title: string; icon?: string }>
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }

    const body: BroadcastRequest = await request.json()
    const { title, body: message, image, click_action, target_roles, target_user_ids, actions } = body

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and body are required' },
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

    let query = supabase
      .from('fcm_device_tokens')
      .select('device_token, user_id')
      .eq('is_active', true)

    if (target_roles && target_roles.length > 0) {
      const { data: users } = await supabase
        .from('profiles')
        .select('id')
        .in('role', target_roles)
      
      const userIds = users?.map(u => u.id) || []
      if (userIds.length > 0) {
        query = query.in('user_id', userIds)
      } else {
        return NextResponse.json(
          { success: true, sent: 0, message: 'No users found for target roles' }
        )
      }
    }

    if (target_user_ids && target_user_ids.length > 0) {
      query = query.in('user_id', target_user_ids)
    }

    const { data: tokens } = await query
    const deviceTokens = tokens?.map(t => t.device_token) || []

    let sentCount = 0
    let failedCount = 0

    // Try to send push notifications (if Firebase is configured and tokens exist)
    const app = initFirebaseAdmin()
    if (app && deviceTokens.length > 0) {
      const dataPayload: Record<string, string> = {
        click_action: click_action || '/dashboard',
        ...(image ? { image_url: image } : {}),
      }

      for (const token of deviceTokens) {
        try {
          const result = await sendPushNotification(token, {
            title,
            body: message,
            image,
            data: dataPayload,
          })

          if (result.success) {
            sentCount++
          } else {
            failedCount++
          }
        } catch (error) {
          failedCount++
        }
      }
    }

    // ALWAYS save notification to database for in-app display
    try {
      if (target_roles && target_roles.length > 0) {
        for (const role of target_roles) {
          await supabase.from('notifications').insert({
            type: 'INFO',
            category: 'SYSTEM',
            title,
            message,
            link: click_action,
            created_for_role: role,
            metadata: {
              image,
              target_roles,
              target_user_ids,
              actions,
              sentCount,
              failedCount,
            },
          })
        }
      } else {
        // Broadcast to all users - get all distinct roles
        const { data: distinctRoles } = await supabase
          .from('profiles')
          .select('role')
          .not('role', 'is', null)
          .not('role', 'eq', '')
        
        const roles = [...new Set(distinctRoles?.map(r => r.role).filter(Boolean) || [])]
        
        if (roles.length === 0) {
          // Fallback to common roles if no roles found in profiles
          roles.push('RETAILER', 'DISTRIBUTOR', 'SALES', 'LOGISTIC')
        }
        
        for (const role of roles) {
          await supabase.from('notifications').insert({
            type: 'INFO',
            category: 'SYSTEM',
            title,
            message,
            link: click_action,
            created_for_role: role,
            metadata: {
              image,
              target_roles: [], // Empty array means "all roles"
              target_user_ids,
              actions,
              sentCount,
              failedCount,
            },
          })
        }
      }
    } catch (dbError) {
      console.error('Failed to save notification to DB:', dbError)
      return NextResponse.json(
        { error: 'Failed to save notification' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      failed: failedCount,
      total: deviceTokens.length,
      message: deviceTokens.length === 0 
        ? 'Notification saved! Push notifications will work once users enable them.' 
        : undefined,
    })
  } catch (e) {
    console.error('Error in broadcast notification:', e)
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Calculate date 7 days ago for TTL
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoISO = sevenDaysAgo.toISOString()

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .gte('created_at', sevenDaysAgoISO)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const uniqueNotifications = new Map()
    for (const notif of notifications || []) {
      const key = `${notif.title}-${notif.message}-${notif.created_at.split('T')[0]}`
      if (!uniqueNotifications.has(key)) {
        uniqueNotifications.set(key, notif)
      }
    }

    return NextResponse.json({ notifications: Array.from(uniqueNotifications.values()) })
  } catch (e) {
    console.error('Error in notifications API:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const body = await request.json()
    const { notification_id, mark_all_read } = body

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    if (mark_all_read) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('created_for_role', 'SUPER_ADMIN')
        .eq('is_read', false)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else if (notification_id) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notification_id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Error in notifications PATCH:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const { searchParams } = new URL(request.url)
    const notification_id = searchParams.get('id')

    if (!notification_id) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notification_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Error in notifications DELETE:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
