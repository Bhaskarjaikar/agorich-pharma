import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true })

  try {
    const { accessToken, refreshToken } = await req.json()

    console.log('🔄 Refresh endpoint tokens received:', {
      hasAccessToken: Boolean(accessToken),
      hasRefreshToken: Boolean(refreshToken),
    })

    if (!accessToken || !refreshToken) {
      return NextResponse.json({ error: 'Missing tokens' }, { status: 400 })
    }

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

    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    if (error) {
      console.error('🔄 Refresh endpoint setSession error:', error)
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    console.log('✅ Refresh endpoint setSession success')
    return res
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to refresh session'
    console.error('🔄 Refresh endpoint failure:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
