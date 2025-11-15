"use client"

import { ReactNode, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'

export default function Protected({ children }: { children: ReactNode }) {
  const { user, loading, profile } = useSupabaseAuth()
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()

  useEffect(() => {
    if (loading) return
    if (!user) {
      const doRedirect = async () => {
        // Small delay to let session hydrate
        await new Promise(r => setTimeout(r, 250))
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
  }, [loading, user, profile, router, pathname, search])

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>
  }

  if (!user) return <div className="p-6 text-center">Redirecting...</div>

  return <>{children}</>
}
