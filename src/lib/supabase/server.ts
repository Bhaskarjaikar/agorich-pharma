import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates a Supabase server client with proper cookie handling
 * This is the correct way to use Supabase with Next.js App Router
 */
export async function createServerClient() {
  const cookieStore = await cookies()

  // Use safe fallbacks to prevent crashes if env vars are missing in dev
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cfthxtnwuhvhhnifshsr.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmdGh4dG53dWh2aGhuaWZzaHNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyOTkyMjQsImV4cCI6MjA3NTg3NTIyNH0.PFQzwzsnb10LZISfcbG9ipHy8aVURxL5A7cg8rn3sFw'

  return createSupabaseServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: Parameters<typeof cookieStore.set>[2]) {
          try {
            cookieStore.set(name, value, options)
          } catch {
            // Cookie setting failed - this can happen in middleware
            // The response object will handle it
          }
        },
        remove(name: string, options: Parameters<typeof cookieStore.set>[2]) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 })
          } catch {
            // Cookie removal failed - ignore
          }
        },
      },
    }
  )
}
