import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import { Logo } from '@/components/ui/Logo';
import { gradients, borderRadius, shadows, typography } from '@/lib/design-system';

export const metadata: Metadata = {
  title: "シクマト - Shikutokuまとめ作成ツール | 無料でかんたんブログ記事作成",
  description: "Shikutoku（シクトク）のトークを簡単にまとめてブログ記事にできる無料ツール。ドラッグ&ドロップで簡単編集、ライブドアブログへ直接投稿可能。まとめブログ運営者必見！",
  keywords: "シクトク,Shikutoku,まとめ,ブログ,掲示板,まとめサイト,まとめツール,ライブドアブログ,無料,シクマト,まとめ作成,ブログ記事,自動生成",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', type: 'image/x-icon' }
    ],
    apple: '/apple-touch-icon.svg',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: "シクマト - Shikutokuまとめ作成ツール | 無料でかんたんブログ記事作成",
    description: "Shikutoku（シクトク）のトークを簡単にまとめてブログ記事に。ドラッグ&ドロップで簡単編集、ライブドアブログへ直接投稿可能。",
    url: "https://matome.shikutoku.me",
    siteName: "シクマト",
    type: "website",
    locale: "ja_JP",
    images: [
      {
        url: "https://matome.shikutoku.me/og-image.svg",
        width: 1200,
        height: 630,
        alt: "シクマト - Shikutokuまとめ作成ツール",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "シクマト - Shikutokuまとめ作成ツール",
    description: "Shikutokuのトークを簡単にまとめてブログ記事に。無料で使える便利なまとめ作成ツール。",
    images: ["https://matome.shikutoku.me/og-image.svg"],
  },
  metadataBase: new URL('https://matome.shikutoku.me'),
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'シクマト',
    alternateName: 'Shikumato',
    url: 'https://matome.shikutoku.me',
    description: 'Shikutoku（シクトク）のトークを簡単にまとめてブログ記事にできる無料ツール。ドラッグ&ドロップで簡単編集、ライブドアブログへ直接投稿可能。',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'JPY',
    },
    featureList: [
      'Shikutokuトークのまとめ作成',
      'ドラッグ&ドロップによるコメント並べ替え',
      'コメントの色・サイズカスタマイズ',
      'HTMLタグ自動生成',
      'ライブドアブログ直接投稿',
    ],
    screenshot: 'https://matome.shikutoku.me/og-image.svg',
    author: {
      '@type': 'Organization',
      name: 'シクマト',
      url: 'https://matome.shikutoku.me',
    },
  };

  return (
    <html lang="ja">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-gradient-to-br from-sky-50 via-white to-cyan-50 min-h-screen">
        <Toaster position="top-center" />
        <nav className={`${gradients.primary} ${shadows.lg}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <div className="flex items-center gap-3">
                <a href="/" className="group flex items-center gap-3 hover:opacity-90 transition-opacity">
                  <div className={`w-12 h-12 bg-white ${borderRadius.appIcon} flex items-center justify-center ${shadows.lg} group-hover:shadow-xl transition-all group-hover:scale-105`}>
                    <Logo />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl text-white" style={{ fontFamily: typography.fonts.apple, letterSpacing: '0.08em', fontWeight: '800' }}>
                      シクマト
                    </span>
                    <span className="text-xs text-sky-100 font-medium">Shikutokuのまとめ作成ツール</span>
                  </div>
                </a>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/about"
                  className="px-4 py-2 text-sm text-white hover:bg-white/20 rounded-lg transition-all font-bold backdrop-blur-sm"
                >
                  <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  使い方
                </a>
                <a
                  href="https://shikutoku.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white text-sky-600 hover:bg-sky-50 rounded-lg transition-all font-bold shadow-md hover:shadow-lg"
                >
                  Shikutoku
                  <svg className="w-4 h-4 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="py-4 bg-white/60 backdrop-blur-sm border-t border-sky-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex items-center justify-center gap-3 text-xs mb-2">
              <a href="/sitemap" className="text-gray-600 hover:text-gray-800">
                サイトマップ
              </a>
              <span className="text-gray-400">|</span>
              <a href="/privacy" className="text-gray-600 hover:text-gray-800">
                プライバシーポリシー
              </a>
              <span className="text-gray-400">|</span>
              <a href="/terms" className="text-gray-600 hover:text-gray-800">
                利用規約
              </a>
            </div>
            <p className="text-xs text-gray-500">
              © 2025 シクマト
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
