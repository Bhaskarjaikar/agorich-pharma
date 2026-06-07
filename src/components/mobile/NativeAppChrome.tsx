'use client';

import { useEffect } from 'react';
import { isNativeApp } from '@/lib/capacitor';

export function NativeAppChrome() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isNativeApp()) return;
    document.documentElement.classList.add('native-app');
    return () => {
      document.documentElement.classList.remove('native-app');
    };
  }, []);

  return null;
}

export default NativeAppChrome;
