import React from 'react';
import { colors } from '@/lib/design-system';

export const Logo: React.FC = () => (
  <svg className="w-11 h-11" viewBox="0 0 24 24" fill="none">
    {/* シンプルでかわいいまとめツールアイコン */}
    {/* 3本の線 */}
    <rect x="3" y="6" width="10" height="3" rx="1.5" fill={colors.primary.pink.light} />
    <rect x="3" y="10.5" width="12" height="3" rx="1.5" fill={colors.accent.skyBlue} />
    <rect x="3" y="15" width="8" height="3" rx="1.5" fill={colors.accent.lavender} />

    {/* シンプルな > （集約を表現） */}
    <path
      d="M16 7L21 12L16 17"
      stroke={colors.primary.pink.dark}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);