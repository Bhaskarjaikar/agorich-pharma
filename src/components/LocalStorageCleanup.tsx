'use client'

import { useEffect } from 'react'

/**
 * Cleanup component to fix corrupted localStorage and cookie data from Supabase
 * This runs once on app load to clear any old/corrupted auth data
 * 
 * The @supabase/ssr library uses cookies for auth, not localStorage
 * Old localStorage keys or corrupted cookies can cause conflicts and errors
 */

// Run synchronous cleanup immediately to prevent Supabase from reading corrupted data
if (typeof window !== 'undefined') {
  try {
    // Function to clear a cookie
    const clearCookie = (name: string) => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`
    }

    // Check cookies for corrupted data synchronously
    const allCookies = document.cookie.split(';')
    allCookies.forEach(cookie => {
      const [name, value] = cookie.split('=').map(s => s.trim())
      if (!name || !value) return
      
      // Check if this looks like a Supabase cookie with corrupted data
      if ((name.includes('sb-') || name.includes('supabase') || name.includes('auth')) && value.trim().startsWith('{') && value.length > 1000) {
        try {
          const parsed = JSON.parse(decodeURIComponent(value))
          // If it has access_token, user, or other session properties, it's corrupted
          if (parsed.access_token || parsed.user || parsed.refresh_token) {
            clearCookie(name)
            console.log(`🧹 Synchronously cleared corrupted cookie: ${name}`)
          }
        } catch {
          // Not valid JSON or corrupted, clear it
          if (value.length > 500) {
            clearCookie(name)
            console.log(`🧹 Synchronously cleared potentially corrupted cookie: ${name}`)
          }
        }
      }
    })

    // Also check localStorage for corrupted session objects
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cfthxtnwuhvhhnifshsr.supabase.co'
    const hostname = new URL(supabaseUrl).hostname.split('.')[0]
    const corruptedKeys = [
      `sb-${hostname}-auth-token`,
      'sb-access-token',
      'sb-refresh-token',
      'supabase.auth.token',
      'supabase.auth.user',
      'supabase.auth.session',
      'supabase-auth-token',
      'supabase-auth-refresh-token'
    ]

    corruptedKeys.forEach(key => {
      try {
        const value = localStorage.getItem(key)
        if (value && value.trim().startsWith('{') && value.length > 1000) {
          try {
            const parsed = JSON.parse(value)
            if (parsed.access_token || parsed.user || parsed.refresh_token) {
              localStorage.removeItem(key)
              console.log(`🧹 Synchronously removed corrupted localStorage: ${key}`)
            }
          } catch {
            localStorage.removeItem(key)
            console.log(`🧹 Synchronously removed invalid localStorage: ${key}`)
          }
        } else if (value) {
          localStorage.removeItem(key)
          console.log(`🧹 Synchronously removed localStorage auth key: ${key}`)
        }
      } catch {
        // Continue on error
      }
    })
  } catch (error) {
    console.warn('Error in synchronous cleanup:', error)
  }
}

export default function LocalStorageCleanup() {
  useEffect(() => {
    // Build the Supabase auth token key based on the project URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cfthxtnwuhvhhnifshsr.supabase.co'
    const hostname = new URL(supabaseUrl).hostname.split('.')[0]
    const supabaseAuthKey = `sb-${hostname}-auth-token`

    // Function to clear a cookie
    const clearCookie = (name: string, paths: string[] = ['/', '/']) => {
      paths.forEach(path => {
        // Try to clear with various domain/path combinations
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${window.location.hostname};`
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=.${window.location.hostname};`
      })
    }

    // Clear any potentially corrupted localStorage keys from older Supabase versions
    // The @supabase/ssr library now uses cookies exclusively for SSR
    const corruptedKeys = [
      supabaseAuthKey,
      'sb-access-token',
      'sb-refresh-token',
      'supabase.auth.token',
      'supabase.auth.user',
      'supabase.auth.session',
      'supabase-auth-token',
      'supabase-auth-refresh-token'
    ]

    console.log('🧹 Checking for corrupted localStorage keys...')

    corruptedKeys.forEach(key => {
      try {
        const value = localStorage.getItem(key)
        if (value) {
          console.log(`Found localStorage key: ${key}`)
          // Check if value is a corrupted JSON string (full session object)
          if (value.trim().startsWith('{') && value.length > 1000) {
            try {
              const parsed = JSON.parse(value)
              // If it's a full session object (has access_token, user, etc), it's corrupted
              if (parsed.access_token || parsed.user || parsed.refresh_token) {
                console.log(`⚠️ Removing corrupted session object from localStorage: ${key}`)
                localStorage.removeItem(key)
                console.log(`✅ Removed ${key}`)
              }
            } catch {
              // Invalid JSON, remove it
              localStorage.removeItem(key)
              console.log(`✅ Removed ${key}`)
            }
          } else {
            // For Supabase auth keys, just remove them since SSR uses cookies
            localStorage.removeItem(key)
            console.log(`✅ Removed ${key}`)
          }
        }
      } catch (error) {
        // If there's any error accessing localStorage, just continue
        console.warn(`Error checking localStorage key ${key}:`, error)
      }
    })

    // Clear potentially corrupted cookies
    // Supabase SSR uses specific cookie names, check if any contain full JSON objects
    console.log('🧹 Checking for corrupted cookies...')
    const allCookies = document.cookie.split(';')
    const corruptedCookieNames: string[] = []
    
    allCookies.forEach(cookie => {
      const [name, value] = cookie.split('=').map(s => s.trim())
      if (!name || !value) return
      
      // Check if this looks like a Supabase cookie
      if (name.includes('sb-') || name.includes('supabase') || name.includes('auth')) {
        // Check if the value is a full JSON object (corrupted)
        if (value.trim().startsWith('{') && value.length > 1000) {
          try {
            const parsed = JSON.parse(decodeURIComponent(value))
            // If it has access_token, user, or other session properties, it's corrupted
            if (parsed.access_token || parsed.user || parsed.refresh_token) {
              corruptedCookieNames.push(name)
              console.log(`⚠️ Found corrupted cookie: ${name} (contains full session object)`)
            }
          } catch {
            // Not valid JSON, might still be corrupted
            if (value.length > 500) {
              corruptedCookieNames.push(name)
              console.log(`⚠️ Found potentially corrupted cookie: ${name}`)
            }
          }
        }
      }
    })

    // Clear corrupted cookies
    if (corruptedCookieNames.length > 0) {
      console.log(`🧹 Clearing ${corruptedCookieNames.length} corrupted cookies...`)
      corruptedCookieNames.forEach(name => {
        clearCookie(name)
        console.log(`✅ Cleared corrupted cookie: ${name}`)
      })
    }

    // Check all localStorage keys for corrupted JSON data
    const allKeys = Object.keys(localStorage)
    console.log(`Checking ${allKeys.length} total localStorage keys for corruption...`)
    
    for (const key of allKeys) {
      try {
        // Skip non-Supabase keys that our app uses intentionally
        const skipKeys = ['userName', 'businessName', 'businessType', 'aadharNumber', 'panNumber', 'userRegistered', 'invoices', 'theme', 'language', 'inventoryProducts', 'referralStats', 'referralEarnings', 'totalReferrals', 'referrals', 'lang', 'langWelcomeShown', 'profilePhoto']
        if (skipKeys.includes(key)) {
          continue
        }

        const value = localStorage.getItem(key)
        if (value && value.trim().startsWith('{') && value.trim().endsWith('}')) {
          // It looks like JSON, try to parse it
          try {
            const parsed = JSON.parse(value)
            // If parsing succeeds, check if it has nested objects that are strings (corrupted)
            if (typeof parsed === 'object' && parsed !== null) {
              // Check if this is a full Supabase session object (corrupted)
              if (parsed.access_token || (parsed.user && typeof parsed.user === 'object')) {
                console.log(`⚠️ Removing corrupted Supabase session from localStorage: ${key}`)
                localStorage.removeItem(key)
                continue
              }
              
              const hasCorruptedNesting = Object.values(parsed).some((v) => {
                if (typeof v !== 'string') return false
                const trimmed = v.trim()
                return trimmed.startsWith('{') || trimmed.startsWith('[')
              })
              if (hasCorruptedNesting) {
                console.log(`⚠️ Removing key with corrupted nested structure: ${key}`)
                localStorage.removeItem(key)
              }
            }
          } catch {
            // Invalid JSON, remove it
            console.log(`⚠️ Removing key with invalid JSON: ${key}`)
            localStorage.removeItem(key)
          }
        }
      } catch {
        // Continue on any error
      }
    }

    console.log('✅ LocalStorage and cookie cleanup complete')
  }, [])

  // This component doesn't render anything
  return null
}

