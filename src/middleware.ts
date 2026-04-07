import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options?: CookieOptions) => {
          res.cookies.set({ name, value, ...(options ?? {}) })
        },
        remove: (name: string, options?: CookieOptions) => {
          res.cookies.delete(options ? { name, ...options } : { name })
        },
      },
    }
  )

  // Log cookies to confirm middleware can see auth token
  const cookieNames = req.cookies.getAll().map(({ name }) => name)
  console.log('🧁 Cookies visible to middleware:', cookieNames)

  const { data: { user }, error } = await supabase.auth.getUser()
  console.log('👤 Middleware user:', user?.email || 'none', error || '')

  const pathname = req.nextUrl.pathname

  // Allow OAuth callback route
  if (pathname.startsWith('/auth/callback')) return res

  // Admin route protection
  if (pathname.startsWith('/admin')) {
    if (!user) return NextResponse.redirect(new URL('/login?redirect=/admin', req.url))
    if (user.id !== '723421ed-f226-41f0-bb09-3feb55e3e293')
      return NextResponse.redirect(new URL('/retailer', req.url))
  }

  // Retailer route protection
  if (pathname.startsWith('/retailer') && user?.id === '723421ed-f226-41f0-bb09-3feb55e3e293') {
    return NextResponse.redirect(new URL('/admin', req.url))
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*', '/retailer/:path*', '/auth/callback'],
}
