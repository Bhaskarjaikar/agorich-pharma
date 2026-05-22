import { createClient } from '@supabase/supabase-js'

export type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'
export type NotificationCategory = 'INVOICE' | 'PAYMENT' | 'STOCK' | 'USER' | 'SYSTEM'

export interface Notification {
  id: string
  type: NotificationType
  category: NotificationCategory
  title: string
  message: string
  link?: string
  is_read: boolean
  read_at?: string
  created_for_role: string
  created_for_user_id?: string
  metadata?: Record<string, any>
  created_at: string
}

export async function createNotification(params: {
  supabase: any
  type: NotificationType
  category: NotificationCategory
  title: string
  message: string
  link?: string
  createdForRole?: string
  createdForUserId?: string
  metadata?: Record<string, any>
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, type, category, title, message, link, createdForRole = 'SUPER_ADMIN', createdForUserId, metadata } = params

    const { error } = await supabase
      .from('notifications')
      .insert({
        type,
        category,
        title,
        message,
        link,
        created_for_role: createdForRole,
        created_for_user_id: createdForUserId || null,
        metadata: metadata || null,
        is_read: false
      })

    if (error) {
      console.error('Failed to create notification:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Exception creating notification:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function markNotificationAsRead(params: {
  supabase: any
  notificationId: string
  userId?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, notificationId, userId } = params

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function markAllNotificationsAsRead(params: {
  supabase: any
  userId?: string
  role?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, userId, role } = params

    let query = supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('is_read', false)

    if (userId) {
      query = query.eq('created_for_user_id', userId)
    } else if (role) {
      query = query.eq('created_for_role', role)
    }

    const { error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function getUnreadNotificationCount(params: {
  supabase: ReturnType<typeof createClient>
  userId?: string
  role?: string
}): Promise<number> {
  try {
    const { supabase, userId, role } = params

    let query = supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false)

    if (userId) {
      query = query.eq('created_for_user_id', userId)
    } else if (role) {
      query = query.eq('created_for_role', role)
    }

    const { count, error } = await query

    if (error) {
      console.error('Error getting unread notification count:', error)
      return 0
    }

    return count || 0
  } catch (err) {
    return 0
  }
}
