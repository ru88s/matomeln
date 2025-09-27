import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pagesビルド時は静的エクスポート、ローカルでは動的
  ...(process.env.CF_PAGES ? { output: 'export' } : {}),
  images: {
    unoptimized: true,
  },
  trailingSlash: false,
};

export default nextConfig;
