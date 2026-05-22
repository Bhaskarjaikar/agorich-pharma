'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSupabaseAuth } from './useSupabaseAuth'

interface NotificationItem {
  id: string
  type: string
  category?: string
  title: string
  message: string
  link?: string
  is_read?: boolean
  created_at: string
  metadata?: Record<string, any>
}

export function useAppNotifications() {
  const { user, session } = useSupabaseAuth()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = useCallback(async () => {
    if (!user || !session) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const items: NotificationItem[] = data.notifications || []
        setNotifications(items)
        setUnreadCount(items.filter(n => !n.is_read).length)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [user, session])

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user || !session) {
      return
    }

    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          notification_id: notificationId,
          mark_as_read: true,
        }),
      })

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }, [user, session])

  const markAllAsRead = useCallback(async () => {
    for (const notification of notifications) {
      if (!notification.is_read) {
        await markAsRead(notification.id)
      }
    }
  }, [notifications, markAsRead])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  return {
    notifications,
    loading,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  }
}