'use client';

import { Capacitor } from '@capacitor/core';

/**
 * Returns true only when the app is running inside a native Capacitor
 * WebView (Android or iOS). On the regular web this is always false.
 */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Returns the native platform string ('android', 'ios') or 'web'.
 */
export function getPlatform(): 'android' | 'ios' | 'web' {
  if (typeof window === 'undefined') return 'web';
  try {
    const p = Capacitor.getPlatform();
    if (p === 'android' || p === 'ios') return p;
    return 'web';
  } catch {
    return 'web';
  }
}
