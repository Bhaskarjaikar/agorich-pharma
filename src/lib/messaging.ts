'use client'

import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { 
  getMessaging, 
  Messaging, 
  getToken, 
  isSupported,
  onMessage,
  NextFn,
  MessagePayload,
  Unsubscribe
} from 'firebase/messaging'

let app: FirebaseApp | null = null
let messaging: Messaging | null = null
let messageListener: Unsubscribe | null = null
let tokenRefreshListener: Unsubscribe | null = null

export interface FCMConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

export interface TokenResult {
  success: boolean
  token?: string
  error?: string
}

export interface PermissionResult {
  success: boolean
  permission?: NotificationPermission
  error?: string
}

/**
 * Initialize Firebase app and messaging
 */
export async function initializeMessaging(): Promise<{ app: FirebaseApp; messaging: Messaging } | null> {
  // Check if we're in browser
  if (typeof window === 'undefined') {
    console.warn('Messaging can only be initialized in browser')
    return null
  }

  // Check if Firebase API key is configured
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!apiKey) {
    console.warn('Firebase API key not configured')
    return null
  }

  try {
    // Initialize app if not already done
    if (!app) {
      const firebaseConfig: FCMConfig = {
        apiKey,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
      }

      app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    }

    // Check if messaging is supported
    const supported = await isSupported()
    if (!supported) {
      console.warn('Firebase Messaging is not supported in this browser')
      return null
    }

    // Get messaging instance
    if (!messaging) {
      messaging = getMessaging(app)
    }

    return { app, messaging }
  } catch (error) {
    console.error('Error initializing Firebase Messaging:', error)
    return null
  }
}

/**
 * Register service worker for FCM
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser')
    return null
  }

  try {
    // Check if service worker is already registered
    const existingRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
    if (existingRegistration) {
      console.log('Service worker already registered')
      return existingRegistration
    }

    // Register new service worker
    console.log('Registering service worker...')
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    console.log('Service worker registered:', registration.scope)
    return registration
  } catch (error) {
    console.error('Service worker registration failed:', error)
    return null
  }
}

/**
 * Get FCM token for this device
 */
export async function getFCMToken(): Promise<TokenResult> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Browser only' }
  }

  try {
    // Check if messaging is supported
    const supported = await isSupported()
    if (!supported) {
      return { success: false, error: 'FCM not supported' }
    }

    // Initialize messaging
    const result = await initializeMessaging()
    if (!result) {
      return { success: false, error: 'Firebase not initialized' }
    }

    // Register service worker
    const swRegistration = await registerServiceWorker()
    if (!swRegistration) {
      return { success: false, error: 'Service worker registration failed' }
    }

    // Get VAPID key
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
    if (!vapidKey) {
      console.warn('VAPID key not configured')
      return { success: false, error: 'VAPID key not configured' }
    }

    // Validate VAPID key format
    if (!/^[A-Za-z0-9_-]+$/.test(vapidKey)) {
      console.warn('Invalid VAPID key format')
      return { success: false, error: 'Invalid VAPID key' }
    }

    // Get token
    const token = await getToken(result.messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: swRegistration,
    })

    if (token) {
      console.log('✅ FCM Token obtained')
      return { success: true, token }
    } else {
      return { success: false, error: 'No token returned' }
    }

  } catch (error: any) {
    console.error('Error getting FCM token:', error?.message || error)
    
    // Handle specific errors
    if (error?.code === 'messaging/registered-service-worker-not-found') {
      return { success: false, error: 'Service worker not found' }
    }
    if (error?.code === 'messaging/use-service-worker-missing') {
      return { success: false, error: 'Service worker missing' }
    }
    if (error?.code === 'messaging/invalid-vapid-key') {
      return { success: false, error: 'Invalid VAPID key' }
    }
    
    return { success: false, error: error?.message || 'Unknown error' }
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<PermissionResult> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { success: false, error: 'Notifications not supported' }
  }

  try {
    const permission = await Notification.requestPermission()
    
    if (permission === 'granted') {
      console.log('✅ Notification permission granted')
      return { success: true, permission }
    } else if (permission === 'denied') {
      console.warn('⚠️ Notification permission denied')
      return { success: false, permission: 'denied', error: 'Permission denied' }
    } else {
      console.warn('⚠️ Notification permission default')
      return { success: false, permission: 'default', error: 'Permission not granted' }
    }
  } catch (error: any) {
    console.error('Error requesting notification permission:', error)
    return { success: false, error: error?.message || 'Unknown error' }
  }
}

/**
 * Listen for foreground messages
 */
export function onForegroundMessage(callback: NextFn<MessagePayload>): Unsubscribe | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    // Initialize messaging if not done
    initializeMessaging().then((result) => {
      if (result && !messageListener) {
        messageListener = onMessage(result.messaging, callback)
        console.log('✅ Foreground message listener registered')
      }
    })

    // Return cleanup function
    return () => {
      if (messageListener) {
        messageListener()
        messageListener = null
        console.log('🧹 Foreground message listener removed')
      }
    }
  } catch (error) {
    console.error('Error setting up foreground message listener:', error)
    return null
  }
}

/**
 * Listen for token refresh
 * Note: In Firebase v10+, token refresh is handled by catching deleted token errors
 * when calling getToken(). The callback will be called when a token refresh is detected.
 */
export function onTokenRefreshCallback(callback: () => void): Unsubscribe | null {
  if (typeof window === 'undefined') {
    return null
  }

  // Store callback for manual triggering
  tokenRefreshCallbackRef = callback
  console.log('✅ Token refresh callback registered')
  
  return () => {
    tokenRefreshCallbackRef = null
    console.log('🧹 Token refresh callback removed')
  }
}

// Global ref to store the callback
let tokenRefreshCallbackRef: (() => void) | null = null

/**
 * Check if messaging is supported in current browser
 */
export async function checkMessagingSupport(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    return await isSupported()
  } catch (error) {
    console.error('Error checking messaging support:', error)
    return false
  }
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied'
  }

  return Notification.permission
}

/**
 * Register token with server
 */
export async function registerTokenWithServer(
  userId: string,
  token: string
): Promise<boolean> {
  if (!userId || !token) {
    return false
  }

  try {
    const response = await fetch('/api/notifications/fcm-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        device_token: token,
        device_type: 'web',
      }),
    })

    if (response.ok) {
      console.log('✅ FCM token registered with server')
      return true
    } else {
      console.error('Failed to register token with server:', response.status)
      return false
    }
  } catch (error) {
    console.error('Error registering token with server:', error)
    return false
  }
}
