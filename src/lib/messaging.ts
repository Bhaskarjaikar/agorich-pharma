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
const tokenRefreshListener: Unsubscribe | null = null

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
 * Initialize Firebase app and messaging with SSR safety
 */
export async function initializeMessaging(): Promise<{ app: FirebaseApp; messaging: Messaging } | null> {
  // Strict SSR safety check
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null
  }

  // Check if Firebase API key is configured
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!apiKey) {
    console.warn('Firebase API key not configured')
    return null
  }

  // Check browser support before any Firebase initialization
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    console.warn('Browser does not support required features for FCM')
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
    // Reset on error to allow retry
    app = null
    messaging = null
    return null
  }
}

/**
 * Register service worker for FCM with proper scoping and error handling
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  // Strict SSR and browser support checks
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null
  }

  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser')
    return null
  }

  try {
    // First, check for existing registration with proper scope
    const existingRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
    
    if (existingRegistration) {
      console.log('✅ Service worker already registered:', existingRegistration.scope)
      
      // Ensure the service worker is active
      if (existingRegistration.active) {
        return existingRegistration
      } else if (existingRegistration.installing) {
        // Wait for installation to complete
        await new Promise<void>((resolve) => {
          existingRegistration.installing!.addEventListener('statechange', () => {
            if (existingRegistration.installing!.state === 'activated') {
              resolve()
            }
          })
        })
        return existingRegistration
      }
    }

    // Register new service worker with explicit scope
    console.log('📦 Registering service worker...')
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
      type: 'classic'
    })

    console.log('✅ Service worker registered:', registration.scope)

    // Wait for the service worker to be ready
    if (registration.installing) {
      await new Promise<void>((resolve) => {
        registration.installing!.addEventListener('statechange', () => {
          if (registration.installing!.state === 'activated') {
            console.log('✨ Service worker activated')
            resolve()
          }
        })
      })
    } else if (registration.waiting) {
      // If it's waiting, skip waiting to activate
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }

    return registration

  } catch (error: any) {
    console.error('❌ Service worker registration failed:', error)
    
    // Provide specific error messages for common issues
    if (error?.name === 'SecurityError') {
      console.error('⚠️ Service worker registration blocked by security policy. Ensure HTTPS or localhost.')
    } else if (error?.name === 'TypeError') {
      console.error('⚠️ Service worker script not found or invalid.')
    }
    
    return null
  }
}

/**
 * Get FCM token for this device with proper service worker registration
 */
export async function getFCMToken(): Promise<TokenResult> {
  // Strict SSR check
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { success: false, error: 'Browser only' }
  }

  try {
    // Step 1: Check browser support
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      return { success: false, error: 'Browser does not support required features' }
    }

    // Step 2: Check if messaging is supported
    const supported = await isSupported()
    if (!supported) {
      return { success: false, error: 'Firebase Messaging not supported' }
    }

    // Step 3: Register service worker FIRST (before Firebase initialization)
    const swRegistration = await registerServiceWorker()
    if (!swRegistration) {
      return { success: false, error: 'Service worker registration failed' }
    }

    // Step 4: Ensure service worker is active and ready
    if (!swRegistration.active) {
      return { success: false, error: 'Service worker not active' }
    }

    // Step 5: Initialize Firebase messaging
    const result = await initializeMessaging()
    if (!result) {
      return { success: false, error: 'Firebase initialization failed' }
    }

    // Step 6: Get VAPID key
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
    if (!vapidKey) {
      console.warn('VAPID key not configured')
      return { success: false, error: 'VAPID key not configured' }
    }

    // Step 7: Validate VAPID key format
    if (!/^[A-Za-z0-9_-]+$/.test(vapidKey)) {
      console.warn('Invalid VAPID key format')
      return { success: false, error: 'Invalid VAPID key format' }
    }

    // Step 8: Get FCM token with proper configuration
    const token = await getToken(result.messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: swRegistration,
    })

    if (token) {
      console.log('✅ FCM Token obtained successfully')
      return { success: true, token }
    } else {
      return { success: false, error: 'No token returned from Firebase' }
    }

  } catch (error: any) {
    console.error('❌ Error getting FCM token:', error)
    
    // Handle specific Firebase messaging errors
    if (error?.code) {
      switch (error.code) {
        case 'messaging/permission-blocked':
          return { success: false, error: 'Notification permission blocked by browser' }
        case 'messaging/permission-default':
          return { success: false, error: 'Notification permission not granted' }
        case 'messaging/registered-service-worker-not-found':
          return { success: false, error: 'Service worker not found. Please refresh the page.' }
        case 'messaging/use-service-worker-missing':
          return { success: false, error: 'Service worker registration missing' }
        case 'messaging/invalid-vapid-key':
          return { success: false, error: 'Invalid VAPID key configuration' }
        case 'messaging/failed-service-worker-registration':
          return { success: false, error: 'Service worker registration failed' }
        case 'messaging/token-unsubscribe':
        case 'messaging/token-update':
          // Token needs refresh, trigger callback
          triggerTokenRefresh()
          return { success: false, error: 'Token needs refresh' }
      }
    }
    
    return { success: false, error: error?.message || 'Unknown error getting FCM token' }
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
 * Listen for foreground messages with duplicate prevention
 */
export function onForegroundMessage(callback: NextFn<MessagePayload>): Unsubscribe | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null
  }

  try {
    // Clean up existing listener first
    if (messageListener) {
      messageListener()
      messageListener = null
    }

    // Initialize messaging
    initializeMessaging().then((result) => {
      if (result) {
        // Set up Firebase onMessage listener
        messageListener = onMessage(result.messaging, (payload) => {
          console.log('📱 Firebase foreground message received:', payload)
          
          // Check if app is focused to prevent duplicates
          if (document.hasFocus()) {
            console.log('🎯 App is focused, handling message in-app')
            callback(payload)
          } else {
            console.log('🔍 App not focused, allowing service worker notification')
          }
        })
        
        console.log('✅ Firebase foreground message listener registered')
      }
    })

    // Also listen for service worker messages (for legacy push or forwarded messages)
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'FCM_FOREGROUND_MESSAGE') {
        console.log('📱 Service worker forwarded message:', event.data.payload)
        
        // Check if app is focused
        if (document.hasFocus()) {
          console.log('🎯 App is focused, handling forwarded message in-app')
          callback(event.data.payload)
        }
      }
    }

    // Add service worker message listener
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)

    // Return cleanup function
    return () => {
      // Clean up Firebase listener
      if (messageListener) {
        messageListener()
        messageListener = null
        console.log('🧹 Firebase foreground message listener removed')
      }
      
      // Clean up service worker listener
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
      console.log('🧹 Service worker message listener removed')
    }
  } catch (error) {
    console.error('❌ Error setting up foreground message listener:', error)
    return null
  }
}

/**
 * Listen for token refresh
 * In Firebase v10+, token refresh is handled by:
 * 1. Listening for 'messaging/token-refresh' events
 * 2. Catching errors when getToken() fails with specific error codes
 */
export function onTokenRefreshCallback(callback: () => void): Unsubscribe | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
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
 * Trigger token refresh callback (to be called from getFCMToken on specific errors)
 */
export function triggerTokenRefresh(): void {
  if (tokenRefreshCallbackRef) {
    console.log('🔄 Triggering token refresh callback')
    tokenRefreshCallbackRef()
  }
}

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
