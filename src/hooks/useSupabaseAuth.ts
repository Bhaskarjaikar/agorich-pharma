'use client'

import { useState, useEffect, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { Profile, UserRole } from '@/lib/supabase-client'

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
  const router = useRouter()

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
          setProfile(null)
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
        setProfile(null)
        return
      }

      // Set profile if data exists
      if (data) {
        setProfile(data)
      } else {
        setProfile(null)
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
      setProfile(null)
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

    // Initialize auth state
    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession()

        if (!mounted) return

        if (sessionError) {
          const msg = typeof sessionError.message === 'string' ? sessionError.message : ''
          console.error('Error getting session:', sessionError)
          // If refresh token is invalid/missing, clear local auth and go to login
          if (msg.toLowerCase().includes('invalid refresh token')) {
            try {
              await supabase.auth.signOut({ scope: 'local' })
            } catch {}
            router.replace('/login')
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
            // Wait briefly for DB trigger to create profile, then fetch role and route accordingly
            setTimeout(async () => {
              if (!mounted) return
              try {
                // Try direct role fetch to avoid race with state
                const { data: roleRow } = await supabase
                  .from('profiles')
                  .select('role')
                  .eq('id', newSession.user.id)
                  .maybeSingle()
                const role = roleRow?.role || 'RETAILER'
                const dest = role === 'SUPER_ADMIN' ? '/admin' : '/retailer'
                await loadProfile(newSession.user.id)
                router.replace(dest)
              } catch {
                // Fallback to retailer if role cannot be fetched yet
                router.replace('/retailer')
              }
            }, 800)
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
      const baseCallback = (() => {
        if (typeof window === 'undefined') return '/auth/callback'
        const loc = window.location
        const hostname = loc.hostname === '0.0.0.0' ? 'localhost' : loc.hostname
        const port = loc.port ? `:${loc.port}` : ''
        return `${loc.protocol}//${hostname}${port}/auth/callback`
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
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
        throw error
      }
      
      setUser(null)
      setSession(null)
      setProfile(null)
      router.push('/')
    } catch (error: unknown) {
      console.error('Error in signOut:', error)
      throw error
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

