import * as admin from 'firebase-admin'
import { createClient } from '@supabase/supabase-js'

let isInitialized = false

export function initFirebaseAdmin(): admin.app.App | null {
  if (typeof window !== 'undefined') {
    console.warn('Firebase Admin can only be used on server-side')
    return null
  }

  if (isInitialized) {
    return admin.app()
  }

  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }

    if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
      console.warn('Firebase service account credentials not configured')
      return null
    }

    if (admin.apps.length > 0) {
      isInitialized = true
      return admin.apps[0]!
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })

    isInitialized = true
    return admin.app()
  } catch (error) {
    console.error('Firebase Admin initialization error:', error)
    return null
  }
}

export interface PushNotificationPayload {
  title: string
  body: string
  image?: string
  icon?: string
  click_action?: string
  data?: Record<string, string>
  actions?: Array<{ action: string; title: string; icon?: string }>
}

export async function sendPushNotification(
  deviceToken: string,
  payload: PushNotificationPayload
): Promise<{ success: boolean; error?: string }> {
  if (typeof window !== 'undefined') {
    return { success: false, error: 'Server-side only' }
  }

  const app = initFirebaseAdmin()
  if (!app) {
    return { success: false, error: 'Firebase Admin not initialized' }
  }

  try {
    const message: admin.messaging.Message = {
      notification: {
        title: payload.title,
        body: payload.body,
      },
      token: deviceToken,
      data: payload.data,
      webpush: {
        notification: {
          icon: payload.icon || '/agorich-logo.png',
          badge: '/agorich-logo.png',
          image: payload.image,
          click_action: payload.click_action || payload.data?.click_action || '/dashboard',
          requireInteraction: false,
          actions: payload.actions?.slice(0, 2) as any,
        },
        fcmOptions: {
          link: payload.click_action || payload.data?.click_action || '/dashboard',
        },
      },
      android: {
        priority: 'high' as const,
        notification: {
          channelId: 'agorich_notifications',
          defaultSound: true,
          defaultVibrateTimings: true,
          imageUrl: payload.image,
          clickAction: payload.click_action || payload.data?.click_action || 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        payload: {
          aps: {
            badge: 1,
            sound: 'default',
            'mutable-content': 1,
          },
        },
        fcmOptions: {
          imageUrl: payload.image,
        },
      },
    }

    const response = await admin.messaging(app).send(message)
    console.log('✅ FCM push sent successfully:', response)
    return { success: true }
  } catch (error) {
    console.error('❌ FCM send error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function sendPushToMultipleDevices(
  deviceTokens: string[],
  payload: PushNotificationPayload
): Promise<{ success: number; failed: number }> {
  if (deviceTokens.length === 0) {
    return { success: 0, failed: 0 }
  }

  let success = 0
  let failed = 0

  for (const token of deviceTokens) {
    const result = await sendPushNotification(token, payload)
    if (result.success) {
      success++
    } else {
      failed++
    }
  }

  return { success, failed }
}

export async function sendPushToTopic(
  topic: string,
  payload: PushNotificationPayload
): Promise<{ success: boolean; error?: string }> {
  if (typeof window !== 'undefined') {
    return { success: false, error: 'Server-side only' }
  }

  const app = initFirebaseAdmin()
  if (!app) {
    return { success: false, error: 'Firebase Admin not initialized' }
  }

  try {
    const message: admin.messaging.Message = {
      notification: {
        title: payload.title,
        body: payload.body,
      },
      topic,
      data: payload.data,
      webpush: {
        notification: {
          icon: '/agorich-logo.png',
          badge: '/agorich-logo.png',
          image: payload.image,
          click_action: payload.click_action || '/dashboard',
        },
      },
    }

    await admin.messaging(app).send(message)
    return { success: true }
  } catch (error) {
    console.error('FCM topic send error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}