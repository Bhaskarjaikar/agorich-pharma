'use client'

import { useEffect } from 'react'
import { useFCM } from '@/hooks/useFCM'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { toast } from 'sonner'

export default function FCMInitializer() {
  const { user } = useSupabaseAuth()
  const { token, permission, isSupported, isLoading, error, requestPermission } = useFCM({
    userId: user?.id
  })

  useEffect(() => {
    if (!isLoading && isSupported && permission === 'default') {
      const askPermission = async () => {
        const result = await requestPermission((payload: any) => {
          console.log('FCM message received:', payload)
          toast(payload.notification?.title || 'New Notification', {
            description: payload.notification?.body,
            duration: 5000,
          })
        })
        
        if (result === 'granted') {
          console.log('FCM permission granted')
        } else if (result === 'denied') {
          console.log('FCM permission denied')
        }
      }
      
      askPermission()
    }
  }, [isLoading, isSupported, permission, requestPermission])

  useEffect(() => {
    if (token) {
      console.log('FCM token:', token)
    }
  }, [token])

  useEffect(() => {
    if (error) {
      console.error('FCM error:', error)
    }
  }, [error])

  if (!isSupported) {
    console.log('FCM not supported on this browser')
    return null
  }

  return null
}