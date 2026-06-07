'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/AuthContext'
import { useRouter, usePathname } from 'next/navigation'

interface SessionSyncProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function SessionSync({ children, fallback }: SessionSyncProps) {
  const { user, loading, initialized } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    if (!initialized || !loading) return
    const timer = setTimeout(() => {
      router.replace('/login?error=session_failed')
    }, 4000)
    return () => clearTimeout(timer)
  }, [initialized, loading, router])

  useEffect(() => {
    if (!initialized || loading) return

    const publicPaths = ['/', '/login', '/signup', '/auth/callback', '/about', '/mission', '/values', '/privacy', '/terms', '/medicines']
    const isPublicPath = publicPaths.some(path => pathname === path || pathname?.startsWith(`${path}/`))

    if (!isPublicPath && pathname?.startsWith('/')) {
      if (!user) {
        const currentPath = pathname
        router.replace(`/login?redirect=${encodeURIComponent(currentPath)}`)
        return
      }
    }

    setHasChecked(true)
  }, [initialized, loading, user, pathname, router])

  if (!initialized || loading) {
    return fallback || (
      <div className="fixed inset-0 flex items-center justify-center bg-transparent">
        <div className="relative">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!hasChecked) return null

  return <>{children}</>
}

export function useAuthCheck() {
  const { user, loading, initialized } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!initialized || loading) return

    const publicPaths = ['/', '/login', '/signup', '/auth/callback', '/about', '/mission', '/values', '/privacy', '/terms', '/medicines']
    const isPublicPath = publicPaths.some(path => pathname === path || pathname?.startsWith(`${path}/`))

    if (!isPublicPath && pathname?.startsWith('/')) {
      if (!user) {
        const currentPath = pathname
        router.replace(`/login?redirect=${encodeURIComponent(currentPath)}`)
      }
    }
  }, [initialized, loading, user, pathname, router])

  return { user, loading, initialized }
}
