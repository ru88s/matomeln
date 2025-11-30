'use client';

import { useState } from 'react';
import { extractTalkIdFromUrl, detectSourceType } from '@/lib/shikutoku-api';
import { Talk } from '@/lib/types';
import { StepHeader } from '@/components/ui/StepHeader';
import { componentStyles } from '@/lib/design-system';

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
    <div className={componentStyles.card.base}>
      <StepHeader
        number={1}
        title="スレッドを読み込む"
        badge={{ text: '必須', variant: 'required' }}
        variant="pink"
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
            Shikutoku または 5ch のURL
          </label>
          <input
            type="text"
            id="url"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://shikutoku.me/talks/123 または https://xxx.5ch.net/test/read.cgi/..."
            className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            ShikutokuのトークIDのみの入力も可能です（例: 6454）
          </p>
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-orange-400 to-pink-400 text-white font-bold py-3 px-4 rounded-2xl hover:from-orange-500 hover:to-pink-500 transition-all shadow-md cursor-pointer"
        >
          読み込む
        </button>
      </form>

      {currentTalk && (
        <div className="mt-4 p-4 bg-gradient-to-r from-orange-50 to-pink-50 rounded-2xl border border-orange-100">
          <div className="font-medium text-stone-800">{currentTalk.title}</div>
          <div className="text-xs text-stone-500 mt-1">
            コメント数: {commentsCount !== undefined ? commentsCount : 0}
          </div>
        </div>
      )}
    </div>
  );
}