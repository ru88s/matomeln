'use client';

import { useState } from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'features' | 'faq'>('basic');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-gradient-to-br from-orange-50 to-pink-50 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl">
        {/* ヘッダー */}
        <div className="p-4 border-b border-orange-100 flex justify-between items-center bg-white/80 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>💡</span>
            使い方
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-orange-100 rounded-full transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* タブ */}
        <div className="flex gap-1 p-3 bg-white/50 border-b border-orange-100">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'basic'
                ? 'bg-gradient-to-r from-orange-400 to-pink-400 text-white shadow'
                : 'text-gray-600 hover:bg-orange-100'
            }`}
          >
            基本の使い方
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'features'
                ? 'bg-gradient-to-r from-orange-400 to-pink-400 text-white shadow'
                : 'text-gray-600 hover:bg-orange-100'
            }`}
          >
            便利な機能
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'faq'
                ? 'bg-gradient-to-r from-orange-400 to-pink-400 text-white shadow'
                : 'text-gray-600 hover:bg-orange-100'
            }`}
          >
            よくある質問
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-4 max-h-[calc(85vh-130px)] overflow-y-auto">
          {/* 基本の使い方 */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              {/* ステップ1 */}
              <div className="flex gap-3 bg-white rounded-xl p-4 shadow-sm border border-pink-100">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-500 text-white rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="font-bold">1</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">スレッドを読み込む</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    5ch、open2ch、2ch.sc、ShikutokuのスレッドURLを入力
                  </p>
                  <div className="text-xs bg-gray-50 p-2 rounded-lg space-y-1">
                    <code className="block text-orange-600">https://xxx.5ch.net/test/read.cgi/...</code>
                    <code className="block text-orange-600">https://xxx.2ch.sc/test/read.cgi/...</code>
                  </div>
                </div>
              </div>

              {/* ステップ2 */}
              <div className="flex gap-3 bg-white rounded-xl p-4 shadow-sm border border-purple-100">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 text-white rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="font-bold">2</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">コメントを選択</h3>
                  <p className="text-sm text-gray-600">
                    まとめに含めたいコメントをクリックして選択。色・サイズも個別調整可能。
                  </p>
                </div>
              </div>

              {/* ステップ3 */}
              <div className="flex gap-3 bg-white rounded-xl p-4 shadow-sm border border-sky-100">
                <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-cyan-500 text-white rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="font-bold">3</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">タグを発行</h3>
                  <p className="text-sm text-gray-600">
                    「タグを発行」ボタンでHTMLタグを生成。生成後も編集可能。
                  </p>
                </div>
              </div>

              {/* ステップ4 */}
              <div className="flex gap-3 bg-white rounded-xl p-4 shadow-sm border border-green-100">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="font-bold">4</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">ブログに投稿</h3>
                  <p className="text-sm text-gray-600">
                    ライブドアブログはワンクリック投稿。他はHTMLをコピーして貼り付け。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 便利な機能 */}
          {activeTab === 'features' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-100">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span>⌨️</span>
                  キーボードショートカット
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <kbd className="px-1.5 py-0.5 bg-white rounded border text-xs font-mono">Space</kbd>
                    <span className="ml-2 text-gray-600">選択/解除</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <kbd className="px-1.5 py-0.5 bg-white rounded border text-xs font-mono">1-9, 0</kbd>
                    <span className="ml-2 text-gray-600">色選択</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <kbd className="px-1.5 py-0.5 bg-white rounded border text-xs font-mono">Q W E</kbd>
                    <span className="ml-2 text-gray-600">サイズ 大/中/小</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <kbd className="px-1.5 py-0.5 bg-white rounded border text-xs font-mono">⌘+E</kbd>
                    <span className="ml-2 text-gray-600">編集</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <kbd className="px-1.5 py-0.5 bg-white rounded border text-xs font-mono">⌘+Z</kbd>
                    <span className="ml-2 text-gray-600">元に戻す</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <kbd className="px-1.5 py-0.5 bg-white rounded border text-xs font-mono">⌘+Enter</kbd>
                    <span className="ml-2 text-gray-600">タグ発行</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-100">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span>🎨</span>
                  カスタマイズ
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• コメントの個別編集（ダブルクリック or ⌘+E）</li>
                  <li>• 10色のカラーパレット</li>
                  <li>• 文字サイズ3段階</li>
                  <li>• ドラッグ&ドロップで並び替え</li>
                  <li>• URLは自動でリンク化</li>
                </ul>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-100">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span>🚀</span>
                  ライブドアブログ連携
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  APIキーを設定するとワンクリックで自動投稿できます。
                </p>
                <p className="text-xs text-gray-500">
                  ライブドアブログ管理画面 → 設定 → API Key で取得
                </p>
              </div>
            </div>
          )}

          {/* よくある質問 */}
          {activeTab === 'faq' && (
            <div className="space-y-3">
              {[
                { q: '利用料金はかかりますか？', a: '完全無料です。登録も不要です。' },
                { q: 'どのブログで使えますか？', a: 'HTML編集対応のブログサービスで使えます。ライブドアブログは自動投稿にも対応。' },
                { q: 'コメントの順番は変更できますか？', a: 'はい、ドラッグ&ドロップで自由に並び替えできます。' },
                { q: '画像も含められますか？', a: 'はい、コメントの画像は自動で含まれます（最大200px）。' },
                { q: '生成後に編集できますか？', a: 'はい、タイトル・本文・続きすべて編集可能です。' },
                { q: '引用元リンクは含まれますか？', a: 'はい、自動で元スレッドへのリンクが追加されます。' },
                { q: '対応している掲示板は？', a: '5ch、open2ch、2ch.sc、Shikutokuに対応しています。' },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-orange-100">
                  <p className="font-bold text-gray-900 text-sm mb-1">Q: {item.q}</p>
                  <p className="text-sm text-gray-600">A: {item.a}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
