'use client';

import { useState } from 'react';
import { extractTalkIdFromUrl } from '@/lib/shikutoku-api';
import { Talk } from '@/lib/types';

interface TalkLoaderProps {
  onLoad: (talkId: string) => void;
  currentTalk: Talk | null;
}

export default function TalkLoader({ onLoad, currentTalk }: TalkLoaderProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const talkId = extractTalkIdFromUrl(input);

    if (!talkId) {
      setError('有効なURLまたはトークIDを入力してください');
      return;
    }

    onLoad(talkId);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        ステップ1: トークを読み込む
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
            ShikutokuのトークURL または トークID
          </label>
          <input
            type="text"
            id="url"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://shikutoku.me/talks/123 または 123"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        <button
          type="submit"
          className="w-full bg-pink-500 text-white font-medium py-2 px-4 rounded-xl hover:bg-pink-600 transition-colors"
        >
          トークを読み込む
        </button>
      </form>

      {currentTalk && (
        <div className="mt-4 p-4 bg-pink-50 rounded-xl">
          <div className="text-sm text-gray-600">読み込み済み:</div>
          <div className="font-medium text-gray-900">{currentTalk.title}</div>
          <div className="text-xs text-gray-500 mt-1">
            コメント数: {currentTalk.comment_count || 0}
          </div>
        </div>
      )}
    </div>
  );
}