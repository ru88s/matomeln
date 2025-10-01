'use client';

import { useEffect, useRef } from 'react';

interface TwitterEmbedProps {
  url: string;
}

export function TwitterEmbed({ url }: TwitterEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Twitter Widgets JSの読み込み
    const script = document.createElement('script');
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    script.charset = 'utf-8';

    if (!document.querySelector('script[src="https://platform.twitter.com/widgets.js"]')) {
      document.body.appendChild(script);
    }

    // Twitterウィジェットの初期化
    script.onload = () => {
      if (window.twttr && containerRef.current) {
        window.twttr.widgets.load(containerRef.current);
      }
    };

    // 既にスクリプトが読み込まれている場合
    if (window.twttr) {
      window.twttr.widgets.load(containerRef.current);
    }

    return () => {
      // クリーンアップは不要（スクリプトは共有）
    };
  }, [url]);

  return (
    <div ref={containerRef} className="my-2">
      <blockquote className="twitter-tweet">
        <a href={url}></a>
      </blockquote>
    </div>
  );
}

// Twitter Widgets API の型定義
declare global {
  interface Window {
    twttr?: {
      widgets: {
        load: (element?: HTMLElement) => void;
      };
    };
  }
}
