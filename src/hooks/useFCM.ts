'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/components/auth/AuthContext'
import { 
  getFCMToken, 
  requestNotificationPermission,
  onForegroundMessage,
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
  const messageListenerUnsubscribeRef = useRef<(() => void) | null>(null)

  // Get and store token with Supabase sync
  const getAndStoreToken = useCallback(async (): Promise<string | null> => {
    if (!user) {
      console.log('No authenticated user, skipping token generation')
      return null
    }

    try {
      setError(null)
      
      const result: TokenResult = await getFCMToken()
      
      if (result.success && result.token) {
        setToken(result.token)
        
        // Sync token with Supabase backend
        const syncSuccess = await registerTokenWithServer(user.id, result.token)
        
        if (syncSuccess) {
          console.log('✅ FCM token synced with Supabase')
          return result.token
        } else {
          setError('Failed to sync token with server')
          return null
        }
      } else {
        setError(result.error || 'Failed to get FCM token')
        return null
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Token generation failed'
      console.error('Token generation error:', errorMessage)
      setError(errorMessage)
      return null
    }
  }, [user])

  // Setup foreground message listener with duplicate prevention
  const setupForegroundListener = useCallback(() => {
    // Clean up existing listener
    if (messageListenerUnsubscribeRef.current) {
      messageListenerUnsubscribeRef.current()
      messageListenerUnsubscribeRef.current = null
    }

    const unsubscribe = onForegroundMessage((payload) => {
      console.log('📱 Foreground message received:', payload)
      
      // Only show in-app notification if app is focused
      if (typeof document !== 'undefined' && document.hasFocus()) {
        const notification = payload.notification
        if (notification) {
          toast(notification.title || 'New Notification', {
            description: notification.body,
            duration: 5000,
          })
        }
      } else {
        console.log('🔍 App not focused, notification handled by service worker')
      }
    })

    if (unsubscribe) {
      messageListenerUnsubscribeRef.current = unsubscribe
    }
  }, [])

  // Setup token refresh listener
  const setupTokenRefreshListener = useCallback(() => {
    // In Firebase v10+, token refresh is handled by:
    // 1. Listening for 'messaging/token-refresh' events
    // 2. Or catching errors when getToken() fails with 'messaging/token-unsubscribe'
    
    // We'll handle this in getFCMToken function
    console.log('🔄 Token refresh listener ready')
  }, [])

  // Request notification permission with all state handling
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      console.warn('FCM not supported in this browser')
      setError('FCM not supported')
      return 'denied'
    }

    try {
      const result = await requestNotificationPermission()
      
      if (result.success && result.permission) {
        setPermission(result.permission)
        
        if (result.permission === 'granted') {
          console.log('✅ Notification permission granted')
          
          if (user) {
            await getAndStoreToken()
            setupTokenRefreshListener()
          }
          
          // Setup foreground listener for in-app notifications
          setupForegroundListener()
          
        } else if (result.permission === 'denied') {
          console.warn('⚠️ Notification permission denied by user')
          setError('Notification permission denied. Please enable in browser settings.')
          
          // Save denied state to prevent repeated prompts
          if (typeof window !== 'undefined') {
            localStorage.setItem('fcm_permission_denied', 'true')
          }
          
        } else if (result.permission === 'default') {
          console.log('ℹ️ Notification permission not yet decided')
          setError('Notification permission not granted')
        }
        
        return result.permission
      } else {
        setError(result.error || 'Permission request failed')
        return 'denied'
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Permission request failed'
      console.error('Permission request error:', errorMessage)
      setError(errorMessage)
      return 'denied'
    }
  }, [isSupported, user, getAndStoreToken, setupTokenRefreshListener, setupForegroundListener])

  // Refresh token manually
  const refreshToken = useCallback(async (): Promise<string | null> => {
    if (!user) {
      setError('No authenticated user')
      return null
    }
    return await getAndStoreToken()
  }, [user, getAndStoreToken])

  // Unregister token from server
  const unregisterToken = useCallback(async (): Promise<void> => {
    if (!user || !token) {
      console.log('No token to unregister')
      return
    }

    try {
      const response = await fetch('/api/notifications/fcm-token', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          device_token: token,
        }),
      })

      if (response.ok) {
        setToken(null)
        console.log('✅ FCM token unregistered from server')
      } else {
        console.error('Failed to unregister token:', response.status)
        setError('Failed to unregister token')
      }
    } catch (err) {
      console.error('Error unregistering token:', err)
      setError('Error unregistering token')
    }
  }, [user, token])

  // Initialize FCM on mount
  useEffect(() => {
    const initialize = async () => {
      // Prevent multiple initializations
      if (initializationRef.current) return
      initializationRef.current = true

      try {
        // Check if messaging is supported
        const supported = await checkMessagingSupport()
        setIsSupported(supported)
        
        if (!supported) {
          console.log('FCM not supported in this browser')
          setIsLoading(false)
          return
        }

        // Get current permission state
        const currentPermission = getNotificationPermission()
        setPermission(currentPermission)

        // Check if permission was previously denied
        if (typeof window !== 'undefined') {
          const wasDenied = localStorage.getItem('fcm_permission_denied') === 'true'
          if (wasDenied && currentPermission === 'default') {
            setPermission('denied')
            setError('Notifications previously denied. Enable in browser settings.')
          }
        }

        // If permission is granted and user is logged in, get token
        if (currentPermission === 'granted' && user) {
          await getAndStoreToken()
        }

        // Setup foreground message listener
        setupForegroundListener()

        // Also listen for service worker messages directly
        if ('serviceWorker' in navigator) {
          const handleServiceWorkerMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'PUSH_FOREGROUND_MESSAGE') {
              console.log('📱 Direct service worker push message:', event.data.payload)
              
              // Only show in-app notification if app is focused
              if (typeof document !== 'undefined' && document.hasFocus()) {
                const data = event.data.payload
                const notificationData = data.notification || data.data || data
                
                if (notificationData.title || notificationData.body) {
                  toast(notificationData.title || 'New Notification', {
                    description: notificationData.body || notificationData.message,
                    duration: 5000,
                  })
                }
              }
            }
          }

          navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)
          
          // Store combined cleanup function
          const existingCleanup = messageListenerUnsubscribeRef.current
          messageListenerUnsubscribeRef.current = () => {
            // Clean up Firebase message listener
            if (existingCleanup) {
              existingCleanup()
            }
            // Clean up service worker message listener
            navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
          }
        }

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
  }, [user, permission, isSupported, token, getAndStoreToken])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (messageListenerUnsubscribeRef.current) {
        messageListenerUnsubscribeRef.current()
        messageListenerUnsubscribeRef.current = null
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
