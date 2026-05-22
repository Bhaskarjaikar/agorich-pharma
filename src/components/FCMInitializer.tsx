'use client'

import { useEffect } from 'react'
import { useFCM } from '@/hooks/useFCM'
import { toast } from 'sonner'

export default function FCMInitializer() {
  const { token, permission, isSupported, isLoading, requestPermission } = useFCM()

  useEffect(() => {
    if (!isLoading && isSupported && permission === 'default') {
      const askPermission = async () => {
        const result = await requestPermission()
        
        if (result === 'granted') {
          console.log('FCM permission granted')
        } else if (result === 'denied') {
          console.log('FCM permission denied')
        }
      }
      
      askPermission()
    }
  }, [isLoading, isSupported, permission])

  useEffect(() => {
    if (token) {
      console.log('FCM token:', token)
    }
  }, [token])

  if (!isSupported) {
    console.log('FCM not supported on this browser')
    return null
  }

  return null
}