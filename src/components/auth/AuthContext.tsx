'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { useLastUsedAccount, LastUsedAccount } from '@/hooks/useLastUsedAccount'
import { Profile } from '@/lib/supabase-client'

const SUPER_ADMIN_ID = '723421ed-f226-41f0-bb09-3feb55e3e293'

interface SupabaseErrorLike {
  code?: string
  message?: string
}

export interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  initialized: boolean
}

interface AuthContextType extends AuthState {
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  lastUsedAccount: LastUsedAccount | null
  allAccounts: LastUsedAccount[]
  switchAccount: (accountId: string) => void
  removeAccount: (accountId: string) => void
  clearAllAccounts: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function isNotFoundError(error: SupabaseErrorLike): boolean {
  const code = error.code
  const message = error.message || ''
  const lowerMessage = message.toLowerCase()

  return (
    code === 'PGRST116' ||
    code === 'PGRST200' ||
    code === 'PGRST205' ||
    lowerMessage.includes('no rows') ||
    lowerMessage.includes('not found')
  )
}

function isServerError(error: SupabaseErrorLike): boolean {
  const code = error.code
  const message = error.message || ''

  return (
    code === '500' ||
    message.includes('500') ||
    message.toLowerCase().includes('internal server error')
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const router = useRouter()
  const {
    lastUsedAccount,
    allAccounts,
    saveAccount,
    switchAccount: switchStoredAccount,
    removeAccount,
    clearAllAccounts,
  } = useLastUsedAccount()

  const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        if (isNotFoundError(error) || isServerError(error)) {
          setProfile(null)
          return null
        }
        console.error('Error loading profile:', error)
        setProfile(null)
        return null
      }

      setProfile(data)
      return data
    } catch (err) {
      const error = err as SupabaseErrorLike
      if (!isNotFoundError(error)) {
        console.error('Error in loadProfile:', error)
      }
      setProfile(null)
      return null
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await loadProfile(user.id)
    }
  }, [user?.id, loadProfile])

  const getRoleDestination = useCallback((userId: string | null, role?: string | null): string => {
    if (userId === SUPER_ADMIN_ID || role === 'SUPER_ADMIN') return '/admin'
    switch (role) {
      case 'LOGISTIC':
        return '/logistic'
      case 'SALES':
        return '/sales'
      case 'DISTRIBUTOR':
        return '/distributor'
      case 'RETAILER':
        return '/retailer'
      default:
        return '/retailer'
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    try {
      const getCallbackUrl = () => {
        if (typeof window === 'undefined') return '/auth/callback'
        const loc = window.location
        const hostname = loc.hostname === '0.0.0.0' ? 'localhost' : loc.hostname
        const port = loc.port ? `:${loc.port}` : ''
        return `${loc.protocol}//${hostname}${port}/auth/callback`
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getCallbackUrl(),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) throw error
    } catch (err) {
      console.error('Error signing in with Google:', err)
      throw err
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      const getCookieDomain = () => {
        if (typeof window === 'undefined') return undefined
        const hostname = window.location.hostname
        if (hostname === 'localhost' || hostname === '0.0.0.0') return undefined
        const domain = hostname.startsWith('www.') ? hostname.slice(4) : hostname
        return `.${domain}`
      }

      const cookiesToClear = [
        'sb-access-token',
        'sb-refresh-token',
        'sb-provider-token',
        'sb-user',
        'sb-auth-token',
        'just_logged_in',
      ]

      const allCookies = document.cookie.split(';')
      allCookies.forEach(cookie => {
        const name = cookie.trim().split('=')[0]
        if (name.startsWith('sb-')) {
          cookiesToClear.push(name)
        }
      })

      const domain = getCookieDomain()
      cookiesToClear.forEach(name => {
        document.cookie = `${name}=; path=/; max-age=0; SameSite=lax${domain ? `; Domain=${domain}` : ''}`
      })

      await supabase.auth.signOut({ scope: 'global' })
      setUser(null)
      setSession(null)
      setProfile(null)
      router.push('/')
    } catch (err) {
      console.error('Error signing out:', err)
      await supabase.auth.signOut({ scope: 'global' })
      setUser(null)
      setSession(null)
      setProfile(null)
      router.push('/')
    }
  }, [router])

  useEffect(() => {
    let mounted = true
    let subscription: { unsubscribe: () => void } | null = null

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession()

        if (!mounted) return

        if (sessionError) {
          const msg = sessionError.message?.toLowerCase() || ''
          if (msg.includes('invalid refresh token') || msg.includes('refresh token not found')) {
            try {
              await supabase.auth.signOut({ scope: 'local' })
            } catch {}
            router.replace('/login')
          }
          setLoading(false)
          setInitialized(true)
          return
        }

        setSession(initialSession)
        setUser(initialSession?.user ?? null)

        if (initialSession?.user) {
          const profileData = await loadProfile(initialSession.user.id)
          if (mounted && initialSession.user) {
            saveAccount(initialSession.user, profileData || undefined)
          }
        }

        if (mounted) {
          setLoading(false)
          setInitialized(true)
        }

        subscription = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (!mounted) return

          setSession(newSession)
          setUser(newSession?.user ?? null)

          if (newSession?.user) {
            const profileData = await loadProfile(newSession.user.id)
            if (mounted) {
              saveAccount(newSession.user, profileData || undefined)
            }
          } else {
            setProfile(null)
          }

          if (event === 'SIGNED_OUT') {
            router.push('/')
          }
        }).data.subscription

      } catch (err) {
        console.error('Error initializing auth:', err)
        if (mounted) {
          setLoading(false)
          setInitialized(true)
        }
      }
    }

    initializeAuth()

    return () => {
      mounted = false
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [router, loadProfile, saveAccount])

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    initialized,
    signInWithGoogle,
    signOut,
    refreshProfile,
    lastUsedAccount,
    allAccounts,
    switchAccount: switchStoredAccount,
    removeAccount,
    clearAllAccounts,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}