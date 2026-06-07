import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

// Helper to get cookie domain for consistency with callback route
const getCookieDomain = (hostname: string) => {
  if (hostname === 'localhost' || hostname === '0.0.0.0') return undefined
  // Remove www. prefix and add leading dot for cross-subdomain cookies
  const domain = hostname.startsWith('www.') ? hostname.slice(4) : hostname
  return `.${domain}`
}

// Helper function to get user role from Supabase
async function getUserRole(supabase: any, userId: string) {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    
    if (error || !profile) {
      return null
    }
    return profile.role
  } catch (error) {
    console.error('Error fetching user role:', error)
    return null
  }
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // Get hostname for cookie domain
  const hostname = req.nextUrl.hostname === '0.0.0.0' ? 'localhost' : req.nextUrl.hostname
  const cookieDomain = getCookieDomain(hostname)
  const isSecure = process.env.NODE_ENV === 'production'

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options?: CookieOptions) => {
          const enhancedOptions: CookieOptions = {
            ...options,
            path: '/',
            sameSite: 'lax',
            secure: isSecure,
            ...(cookieDomain ? { domain: cookieDomain } : {}),
          }
          res.cookies.set({ name, value, ...enhancedOptions })
        },
        remove: (name: string, options?: CookieOptions) => {
          const enhancedOptions: CookieOptions = {
            ...options,
            path: '/',
            maxAge: 0,
            sameSite: 'lax',
            secure: isSecure,
            ...(cookieDomain ? { domain: cookieDomain } : {}),
          }
          res.cookies.set({ name, value: '', ...enhancedOptions })
        },
      },
    }
  )

  const justLoggedInCookie = req.cookies.get('just_logged_in')
  
  if (justLoggedInCookie?.value === 'true') {
    res.cookies.set({ 
      name: 'just_logged_in', 
      value: '', 
      path: '/',
      maxAge: 0,
      sameSite: 'lax',
      secure: isSecure,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    })
    return res
  }

  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null

  const pathname = req.nextUrl.pathname

  // Redirect /signup to /login
  if (pathname.startsWith('/signup')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (pathname.startsWith('/auth/callback')) return res

  let userRole = null
  if (user) {
    userRole = await getUserRole(supabase, user.id)
  }

  // Helper function to get correct dashboard for role
  const getDashboardForRole = (role: string | null) => {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
      case 'SALES':
      case 'SUPPORT':
        return '/admin'
      case 'LOGISTIC':
        return '/logistic'
      case 'DISTRIBUTOR':
        return '/distributor'
      case 'RETAILER':
        return '/retailer'
      default:
        return '/login'
    }
  }

  // Admin route protection
  if (pathname.startsWith('/admin')) {
    if (!user) return NextResponse.redirect(new URL('/login?redirect=/admin', req.url))
    if (!['SUPER_ADMIN', 'ADMIN', 'SALES', 'SUPPORT'].includes(userRole as string)) {
      const destination = getDashboardForRole(userRole)
      return NextResponse.redirect(new URL(destination, req.url))
    }
  }

  // Logistic route protection
  if (pathname.startsWith('/logistic')) {
    if (!user) return NextResponse.redirect(new URL('/login?redirect=/logistic', req.url))
    if (!['SUPER_ADMIN', 'LOGISTIC'].includes(userRole as string)) {
      const destination = getDashboardForRole(userRole)
      return NextResponse.redirect(new URL(destination, req.url))
    }
  }

  // Sales route protection
  if (pathname.startsWith('/sales')) {
    if (!user) return NextResponse.redirect(new URL('/login?redirect=/sales', req.url))
    if (!['SUPER_ADMIN', 'SALES'].includes(userRole as string)) {
      const destination = getDashboardForRole(userRole)
      return NextResponse.redirect(new URL(destination, req.url))
    }
  }

  // Retailer route protection
  if (pathname.startsWith('/retailer')) {
    if (!user) return NextResponse.redirect(new URL('/login?redirect=/retailer', req.url))
    if (userRole === 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
    if (userRole !== 'RETAILER') {
      const destination = getDashboardForRole(userRole)
      return NextResponse.redirect(new URL(destination, req.url))
    }
  }

  // Distributor route protection
  if (pathname.startsWith('/distributor')) {
    if (!user) return NextResponse.redirect(new URL('/login?redirect=/distributor', req.url))
    if (userRole === 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
    if (userRole !== 'DISTRIBUTOR') {
      const destination = getDashboardForRole(userRole)
      return NextResponse.redirect(new URL(destination, req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*', '/retailer/:path*', '/logistic/:path*', '/sales/:path*', '/distributor/:path*', '/auth/callback', '/signup'],
}
