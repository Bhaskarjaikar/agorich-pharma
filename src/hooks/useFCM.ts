'use client'

import { useState, useEffect, useCallback } from 'react'
import { onMessage, getMessaging, getToken, isSupported as isMessagingSupported } from 'firebase/messaging'
import { initFirebase } from '@/lib/firebase'
import { useAuth } from '@/components/auth/AuthContext'

export function useFCM() {
  const { user } = useAuth()
  const [token, setToken] = useState<string | null>(null)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkSupport = async () => {
      try {
        const supported = await isMessagingSupported()
        setIsSupported(supported)
      } catch {
        setIsSupported(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkSupport()

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      return 'denied'
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result === 'granted') {
        await getAndRegisterToken()
      }

      return result
    } catch (error) {
      return 'denied'
    }
  }, [isSupported, user])

  const getAndRegisterToken = useCallback(async () => {
    if (!isSupported || !user) {
      return null
    }

    try {
      const firebase = await initFirebase()
      if (!firebase) {
        return null
      }

      const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
      if (!VAPID_KEY) {
        return null
      }

      const newToken = await getToken(firebase.messaging, {
        vapidKey: VAPID_KEY,
      })

      if (newToken) {
        setToken(newToken)
        await registerTokenWithServer(newToken)
      }

      return newToken
    } catch {
      return null
    }
  }, [isSupported, user])

  const registerTokenWithServer = useCallback(async (fcmToken: string) => {
    if (!user?.id) {
      return false
    }

    try {
      const response = await fetch('/api/notifications/fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          device_token: fcmToken,
          device_type: 'web',
        }),
      })

      if (response.ok) {
        return true
      }

      return false
    } catch {
      return false
    }
  }, [user])

  const unregisterToken = useCallback(async () => {
    if (!token || !user?.id) {
      return false
    }

    try {
      const response = await fetch(`/api/notifications/fcm-token?user_id=${user.id}&device_token=${encodeURIComponent(token)}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setToken(null)
        return true
      }

      return false
    } catch {
      return false
    }
  }, [token, user])

  useEffect(() => {
    if (!isSupported) {
      return
    }

    const setupMessageListener = async () => {
      try {
        const firebase = await initFirebase()
        if (!firebase) {
          return
        }

        onMessage(firebase.messaging, () => {})
      } catch {}
    }

    setupMessageListener()
  }, [isSupported])

  useEffect(() => {
    if (isSupported && permission === 'granted' && user) {
      getAndRegisterToken()
    }
  }, [isSupported, permission, user, getAndRegisterToken])

  useEffect(() => {
    if (!user && token) {
      unregisterToken()
    }
  }, [user, token, unregisterToken])

  return {
    token,
    permission,
    isSupported,
    isLoading,
    requestPermission,
    getAndRegisterToken,
    unregisterToken,
  }
}