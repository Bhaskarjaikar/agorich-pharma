'use client'

import { useState, useEffect, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { Profile, UserRole } from '@/lib/supabase-client'

const SUPER_ADMIN_ID = '723421ed-f226-41f0-bb09-3feb55e3e293'

export interface AuthUser {
  id: string
  email?: string
  role?: UserRole
}

interface SupabaseErrorLike {
  code?: string
  message?: string
}

export interface UseSupabaseAuthReturn {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

/**
 * Centralized authentication hook with proper error handling
 * Handles session management, profile loading, and graceful error recovery
 */
export function useSupabaseAuth(): UseSupabaseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (isHydrated) {
      try {
        const cachedProfile = localStorage.getItem('cached_profile')
        if (cachedProfile) {
          const parsedProfile = JSON.parse(cachedProfile)
          setProfile(parsedProfile)
        }
      } catch (error) {
        console.error('Error loading cached profile:', error)
      }
    }
  }, [isHydrated])

  // Load user profile from database
  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      // If there's an error, check what type it is
      if (error) {
        const supabaseError = error as SupabaseErrorLike
        const errorCode = supabaseError.code
        const errorMessage = supabaseError.message
        // Treat errors with no code/message as "empty"
        const isEmptyError = !errorCode && !errorMessage

        // Check if it's a "not found" error (expected for new users)
        const hasNotfoundCode = errorCode === 'PGRST116' || errorCode === 'PGRST200' || errorCode === 'PGRST205'
        const hasNotfoundMessage =
          typeof errorMessage === 'string' && (
            errorMessage.toLowerCase().includes('no rows') ||
            errorMessage.toLowerCase().includes('not found')
          )

        // Check if it's a server error (500) - likely RLS policy issue
        const isServerError =
          errorCode === '500' ||
          (typeof errorMessage === 'string' && (
            errorMessage.includes('500') ||
            errorMessage.toLowerCase().includes('internal server error')
          ))

        // Handle empty errors, "not found" errors, and server errors silently
        if (isEmptyError || hasNotfoundCode || hasNotfoundMessage || isServerError) {
          if (isServerError) {
            console.warn('Server error loading profile (likely RLS policy issue):', error)
          }
          // For empty errors and not found errors, don't log anything
          // But keep the cached profile if available
          return
        }

        // Only log other real errors with actual content; avoid printing empty objects
        if (errorCode || errorMessage) {
          console.error(
            `Error loading profile: code=${errorCode ?? 'unknown'} message=${errorMessage ?? 'unknown'}`
          )
        } else {
          // If error exists but has no code/message, treat as empty
          console.debug('Empty error object received while loading profile')
        }
        // Don't set profile to null - keep cached version
        return
      }

      // Set profile if data exists
      if (data) {
        setProfile(data)
        // Save to localStorage
        try {
          localStorage.setItem('cached_profile', JSON.stringify(data))
        } catch (storageError) {
          console.error('Error saving profile to localStorage:', storageError)
        }
      }
    } catch (err: unknown) {
      const error = err as SupabaseErrorLike

      const lowerMessage = typeof error.message === 'string' ? error.message.toLowerCase() : ''

      // Only log if it's a meaningful error (not just "not found" or empty)
      const isNotFound =
        error.code === 'PGRST116' ||
        error.code === 'PGRST200' ||
        error.code === 'PGRST205' ||
        lowerMessage.includes('no rows') ||
        lowerMessage.includes('not found') ||
        (!error.code && !error.message) // Empty error object

      // For empty error objects or "not found" errors, don't log anything
      if (!isNotFound) {
        const code = error.code
        const message = error.message
        if (code || message) {
          console.error(`Error in loadProfile: code=${code ?? 'unknown'} message=${message ?? 'unknown'}`)
        }
      }
      // Don't set profile to null - keep cached version
    }
  }, [])

  // Refresh profile data
  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await loadProfile(user.id)
    }
  }, [user?.id, loadProfile])

  useEffect(() => {
    let mounted = true
    let authSubscription: { unsubscribe: () => void } | null = null

    const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          setTimeout(() => reject(new Error('AUTH_TIMEOUT')), ms)
        }),
      ])
    }

    // Initialize auth state
    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession }, error: sessionError } = await withTimeout(supabase.auth.getSession(), 4000)

        if (!mounted) return

        if (sessionError) {
          const msg = typeof sessionError.message === 'string' ? sessionError.message : ''
          const lowerMsg = msg.toLowerCase()
          console.error('Error getting session:', sessionError)
          // If refresh token is invalid/missing/not found, clear local auth and go to login
          if (lowerMsg.includes('invalid refresh token') || lowerMsg.includes('refresh token not found')) {
            console.warn('Invalid or missing refresh token, signing out and redirecting to login')
            try {
              await supabase.auth.signOut({ scope: 'local' })
            } catch {}
            router.replace('/login')
            setLoading(false)
            return
          }
          setLoading(false)
          return
        }

        setSession(initialSession)
        setUser(initialSession?.user ?? null)

        // Load profile if user exists
        if (initialSession?.user) {
          await loadProfile(initialSession.user.id)
        }

        setLoading(false)

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (!mounted) return

          console.log('Auth state changed:', event, newSession?.user?.id)

          setSession(newSession)
          setUser(newSession?.user ?? null)

          if (newSession?.user) {
            await loadProfile(newSession.user.id)
          } else {
            setProfile(null)
          }

          // Handle specific events
          if (event === 'SIGNED_OUT') {
            router.push('/')
          } else if (event === 'SIGNED_IN' && newSession?.user) {
            // Load profile immediately - no delay to prevent race conditions
            // Login page will handle waiting and redirects
            try {
              await loadProfile(newSession.user.id)
            } catch {
              // Silent fail - profile might not exist yet
            }
          } else if (event === 'TOKEN_REFRESHED') {
            // If refresh failed and session is null, force re-login
            if (!newSession) {
              try {
                await supabase.auth.signOut({ scope: 'local' })
              } catch {}
              router.replace('/login')
            }
          }
        })

        authSubscription = subscription
      } catch (error) {
        if ((error as Error | undefined)?.message === 'AUTH_TIMEOUT') {
          try {
            await supabase.auth.signOut({ scope: 'local' })
          } catch {}
          if (mounted) {
            setUser(null)
            setSession(null)
            setProfile(null)
            setLoading(false)
          }
          router.replace('/login?error=session_failed')
          return
        }

        console.error('Error initializing auth:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    return () => {
      mounted = false
      if (authSubscription) {
        authSubscription.unsubscribe()
      }
    }
  }, [router, loadProfile])

  const signInWithGoogle = useCallback(async () => {
    try {
      // Build redirect URL - use EXACT current hostname (clean, no query params)
      // Supabase must have this exact URL in redirect URLs list
      const baseCallback = (() => {
        if (typeof window === 'undefined') return '/auth/callback'
        const loc = window.location
        const hostname = loc.hostname === '0.0.0.0' ? 'localhost' : loc.hostname
        const port = loc.port ? `:${loc.port}` : ''
        
        // Use exact current hostname (keep www if present)
        // Both www.agorich.com and agorich.com must be in Supabase redirect URLs
        const redirectUrl = `${loc.protocol}//${hostname}${port}/auth/callback`
        console.log('[signInWithGoogle] Redirect URL:', redirectUrl)
        return redirectUrl
      })()
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: baseCallback,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        console.error('Error signing in with Google:', error)
        throw error
      }
    } catch (error: unknown) {
      console.error('Error in signInWithGoogle:', error)
      throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      // Get cookie domain for clearing cookies
      const getCookieDomain = () => {
        if (typeof window === 'undefined') return undefined
        const hostname = window.location.hostname
        if (hostname === 'localhost' || hostname === '0.0.0.0') return undefined
        const domain = hostname.startsWith('www.') ? hostname.slice(4) : hostname
        return `.${domain}`
      }
      
      const domain = getCookieDomain()
      const isSecure = window.location.protocol === 'https:'
      
      // Clear all auth-related cookies manually to ensure complete logout
      const cookiesToClear = [
        'sb-access-token',
        'sb-refresh-token',
        'just_logged_in',
        'sb-provider-token',
        'sb-user',
        'sb-auth-token'
      ]
      
      // Also clear any cookies with the sb- prefix (Supabase cookies)
      const allCookies = document.cookie.split(';')
      const supabaseCookies = allCookies
        .map(c => c.trim().split('=')[0])
        .filter(name => name.startsWith('sb-') || name.includes('supabase') || name.includes('code-verifier'))
      
      const uniqueCookies = [...new Set([...cookiesToClear, ...supabaseCookies])]
      
      uniqueCookies.forEach(cookieName => {
        // Clear with domain
        if (domain) {
          document.cookie = `${cookieName}=; path=/; domain=${domain}; Max-Age=0; SameSite=lax${isSecure ? '; Secure' : ''}`
        }
        // Clear without domain (for localhost)
        document.cookie = `${cookieName}=; path=/; Max-Age=0; SameSite=lax${isSecure ? '; Secure' : ''}`
      })
      
      console.log('[signOut] Cleared cookies:', uniqueCookies)
      
      // Call Supabase signOut
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
      }
      
      // Clear localStorage as well
      localStorage.removeItem('sb-auth-token')
      localStorage.removeItem('supabase.auth.token')
      
      setUser(null)
      setSession(null)
      setProfile(null)
      
      // Hard redirect to home page after logout
      window.location.href = '/'
    } catch (error: unknown) {
      console.error('Error in signOut:', error)
      // Even on error, redirect to home
      window.location.href = '/'
    }
  }, [router])

  return {
    user,
    session,
    profile,
    loading,
    signInWithGoogle,
    signOut,
    refreshProfile,
  }
}
