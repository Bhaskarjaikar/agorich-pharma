"use client"

import { ReactNode, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'

export default function Protected({ children }: { children: ReactNode }) {
  const { user, loading, profile } = useSupabaseAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [timeoutReached, setTimeoutReached] = useState(false)

  useEffect(() => {
    // Safety timeout - if loading takes too long, show content anyway
    const timer = setTimeout(() => {
      if (loading) {
        setTimeoutReached(true)
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [loading])

  useEffect(() => {
    if (loading) return
    if (!user) {
      const doRedirect = async () => {
        await new Promise(r => setTimeout(r, 100))
        router.replace('/login')
      }
      doRedirect()
      return
    }
    // If logged-in user has no profile (e.g., onboarding deleted), send to onboarding
    const currentPath = pathname || '/'
    if (!profile && currentPath !== '/onboarding') {
      router.replace('/onboarding')
    }
  }, [loading, user, profile, router, pathname])

  // Show loading only for initial load, not for navigation
  if (loading && !timeoutReached && !user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-3"></div>
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400">Redirecting...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
