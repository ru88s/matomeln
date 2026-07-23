'use client';

import { useState, useEffect } from 'react';

interface OGPData {
  title: string;
  description: string;
  image: string;
  siteName: string;
  url: string;
}

function parseOgpResponse(text: string, fallbackUrl: string): OGPData | null {
  if (!text.trim()) return null;
  try {
    const parsed = JSON.parse(text) as Partial<OGPData> | null;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      title: typeof parsed.title === 'string' ? parsed.title : '',
      description: typeof parsed.description === 'string' ? parsed.description : '',
      image: typeof parsed.image === 'string' ? parsed.image : '',
      siteName: typeof parsed.siteName === 'string' ? parsed.siteName : '',
      url: typeof parsed.url === 'string' && parsed.url ? parsed.url : fallbackUrl,
    };
  } catch {
    return null;
  }
}

export function LinkCard({ url }: { url: string }) {
  const [ogp, setOgp] = useState<OGPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // imgurのURLはフルURLでテキストリンク表示
  const isImgur = /^https?:\/\/(i\.)?imgur\.com\//i.test(url);

  useEffect(() => {
    setOgp(null);
    setError(false);
    setLoading(!isImgur);

    // imgurの場合はOGP取得をスキップ
    if (isImgur) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchOGP = async () => {
      try {
        const response = await fetch(`/api/ogp?url=${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error('Failed to fetch OGP');
        const data = parseOgpResponse(await response.text(), url);
        if (cancelled) return;
        if (!data) {
          setError(true);
          return;
        }
        setOgp(data);
      } catch (err) {
        if (cancelled) return;
        setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchOGP();
    return () => {
      cancelled = true;
    };
  }, [url, isImgur]);

  // imgurの場合はフルURLでテキストリンク表示
  if (isImgur) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-blue-500 hover:underline break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
    );
  }

  if (loading) {
    return (
      <div className="my-2 flex min-h-28 w-full max-w-2xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-3.5">
          <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="w-24 shrink-0 animate-pulse bg-gray-100 sm:w-32" />
      </div>
    );
  }

  if (error || !ogp) {
    let hostname = url;
    try {
      hostname = new URL(url).hostname;
    } catch {
      // URLをそのまま表示
    }
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="my-2 block w-full max-w-2xl overflow-hidden rounded-lg border border-gray-200 bg-white px-3.5 py-3 no-underline shadow-sm transition-colors hover:bg-gray-50"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="block truncate text-sm font-semibold text-gray-900">{hostname}</span>
        <span className="mt-1 line-clamp-2 block break-all text-xs leading-5 text-gray-500">{url}</span>
      </a>
    );
  }

  let hostname = url;
  try {
    hostname = ogp.siteName || new URL(url).hostname;
  } catch {
    hostname = ogp.siteName || url;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ogp.title}
      className="my-2 flex min-h-28 w-full max-w-2xl overflow-hidden rounded-lg border border-gray-200 bg-white no-underline shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex min-w-0 flex-1 flex-col justify-center p-3.5">
        <div className="mb-1 truncate text-xs font-semibold text-gray-500">{hostname}</div>
        <div className="line-clamp-3 text-sm font-bold leading-5 text-gray-900 sm:line-clamp-2">{ogp.title}</div>
        {ogp.description && (
          <div className="mt-1.5 line-clamp-1 text-xs leading-5 text-gray-500 sm:line-clamp-2">{ogp.description}</div>
        )}
      </div>
      {ogp.image && (
        <div className="w-[32%] max-w-32 shrink-0 bg-gray-100">
          <img
            src={ogp.image}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full min-h-28 w-full object-cover"
            onError={(e) => {
              e.currentTarget.parentElement?.remove();
            }}
          />
        </div>
      )}
    </a>
  );
}
