'use client';

import { Tweet } from 'react-tweet';
import { memo } from 'react';

interface TwitterEmbedProps {
  url: string;
}

function TwitterEmbedComponent({ url }: TwitterEmbedProps) {
  // URLからTweetIDを抽出
  const tweetIdMatch = url.match(/status\/(\d+)/);
  const tweetId = tweetIdMatch ? tweetIdMatch[1] : null;

  if (!tweetId) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-blue-500 hover:underline"
      >
        {url}
      </a>
    );
  }

  return (
    <span className="block w-[75%] max-w-md [&>div]:!my-0" data-theme="light">
      <Tweet
        id={tweetId}
        fallback={
          <div className="rounded-lg border border-gray-300 bg-gray-50 p-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Xポスト
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block text-blue-500 hover:text-blue-600 hover:underline text-sm"
            >
              {url}
            </a>
          </div>
        }
      />
    </span>
  );
}

export const TwitterEmbed = memo(TwitterEmbedComponent);
