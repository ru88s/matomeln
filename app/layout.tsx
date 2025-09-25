import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: "シクマト - Shikutokuまとめ作成ツール",
  description: "Shikutoku（シクトク）のトークを簡単にまとめてブログ記事にできる無料ツール",
  keywords: "シクトク,まとめ,ブログ,Shikutoku,掲示板",
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
        <nav className="bg-white/80 backdrop-blur-sm border-b border-sky-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-2">
                <a href="/" className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
                    ま
                  </div>
                  <span className="font-bold text-xl text-gray-800">シクマト</span>
                </a>
                <span className="text-xs text-gray-500 ml-2">Beta</span>
              </div>

              <div className="flex items-center gap-4">
                <a
                  href="/about"
                  className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  使い方
                </a>
                <a
                  href="https://shikutoku.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-sky-600 hover:text-sky-700 transition-colors font-medium"
                >
                  シクトク →
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
              © 2024 シクマト -
              <a href="https://shikutoku.me" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-700 ml-1">
                Shikutoku
              </a>
              の関連サービス
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
