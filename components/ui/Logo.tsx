import React from 'react';

export const Logo: React.FC = () => (
  <svg className="w-11 h-11" viewBox="0 0 24 24" fill="none">
    {/* まとめるん - モダンでスタイリッシュなアイコン */}

    {/* グラデーション定義 */}
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FB923C" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
    </defs>

    {/* メインの「M」シェイプ - まとめるんの頭文字 */}
    <path
      d="M4 18V8L8.5 14L12 8L15.5 14L20 8V18"
      stroke="url(#logoGradient)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />

    {/* アクセントのドット */}
    <circle cx="12" cy="5" r="2" fill="url(#logoGradient)" />
  </svg>
);
