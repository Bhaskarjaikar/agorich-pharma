'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { Browser } from '@capacitor/browser';

const SUPER_ADMIN_ID = '723421ed-f226-41f0-bb09-3feb55e3e293';

function getRoleDestination(userId: string | null | undefined, role?: string | null): string {
  if (userId === SUPER_ADMIN_ID || role === 'SUPER_ADMIN') return '/admin';
  switch (role) {
    case 'LOGISTIC':
      return '/logistic';
    case 'SALES':
      return '/sales';
    case 'DISTRIBUTOR':
      return '/distributor';
    case 'RETAILER':
      return '/retailer';
    default:
      return '/retailer';
  }
}

/**
 * CapacitorCallbackPage
 *
 * Client-side equivalent of the server route at /auth/callback. It exists
 * separately because Next.js does not allow `route.ts` and `page.tsx` to
 * coexist in the same directory, and `output: "export"` cannot run server
 * routes anyway. The Capacitor deep-link handler navigates here directly,
 * so the auth flow still completes inside the native WebView.
 */
export default function CapacitorCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'working' | 'done'>('working');
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const handle = async () => {
      try {
        Browser.close().catch(() => {});

        // PKCE flow: the URL carries a `code` query param.
        const code = searchParams?.get('code') ?? null;

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('[capacitor-callback] Code exchange failed:', error);
            router.replace('/login?error=exchange_failed');
            return;
          }
        }

        // Implicit / hash flow: tokens live in the URL fragment. The
        // supabase-js client picks those up automatically on page load.
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr || !user) {
          router.replace('/login?error=session_expired');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        const destination = getRoleDestination(user.id, profile?.role);
        setStatus('done');
        router.replace(destination);
      } catch (err) {
        console.error('[capacitor-callback] Unexpected error:', err);
        router.replace('/login?error=callback_error');
      }
    };

    handle();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">
          {status === 'working' ? 'Signing you in…' : 'Redirecting…'}
        </p>
      </div>
    </div>
  );
}
