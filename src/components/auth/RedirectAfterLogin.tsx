"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'

/**
 * RedirectAfterLogin
 *
 * Client component that runs immediately after a user lands on an auth-protected area
 * and decides where to send them based on their Supabase profile metadata.
 *
 * Rules:
 * - If user id === 723421ed-f226-41f0-bb09-3feb55e3e293: redirect to /admin/dashboard
 * - Else read profiles.role and redirect:
 *   - SUPER_ADMIN     -> /admin/dashboard
 *   - RETAILER  -> /retailer/dashboard
 *   - LOGISTIC  -> /logistics/dashboard
 * - If profile is missing or user is unverified -> /login
 *
 * Shows a simple Loading... state while checking.
 */
export default function RedirectAfterLogin() {
  // Local loading + optional error (not shown to user to avoid flicker)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    // Perform auth + role check
    const run = async () => {
      try {
        // 1) Get current user from Supabase Auth
        const { data: userResp, error: userErr } = await supabase.auth.getUser()
        if (userErr) {
          // If token is invalid/expired, push to login
          if (!cancelled) router.replace('/login')
          return
        }

        const user = userResp?.user || null
        if (!user) {
          if (!cancelled) router.replace('/login')
          return
        }

        // 2) Special-case: hard override for the specified SUPER_ADMIN user
        if (user.id === '723421ed-f226-41f0-bb09-3feb55e3e293') {
          if (!cancelled) router.replace('/admin/dashboard')
          return
        }

        // 3) Fetch profile metadata (role + is_verified)
        const { data: profile, error: profErr } = await supabase
          .from('profiles')
          .select('role, is_verified')
          .eq('id', user.id)
          .maybeSingle()

        // If profile cannot be read or not present, send to login by default
        if (profErr || !profile) {
          if (!cancelled) router.replace('/login')
          return
        }

        // 4) If not verified, default to login (can change to onboarding if needed)
        if (profile.is_verified === false) {
          if (!cancelled) router.replace('/login')
          return
        }

        // 5) Role-based redirects
        const role = (profile.role || 'RETAILER') as string
        switch (role) {
          case 'SUPER_ADMIN':
            if (!cancelled) router.replace('/admin/dashboard')
            break
          case 'LOGISTIC':
            if (!cancelled) router.replace('/logistics/dashboard')
            break
          case 'RETAILER':
          default:
            if (!cancelled) router.replace('/retailer/dashboard')
            break
        }
      } catch {
        // On any unexpected error, fail safe to login
        if (!cancelled) router.replace('/login')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [router])

  // 6) Loading state while we decide
  if (loading) {
    return <div className="p-6 text-center">Loading...</div>
  }

  // This component never actually renders post-redirect
  return null
}
