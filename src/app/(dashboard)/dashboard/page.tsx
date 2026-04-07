'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { UserRole } from '@/lib/supabase-client'
import BackgroundSlideshow from '@/components/BackgroundSlideshow'

export default function UniversalDashboard() {
  const router = useRouter()
  const { user, profile, loading } = useSupabaseAuth()

  useEffect(() => {
    // Wait for auth to load
    if (loading) return

    // If no user, redirect to login
    if (!user) {
      router.replace('/login')
      return
    }

    // Check if user has admin role
    if (profile && (profile.role === 'SUPER_ADMIN')) {
      router.replace('/admin')
      return
    }

    // If profile doesn't exist or is incomplete, redirect to retailer dashboard
    // User can complete profile from settings page
    if (!profile) {
      router.replace('/retailer')
      return
    }

    // Redirect based on role
    const role = (profile.role || 'RETAILER') as UserRole

    switch (role) {
      case 'SUPER_ADMIN':
        router.replace('/admin')
        break
      case 'SALES':
        router.replace('/sales')
        break
      case 'LOGISTIC':
        router.replace('/logistic')
        break
      case 'SUPPORT':
        router.replace('/retailer')
        break
      case 'RETAILER':
      default:
        router.replace('/retailer')
        break
    }
  }, [user, profile, loading, router])

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden flex items-center justify-center">
      <BackgroundSlideshow
        images={["/slides/medics.jpg","/slides/red-fort.jpg","/slides/india-gate.jpg","/slides/india-flag.jpg"]}
        intervalMs={6000}
        overlayClassName="bg-black/60 md:bg-black/50"
        gradeClassName="bg-gradient-to-br from-sky-600/40 via-blue-900/35 to-slate-900/45 mix-blend-multiply"
        tintClassName="bg-sky-600/20 mix-blend-color"
        blurPx={4}
      />
      <div className="text-center z-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white/80">Redirecting...</p>
      </div>
    </div>
  )
}
