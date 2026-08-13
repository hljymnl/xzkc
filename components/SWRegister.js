'use client';
import { useEffect } from 'react';
import { asset } from '@/lib/base';
export default function SWRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(asset('/sw.js')).catch(() => {});
    }
  }, []);
  return null;
}
