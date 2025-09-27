import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages用の静的エクスポート設定
  output: 'export',
  images: {
    unoptimized: true,
  },
  // 静的エクスポート用の設定
  trailingSlash: false,
};

export default nextConfig;
