'use client';

import { HeroButton } from '@/components/ui/HeroControls';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application route error:', error);
    const storageKey = 'matomeln:last-route-error-reload';
    let shouldReload = true;

    try {
      const lastReload = Number(sessionStorage.getItem(storageKey) || '0');
      const now = Date.now();
      shouldReload = now - lastReload > 60000;
      if (shouldReload) {
        sessionStorage.setItem(storageKey, String(now));
      }
    } catch {
      shouldReload = true;
    }

    const timer = window.setTimeout(() => {
      if (shouldReload) {
        window.location.reload();
      } else {
        reset();
      }
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [error, reset]);

  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
      <p className="font-bold">画面を復旧しています...</p>
      <HeroButton
        type="button"
        onClick={() => window.location.reload()}
        className="mt-3 rounded bg-orange-500 px-3 py-2 font-bold text-white"
      >
        再読み込み
      </HeroButton>
    </div>
  );
}
