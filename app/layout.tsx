import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import { Logo } from '@/components/ui/Logo';
import { gradients, borderRadius, shadows, typography } from '@/lib/design-system';

export const metadata: Metadata = {
  title: "シクマト - Shikutokuまとめ作成ツール",
  description: "Shikutoku（シクトク）のトークを簡単にまとめてブログ記事にできる無料ツール",
  keywords: "シクトク,まとめ,ブログ,Shikutoku,掲示板",
  manifest: '/manifest.json',
  openGraph: {
    title: "シクマト - Shikutokuまとめ作成ツール",
    description: "Shikutokuのトークを簡単にまとめてブログ記事に",
    url: "https://matome.shikutoku.me",
    siteName: "シクマト",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "シクマト - Shikutokuまとめ作成ツール",
    description: "Shikutokuのトークを簡単にまとめてブログ記事に",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
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

        <footer className="mt-16 py-8 bg-white/60 backdrop-blur-sm border-t border-sky-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm text-gray-600">
              © 2025 シクマト -
              <a href="https://shikutoku.me" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-700 ml-1">
                Shikutoku
              </a>
              のまとめ作成ツール
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
