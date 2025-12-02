import type { Metadata } from "next";
import "./globals.css";
import 'react-tweet/theme.css';
import { Toaster } from 'react-hot-toast';
import { Logo } from '@/components/ui/Logo';

export const metadata: Metadata = {
  title: "まとめるん - 掲示板まとめ作成ツール | 無料でかんたんブログ記事作成",
  description: "5chやShikutokuのスレッドを簡単にまとめてブログ記事にできる無料ツール。コメント選択&カスタマイズで簡単作成、ライブドアブログへ直接投稿可能。まとめブログ運営者必見！",
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
    description: "5chやShikutokuのスレッドを簡単にまとめてブログ記事に。コメント選択&カスタマイズで簡単作成、ライブドアブログへ直接投稿可能。",
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
    description: '5chやShikutokuのスレッドを簡単にまとめてブログ記事にできる無料ツール。コメント選択&カスタマイズで簡単作成、ライブドアブログへ直接投稿可能。',
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
      <body className="bg-gray-50 min-h-screen">
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              borderRadius: '8px',
              background: '#fff',
              color: '#1f2937',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            },
          }}
        />
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm">
                    <Logo />
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    まとめるん
                  </span>
                  <span className="text-[10px] text-gray-400 font-normal ml-1">Beta</span>
                </a>
              </div>

              <div className="flex items-center gap-4">
                <a
                  href="/about"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
                >
                  <span>💡</span>
                  <span>使い方</span>
                </a>
                <a
                  href="/settings"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
                >
                  <span>⚙️</span>
                  <span>設定</span>
                </a>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="py-6 border-t border-gray-200 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex items-center justify-center gap-4 text-xs mb-2">
              <a href="/site-map" className="text-gray-500 hover:text-gray-700 transition-colors">
                サイトマップ
              </a>
              <span className="text-gray-300">|</span>
              <a href="/privacy" className="text-gray-500 hover:text-gray-700 transition-colors">
                プライバシーポリシー
              </a>
              <span className="text-gray-300">|</span>
              <a href="/terms" className="text-gray-500 hover:text-gray-700 transition-colors">
                利用規約
              </a>
              <span className="text-gray-300">|</span>
              <a href="/contact" className="text-gray-500 hover:text-gray-700 transition-colors">
                お問い合わせ
              </a>
            </div>
            <p className="text-xs text-gray-400">
              © 2025 まとめるん
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
