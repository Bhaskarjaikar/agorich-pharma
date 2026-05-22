'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/components/auth/AuthContext'
import { 
  getFCMToken, 
  requestNotificationPermission,
  onForegroundMessage,
  onTokenRefreshCallback,
  checkMessagingSupport,
  getNotificationPermission,
  registerTokenWithServer,
  TokenResult
} from '@/lib/messaging'
import { toast } from 'sonner'

export interface UseFCMReturn {
  token: string | null
  permission: NotificationPermission
  isSupported: boolean
  isLoading: boolean
  error: string | null
  requestPermission: () => Promise<NotificationPermission>
  refreshToken: () => Promise<string | null>
  unregisterToken: () => Promise<void>
}

export function useFCM(): UseFCMReturn {
  const { user } = useAuth()
  
  const [token, setToken] = useState<string | null>(null)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const initializationRef = useRef(false)
  const tokenRefreshUnsubscribeRef = useRef<(() => void) | null>(null)

  // Initialize FCM on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        // Check if messaging is supported
        const supported = await checkMessagingSupport()
        setIsSupported(supported)
        
        if (!supported) {
          console.log('FCM not supported in this browser')
          setIsLoading(false)
          return
        }

        // Get current permission
        const currentPermission = getNotificationPermission()
        setPermission(currentPermission)

        // If permission is granted and user is logged in, get token
        if (currentPermission === 'granted' && user) {
          await getAndStoreToken()
        }

        // Set up foreground message listener
        setupForegroundListener()

      } catch (err) {
        console.error('FCM initialization error:', err)
        setError(err instanceof Error ? err.message : 'Initialization failed')
      } finally {
        setIsLoading(false)
      }
    }

    initialize()
  }, [])

  // Get token when user logs in
  useEffect(() => {
    if (user && permission === 'granted' && !token && isSupported) {
      getAndStoreToken()
    }
  }, [user, permission, isSupported])

  // Setup foreground message listener
  const setupForegroundListener = useCallback(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      console.log('📱 Foreground message received:', payload)
      
      const notification = payload.notification
      if (notification) {
        toast(notification.title || 'New Notification', {
          description: notification.body,
          duration: 5000,
        })
      }
    })

    if (unsubscribe) {
      tokenRefreshUnsubscribeRef.current = unsubscribe
    }
  }, [])

  // Get and store token
  const getAndStoreToken = useCallback(async (): Promise<string | null> => {
    if (!user) {
      console.log('No user, skipping token generation')
      return null
    }

    try {
      setError(null)
      
      const result: TokenResult = await getFCMToken()
      
      if (result.success && result.token) {
        setToken(result.token)
        await registerTokenWithServer(user.id, result.token)
        return result.token
      } else {
        setError(result.error || 'Failed to get token')
        return null
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Token generation failed'
      console.error('Token generation error:', errorMessage)
      setError(errorMessage)
      return null
    }
  }, [user])

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      console.warn('FCM not supported')
      return 'denied'
    }

    try {
      const result = await requestNotificationPermission()
      
      if (result.success && result.permission) {
        setPermission(result.permission)
        
        if (result.permission === 'granted' && user) {
          await getAndStoreToken()
          setupTokenRefreshListener()
        }
        
        return result.permission
      } else {
        setError(result.error || 'Permission not granted')
        return result.permission || 'denied'
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Permission request failed'
      console.error('Permission request error:', errorMessage)
      setError(errorMessage)
      return 'denied'
    }
  }, [isSupported, user, getAndStoreToken, setupForegroundListener])

  // Setup token refresh listener
  const setupTokenRefreshListener = useCallback(() => {
    if (tokenRefreshUnsubscribeRef.current) {
      return // Already set up
    }

    const unsubscribe = onTokenRefreshCallback(async () => {
      console.log('🔄 Token refresh detected, getting new token...')
      await getAndStoreToken()
    })

    if (unsubscribe) {
      tokenRefreshUnsubscribeRef.current = unsubscribe
    }
  }, [getAndStoreToken])

  // Refresh token
  const refreshToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null
    return await getAndStoreToken()
  }, [user, getAndStoreToken])

  // Unregister token
  const unregisterToken = useCallback(async (): Promise<void> => {
    if (!user || !token) return

    try {
      await fetch('/api/notifications/fcm-token', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
        }),
      })

      setToken(null)
      console.log('Token unregistered')
    } catch (err) {
      console.error('Error unregistering token:', err)
    }
  }, [user, token])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tokenRefreshUnsubscribeRef.current) {
        tokenRefreshUnsubscribeRef.current()
      }
    }
  }, [])

  return {
    token,
    permission,
    isSupported,
    isLoading,
    error,
    requestPermission,
    refreshToken,
    unregisterToken,
  }
}
