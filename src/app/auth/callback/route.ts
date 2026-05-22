import { NextResponse, NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

// Helper to log all cookies for debugging
const logCookies = (label: string, cookies: { getAll: () => Array<{ name: string; value?: string }> }) => {
  const all = cookies.getAll()
  console.log(`[${label}] Cookies (${all.length}):`, all.map(c => c.name).join(', '))
}

const SUPER_ADMIN_ID = '723421ed-f226-41f0-bb09-3feb55e3e293'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  const reqUrl = new URL(request.url)
  const hostname = reqUrl.hostname === '0.0.0.0' ? 'localhost' : reqUrl.hostname
  const port = reqUrl.port ? `:${reqUrl.port}` : ''
  
  // Use exact hostname for base URL
  const baseUrl = `${reqUrl.protocol}//${hostname}${port}`
  const isSecure = reqUrl.protocol === 'https:'
  
  // For cookie domain: remove www and add leading dot for cross-subdomain cookies
  const cookieDomain = hostname.startsWith('www.') ? hostname.slice(4) : hostname

  console.log('[Callback] Request URL:', request.url)
  console.log('[Callback] Hostname:', hostname)
  console.log('[Callback] Code present:', !!code)
  
  // Log all cookies with details
  const allCookies = request.cookies.getAll()
  console.log('[Callback] All cookies:', allCookies.map(c => c.name))
  
  // Look for PKCE code verifier cookie specifically
  const codeVerifierCookie = allCookies.find(c => c.name.includes('code-verifier'))
  console.log('[Callback] Code verifier cookie:', codeVerifierCookie ? {
    name: codeVerifierCookie.name,
    valueLength: codeVerifierCookie.value?.length,
    valuePreview: codeVerifierCookie.value?.substring(0, 20) + '...'
  } : 'NOT FOUND')

  // Track cookies that need to be set with improved settings for cross-domain
  const cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => {
          const cookie = request.cookies.get(name)?.value
          console.log(`[Callback] Getting cookie ${name}:`, cookie ? 'present' : 'missing')
          return cookie
        },
        set: (name: string, value: string, options: CookieOptions) => {
          console.log(`[Callback] Setting cookie ${name}`)
          // Ensure proper cookie settings for cross-domain
          const enhancedOptions: CookieOptions = {
            ...options,
            path: '/',
            sameSite: 'lax',
            secure: isSecure,
            // For production, use domain without www for consistency
            ...(process.env.NODE_ENV === 'production' && cookieDomain !== 'localhost' 
              ? { domain: `.${cookieDomain}` } 
              : {}),
          }
          cookiesToSet.push({ name, value, options: enhancedOptions })
        },
        remove: (name: string, options: CookieOptions) => {
          console.log(`[Callback] Removing cookie ${name}`)
          const enhancedOptions: CookieOptions = {
            ...options,
            path: '/',
            maxAge: 0,
            sameSite: 'lax',
            secure: isSecure,
            ...(process.env.NODE_ENV === 'production' && cookieDomain !== 'localhost' 
              ? { domain: `.${cookieDomain}` } 
              : {}),
          }
          cookiesToSet.push({ name, value: '', options: enhancedOptions })
        },
      },
    }
  )

  try {
    if (!code) {
      console.log('[Callback] No code provided, redirecting to login')
      return NextResponse.redirect(new URL(`${baseUrl}/login`, request.url))
    }

    console.log('[Callback] Exchanging code for session...')
    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    console.log('[Callback] Exchange result:', { 
      hasSession: !!sessionData?.session, 
      hasUser: !!sessionData?.user, 
      error: exchangeError?.message 
    })
    
    if (exchangeError) {
      console.error('[Callback] Code exchange error:', exchangeError)
      const errorDetails = encodeURIComponent(exchangeError.message || 'exchange_failed')
      return NextResponse.redirect(new URL(`/login?error=exchange_failed&details=${errorDetails}`, request.url))
    }

    // Check if we have user data
    if (!sessionData?.user) {
      console.log('[Callback] No user data in session, redirecting to login')
      return NextResponse.redirect(new URL(`${baseUrl}/login`, request.url))
    }

    const userId = sessionData.user.id
    const userEmail = sessionData.user.email
    const userMetadata = sessionData.user.user_metadata
    
    console.log('[Callback] User authenticated:', { userId, userEmail })
    
    // Check if profile exists
    console.log('[Callback] Checking for existing profile...')
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle()

    console.log('[Callback] Profile check result:', existingProfile ? 'found' : 'not found')

    // Get selected role from cookie
    const selectedRoleCookie = request.cookies.get('selectedRole')?.value as 'RETAILER' | 'DISTRIBUTOR' | 'SUPER_ADMIN' | 'LOGISTIC' | 'SALES' | 'ADMIN' | undefined
    const userRole = selectedRoleCookie || 'RETAILER'
    
    console.log('[Callback] Selected role from cookie:', selectedRoleCookie, 'Using role:', userRole)

    // If no profile exists, create minimal profile for Google/OAuth user
    if (!existingProfile) {
      console.log('[Callback] Creating new profile for user:', userId, 'with role:', userRole)
      const fullName = userMetadata?.full_name || userMetadata?.name || userEmail?.split('@')[0] || 'User'
      const avatarUrl = userMetadata?.avatar_url || userMetadata?.picture || null
      
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          user_name: fullName,
          email: userEmail,
          role: userRole,
          is_verified: true,
          profile_photo: avatarUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (profileError) {
        console.error('[Callback] Auto-profile creation error:', profileError)
      } else {
        console.log('[Callback] Auto-created profile for Google user:', userId)
      }
      
      // Determine destination based on user role
      let destination = '/retailer'
      if (userRole === 'DISTRIBUTOR') {
        destination = '/distributor'
      } else if (userId === SUPER_ADMIN_ID || userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
        destination = '/admin'
      } else if (userRole === 'LOGISTIC') {
        destination = '/logistic'
      } else if (userRole === 'SALES') {
        destination = '/sales'
      }
      
      const redirectUrl = new URL(`${baseUrl}${destination}`, request.url)
      console.log('[Callback] Redirecting new user to:', redirectUrl.toString())
      console.log('[Callback] Cookies to set:', cookiesToSet.map(c => c.name))
      
      const response = NextResponse.redirect(redirectUrl)
      
      // Apply all cookies from session exchange
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set({ name, value, ...options })
      })
      
      // Add grace period cookie with same domain settings
      const gracePeriodOptions: CookieOptions = { 
        maxAge: 10, 
        path: '/',
        sameSite: 'lax',
        secure: isSecure,
        ...(process.env.NODE_ENV === 'production' && cookieDomain !== 'localhost' 
          ? { domain: `.${cookieDomain}` } 
          : {}),
      }
      response.cookies.set('just_logged_in', 'true', gracePeriodOptions)
      
      // Clear selectedRole cookie after use
      response.cookies.set('selectedRole', '', { 
        maxAge: 0, 
        path: '/',
        sameSite: 'lax',
        secure: isSecure,
        ...(process.env.NODE_ENV === 'production' && cookieDomain !== 'localhost' 
          ? { domain: `.${cookieDomain}` } 
          : {}),
      })
      
      console.log('[Callback] Set grace period cookie with domain:', gracePeriodOptions.domain || 'default', 'secure:', gracePeriodOptions.secure)
      return response
    }

    // For existing profile, also check if we have a selectedRole cookie to update the role
    if (selectedRoleCookie && existingProfile.role !== selectedRoleCookie) {
      console.log('[Callback] Updating existing user role to:', selectedRoleCookie)
      await supabase
        .from('profiles')
        .update({ role: selectedRoleCookie, updated_at: new Date().toISOString() })
        .eq('id', userId)
    }

    // Determine destination based on role
    let destination = '/retailer'
    if (userId === SUPER_ADMIN_ID || existingProfile?.role === 'SUPER_ADMIN' || existingProfile?.role === 'ADMIN') {
      destination = '/admin'
    } else if (existingProfile?.role === 'LOGISTIC') {
      destination = '/logistic'
    } else if (existingProfile?.role === 'SALES') {
      destination = '/sales'
    } else if (existingProfile?.role === 'DISTRIBUTOR') {
      destination = '/distributor'
    }
    
    console.log('[Callback] Existing user - Redirecting to:', destination, 'Role:', existingProfile?.role, 'User:', userId)
    console.log('[Callback] Cookies to set:', cookiesToSet.map(c => c.name))
    
    const redirectUrl = new URL(`${baseUrl}${destination}`, request.url)
    const response = NextResponse.redirect(redirectUrl)
    
    // Apply all cookies from session exchange
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set({ name, value, ...options })
    })
    
    // Add grace period cookie with same domain settings
    const gracePeriodOptions: CookieOptions = { 
      maxAge: 10, 
      path: '/',
      sameSite: 'lax',
      secure: isSecure,
      ...(process.env.NODE_ENV === 'production' && cookieDomain !== 'localhost' 
        ? { domain: `.${cookieDomain}` } 
        : {}),
    }
    response.cookies.set('just_logged_in', 'true', gracePeriodOptions)
    console.log('[Callback] Set grace period cookie with domain:', gracePeriodOptions.domain || 'default', 'secure:', gracePeriodOptions.secure)
    return response
  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(new URL('/login?error=callback_error', request.url))
  }

  // Fallback: redirect to login if no code or session
  return NextResponse.redirect(new URL(`${baseUrl}/login`, request.url))
}
