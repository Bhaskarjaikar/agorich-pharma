'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, X, User, SignOut, CaretRight, Sparkle } from '@phosphor-icons/react'
import { useAuth } from '@/components/auth/AuthContext'
import { LastUsedAccount } from '@/hooks/useLastUsedAccount'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'

const SUPER_ADMIN_ID = '723421ed-f226-41f0-bb09-3feb55e3e293'

function getRoleDestination(userId: string | null, role?: string | null): string {
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

function AvatarDisplay({ account, size = 'md' }: { account: LastUsedAccount; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
  }

  if (account.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={account.avatarUrl}
        alt={account.name || account.email}
        className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-white/20`}
        referrerPolicy="no-referrer"
      />
    )
  }

  const bgColors = [
    'bg-gradient-to-br from-emerald-400 to-teal-500',
    'bg-gradient-to-br from-blue-400 to-indigo-500',
    'bg-gradient-to-br from-purple-400 to-pink-500',
    'bg-gradient-to-br from-orange-400 to-red-500',
    'bg-gradient-to-br from-cyan-400 to-blue-500',
  ]

  const colorIndex = account.email.charCodeAt(0) % bgColors.length

  return (
    <div className={`${sizeClasses[size]} ${bgColors[colorIndex]} rounded-full flex items-center justify-center text-white font-semibold ring-2 ring-white/20`}>
      {getInitials(account.name, account.email)}
    </div>
  )
}

interface LastUsedAccountCardProps {
  account: LastUsedAccount
  onContinue: () => Promise<void>
  onSwitchAccount: () => void
  onSignOut: () => void
  isLoading?: boolean
}

export function LastUsedAccountCard({
  account,
  onContinue,
  onSwitchAccount,
  onSignOut,
  isLoading = false,
}: LastUsedAccountCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="relative"
    >
      <button
        onClick={onContinue}
        disabled={isLoading}
        className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 p-4 text-left transition-all duration-300 hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative flex items-center gap-4">
          <div className="relative">
            <AvatarDisplay account={account} size="lg" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-3 h-3 text-white" weight="fill" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                {account.name || 'Welcome back'}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                <Sparkle className="w-3 h-3" weight="fill" />
                Last Used
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
              {account.email}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <CaretRight className="w-5 h-5 text-emerald-500 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {isLoading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsExpanded(!isExpanded)
        }}
        className="absolute top-2 right-2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSwitchAccount()
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <User className="w-4 h-4" />
                Switch Account
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSignOut()
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <SignOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface AccountSwitcherProps {
  accounts: LastUsedAccount[]
  currentAccountId?: string
  onSelectAccount: (account: LastUsedAccount) => void
  onSignOut: () => void
}

export function AccountSwitcher({
  accounts,
  currentAccountId,
  onSelectAccount,
  onSignOut,
}: AccountSwitcherProps) {
  const otherAccounts = accounts.filter(a => a.id !== currentAccountId)

  if (otherAccounts.length === 0) return null

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        Or continue with another account
      </p>
      <div className="space-y-2">
        {otherAccounts.map(account => (
          <button
            key={account.id}
            onClick={() => onSelectAccount(account)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <AvatarDisplay account={account} size="md" />
            <div className="flex-1 text-left">
              <p className="font-medium text-slate-900 dark:text-white text-sm">
                {account.name || account.email.split('@')[0]}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{account.email}</p>
            </div>
          </button>
        ))}
      </div>
      <button
        onClick={onSignOut}
        className="w-full text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
      >
        Sign out of all accounts
      </button>
    </div>
  )
}

export function useOneClickAuth() {
  const { user, profile, signInWithGoogle } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)

  const continueAsLastUsed = async (account: LastUsedAccount) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: '',
      })

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          router.push('/login?error=account_not_found')
        } else {
          throw error
        }
        return
      }

      let destination = getRoleDestination(user?.id || null, profile?.role)
      const redirect = searchParams?.get('redirect')
      if (redirect?.startsWith('/')) {
        destination = redirect
      }

      router.push(destination)
    } catch (err) {
      console.error('Error continuing as last used:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    continueAsLastUsed,
    isLoading,
  }
}