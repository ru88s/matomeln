'use client';

import { useState } from 'react';
import { extractTalkIdFromUrl, detectSourceType } from '@/lib/shikutoku-api';
import { Talk } from '@/lib/types';

interface TalkLoaderProps {
  onLoad: (input: string) => void;
  currentTalk: Talk | null;
  commentsCount?: number;
}

export default function TalkLoader({ onLoad, currentTalk, commentsCount }: TalkLoaderProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedInput = input.trim();
    if (!trimmedInput) {
      setError('URLまたはトークIDを入力してください');
      return;
    }

    const sourceType = detectSourceType(trimmedInput);

    if (sourceType === 'unknown') {
      setError('有効なShikutokuまたは5chのURLを入力してください');
      return;
    }

    // Shikutokuの場合はIDを抽出して検証
    if (sourceType === 'shikutoku') {
      const talkId = extractTalkIdFromUrl(trimmedInput);
      if (!talkId) {
        setError('有効なShikutoku URLまたはトークIDを入力してください');
        return;
      }
    }

    onLoad(trimmedInput);
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-pink-100 p-6 shadow-sm hover:border-pink-200 transition-all">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
          <span className="font-black text-xl">1</span>
        </div>
        <h2 className="text-lg font-black text-gray-900">スレッドを読み込む</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm text-gray-600 mb-1">
            <a href="https://shikutoku.me" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">shikutoku.me</a> または <a href="https://5ch.net" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">5ch.net</a> のURL
          </label>
          <input
            type="text"
            id="url"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://shikutoku.me/talks/123 または https://xxx.5ch.net/test/read.cgi/..."
            className="w-full px-4 py-2.5 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent text-sm bg-white shadow-sm"
          />
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-4 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-md hover:shadow-lg cursor-pointer"
        >
          読み込む
        </button>
      </form>

      {currentTalk && (
        <div className="mt-4 p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl border border-pink-200 shadow-sm">
          <div className="font-bold text-rose-500">{currentTalk.title}</div>
          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <span className="inline-block w-2 h-2 bg-green-400 rounded-full"></span>
            {commentsCount !== undefined ? commentsCount : 0}件のコメント
          </div>
        </div>
      )}
    </div>
  );
}
