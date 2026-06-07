'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/components/auth/AuthContext'
import { LastUsedAccountCard, AccountSwitcher } from '@/components/auth/LastUsedAccountCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner, Eye, EyeSlash, Moon, Sun, Users, Package, ArrowRight } from '@phosphor-icons/react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase-client'
import { LastUsedAccount } from '@/hooks/useLastUsedAccount'

const SUPER_ADMIN_ID = '723421ed-f226-41f0-bb09-3feb55e3e293'

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

function getRoleDestination(userId: string | null | undefined, role?: string | null): string {
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
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile, loading: authLoading, signInWithGoogle, signOut, lastUsedAccount, allAccounts, removeAccount } = useAuth()

  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'RETAILER' | 'DISTRIBUTOR' | 'ADMIN' | null>(null)
  const [isContinuingAsLastUsed, setIsContinuingAsLastUsed] = useState(false)
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('agorich-dark-mode')
    if (saved !== null) {
      setDarkMode(saved === 'true')
    } else {
      setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('agorich-dark-mode', String(darkMode))
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  useEffect(() => {
    const qpError = searchParams?.get('error')
    if (qpError) {
      const errorMessages: Record<string, string> = {
        'exchange_failed': 'Authentication failed. Please try signing in again.',
        'exchange-failed': 'Authentication failed. Please try signing in again.',
        'callback_error': 'Something went wrong. Please try again.',
        'session_expired': 'Your session has expired. Please sign in again.',
        'session_failed': 'Session expired or failed. Please sign in again.',
        'unauthorized': 'You are not authorized to access this page.',
        'profile_missing': 'Profile not found. Please complete registration.',
        'account_not_found': 'This account no longer exists. Please sign in with a different method.',
      }
      setError(errorMessages[qpError] || qpError)
    }
  }, [searchParams])

  useEffect(() => {
    try {
      const qpEmail = searchParams?.get('email') || ''
      const last = localStorage.getItem('lastLoginEmail') || ''
      if (qpEmail) setEmail(qpEmail)
      else if (last) setEmail(last)
    } catch {}
  }, [searchParams])

  useEffect(() => {
    if (!authLoading) {
      setInitialized(true)
    }
  }, [authLoading])

  const resolvePostLoginDestination = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle()

      let destination = getRoleDestination(userId, data?.role)
      const redirect = searchParams?.get('redirect')
      if (redirect?.startsWith('/')) {
        destination = redirect
      }
      return destination
    } catch {
      let destination = getRoleDestination(userId, null)
      const redirect = searchParams?.get('redirect')
      if (redirect?.startsWith('/')) {
        destination = redirect
      }
      return destination
    }
  }, [searchParams])

  const handleContinueAsLastUsed = useCallback(async () => {
    if (!lastUsedAccount) return

    if (lastUsedAccount.provider && lastUsedAccount.provider !== 'email') {
      setError('This account requires sign-in with ' + (lastUsedAccount.provider === 'google' ? 'Google' : lastUsedAccount.provider) + '. Please use the sign-in option below.')
      setShowAccountSwitcher(true)
      return
    }

    setIsContinuingAsLastUsed(true)
    setError(null)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: lastUsedAccount.email,
        password: lastUsedAccount.password || '',
      })

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials') || signInError.message.includes('Email not confirmed')) {
          setError('This account requires password. Please sign in manually.')
          setShowAccountSwitcher(true)
        } else {
          throw signInError
        }
        return
      }

      const userId = data.user?.id
      if (!userId) throw new Error('Login failed. Please try again.')
      const destination = await resolvePostLoginDestination(userId)
      router.replace(destination)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to continue. Please sign in manually.'
      setError(message)
    } finally {
      setIsContinuingAsLastUsed(false)
    }
  }, [lastUsedAccount, resolvePostLoginDestination, router])

  const handleSwitchToAccount = useCallback(async (account: LastUsedAccount) => {
    if (account.provider && account.provider !== 'email') {
      setError('This account requires sign-in with ' + (account.provider === 'google' ? 'Google' : account.provider) + '. Please use that sign-in option instead.')
      setShowAccountSwitcher(false)
      return
    }

    setShowAccountSwitcher(false)
    setError(null)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password || '',
      })

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials') || signInError.message.includes('Email not confirmed')) {
          setError('This account requires password. Please sign in manually.')
        } else {
          throw signInError
        }
        return
      }

      const userId = data.user?.id
      if (!userId) throw new Error('Login failed. Please try again.')
      const destination = await resolvePostLoginDestination(userId)
      router.replace(destination)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to switch account. Please sign in manually.'
      setError(message)
    }
  }, [resolvePostLoginDestination, router])

  const handleSignOut = useCallback(async () => {
    await signOut()
    router.push('/login')
  }, [signOut, router])

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
        const draftRaw = localStorage.getItem('onboardingDraft')
        if (draftRaw && data.user) {
          try {
            const draft = JSON.parse(draftRaw)
            await supabase.from('profiles').upsert({
              id: data.user.id,
              ...draft,
              is_verified: true,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' })
            localStorage.setItem('onboardingCompleted', 'true')
            localStorage.removeItem('onboardingDraft')
          } catch {}
        }
      }

      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token ?? null
      const refreshToken = sessionData.session?.refresh_token ?? null

      if (!accessToken || !refreshToken) {
        throw new Error('Session tokens missing after sign-in')
      }

      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, refreshToken }),
        credentials: 'include',
      })

      if (!refreshResponse.ok) {
        const { error: refreshError } = await refreshResponse.json().catch(() => ({ error: 'Session refresh failed' }))
        throw new Error(typeof refreshError === 'string' ? refreshError : 'Session refresh failed')
      }

      const userId = data.user?.id
      if (!userId) throw new Error('Login failed. Please try again.')
      const destination = await resolvePostLoginDestination(userId)
      router.replace(destination)
    } catch (err: unknown) {
      const message = err instanceof Error && err.message ? err.message : 'Login failed. Please try again.'
      setError(message)
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    setError(null)
    try {
      if (selectedRole) {
        try {
          localStorage.setItem('selectedRole', selectedRole)
        } catch {}
        document.cookie = `selectedRole=${selectedRole}; path=/; max-age=3600; SameSite=lax`
      }

      const redirectTarget = searchParams?.get('redirect')
      if (redirectTarget) {
        try {
          localStorage.setItem('postLoginNext', redirectTarget)
        } catch {}
      }
      await signInWithGoogle()
    } catch (err: unknown) {
      const message = err instanceof Error && err.message ? err.message : 'Google sign in failed. Please try again.'
      if (!message.toLowerCase().includes('popup') && !message.toLowerCase().includes('cancel')) {
        setError(message)
      }
      setIsGoogleLoading(false)
    }
  }

  const handleRemoveAccount = (accountId: string) => {
    removeAccount(accountId)
    if (allAccounts.length <= 1) {
      setShowAccountSwitcher(false)
    }
  }

  const loading = !initialized || authLoading
  const isOAuthSuccess = searchParams?.get('oauth') === 'success'
  const isSettingUpOAuth = isOAuthSuccess && user && !profile
  const isAuthenticated = !!user

  // Handle authenticated user redirect - single useEffect
  useEffect(() => {
    if (isAuthenticated && !isSettingUpOAuth && !isContinuingAsLastUsed) {
      resolvePostLoginDestination(user.id)
        .then((destination) => {
          router.replace(destination)
        })
        .catch(() => {})
    }
  }, [isAuthenticated, isSettingUpOAuth, isContinuingAsLastUsed, user, resolvePostLoginDestination, router])

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4" />
          <p className={`text-sm ${darkMode ? 'text-white/80' : 'text-slate-600'}`}>
            Checking your session...
          </p>
        </div>
      </div>
    )
  }

  // if (isAuthenticated && !isSettingUpOAuth && !isContinuingAsLastUsed) {
  //   return (
  //     <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
  //       <div className="text-center">
  //         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4" />
  //         <p className={`text-sm ${darkMode ? 'text-white/80' : 'text-slate-600'}`}>
  //           Redirecting...
  //         </p>
  //       </div>
  //     </div>
  //   )
  // }

  // if (isOAuthSuccess && user && !profile) {
  //   return (
  //     <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
  //       <div className="text-center">
  //         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4" />
  //         <p className={`text-sm ${darkMode ? 'text-white/80' : 'text-slate-600'}`}>
  //           Setting up your account...
  //         </p>
  //       </div>
  //     </div>
  //   )
  // }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${darkMode ? 'bg-background' : 'bg-background'}`}>
      <button
        onClick={() => setDarkMode(!darkMode)}
        className={`fixed top-4 right-4 p-2 rounded-lg transition-colors ${darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-card/80 hover:bg-card text-foreground shadow-sm'}`}
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {darkMode ? <Sun className="w-5 h-5" weight="fill" /> : <Moon className="w-5 h-5" weight="fill" />}
      </button>

      <Card className={`w-full max-w-md shadow-2xl transition-colors duration-300 ${darkMode ? 'bg-card/90 border-border' : 'bg-card/90 border-border'}`}>
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
          <CardTitle className="text-2xl font-bold text-foreground">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to your Agorich Pharma account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <AnimatePresence mode="wait">
            {!selectedRole ? (
              <motion.div
                key="role-selection"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {lastUsedAccount && !showAccountSwitcher && (
                  <div className="mb-4">
                    <LastUsedAccountCard
                      account={lastUsedAccount}
                      onContinue={handleContinueAsLastUsed}
                      onSwitchAccount={() => setShowAccountSwitcher(true)}
                      onSignOut={handleSignOut}
                      isLoading={isContinuingAsLastUsed}
                    />
                  </div>
                )}

                {showAccountSwitcher && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4"
                  >
                    <AccountSwitcher
                      accounts={allAccounts}
                      currentAccountId={lastUsedAccount?.id}
                      onSelectAccount={handleSwitchToAccount}
                      onSignOut={handleSignOut}
                    />
                  </motion.div>
                )}

                {(!lastUsedAccount || showAccountSwitcher) && (
                  <>
                    <p className={`text-center text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      आप कौन हैं?
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setSelectedRole('RETAILER')}
                        className={`p-6 rounded-xl border-2 font-medium transition-all duration-200 text-center ${
                          darkMode
                            ? 'bg-background text-white border-border hover:border-emerald-500 hover:bg-card'
                            : 'bg-card text-foreground border-input hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Users className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                          <span>Retailer</span>
                          <span className="text-xs opacity-70">खुदरा विक्रेता</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedRole('DISTRIBUTOR')}
                        className={`p-6 rounded-xl border-2 font-medium transition-all duration-200 text-center ${
                          darkMode
                            ? 'bg-background text-white border-border hover:border-blue-500 hover:bg-card'
                            : 'bg-card text-foreground border-input hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Package className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                          <span>Distributor</span>
                          <span className="text-xs opacity-70">वितरक</span>
                        </div>
                      </button>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setSelectedRole('ADMIN')}
                      className={`w-full mt-2 py-3 text-xs font-medium transition-all duration-200 rounded-lg ${
                        darkMode
                          ? 'text-muted-foreground hover:text-slate-300 hover:bg-background/50'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      Admin Login
                    </button>
                  </>
                )}

                {lastUsedAccount && !showAccountSwitcher && (
                  <button
                    type="button"
                    onClick={() => setShowAccountSwitcher(true)}
                    className="w-full text-sm text-muted-foreground hover:text-foreground"
                  >
                    Sign in with a different account
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-foreground">
                    Selected: {selectedRole === 'RETAILER' ? 'Retailer' : selectedRole === 'ADMIN' ? 'Admin' : 'Distributor'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedRole(null)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Change
                  </button>
                </div>

                <form onSubmit={handleLogin} className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-foreground">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full h-12 rounded-xl border-2 bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-blue-600 dark:focus:border-blue-500"
                      placeholder="Enter your email"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-foreground">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full h-12 rounded-xl border-2 pr-10 bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-blue-600 dark:focus:border-blue-500"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-3 flex items-center transition-colors text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeSlash className="h-4 w-4" weight="bold" /> : <Eye className="h-4 w-4" weight="bold" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoggingIn}>
                    {isLoggingIn ? (
                      <>
                        <Spinner className="mr-2 h-4 w-4 animate-spin" weight="bold" />
                        Logging in...
                      </>
                    ) : (
                      <>
                        Sign in
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="relative my-4">
                  <div className={`absolute inset-0 flex items-center ${darkMode ? 'text-slate-500' : 'text-muted-foreground'}`}>
                    <div className={`w-full border-t ${darkMode ? 'border-border' : 'border-slate-300'}`} />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-card text-muted-foreground">OR</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                  className={`w-full flex items-center justify-center gap-3 h-12 rounded-xl border-2 font-medium transition-all duration-200 ${
                    darkMode
                      ? 'bg-white text-slate-900 border-border hover:bg-slate-100'
                      : 'bg-card text-foreground border-input hover:bg-muted'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isGoogleLoading ? (
                    <>
                      <Spinner className="w-5 h-5 animate-spin" weight="bold" />
                      <span>Connecting to Google...</span>
                    </>
                  ) : (
                    <>
                      <GoogleIcon className="w-5 h-5" />
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole(null)}
                  className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground"
                >
                  New to Agorich? Use Google to create an account
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="text-center text-xs text-muted-foreground">
            <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
