import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'export' を削除してAPIルートを有効化
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
