import { NextResponse, NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const qpRedirect = url.searchParams.get('redirect') || '/login'
  const cookieRedirectRaw = request.cookies.get('post_auth_redirect')?.value

  // Build a safe target path (relative) for final redirect
  let targetPath = '/login'
  try {
    const preferred = cookieRedirectRaw ? decodeURIComponent(cookieRedirectRaw) : qpRedirect
    const parsed = new URL(preferred, 'http://localhost')
    targetPath = `${parsed.pathname}${parsed.search}`
  } catch {}

  // Prepare redirect response (we will attach cookies to this response)
  const reqUrl = new URL(request.url)
  const hostname = reqUrl.hostname === '0.0.0.0' ? 'localhost' : reqUrl.hostname
  const port = reqUrl.port ? `:${reqUrl.port}` : ''
  const absoluteTarget = `${reqUrl.protocol}//${hostname}${port}${targetPath}`
  const response = NextResponse.redirect(absoluteTarget)
  // Clear the temporary redirect cookie
  try {
    response.cookies.set({ name: 'post_auth_redirect', value: '', path: '/', maxAge: 0 })
  } catch {}

  const supabase = await createServerClient()

  try {
    if (code) {
      await supabase.auth.exchangeCodeForSession(code)
    }
  } catch {
    return NextResponse.redirect(new URL('/login?error=exchange_failed', request.url))
  }

  // Final redirect after cookies have been set
  return response
}
