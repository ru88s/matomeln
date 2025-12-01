import React from 'react';

export const Logo: React.FC = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
    {/* まとめるん - 集約アイコン */}

    {/* グラデーション定義 */}
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FB923C" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
    </defs>

    {/* 3本の線（まとめるコンテンツを表現） */}
    <rect x="3" y="6" width="10" height="3" rx="1.5" fill="url(#logoGradient)" opacity="0.7" />
    <rect x="3" y="10.5" width="12" height="3" rx="1.5" fill="url(#logoGradient)" opacity="0.85" />
    <rect x="3" y="15" width="8" height="3" rx="1.5" fill="url(#logoGradient)" opacity="0.7" />

    {/* > 矢印（集約を表現） */}
    <path
      d="M16 7L21 12L16 17"
      stroke="url(#logoGradient)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);
