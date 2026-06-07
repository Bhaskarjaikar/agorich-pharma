'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Spinner } from '@phosphor-icons/react'
import Image from 'next/image'

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const checkAndRedirect = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          if (!cancelled) {
            router.replace('/login?redirect=%2Fonboarding')
          }
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (cancelled) return

        if (profileError && profileError.code !== 'PGRST116') {
          console.warn('Profile fetch error:', profileError)
        }

        if (profile?.role === 'DISTRIBUTOR') {
          router.replace('/onboarding/distributor')
        } else {
          router.replace('/onboarding/retailer')
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Onboarding redirect error:', err)
          setError('Something went wrong. Please try again.')
          setLoading(false)
        }
      }
    }

    checkAndRedirect()
    return () => { cancelled = true }
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-5">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Image src="/agorich-logo.png" alt="Agorich" width={64} height={64} priority className="rounded" />
          </div>
          <Spinner className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white/80">Redirecting to onboarding...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-5">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <Image src="/agorich-logo.png" alt="Agorich" width={64} height={64} priority className="rounded" />
        </div>
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => router.push('/login')}
          className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
        >
          Go to Login
        </button>
      </div>
    </div>
  )
}