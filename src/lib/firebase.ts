import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getMessaging, Messaging, getToken, onMessage, NotificationPayload } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

let app: FirebaseApp | null = null
let messaging: Messaging | null = null
let serviceWorkerRegistration: ServiceWorkerRegistration | null = null

export async function initFirebase(): Promise<{ app: FirebaseApp; messaging: Messaging } | null> {
  if (typeof window === 'undefined') {
    return null
  }

  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    console.warn('Firebase API key not configured')
    return null
  }

  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
  }

  if (!serviceWorkerRegistration) {
    serviceWorkerRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js') ?? null
  }

  if (!messaging) {
    messaging = getMessaging(app)
  }

  return { app, messaging }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('Service worker not supported in this browser')
    return null
  }

  const existingRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
  if (existingRegistration) {
    console.log('Service worker already registered')
    serviceWorkerRegistration = existingRegistration
    return existingRegistration
  }

  try {
    console.log('Registering service worker...')
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    console.log('Service worker registered:', registration.scope)
    serviceWorkerRegistration = registration
    return registration
  } catch (error) {
    console.error('Service worker registration failed:', error)
    return null
  }
}

export async function getFCMToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null
  }

  const swRegistration = await registerServiceWorker()
  if (!swRegistration) {
    console.error('Service worker registration failed, cannot get FCM token')
    return null
  }

  const firebase = await initFirebase()
  if (!firebase) {
    console.error('Firebase initialization failed')
    return null
  }

  try {
    const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

    // Validate VAPID key exists and is in correct format
    if (!VAPID_KEY) {
      return null
    }

    // Basic validation: VAPID key should be base64 URL encoded
    const isValidVapidKey = /^[A-Za-z0-9_-]+$/.test(VAPID_KEY)
    if (!isValidVapidKey) {
      return null
    }

    const token = await getToken(firebase.messaging, {
      vapidKey: VAPID_KEY,
    })

    return token
  } catch {
    return null
  }
}

export async function onFCMMessage(callback: (payload: NotificationPayload) => void): Promise<() => void> {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const firebase = await initFirebase()
  if (!firebase) {
    return () => {}
  }

  const unsubscribe = onMessage(firebase.messaging, (payload: any) => {
    console.log('FCM Message received:', payload)
    callback(payload as NotificationPayload)
  })

  return unsubscribe
}

export function isFirebaseSupported(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
}
