import { Metadata } from 'next';
import { componentStyles } from '@/lib/design-system';

export const metadata: Metadata = {
  title: 'サイトマップ | まとめるん',
  description: 'まとめるんの全ページ一覧です。',
};

export default function Sitemap() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">サイトマップ</h1>

      <div className="prose prose-sky max-w-none">
        <p className="text-gray-600 mb-6">
          まとめるんの全ページ一覧です。お探しのページをクリックしてください。
        </p>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            <svg className="w-5 h-5 inline-block mr-2 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            メインページ
          </h2>
          <ul className="space-y-3">
            <li>
              <a href="/" className="text-orange-500 hover:text-orange-600 font-medium">
                ホーム
              </a>
              <span className="text-gray-500 text-sm ml-2">- まとめ作成ツール</span>
            </li>
            <li>
              <a href="/about" className="text-orange-500 hover:text-orange-600 font-medium">
                使い方
              </a>
              <span className="text-gray-500 text-sm ml-2">- まとめるんの使用方法とFAQ</span>
            </li>
            <li>
              <a href="/contact" className="text-orange-500 hover:text-orange-600 font-medium">
                お問い合わせ
              </a>
              <span className="text-gray-500 text-sm ml-2">- バグ報告・ご質問</span>
            </li>
          </ul>
        </section>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            <svg className="w-5 h-5 inline-block mr-2 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            対応掲示板
          </h2>
          <ul className="space-y-3">
            <li>
              <a href="https://5ch.net" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600 font-medium inline-flex items-center">
                5ch（5ちゃんねる）
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <span className="text-gray-500 text-sm ml-2">- 日本最大級の掲示板</span>
            </li>
            <li>
              <a href="https://open2ch.net" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600 font-medium inline-flex items-center">
                open2ch（おーぷん2ちゃんねる）
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <span className="text-gray-500 text-sm ml-2">- オープンな2ちゃんねる</span>
            </li>
            <li>
              <a href="https://shikutoku.me" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600 font-medium inline-flex items-center">
                Shikutoku
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <span className="text-gray-500 text-sm ml-2">- 新しい掲示板サービス</span>
            </li>
          </ul>
        </section>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            <svg className="w-5 h-5 inline-block mr-2 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            法的情報
          </h2>
          <ul className="space-y-3">
            <li>
              <a href="/privacy" className="text-orange-500 hover:text-orange-600 font-medium">
                プライバシーポリシー
              </a>
              <span className="text-gray-500 text-sm ml-2">- 個人情報の取り扱いについて</span>
            </li>
            <li>
              <a href="/terms" className="text-orange-500 hover:text-orange-600 font-medium">
                利用規約
              </a>
              <span className="text-gray-500 text-sm ml-2">- サービス利用条件について</span>
            </li>
          </ul>
        </section>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            <svg className="w-5 h-5 inline-block mr-2 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            主な機能
          </h2>
          <div className="bg-orange-50 p-4 rounded-xl">
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-orange-400 mr-2">✓</span>
                <span>5ch、open2ch、Shikutokuのスレッドからコメントを取得</span>
              </li>
              <li className="flex items-start">
                <span className="text-orange-400 mr-2">✓</span>
                <span>コメントの選択・並べ替え・編集</span>
              </li>
              <li className="flex items-start">
                <span className="text-orange-400 mr-2">✓</span>
                <span>文字色・サイズのカスタマイズ</span>
              </li>
              <li className="flex items-start">
                <span className="text-orange-400 mr-2">✓</span>
                <span>HTMLタグの自動生成</span>
              </li>
              <li className="flex items-start">
                <span className="text-orange-400 mr-2">✓</span>
                <span>ライブドアブログへの直接投稿</span>
              </li>
            </ul>
          </div>
        </section>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            <svg className="w-5 h-5 inline-block mr-2 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            キーボードショートカット
          </h2>
          <div className="bg-gray-50 p-4 rounded-xl">
            <ul className="space-y-2 text-sm font-mono">
              <li><kbd className="px-2 py-1 bg-white border rounded">Space</kbd> - コメント選択/解除</li>
              <li><kbd className="px-2 py-1 bg-white border rounded">⌘/Ctrl+E</kbd> - コメント編集</li>
              <li><kbd className="px-2 py-1 bg-white border rounded">1-9</kbd> - カラー選択</li>
              <li><kbd className="px-2 py-1 bg-white border rounded">0</kbd> - 黒色選択</li>
              <li><kbd className="px-2 py-1 bg-white border rounded">Q/W/E</kbd> - 文字サイズ変更</li>
              <li><kbd className="px-2 py-1 bg-white border rounded">⌘/Ctrl+Z</kbd> - 元に戻す</li>
              <li><kbd className="px-2 py-1 bg-white border rounded">⌘/Ctrl+Shift+Z</kbd> - やり直す</li>
              <li><kbd className="px-2 py-1 bg-white border rounded">⌘/Ctrl+Enter</kbd> - タグ発行</li>
              <li><kbd className="px-2 py-1 bg-white border rounded">Esc</kbd> - 編集キャンセル</li>
            </ul>
          </div>
        </section>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center">
            最終更新日：2025年12月1日
          </p>
        </div>
      </div>
    </div>
  );
}