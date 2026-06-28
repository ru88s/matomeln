'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global application error:', error);
    const storageKey = 'matomeln:last-global-error-reload';
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
    <html lang="ja">
      <body>
        <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
          <p>画面を復旧しています...</p>
          <button type="button" onClick={() => window.location.reload()}>
            再読み込み
          </button>
        </main>
      </body>
    </html>
  );
}
