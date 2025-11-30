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
    <div className="bg-white rounded-2xl border border-orange-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 bg-gradient-to-br from-orange-400 to-pink-400 text-white rounded-xl flex items-center justify-center shadow-md">
          <span className="font-bold text-lg">1</span>
        </div>
        <h2 className="text-lg font-bold text-gray-800">スレッドを読み込む</h2>
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
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm bg-white"
          />
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-orange-400 to-pink-400 text-white font-bold py-3 px-4 rounded-xl hover:from-orange-500 hover:to-pink-500 transition-all shadow-md hover:shadow-lg cursor-pointer"
        >
          読み込む
        </button>
      </form>

      {currentTalk && (
        <div className="mt-4 p-4 bg-orange-50 rounded-xl border border-orange-200">
          <div className="font-bold text-orange-600">{currentTalk.title}</div>
          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <span className="inline-block w-2 h-2 bg-green-400 rounded-full"></span>
            {commentsCount !== undefined ? commentsCount : 0}件のコメント
          </div>
        </div>
      )}
    </div>
  );
}
