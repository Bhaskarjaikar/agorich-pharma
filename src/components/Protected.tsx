"use client"

import { ReactNode, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { supabase } from '@/lib/supabase-client'

export default function Protected({ children }: { children: ReactNode }) {
  const { user, loading, profile } = useSupabaseAuth()
  const router = useRouter()
  const pathname = usePathname()

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
    // If logged-in user has no profile (e.g., onboarding deleted), send to role-specific onboarding
    const currentPath = pathname || '/'
    if (!profile && currentPath !== '/onboarding' && currentPath !== '/onboarding/distributor' && currentPath !== '/onboarding/retailer') {
      const checkRoleAndRedirect = async () => {
        if (!user) return
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

          if (profileData?.role === 'DISTRIBUTOR') {
            console.log('[Protected] User is DISTRIBUTOR, skipping onboarding')
            router.replace('/distributor')
            return
          }
        } catch {}
        router.replace('/onboarding')
      }
      checkRoleAndRedirect()
    }

    // Role-based redirection
    if (profile) {
      const role = profile.role
      
      // Function to get correct dashboard for role
      const getDashboardForRole = (userRole: string) => {
        switch (userRole) {
          case 'SUPER_ADMIN':
          case 'ADMIN':
          case 'SUPPORT':
            return '/admin'
          case 'SALES':
            return '/sales'
          case 'LOGISTIC':
            return '/logistic'
          case 'DISTRIBUTOR':
            return '/distributor'
          case 'RETAILER':
            return '/retailer'
          default:
            return '/retailer'
        }
      }
      
      // Check if user is trying to access a dashboard they shouldn't
      let shouldRedirect = false
      const destination = getDashboardForRole(role)
      
      if (currentPath.startsWith('/admin') && !['SUPER_ADMIN', 'ADMIN', 'SALES', 'SUPPORT'].includes(role)) {
        shouldRedirect = true
      } else if (currentPath.startsWith('/retailer') && role !== 'RETAILER') {
        shouldRedirect = true
      } else if (currentPath.startsWith('/distributor') && role !== 'DISTRIBUTOR') {
        shouldRedirect = true
      } else if (currentPath.startsWith('/sales') && role !== 'SALES') {
        shouldRedirect = true
      } else if (currentPath.startsWith('/logistic') && role !== 'LOGISTIC') {
        shouldRedirect = true
      }
      
      if (shouldRedirect) {
        router.replace(destination)
      }
    }
  }, [loading, user, profile, router, pathname])

  // Show loading only for initial load, not for navigation
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-3"></div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
