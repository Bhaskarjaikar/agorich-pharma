'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-client'

const SUPER_ADMIN_ID = '723421ed-f226-41f0-bb09-3feb55e3e293'

const safeRedirect = (raw?: string | null): string | null => {
  if (!raw) return null
  try {
    const decoded = decodeURIComponent(raw)
    if (decoded.startsWith('/')) {
      return decoded
    }
    return null
  } catch {
    return raw.startsWith('/') ? raw : null
  }
}

const computeDestination = (
  params: {
    redirectParam?: string | null
    storedNext?: string | null
    userId: string | null | undefined
    role?: string | null
    autosave?: boolean
  }
): string => {
  const redirectTarget = safeRedirect(params.redirectParam)
  const storedTarget = safeRedirect(params.storedNext ?? undefined)
  const base = redirectTarget || storedTarget || roleToDestination(params.userId, params.role)

  let destination = base

  if (params.userId === SUPER_ADMIN_ID && !destination.startsWith('/admin')) {
    destination = '/admin'
  }

  if (params.autosave && destination === '/retailer') {
    destination = '/retailer?onboarding=success'
  }

  // Prevent non-admins from landing on admin routes
  if (destination.startsWith('/admin') && params.userId !== SUPER_ADMIN_ID && params.role !== 'SUPER_ADMIN') {
    destination = roleToDestination(params.userId, params.role)
  }

  return destination
}

const roleToDestination = (userId: string | null | undefined, role?: string | null): string => {
  if (userId === SUPER_ADMIN_ID || role === 'SUPER_ADMIN') return '/admin'
  switch (role) {
    case 'LOGISTIC':
      return '/logistic'
    case 'SALES':
      return '/sales'
    default:
      return '/retailer'
  }
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile, loading } = useSupabaseAuth()
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const qpError = searchParams?.get('error')
    if (qpError) setError(qpError)
  }, [searchParams])

  // Prefill email from query or last saved
  useEffect(() => {
    try {
      const qpEmail = searchParams?.get('email') || ''
      const last = localStorage.getItem('lastLoginEmail') || ''
      if (qpEmail) setEmail(qpEmail)
      else if (last) setEmail(last)
    } catch {}
  }, [searchParams])

  // Helper: autosave onboarding draft if present after login
  const autoSaveOnboardingDraft = async () => {
    try {
      const draftRaw = typeof window !== 'undefined' ? localStorage.getItem('onboardingDraft') : null
      if (!draftRaw) return
      const { data: userRes } = await supabase.auth.getUser()
      const uid = userRes.user?.id
      if (!uid) return
      let draft: Record<string, unknown>
      try {
        draft = JSON.parse(draftRaw)
      } catch {
        return
      }
      const payload = {
        id: uid,
        ...draft,
        is_verified: true,
        updated_at: new Date().toISOString(),
      }
      const { error: upsertErr } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' }).select()
      if (upsertErr) throw upsertErr
      try {
        localStorage.setItem('onboardingCompleted', 'true')
        localStorage.removeItem('onboardingDraft')
      } catch {}
    } catch (e) {
      console.error('Autosave onboarding failed', e)
    }
  }

  // If already logged in, run autosave if requested, then go to next
  useEffect(() => {
    const run = async () => {
      if (!loading && user) {
        const autosave = searchParams?.get('autosave') === '1'
        if (autosave) {
          await autoSaveOnboardingDraft()
        }
        let storedNext: string | null = null
        try { storedNext = localStorage.getItem('postLoginNext') } catch {}
        const destination = computeDestination({
          redirectParam: searchParams?.get('redirect'),
          storedNext,
          userId: user.id,
          role: profile?.role ?? null,
          autosave,
        })
        if (storedNext) {
          try { localStorage.removeItem('postLoginNext') } catch {}
        }
        router.replace(destination)
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, profile?.role, searchParams])

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoggingIn(true)
    setError(null)

    try { localStorage.setItem('lastLoginEmail', email) } catch {}

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        throw new Error(signInError.message)
      }

      const autosave = searchParams?.get('autosave') === '1'
      if (autosave) {
        await autoSaveOnboardingDraft()
      }

      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token ?? null
      const refreshToken = sessionData.session?.refresh_token ?? null

      if (!accessToken || !refreshToken) {
        throw new Error('Session tokens missing after sign-in')
      }

      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken, refreshToken }),
        credentials: 'include',
      })

      if (!refreshResponse.ok) {
        const { error: refreshError } = await refreshResponse.json().catch(() => ({ error: 'Session refresh failed' }))
        throw new Error(typeof refreshError === 'string' ? refreshError : 'Session refresh failed')
      }

      const signedUser = data.user
      let role: string | null = null
      if (signedUser) {
        try {
          const { data: roleRow } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', signedUser.id)
            .maybeSingle()
          role = roleRow?.role ?? null
        } catch {
          // ignore and fall back to default redirect
        }
      }

      let storedNext: string | null = null
      try { storedNext = localStorage.getItem('postLoginNext') } catch {}

      const destination = computeDestination({
        redirectParam: searchParams?.get('redirect'),
        storedNext,
        userId: signedUser?.id,
        role,
        autosave,
      })

      if (storedNext) {
        try { localStorage.removeItem('postLoginNext') } catch {}
      }

      router.push(destination)
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Login failed. Please try again.'
      console.error('Login error:', message, err)
      setError(message)
    } finally {
      setIsLoggingIn(false)
    }
  }

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white/80">Loading...</p>
        </div>
      </div>
    )
  }

  // If user exists but profile is null (500 error or new user), show login form
  // User can sign in again or we'll handle it in callback
  // Don't block the login form

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="relative w-16 h-16">
              <Image
                src="/agorich-logo.png"
                alt="Agorich Pharma"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your Agorich Pharma account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-1">
              <label className="block text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-md border bg-background px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isLoggingIn}>
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">New to Agorich? </span>
            <Link href={`/signup`} className="text-blue-600 hover:underline">
              Create an account
            </Link>
            <span className="text-muted-foreground"> (mobile number required)</span>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


