'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

const CALLBACK_PATH = '/auth/capacitor-callback';

/**
 * DeepLinkHandler
 *
 * Mounted once at the root layout, this component is a no-op on the web and
 * becomes active inside the Capacitor WebView. It listens for the
 * `appUrlOpen` event fired by @capacitor/app whenever the OS hands our app
 * a URL (Supabase magic link, OAuth redirect, or any other deep link).
 *
 * The URL is rewritten to an internal path on the same origin so the
 * existing Next.js router (and the client-side auth callback page at
 * `/auth/capacitor-callback`) can take over. We do not strip query params
 * or the URL fragment - the supabase-js client needs them to recover the
 * session.
 */
export function DeepLinkHandler() {
  const router = useRouter();
  const lastHandledRef = useRef<{ url: string; ts: number } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!Capacitor.isNativePlatform()) return;

    let removed = false;
    let handle: { remove: () => void } | null = null;

    const processUrl = (rawUrl: string) => {
      try {
        const url = new URL(rawUrl);

        // 1) Strip the custom scheme (`agorich://`) and rebuild as an
        //    internal https URL the WebView can navigate to.
        //    URL parsing of custom schemes puts the path into `pathname`
        //    and the host (when present) into `host`.
        let internalPath = url.pathname || '/';
        if (rawUrl.startsWith('agorich://') && url.host) {
          const hostPrefix = `/${url.host}`;
          if (!internalPath.startsWith(hostPrefix)) {
            internalPath = hostPrefix + (internalPath.startsWith('/') ? internalPath : `/${internalPath}`);
          }
        }

        // agorich://auth/callback?code=...  =>  /auth/callback?code=...
        // agorich:///auth/callback?code=... =>  /auth/callback?code=...
        // https://example.com/auth/callback?code=... => keep as-is
        if (rawUrl.startsWith('agorich://')) {
          // Strip the leading slash that URL adds, then route auth to the
          // client-side callback page (the server route at /auth/callback
          // is not available under output: "export").
          if (internalPath.startsWith('/auth/callback')) {
            internalPath = CALLBACK_PATH + (url.search || '') + (url.hash || '');
          } else if (internalPath.startsWith('/auth/')) {
            internalPath = internalPath + (url.search || '') + (url.hash || '');
          } else {
            internalPath = (internalPath || '/') + (url.search || '') + (url.hash || '');
          }
        } else {
          // Universal / App Links case - keep the path, swap host for
          // the internal callback page when the original target was
          // /auth/callback.
          if (internalPath.startsWith('/auth/callback')) {
            internalPath = CALLBACK_PATH + (url.search || '') + (url.hash || '');
          }
        }

        if (internalPath && internalPath !== window.location.pathname + window.location.search) {
          router.replace(internalPath);
        }
      } catch (err) {
        console.error('[DeepLinkHandler] Failed to parse deep link URL:', rawUrl, err);
      }
    };

    App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      if (removed) return;
      if (event?.url) {
        const now = Date.now();
        const last = lastHandledRef.current;
        if (last && last.url === event.url && now - last.ts < 1500) {
          return;
        }
        lastHandledRef.current = { url: event.url, ts: now };
        Browser.close().catch(() => {});
        processUrl(event.url);
      }
    })
      .then((h) => {
        if (removed) {
          h.remove();
        } else {
          handle = h;
        }
      })
      .catch((err) => {
        console.error('[DeepLinkHandler] Failed to register appUrlOpen listener:', err);
      });

    return () => {
      removed = true;
      if (handle) handle.remove();
    };
  }, [router]);

  return null;
}

export default DeepLinkHandler;
