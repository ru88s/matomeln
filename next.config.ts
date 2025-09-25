import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',  // 静的エクスポート設定
  images: {
    unoptimized: true,  // 画像最適化を無効化（静的サイトのため）
  },
};

export default nextConfig;
