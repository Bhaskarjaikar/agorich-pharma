# Prompt for AI Assistant: Fix Supabase PKCE OAuth Code Verifier Issue

## Problem Statement

I have a Next.js 15.5.4 application using Supabase for authentication. The Google OAuth PKCE flow is failing with this error:

```
POST https://cfthxtnwuhvhhnifshsr.supabase.co/auth/v1/token?grant_type=pkce 400 (Bad Request)
AuthApiError: invalid request: both auth code and code verifier should be non-empty
```

**The issue:** The `code` parameter is present in the callback URL, but Supabase cannot find the `code_verifier` that was supposed to be stored during the OAuth initiation.

## Tech Stack

- **Framework:** Next.js 15.5.4 (Turbopack)
- **Supabase:** `@supabase/ssr` v0.7.0 and `@supabase/supabase-js` v2.76.1
- **Authentication:** Google OAuth with PKCE flow
- **Storage:** Browser localStorage, sessionStorage, cookies

## Current Code Structure

### 1. Supabase Client (`src/lib/supabase-client.ts`)
```typescript
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Cleanup corrupted localStorage before initialization
// (has logic to preserve PKCE keys)

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookies: {
    get(name: string) { /* ... */ },
    set(name: string, value: string, options: any) { /* ... */ },
    remove(name: string, options: any) { /* ... */ },
  },
})
```

### 2. OAuth Login (`src/hooks/useSupabaseAuth.ts`)
```typescript
const signInWithGoogle = async () => {
  const redirectUrl = `${window.location.origin}/auth/callback`
  
  // Verify localStorage is accessible
  // Test localStorage access...
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
    },
  })
  
  return { data, error: null }
}
```

### 3. Callback Handler (`src/app/auth/callback/page.tsx`)
```typescript
// Get code from URL
const code = searchParams.get('code') || hashParams.get('code')

if (code) {
  // Try to find code_verifier in localStorage
  // (current code searches for it but doesn't find it)
  
  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(href)
  
  // Error: "both auth code and code verifier should be non-empty"
}
```

## What's Happening

1. User clicks "Continue with Google" → `signInWithOAuth()` is called
2. Supabase redirects to Google OAuth
3. User approves → Google redirects back with `?code=...` in URL
4. Callback page tries `exchangeCodeForSession(href)`
5. **FAILS:** Supabase cannot find the `code_verifier` that should have been stored

## What I've Already Tried

1. ✅ Added localStorage cleanup (preserving PKCE keys)
2. ✅ Added code_verifier search in callback
3. ✅ Verified localStorage is accessible
4. ✅ Simplified code (removed complex checks)
5. ✅ Added explicit PKCE flow configuration

**None of these worked.**

## What I Need

**Please provide a working solution that:**

1. **Ensures `code_verifier` is stored** when `signInWithOAuth()` is called
2. **Ensures `code_verifier` is retrieved** when `exchangeCodeForSession()` is called
3. **Works with `@supabase/ssr` v0.7.0** (or suggests version update if needed)
4. **Handles browser redirects** (localStorage should persist across redirects)

## Key Questions to Answer

1. How does `@supabase/ssr` v0.7.0 store `code_verifier` internally?
   - localStorage? sessionStorage? cookies? memory?
   - What's the exact key name pattern?

2. Why might `code_verifier` not be found after redirect?
   - Storage cleared? Wrong key name? Timing issue?

3. Is there a known issue with `@supabase/ssr` v0.7.0 and PKCE?
   - Should we update to a newer version?
   - Is there a workaround?

## Expected Solution Format

Please provide:
1. **Complete working code** for all 3 files mentioned above
2. **Explanation** of what was wrong and why your fix works
3. **Alternative approaches** if the primary solution doesn't work
4. **Testing steps** to verify the fix

## Additional Context

- The project was working fine until November 3, 2025, 7 PM
- After that, multiple "fixes" were attempted which may have broken things
- Goal: Restore to a working state with clean, simple code
- Prefer: Use Supabase's built-in PKCE handling rather than manual implementation

## Files to Modify

1. `src/lib/supabase-client.ts` - Supabase client initialization
2. `src/hooks/useSupabaseAuth.ts` - OAuth sign-in function
3. `src/app/auth/callback/page.tsx` - Callback handler

---

**Please analyze the issue and provide a complete, working solution with explanation.**




