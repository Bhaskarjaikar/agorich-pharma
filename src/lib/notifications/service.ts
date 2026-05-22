import { createClient } from '@supabase/supabase-js'
import { createNotification as createDBNotification, Notification } from '../notifications'
import { sendPushNotification, sendPushToMultipleDevices } from './fcm-admin'
import { NotificationEvent, PushNotificationPayload, NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from './types'

export async function sendNotificationWithPush(params: {
  supabase: any
  event: NotificationEvent
}): Promise<{ success: boolean; notification_id?: string; push_sent?: number; error?: string }> {
  const { supabase, event } = params

  try {
    let notificationId: string | undefined

    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .insert({
        type: mapEventTypeToNotificationType(event.type),
        category: mapEventTypeToCategory(event.type),
        title: event.title,
        message: event.body,
        link: event.data?.link || null,
        metadata: event.data || null,
        created_for_role: event.target_roles?.[0] || 'SUPER_ADMIN',
        created_for_user_id: event.target_user_ids?.[0] || null,
      })
      .select('id')
      .single()

    if (notifError) {
      console.error('Failed to create notification:', notifError)
    } else {
      notificationId = notification.id
    }

    const pushPayload: PushNotificationPayload = {
      title: event.title,
      body: event.body,
      click_action: event.data?.link || '/admin/notifications',
      data: event.data || {},
    }

    let pushSent = 0

    if (event.target_user_ids && event.target_user_ids.length > 0) {
      const { data: tokens } = await supabase
        .from('fcm_device_tokens')
        .select('device_token')
        .in('user_id', event.target_user_ids)
        .eq('is_active', true)

      if (tokens && tokens.length > 0) {
        const tokenStrings = tokens.map((t: any) => t.device_token)
        const result = await sendPushToMultipleDevices(tokenStrings, pushPayload)
        pushSent = result.success
      }
    } else if (event.target_roles && event.target_roles.length > 0) {
      const { data: tokens } = await supabase
        .from('fcm_device_tokens')
        .select('device_token, user_id')
        .eq('is_active', true)

      if (tokens && tokens.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, role')
          .in('role', event.target_roles)

        if (profiles && profiles.length > 0) {
          const roleUserIds = new Set(profiles.map((p: any) => p.id))
          const relevantTokens = tokens.filter((t: any) => roleUserIds.has(t.user_id))
          if (relevantTokens.length > 0) {
            const tokenStrings = relevantTokens.map((t: any) => t.device_token)
            const result = await sendPushToMultipleDevices(tokenStrings, pushPayload)
            pushSent = result.success
          }
        }
      }
    } else {
      const { data: allTokens } = await supabase
        .from('fcm_device_tokens')
        .select('device_token')
        .eq('is_active', true)
        .limit(100)

      if (allTokens && allTokens.length > 0) {
        const tokenStrings = allTokens.map((t: any) => t.device_token)
        const result = await sendPushToMultipleDevices(tokenStrings, pushPayload)
        pushSent = result.success
      }
    }

    return {
      success: true,
      notification_id: notificationId,
      push_sent: pushSent,
    }
  } catch (error) {
    console.error('Error in sendNotificationWithPush:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function getUserNotificationPreferences(
  supabase: any,
  userId: string
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return {
      id: '',
      user_id: userId,
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  return data as NotificationPreferences
}

export async function updateUserNotificationPreferences(
  supabase: any,
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: userId,
      ...preferences,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

function mapEventTypeToNotificationType(eventType: string): 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' {
  switch (eventType) {
    case 'INVOICE_PAID':
    case 'PAYMENT_RECEIVED':
    case 'BIRTHDAY_WISH':
    case 'FESTIVAL_GREETING':
      return 'SUCCESS'
    case 'INVOICE_OVERDUE':
    case 'STOCK_ALERT':
      return 'WARNING'
    case 'PAYMENT_REMINDER':
      return 'INFO'
    default:
      return 'INFO'
  }
}

function mapEventTypeToCategory(eventType: string): 'INVOICE' | 'PAYMENT' | 'STOCK' | 'USER' | 'SYSTEM' | 'GREETING' {
  switch (eventType) {
    case 'INVOICE_CREATED':
    case 'INVOICE_SENT':
    case 'INVOICE_PAID':
    case 'INVOICE_OVERDUE':
      return 'INVOICE'
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT_REMINDER':
      return 'PAYMENT'
    case 'STOCK_ALERT':
      return 'STOCK'
    case 'BIRTHDAY_WISH':
    case 'FESTIVAL_GREETING':
      return 'GREETING'
    case 'SCHEME_ANNOUNCEMENT':
      return 'SYSTEM'
    default:
      return 'SYSTEM'
  }
}
