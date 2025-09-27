'use client';

import { useState } from 'react';
import { extractTalkIdFromUrl } from '@/lib/shikutoku-api';
import { Talk } from '@/lib/types';
import { StepHeader } from '@/components/ui/StepHeader';
import { componentStyles } from '@/lib/design-system';

interface TalkLoaderProps {
  onLoad: (talkId: string) => void;
  currentTalk: Talk | null;
  commentsCount?: number;
}

export default function TalkLoader({ onLoad, currentTalk, commentsCount }: TalkLoaderProps) {
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
    <div className={componentStyles.card.base}>
      <StepHeader
        number={1}
        title="トークを読み込む"
        badge={{ text: '必須', variant: 'required' }}
        variant="pink"
      />

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
          className="w-full bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold py-3 px-4 rounded-2xl hover:from-sky-600 hover:to-cyan-600 transition-all shadow-md"
        >
          トークを読み込む
        </button>
      </form>

      {currentTalk && (
        <div className="mt-4 p-4 bg-gradient-to-r from-sky-50 to-cyan-50 rounded-2xl border border-sky-100">
          <div className="font-medium text-gray-900">{currentTalk.title}</div>
          <div className="text-xs text-gray-500 mt-1">
            コメント数: {commentsCount !== undefined ? commentsCount : 0}
          </div>
        </div>
      )}
    </div>
  );
}