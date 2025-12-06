'use client';

import { useState } from 'react';

export default function ContactPage() {
  const [activeTab, setActiveTab] = useState<'bug' | 'other'>('bug');
  const email = 'matomeln8@gmail.com';

  const bugReportSubject = encodeURIComponent('まとめるんの不具合報告');
  const bugReportBody = encodeURIComponent(`## 不具合の説明



## 不具合の再現手順



## 詳細データ（編集しないでください）
WebApp: ${typeof window !== 'undefined' ? JSON.stringify((navigator as Navigator & { userAgentData?: unknown }).userAgentData || { userAgent: navigator.userAgent }) : 'N/A'}
URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}
`);

  const otherSubject = encodeURIComponent('まとめるんへのお問い合わせ');
  const otherBody = encodeURIComponent(`## お問い合わせ内容


`);

  const currentSubject = activeTab === 'bug' ? bugReportSubject : otherSubject;
  const currentBody = activeTab === 'bug' ? bugReportBody : otherBody;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* ヘッダー */}
      <div className="text-center">
        <h1 className="text-4xl font-black bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent mb-4">
          お問い合わせ
        </h1>
        <p className="text-gray-600">
          問題や質問があればお問い合わせください。
        </p>
      </div>

      {/* メインコンテンツ */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-orange-100">
        {/* タブ切り替え */}
        <div className="flex border border-gray-200 rounded-xl overflow-hidden mb-6">
          <button
            onClick={() => setActiveTab('bug')}
            className={`flex-1 py-3 px-4 font-bold transition-all cursor-pointer ${
              activeTab === 'bug'
                ? 'bg-gradient-to-r from-orange-400 to-pink-400 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            バグ報告
          </button>
          <button
            onClick={() => setActiveTab('other')}
            className={`flex-1 py-3 px-4 font-bold transition-all cursor-pointer ${
              activeTab === 'other'
                ? 'bg-gradient-to-r from-orange-400 to-pink-400 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            その他
          </button>
        </div>

        {/* メールアドレス */}
        <p className="text-gray-600 text-sm mb-4">
          以下のメールアドレスにお問い合わせ内容を送信してください。
        </p>

        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-200 mb-6">
          <a
            href={`mailto:${email}?subject=${currentSubject}&body=${currentBody}`}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {email}
          </a>
          <a
            href={`https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${currentSubject}&body=${currentBody}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            Gmailで開く
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        {/* メールテンプレート */}
        <div className="border border-gray-200 rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-gray-900">メールのテンプレート</h3>

          {/* 件名 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-sm text-gray-700">件名</span>
              <button
                onClick={() => {
                  const subject = activeTab === 'bug' ? 'まとめるんの不具合報告' : 'まとめるんへのお問い合わせ';
                  navigator.clipboard.writeText(subject);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                title="コピー"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
              {activeTab === 'bug' ? 'まとめるんの不具合報告' : 'まとめるんへのお問い合わせ'}
            </div>
          </div>

          {/* 本文 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-sm text-gray-700">本文</span>
              <button
                onClick={() => {
                  const body = activeTab === 'bug'
                    ? `## 不具合の説明\n\n\n## 不具合の再現手順\n\n\n## 詳細データ（編集しないでください）\nWebApp: ${JSON.stringify((navigator as Navigator & { userAgentData?: unknown }).userAgentData || { userAgent: navigator.userAgent })}\nURL: ${window.location.href}`
                    : `## お問い合わせ内容\n\n`;
                  navigator.clipboard.writeText(body);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                title="コピー"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap font-mono">
              {activeTab === 'bug' ? (
                <>
                  <p className="text-gray-900 font-bold">## 不具合の説明</p>
                  <p className="text-gray-400 my-2">&nbsp;</p>
                  <p className="text-gray-900 font-bold">## 不具合の再現手順</p>
                  <p className="text-gray-400 my-2">&nbsp;</p>
                  <p className="text-gray-900 font-bold">## 詳細データ（編集しないでください）</p>
                  <p className="text-xs text-gray-500 break-all">
                    WebApp: {typeof window !== 'undefined' ? JSON.stringify((navigator as Navigator & { userAgentData?: unknown }).userAgentData || { userAgent: navigator.userAgent.slice(0, 50) + '...' }) : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">URL: {typeof window !== 'undefined' ? window.location.origin : 'N/A'}</p>
                </>
              ) : (
                <>
                  <p className="text-gray-900 font-bold">## お問い合わせ内容</p>
                  <p className="text-gray-400 my-2">&nbsp;</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
