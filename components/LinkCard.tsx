'use client';

import { useState, useEffect } from 'react';

interface OGPData {
  title: string;
  description: string;
  image: string;
  siteName: string;
  url: string;
}

export function LinkCard({ url }: { url: string }) {
  const [ogp, setOgp] = useState<OGPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // imgurのURLはフルURLでテキストリンク表示
  const isImgur = /^https?:\/\/(i\.)?imgur\.com\//i.test(url);

  useEffect(() => {
    // imgurの場合はOGP取得をスキップ
    if (isImgur) {
      setLoading(false);
      return;
    }

    const fetchOGP = async () => {
      try {
        const response = await fetch(`/api/ogp?url=${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error('Failed to fetch OGP');
        const data = await response.json();
        setOgp(data);
      } catch (err) {
        // 開発環境のみエラーログを出力
        if (process.env.NODE_ENV === 'development') {
          console.error('OGP fetch error:', err);
        }
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchOGP();
  }, [url, isImgur]);

  // imgurの場合はフルURLでテキストリンク表示
  if (isImgur) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-blue-500 hover:underline"
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
        className="inline-block text-blue-500 hover:underline"
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
            {ogp.siteName || new URL(url).hostname}
          </div>
        </div>
      </div>
    </a>
  );
}
