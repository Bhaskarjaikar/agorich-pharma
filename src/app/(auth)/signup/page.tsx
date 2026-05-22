'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner, Eye, EyeSlash } from '@phosphor-icons/react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-client'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'

const SUPER_ADMIN_ID = '723421ed-f226-41f0-bb09-3feb55e3e293'

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

// Google Icon Component
function GoogleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile, loading: authLoading } = useSupabaseAuth()
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [authInitTimeout, setAuthInitTimeout] = useState(false)

  useEffect(() => {
    if (authInitTimeout) return
    const timer = setTimeout(() => {
      setAuthInitTimeout(true)
    }, 5000)
    return () => clearTimeout(timer)
  }, [])

  const loading = authInitTimeout ? false : authLoading

  const redirectTarget = searchParams?.get('redirect') || '/retailer'

  // Redirect logged-in users to their dashboard
  useEffect(() => {
    if (!loading && user) {
      const destination = roleToDestination(user.id, profile?.role)
      router.replace(destination)
    }
  }, [loading, user, profile, router])

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/80">Loading...</p>
        </div>
      </div>
    )
  }

  // Handle Google Sign Up (same as Sign In - OAuth handles both)
  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true)
    setError(null)
    try {
      // Store redirect target for after OAuth callback
      if (redirectTarget) {
        try {
          localStorage.setItem('postLoginNext', redirectTarget)
        } catch {}
      }
      
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

      if (error) throw error
    } catch (err: unknown) {
      const message = err instanceof Error && err.message ? err.message : 'Google sign up failed. Please try again.'
      // Don't show error if user cancelled or closed popup
      if (!message.toLowerCase().includes('popup') && !message.toLowerCase().includes('cancel')) {
        setError(message)
      }
      setIsGoogleLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setIsSubmitting(true)
    try {
      const { data: signData, error: signErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { phone },
        },
      })
      if (signErr) throw signErr

      const userId = signData.user?.id

      if (userId) {
        const { error: profErr } = await supabase
          .from('profiles')
          .update({
            user_name: email,
            phone,
          })
          .eq('id', userId)

        if (profErr) {
          console.warn('Profile update warning:', profErr)
        }
      }

      // After signup, ask user to login
      router.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}&signup=success`)
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Signup failed. Please try again.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 bg-white/10 rounded-full blur-2xl" />
              <Image src="/agorich-logo.png" alt="Agorich Pharma" fill className="object-contain" priority sizes="64px" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
          <CardDescription>Signup to access the retailer dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSignup} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Email <span className="text-red-500">*</span></label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium">Mobile Number <span className="text-red-500">*</span></label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                minLength={10}
                maxLength={10}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="10-digit mobile number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-md border bg-background px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeSlash className="h-4 w-4" weight="bold" /> : <Eye className="h-4 w-4" weight="bold" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">Confirm Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-md border bg-background px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
                  onClick={() => setShowConfirm(v => !v)}
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirm ? <EyeSlash className="h-4 w-4" weight="bold" /> : <Eye className="h-4 w-4" weight="bold" />}
                </button>
              </div>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4 animate-spin" weight="bold" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
            </div>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center text-slate-500">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-900/90 text-slate-400">OR</span>
            </div>
          </div>

          {/* Google Sign Up Button */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center gap-3 h-12 rounded-xl border-2 font-medium transition-all duration-200 bg-white text-slate-900 border-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGoogleLoading ? (
              <>
                <Spinner className="w-5 h-5 animate-spin" weight="bold" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <GoogleIcon className="w-5 h-5" />
                <span>Sign up with Google</span>
              </>
            )}
          </button>

          {/* Login Link */}
          <div className="text-center text-sm mt-4">
            <span className="text-slate-400">Already have an account? </span>
            <Link href={`/login?redirect=${encodeURIComponent(redirectTarget)}`} className="text-blue-400 hover:text-blue-300 hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
