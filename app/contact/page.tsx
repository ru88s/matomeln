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
          ご質問・ご要望・不具合報告などお気軽にどうぞ
        </p>
      </div>

      {/* メインコンテンツ */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-orange-100">
        <div className="space-y-6">
          {/* メールアドレス */}
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">メールでお問い合わせ</h2>
            <a
              href="mailto:matomeln8@gmail.com"
              className="inline-block text-lg font-medium text-orange-500 hover:text-orange-600 transition-colors"
            >
              matomeln8@gmail.com
            </a>
          </div>

          {/* 注意事項 */}
          <div className="bg-orange-50 rounded-xl p-4 text-sm text-gray-600">
            <h3 className="font-bold text-gray-700 mb-2">お問い合わせの際のお願い</h3>
            <ul className="space-y-1 list-disc list-inside">
              <li>不具合報告の場合は、発生状況をできるだけ詳しくお知らせください</li>
              <li>返信には数日かかる場合があります</li>
              <li>個別のまとめ作成依頼にはお応えできません</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
