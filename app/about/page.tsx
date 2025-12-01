'use client';

import { useState } from 'react';

export default function AboutPage() {
  const [activeTab, setActiveTab] = useState<'basic' | 'features' | 'faq'>('basic');

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* ヘッダー */}
      <div className="text-center">
        <h1 className="text-4xl font-black bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent mb-4">
          まとめるんの使い方
        </h1>
        <p className="text-gray-600 text-lg">
          5ch、open2ch、Shikutokuのスレッドから簡単にまとめ記事を作成できます
        </p>
      </div>

      {/* タブナビゲーション */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setActiveTab('basic')}
          className={`px-6 py-3 rounded-2xl font-bold transition-all ${
            activeTab === 'basic'
              ? 'bg-gradient-to-r from-orange-400 to-pink-400 text-white shadow-lg'
              : 'bg-white text-stone-600 hover:bg-orange-50'
          }`}
        >
          基本の使い方
        </button>
        <button
          onClick={() => setActiveTab('features')}
          className={`px-6 py-3 rounded-2xl font-bold transition-all ${
            activeTab === 'features'
              ? 'bg-gradient-to-r from-orange-400 to-pink-400 text-white shadow-lg'
              : 'bg-white text-stone-600 hover:bg-orange-50'
          }`}
        >
          便利な機能
        </button>
        <button
          onClick={() => setActiveTab('faq')}
          className={`px-6 py-3 rounded-2xl font-bold transition-all ${
            activeTab === 'faq'
              ? 'bg-gradient-to-r from-orange-400 to-pink-400 text-white shadow-lg'
              : 'bg-white text-stone-600 hover:bg-orange-50'
          }`}
        >
          よくある質問
        </button>
      </div>

      {/* 基本の使い方 */}
      {activeTab === 'basic' && (
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-orange-100 space-y-8">
          <div className="grid gap-6">
            {/* ステップ1 */}
            <div className="relative">
              <div className="flex gap-4 bg-white rounded-2xl p-5 shadow-sm border-2 border-pink-100 hover:border-pink-200 transition-all">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="font-black text-2xl">1</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-black text-xl text-gray-900">スレッドを読み込む</h3>
                    <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full font-bold">必須</span>
                  </div>
                  <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl p-4 space-y-3">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      5ch、open2ch、ShikutokuのスレッドURLを入力してください。
                    </p>
                    <div className="bg-white rounded-lg p-3 border border-pink-200 shadow-sm">
                      <p className="text-xs font-bold text-gray-600 mb-2">📝 入力例</p>
                      <div className="space-y-1">
                        <code className="block text-xs bg-gray-100 p-1 rounded text-orange-600">https://xxx.5ch.net/test/read.cgi/...</code>
                        <code className="block text-xs bg-gray-100 p-1 rounded text-orange-600">https://xxx.open2ch.net/test/read.cgi/...</code>
                        <code className="block text-xs bg-gray-100 p-1 rounded text-orange-600">https://shikutoku.me/talks/6454</code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* 接続線 */}
              <div className="absolute left-7 top-full h-8 w-0.5 bg-gradient-to-b from-pink-300 to-purple-300"></div>
            </div>

            {/* ステップ2 */}
            <div className="relative">
              <div className="flex gap-4 bg-white rounded-2xl p-5 shadow-sm border-2 border-purple-100 hover:border-purple-200 transition-all">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="font-black text-2xl">2</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-black text-xl text-gray-900">コメントを選択</h3>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold">必須</span>
                  </div>
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 space-y-3">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      まとめに含めたいコメントのチェックボックスをクリックして選択します。
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white rounded-lg p-3 border border-purple-200 shadow-sm">
                        <p className="text-xs font-bold text-purple-700 mb-1">💡 ポイント</p>
                        <p className="text-xs text-gray-600">番号の小さいコメントが自動で「本文」に</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-purple-200 shadow-sm">
                        <p className="text-xs font-bold text-purple-700 mb-1">🎨 カスタマイズ</p>
                        <p className="text-xs text-gray-600">色・サイズを個別調整可能</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* 接続線 */}
              <div className="absolute left-7 top-full h-8 w-0.5 bg-gradient-to-b from-purple-300 to-sky-300"></div>
            </div>

            {/* ステップ3 */}
            <div className="relative">
              <div className="flex gap-4 bg-white rounded-2xl p-5 shadow-sm border-2 border-sky-100 hover:border-sky-200 transition-all">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-sky-500 to-cyan-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="font-black text-2xl">3</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-black text-xl text-gray-900">タグを発行</h3>
                    <span className="text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded-full font-bold">簡単</span>
                  </div>
                  <div className="bg-gradient-to-r from-sky-50 to-cyan-50 rounded-xl p-4 space-y-3">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      画面右下の「タグを発行」ボタンをクリックしてHTMLタグを生成します。
                    </p>
                    <div className="bg-white rounded-lg p-3 border border-sky-200 shadow-sm">
                      <p className="text-xs font-bold text-sky-700 mb-1">✏️ 編集可能</p>
                      <p className="text-xs text-gray-600">生成後もタイトル・本文・続きを自由に編集OK</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* 接続線 */}
              <div className="absolute left-7 top-full h-8 w-0.5 bg-gradient-to-b from-sky-300 to-green-300"></div>
            </div>

            {/* ステップ4 */}
            <div className="relative">
              <div className="flex gap-4 bg-white rounded-2xl p-5 shadow-sm border-2 border-green-100 hover:border-green-200 transition-all">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="font-black text-2xl">4</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-black text-xl text-gray-900">ブログに投稿</h3>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">簡単</span>
                  </div>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 space-y-3">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      ライブドアブログのAPIキーを設定すれば、ワンクリックで自動投稿できます。
                    </p>
                    <div className="bg-white rounded-lg p-3 border border-green-200 shadow-sm">
                      <p className="text-xs font-bold text-green-700 mb-1">✨ または手動でコピー</p>
                      <p className="text-xs text-green-600">各項目の「コピー」ボタンでHTMLをコピーして、お好きなブログに貼り付けることもできます</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 便利な機能 */}
      {activeTab === 'features' && (
        <div className="space-y-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-orange-100">
            <h3 className="font-bold text-lg text-gray-900 mb-4">
              <span className="text-2xl mr-2">⌨️</span>
              キーボードショートカット
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <kbd className="px-2 py-1 bg-white rounded border border-gray-300 text-xs font-mono">Space</kbd>
                <span className="ml-2 text-sm text-gray-700">ホバー中のコメントを選択/解除</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <kbd className="px-2 py-1 bg-white rounded border border-gray-300 text-xs font-mono">1-9, 0</kbd>
                <span className="ml-2 text-sm text-gray-700">色選択（カラーパレット）</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <kbd className="px-2 py-1 bg-white rounded border border-gray-300 text-xs font-mono">Q</kbd>
                <span className="ml-2 text-sm text-gray-700">文字サイズ：大</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <kbd className="px-2 py-1 bg-white rounded border border-gray-300 text-xs font-mono">W</kbd>
                <span className="ml-2 text-sm text-gray-700">文字サイズ：中</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <kbd className="px-2 py-1 bg-white rounded border border-gray-300 text-xs font-mono">E</kbd>
                <span className="ml-2 text-sm text-gray-700">文字サイズ：小</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <kbd className="px-2 py-1 bg-white rounded border border-gray-300 text-xs font-mono">⌘/Ctrl</kbd>
                +
                <kbd className="px-2 py-1 bg-white rounded border border-gray-300 text-xs font-mono">E</kbd>
                <span className="ml-2 text-sm text-gray-700">コメント編集</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <kbd className="px-2 py-1 bg-white rounded border border-gray-300 text-xs font-mono">⌘/Ctrl</kbd>
                +
                <kbd className="px-2 py-1 bg-white rounded border border-gray-300 text-xs font-mono">Enter</kbd>
                <span className="ml-2 text-sm text-gray-700">タグ発行</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <kbd className="px-2 py-1 bg-white rounded border border-gray-300 text-xs font-mono">Esc</kbd>
                <span className="ml-2 text-sm text-gray-700">編集キャンセル</span>
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-orange-100">
            <h3 className="font-bold text-lg text-gray-900 mb-4">
              <span className="text-2xl mr-2">🎨</span>
              カスタマイズ機能
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-1">•</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">コメントの個別編集</p>
                  <p className="text-xs text-gray-600">ダブルクリックまたはCtrl+Eでコメント本文を編集できます</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-1">•</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">色のカスタマイズ</p>
                  <p className="text-xs text-gray-600">10色のカラーパレットから各コメントの色を選択</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-1">•</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">文字サイズの調整</p>
                  <p className="text-xs text-gray-600">大・中・小の3段階でサイズを変更可能</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-1">•</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">自動リンク化</p>
                  <p className="text-xs text-gray-600">コメント内のURLは自動的にクリック可能なリンクに変換</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-1">•</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">レスの並び替え</p>
                  <p className="text-xs text-gray-600">「レスの並び替え」モードでドラッグ&ドロップで順番変更可能</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-1">•</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">ピンポイント移動</p>
                  <p className="text-xs text-gray-600">番号を指定して特定のコメントの下に移動可能</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-orange-100">
            <h3 className="font-bold text-lg text-gray-900 mb-4">
              <span className="text-2xl mr-2">🚀</span>
              ライブドアブログ自動投稿
            </h3>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <p className="text-sm text-gray-700">
                ライブドアブログのAPIキーを設定することで、生成したまとめ記事をワンクリックで投稿できます。
              </p>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs font-bold text-gray-700 mb-2">設定方法：</p>
                <ol className="space-y-1 text-xs text-gray-600">
                  <li>1. ライブドアブログの管理画面にログイン</li>
                  <li>2. 「設定」→「API Key」でAPIキーを取得</li>
                  <li>3. まとめるんの「ライブドアブログAPI設定」に入力</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* よくある質問 */}
      {activeTab === 'faq' && (
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-orange-100">
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <p className="font-bold text-gray-900 mb-2">
                Q: 利用料金はかかりますか？
              </p>
              <p className="text-sm text-gray-600">
                A: 完全無料です。登録も不要で、すぐにご利用いただけます。
              </p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <p className="font-bold text-gray-900 mb-2">
                Q: どのブログサービスで使えますか？
              </p>
              <p className="text-sm text-gray-600">
                A: HTML編集に対応したブログサービス（ライブドアブログ、FC2ブログ、はてなブログ、Amebaブログなど）でご利用いただけます。
                特にライブドアブログは自動投稿にも対応しています。
              </p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <p className="font-bold text-gray-900 mb-2">
                Q: コメントの順番は変更できますか？
              </p>
              <p className="text-sm text-gray-600">
                A: はい、「レスの並び替え」モードを有効にすると、選択したコメントのみが表示され、
                ドラッグ&ドロップで順番を変更できます。また、番号を指定して特定のコメントの下に
                ピンポイントで移動することも可能です。番号が一番小さいコメントが自動的に「本文」となり、
                2つ目以降は「続きを読む」部分に配置されます。
              </p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <p className="font-bold text-gray-900 mb-2">
                Q: 画像も含められますか？
              </p>
              <p className="text-sm text-gray-600">
                A: はい、コメントに添付された画像は自動的に含まれます（最大200pxにリサイズ）。
              </p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <p className="font-bold text-gray-900 mb-2">
                Q: 生成後に編集はできますか？
              </p>
              <p className="text-sm text-gray-600">
                A: はい、生成されたタイトル・本文・続きを読むのテキストエリアは全て編集可能です。
                自由にカスタマイズしてからコピー・投稿してください。
              </p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <p className="font-bold text-gray-900 mb-2">
                Q: 引用元のリンクは含まれますか？
              </p>
              <p className="text-sm text-gray-600">
                A: はい、生成されたHTMLの最後に自動的に元スレッドへのリンクが含まれます。
              </p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <p className="font-bold text-gray-900 mb-2">
                Q: 対応している掲示板は？
              </p>
              <p className="text-sm text-gray-600">
                A: 現在、5ch（5ちゃんねる）、open2ch（おーぷん2ちゃんねる）、Shikutokuに対応しています。
              </p>
            </div>

            <div>
              <p className="font-bold text-gray-900 mb-2">
                Q: 他の掲示板にも対応予定はありますか？
              </p>
              <p className="text-sm text-gray-600">
                A: はい、対応希望の掲示板がありましたらお問い合わせください。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* お問い合わせ */}
      <div className="bg-gradient-to-r from-orange-50 to-pink-50 rounded-3xl p-6 border-2 border-orange-200 shadow-md text-center">
        <h2 className="text-lg font-bold text-stone-800 mb-3">
          お困りの際は
        </h2>
        <p className="text-sm text-stone-600 mb-4">
          使い方でご不明な点がございましたら、お気軽にお問い合わせください。
        </p>
        <a
          href="/contact"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-400 to-pink-400 text-white rounded-2xl hover:from-orange-500 hover:to-pink-500 transition-all font-bold shadow-lg"
        >
          お問い合わせはこちら
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </a>
      </div>
    </div>
  );
}