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

    const controller = new AbortController();

    const fetchOGP = async () => {
      try {
        const response = await fetch(`/api/ogp?url=${encodeURIComponent(url)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Failed to fetch OGP');
        const data = parseOgpResponse(await response.text(), url);
        if (!data) {
          setError(true);
          return;
        }
        setOgp(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchOGP();
    return () => controller.abort();
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
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors my-2"
      >
        <div className="text-sm text-gray-400 animate-pulse">読み込み中...</div>
      </a>
    );
  }

  if (error || !ogp) {
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

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-gray-200 rounded-lg overflow-hidden hover:bg-gray-50 transition-colors my-2 no-underline"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex">
        {ogp.image && (
          <div className="flex-shrink-0 w-32 h-32">
            <img
              src={ogp.image}
              alt={ogp.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="flex-1 p-3 min-w-0">
          {ogp.title && (
            <div className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
              {ogp.title}
            </div>
          )}
          {ogp.description && (
            <div className="text-xs text-gray-600 line-clamp-2 mb-2">
              {ogp.description}
            </div>
          )}
          <div className="text-xs text-gray-400 truncate">
            {ogp.siteName || (() => { try { return new URL(url).hostname; } catch { return url; } })()}
          </div>
        </div>
      </div>
    </a>
  );
}
