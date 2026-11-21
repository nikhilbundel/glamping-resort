'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Re-render the page every few seconds (used while a payment is being confirmed). */
export function AutoRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
