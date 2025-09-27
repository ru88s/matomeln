import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ローカル開発ではAPIルートを有効化、本番ビルドではCloudflare Functions使用
  // output: 'export', // ローカル開発時はコメントアウト
  images: {
    unoptimized: true,
  },
  trailingSlash: false,
};

export default nextConfig;
