'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'dots' | 'pulse' | 'bars';
  color?: 'orange' | 'white' | 'gray';
  className?: string;
}

export default function LoadingSpinner({
  size = 'md',
  variant = 'default',
  color = 'orange',
  className = ''
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const colorClasses = {
    orange: 'text-orange-500',
    white: 'text-white',
    gray: 'text-gray-400'
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5'
  };

  const barSizes = {
    sm: 'w-0.5 h-3',
    md: 'w-1 h-4',
    lg: 'w-1.5 h-5'
  };

  if (variant === 'dots') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`${dotSizes[size]} rounded-full ${colorClasses[color]} bg-current animate-bounce`}
            style={{
              animationDelay: `${i * 0.15}s`,
              animationDuration: '0.6s'
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={`relative ${sizeClasses[size]} ${className}`}>
        <div
          className={`absolute inset-0 rounded-full ${colorClasses[color]} bg-current opacity-75 animate-ping`}
        />
        <div
          className={`relative rounded-full ${sizeClasses[size]} ${colorClasses[color]} bg-current opacity-90`}
        />
      </div>
    );
  }

  if (variant === 'bars') {
    return (
      <div className={`flex items-end gap-0.5 ${className}`}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`${barSizes[size]} ${colorClasses[color]} bg-current rounded-full`}
            style={{
              animation: 'loadingBars 1s ease-in-out infinite',
              animationDelay: `${i * 0.1}s`
            }}
          />
        ))}
        <style jsx>{`
          @keyframes loadingBars {
            0%, 100% {
              transform: scaleY(0.4);
              opacity: 0.5;
            }
            50% {
              transform: scaleY(1);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    );
  }

  // Default spinner with gradient
  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <svg
        className="animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          className="opacity-20"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className={colorClasses[color]}
          d="M12 2C6.47715 2 2 6.47715 2 12"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

// AI分析用の特別なローディングコンポーネント
export function AILoadingIndicator({
  text = 'AIが分析中',
  className = ''
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative w-5 h-5">
        {/* 外側の回転するリング */}
        <svg
          className="absolute inset-0 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-20"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M12 2C6.47715 2 2 6.47715 2 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        {/* 内側のパルスする点 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
        </div>
      </div>
      <span className="animate-pulse">{text}</span>
    </div>
  );
}

// スレッド読み込み用のローディング
export function ThreadLoadingIndicator({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="relative">
        {/* メインのスピナー */}
        <div className="w-10 h-10 rounded-full border-3 border-orange-200 border-t-orange-500 animate-spin" />
        {/* 中央のアイコン */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-orange-400 animate-pulse"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
        </div>
      </div>
      <span className="text-sm text-gray-500 animate-pulse">読み込み中...</span>
    </div>
  );
}
