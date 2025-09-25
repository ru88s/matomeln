import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-12">
      <div className="text-center py-12">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-pink-500 rounded-2xl flex items-center justify-center text-white font-bold text-3xl">
            ま
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          シクマト
        </h1>
        <p className="text-xl text-gray-600 mb-2">
          Shikutokuまとめ作成ツール
        </p>
        <p className="text-sm text-gray-500">
          話題のトークを簡単にまとめてブログ記事に
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="font-bold text-gray-800 mb-2">1. トークを選ぶ</h3>
          <p className="text-sm text-gray-600">
            ShikutokuのURLまたはトークIDを入力して読み込み
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="font-bold text-gray-800 mb-2">2. コメントを選択</h3>
          <p className="text-sm text-gray-600">
            まとめたいコメントを選んで並び替え
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <h3 className="font-bold text-gray-800 mb-2">3. HTMLを生成</h3>
          <p className="text-sm text-gray-600">
            ブログに貼り付けられるHTMLを自動生成
          </p>
        </div>
      </div>

      <div className="text-center">
        <Link
          href="/create"
          className="inline-flex items-center gap-2 bg-pink-500 text-white font-medium px-8 py-3 rounded-xl hover:bg-pink-600 transition-colors"
        >
          まとめ記事を作成する
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-4">特徴</h2>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <div>
              <span className="font-medium text-gray-700">完全無料</span>
              <p className="text-sm text-gray-600 mt-1">
                登録不要、すべての機能が無料で利用可能
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <div>
              <span className="font-medium text-gray-700">自動リンク生成</span>
              <p className="text-sm text-gray-600 mt-1">
                元のShikutokuトークへのリンクを自動で付与
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <div>
              <span className="font-medium text-gray-700">ドラッグ＆ドロップで並び替え</span>
              <p className="text-sm text-gray-600 mt-1">
                直感的な操作でコメントの順番を自由に変更
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <div>
              <span className="font-medium text-gray-700">2つのスタイル</span>
              <p className="text-sm text-gray-600 mt-1">
                シンプル版とCSS付きリッチ版から選択可能
              </p>
            </div>
          </li>
        </ul>
      </div>

      <div className="text-center text-sm text-gray-600">
        <p>
          このツールは
          <a href="https://shikutoku.me" target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:text-pink-600 font-medium mx-1">
            Shikutoku（シクトク）
          </a>
          の関連サービスです
        </p>
      </div>
    </div>
  );
}