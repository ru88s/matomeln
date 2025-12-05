'use client';

export default function ContactPage() {
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
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">準備中</h2>
          <p className="text-gray-500">
            お問い合わせ機能は現在準備中です。<br />
            しばらくお待ちください。
          </p>
        </div>
      </div>
    </div>
  );
}
