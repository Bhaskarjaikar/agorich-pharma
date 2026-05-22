import { PushNotificationPayload, FCMDeviceToken } from './types'

export async function sendPushNotificationLegacy(
  deviceToken: string,
  payload: PushNotificationPayload
): Promise<{ success: boolean; error?: string }> {
  console.warn('Legacy FCM API is deprecated. Use Firebase Admin SDK instead.')
  return { success: false, error: 'Legacy API deprecated' }
}

export async function sendPushToMultipleDevicesLegacy(
  deviceTokens: string[],
  payload: PushNotificationPayload
): Promise<{ success: number; failed: number }> {
  console.warn('Legacy FCM API is deprecated. Use Firebase Admin SDK instead.')
  return { success: 0, failed: deviceTokens.length }
}

export async function sendPushToTopicLegacy(
  topic: string,
  payload: PushNotificationPayload
): Promise<{ success: boolean; error?: string }> {
  console.warn('Legacy FCM API is deprecated. Use Firebase Admin SDK instead.')
  return { success: false, error: 'Legacy API deprecated' }
}
