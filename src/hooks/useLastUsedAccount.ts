'use client'

import { useState, useEffect, useCallback } from 'react'
import { User } from '@supabase/supabase-js'

const LAST_USED_ACCOUNT_KEY = 'agorich_last_used_account'
const MAX_STORED_ACCOUNTS = 3

export interface LastUsedAccount {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  role?: string
  provider?: string
  lastUsedAt: number
}

interface StoredAccountsData {
  accounts: LastUsedAccount[]
  lastUsedId: string | null
}

function getStoredAccounts(): StoredAccountsData {
  if (typeof window === 'undefined') return { accounts: [], lastUsedId: null }
  try {
    const raw = localStorage.getItem(LAST_USED_ACCOUNT_KEY)
    if (!raw) return { accounts: [], lastUsedId: null }
    return JSON.parse(raw)
  } catch {
    return { accounts: [], lastUsedId: null }
  }
}

function saveStoredAccounts(data: StoredAccountsData): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LAST_USED_ACCOUNT_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('Failed to save last used account:', e)
  }
}

export function useLastUsedAccount() {
  const [lastUsedAccount, setLastUsedAccount] = useState<LastUsedAccount | null>(null)
  const [allAccounts, setAllAccounts] = useState<LastUsedAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = getStoredAccounts()
    if (stored.accounts.length > 0) {
      setAllAccounts(stored.accounts)
      if (stored.lastUsedId) {
        const lastUsed = stored.accounts.find(a => a.id === stored.lastUsedId)
        setLastUsedAccount(lastUsed || stored.accounts[0] || null)
      } else {
        setLastUsedAccount(stored.accounts[0])
      }
    }
    setIsLoading(false)
  }, [])

  const saveAccount = useCallback((user: User, profile?: { role?: string }) => {
    if (!user) return

    const accountData: LastUsedAccount = {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      role: profile?.role,
      provider: user.app_metadata?.provider || 'email',
      lastUsedAt: Date.now(),
    }

    const stored = getStoredAccounts()
    const existingIndex = stored.accounts.findIndex(a => a.id === user.id)

    if (existingIndex >= 0) {
      stored.accounts[existingIndex] = accountData
    } else {
      if (stored.accounts.length >= MAX_STORED_ACCOUNTS) {
        stored.accounts.sort((a, b) => b.lastUsedAt - a.lastUsedAt)
        stored.accounts = stored.accounts.slice(0, MAX_STORED_ACCOUNTS - 1)
      }
      stored.accounts.push(accountData)
    }

    stored.lastUsedId = user.id
    saveStoredAccounts(stored)

    setAllAccounts(stored.accounts)
    setLastUsedAccount(accountData)
  }, [])

  const switchAccount = useCallback((accountId: string) => {
    const stored = getStoredAccounts()
    const account = stored.accounts.find(a => a.id === accountId)
    if (account) {
      stored.lastUsedId = accountId
      stored.accounts = stored.accounts.map(a => ({
        ...a,
        lastUsedAt: a.id === accountId ? Date.now() : a.lastUsedAt,
      }))
      saveStoredAccounts(stored)
      setLastUsedAccount(account)
    }
  }, [])

  const removeAccount = useCallback((accountId: string) => {
    const stored = getStoredAccounts()
    stored.accounts = stored.accounts.filter(a => a.id !== accountId)
    if (stored.lastUsedId === accountId) {
      stored.lastUsedId = stored.accounts[0]?.id || null
    }
    saveStoredAccounts(stored)
    setAllAccounts(stored.accounts)
    setLastUsedAccount(stored.accounts[0] || null)
  }, [])

  const clearAllAccounts = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(LAST_USED_ACCOUNT_KEY)
      setAllAccounts([])
      setLastUsedAccount(null)
    } catch {}
  }, [])

  return {
    lastUsedAccount,
    allAccounts,
    isLoading,
    saveAccount,
    switchAccount,
    removeAccount,
    clearAllAccounts,
  }
}