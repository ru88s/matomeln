import type { Metadata } from "next";
import "./globals.css";
import 'react-tweet/theme.css';
import { Toaster } from 'react-hot-toast';
import { Logo } from '@/components/ui/Logo';
import { gradients, borderRadius, shadows, typography } from '@/lib/design-system';

export const metadata: Metadata = {
  title: "まとめるん - 掲示板まとめ作成ツール | 無料でかんたんブログ記事作成",
  description: "5chやShikutokuのスレッドを簡単にまとめてブログ記事にできる無料ツール。ドラッグ&ドロップで簡単編集、ライブドアブログへ直接投稿可能。まとめブログ運営者必見！",
  keywords: "5ch,Shikutoku,まとめ,ブログ,掲示板,まとめサイト,まとめツール,ライブドアブログ,無料,まとめるん,まとめ作成,ブログ記事,自動生成",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', type: 'image/x-icon' }
    ],
    apple: '/apple-touch-icon.svg',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: "まとめるん - 掲示板まとめ作成ツール | 無料でかんたんブログ記事作成",
    description: "5chやShikutokuのスレッドを簡単にまとめてブログ記事に。ドラッグ&ドロップで簡単編集、ライブドアブログへ直接投稿可能。",
    url: "https://matomeln.pages.dev",
    siteName: "まとめるん",
    type: "website",
    locale: "ja_JP",
    images: [
      {
        url: "https://matomeln.pages.dev/og-image.png",
        width: 1200,
        height: 630,
        alt: "まとめるん - 掲示板まとめ作成ツール",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "まとめるん - 掲示板まとめ作成ツール",
    description: "5chやShikutokuのスレッドを簡単にまとめてブログ記事に。無料で使える便利なまとめ作成ツール。",
    images: ["https://matomeln.pages.dev/og-image.png"],
  },
  metadataBase: new URL('https://matomeln.pages.dev'),
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
    name: 'まとめるん',
    alternateName: 'Matomeln',
    url: 'https://matomeln.pages.dev',
    description: '5chやShikutokuのスレッドを簡単にまとめてブログ記事にできる無料ツール。ドラッグ&ドロップで簡単編集、ライブドアブログへ直接投稿可能。',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'JPY',
    },
    featureList: [
      '5ch・Shikutokuスレッドのまとめ作成',
      'ドラッグ&ドロップによるコメント並べ替え',
      'コメントの色・サイズカスタマイズ',
      'HTMLタグ自動生成',
      'ライブドアブログ直接投稿',
    ],
    screenshot: 'https://matomeln.pages.dev/og-image.svg',
    author: {
      '@type': 'Organization',
      name: 'まとめるん',
      url: 'https://matomeln.pages.dev',
    },
  };

  return (
    <html lang="ja">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Cloudflare Web Analytics */}
        <script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "d9c88df490414f3996a1358c65d64642"}'></script>
      </head>
      <body className="bg-gradient-to-br from-orange-50 via-white to-pink-50 min-h-screen">
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              borderRadius: '16px',
              background: '#fff',
              color: '#44403C',
              boxShadow: '0 4px 12px rgba(251, 146, 60, 0.15)',
            },
          }}
        />
        <nav className="bg-gradient-to-r from-orange-400 via-orange-400 to-pink-400 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <div className="flex items-center gap-3">
                <a href="/" className="group flex items-center gap-3 hover:opacity-90 transition-opacity">
                  <div className={`w-12 h-12 bg-white ${borderRadius.appIcon} flex items-center justify-center ${shadows.lg} group-hover:shadow-xl transition-all group-hover:scale-105`}>
                    <Logo />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl text-white drop-shadow-sm" style={{ fontFamily: typography.fonts.rounded, letterSpacing: '0.05em', fontWeight: '800' }}>
                      まとめるん
                    </span>
                    <span className="text-xs text-orange-100 font-medium">掲示板まとめ作成ツール</span>
                  </div>
                </a>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/about"
                  className="px-4 py-2 text-sm text-white hover:bg-white/20 rounded-xl transition-all font-bold backdrop-blur-sm"
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
                  className="px-4 py-2 bg-white text-orange-500 hover:bg-orange-50 rounded-xl transition-all font-bold shadow-md hover:shadow-lg"
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

        <footer className="py-5 bg-white/70 backdrop-blur-sm border-t border-orange-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex items-center justify-center gap-3 text-xs mb-2">
              <a href="/site-map" className="text-stone-500 hover:text-orange-500 transition-colors">
                サイトマップ
              </a>
              <span className="text-stone-300">|</span>
              <a href="/privacy" className="text-stone-500 hover:text-orange-500 transition-colors">
                プライバシーポリシー
              </a>
              <span className="text-stone-300">|</span>
              <a href="/terms" className="text-stone-500 hover:text-orange-500 transition-colors">
                利用規約
              </a>
            </div>
            <p className="text-xs text-stone-400">
              © 2025 まとめるん
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
