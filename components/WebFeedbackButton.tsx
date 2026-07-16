'use client';

import { HeroButton, HeroTextArea } from '@/components/ui/HeroControls';
import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';

const FEEDBACK_ENDPOINT =
  process.env.NEXT_PUBLIC_WEB_FEEDBACK_ENDPOINT || 'https://app-feedback.w-yonamine.workers.dev/feedback';

export default function WebFeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const submitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (trimmed.length < 8) {
      toast.error('8文字以上で入力してください');
      return;
    }

    setIsSending(true);
    try {
      const viewport =
        typeof window !== 'undefined'
          ? `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio || 1}`
          : '';
      const response = await fetch(FEEDBACK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app: 'まとめるん',
          message: trimmed,
          source: 'web',
          device: {
            appVersion: 'web',
            buildNumber: 'matomeln',
            deviceModel: navigator.userAgent,
            osVersion: navigator.platform || 'web',
            locale: navigator.language || 'ja-JP',
          },
          context: {
            pageUrl: window.location.href,
            siteUrl: window.location.origin,
            userAgent: navigator.userAgent,
            referrer: document.referrer,
            viewport,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast.success('フィードバックを送信しました');
      setMessage('');
      setIsOpen(false);
    } catch (error) {
      console.error('feedback submit failed', error);
      toast.error('送信に失敗しました。時間をおいて再度お試しください');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <HeroButton
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
      >
        フィードバック
      </HeroButton>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-left shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">フィードバック</h2>
                <p className="mt-1 text-sm text-gray-500">
                  不具合や改善要望を送ってください。
                </p>
              </div>
              <HeroButton
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full px-2 py-1 text-xl leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="閉じる"
              >
                ×
              </HeroButton>
            </div>

            <form onSubmit={submitFeedback} className="space-y-4">
              <HeroTextArea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={5}
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                placeholder="例: タグ発行時に空白行が消える、〇〇の操作が分かりにくい"
              />
              <div className="flex items-center justify-end gap-3">
                <HeroButton
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
                >
                  キャンセル
                </HeroButton>
                <HeroButton
                  type="submit"
                  disabled={isSending}
                  className="rounded-lg bg-gradient-to-r from-orange-400 to-pink-400 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSending ? '送信中...' : '送信する'}
                </HeroButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
