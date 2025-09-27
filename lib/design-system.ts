// Design System Constants
export const colors = {
  // Primary Colors
  primary: {
    pink: {
      50: '#FDF2F8',
      100: '#FCE7F3',
      200: '#FBCFE8',
      300: '#F9A8D4',
      400: '#F472B6',
      500: '#EC4899',
      600: '#DB2777',
      700: '#BE185D',
      light: '#FFB6C1',
      dark: '#FF69B4',
    },
    sky: {
      50: '#F0F9FF',
      100: '#E0F2FE',
      200: '#BAE6FD',
      300: '#7DD3FC',
      400: '#38BDF8',
      500: '#0EA5E9',
      600: '#0284C7',
      700: '#0369A1',
    },
    purple: {
      100: '#F3E8FF',
      200: '#E9D5FF',
      500: '#A855F7',
      600: '#9333EA',
    },
    green: {
      50: '#F0FDF4',
      100: '#DCFCE7',
      200: '#BBF7D0',
      500: '#22C55E',
      600: '#16A34A',
      700: '#15803D',
    },
    cyan: {
      50: '#ECFEFF',
      100: '#CFFAFE',
      500: '#06B6D4',
    },
  },
  // Neutral Colors
  neutral: {
    white: '#FFFFFF',
    gray: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
  },
  // Accent Colors
  accent: {
    lavender: '#DDA0DD',
    skyBlue: '#87CEEB',
    rose: '#FCA5A5',
    amber: '#FECA57',
  },
} as const;

export const typography = {
  fonts: {
    apple: '-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", YuGothic, sans-serif',
    rounded: '"Hiragino Maru Gothic ProN", "Hiragino Kaku Gothic ProN", "メイリオ", Meiryo, "Rounded Mplus 1c", sans-serif',
    system: 'system-ui, -apple-system, "Hiragino Sans", "Yu Gothic", sans-serif',
  },
  sizes: {
    xs: 'text-xs',    // 12px
    sm: 'text-sm',    // 14px
    base: 'text-base', // 16px
    lg: 'text-lg',    // 18px
    xl: 'text-xl',    // 20px
    '2xl': 'text-2xl', // 24px
    '3xl': 'text-3xl', // 30px
    '4xl': 'text-4xl', // 36px
  },
  weights: {
    normal: 'font-normal', // 400
    medium: 'font-medium', // 500
    semibold: 'font-semibold', // 600
    bold: 'font-bold', // 700
    extrabold: 'font-extrabold', // 800
    black: 'font-black', // 900
  },
} as const;

export const spacing = {
  xs: '0.5rem',   // 8px
  sm: '0.75rem',  // 12px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
  '2xl': '3rem',  // 48px
  '3xl': '4rem',  // 64px
} as const;

export const borderRadius = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  base: 'rounded',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
  full: 'rounded-full',
  appIcon: 'rounded-[20%]', // iOS app icon style
} as const;

export const shadows = {
  sm: 'shadow-sm',
  base: 'shadow',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
  none: 'shadow-none',
} as const;

export const gradients = {
  primary: 'bg-gradient-to-r from-sky-500 to-cyan-500',
  pink: 'bg-gradient-to-br from-pink-500 to-rose-500',
  purple: 'bg-gradient-to-br from-purple-500 to-indigo-500',
  green: 'bg-gradient-to-br from-green-500 to-emerald-500',
  background: 'bg-gradient-to-br from-sky-50 via-white to-cyan-50',
} as const;

export const transitions = {
  all: 'transition-all',
  colors: 'transition-colors',
  opacity: 'transition-opacity',
  shadow: 'transition-shadow',
  transform: 'transition-transform',
  duration: {
    fast: 'duration-150',
    base: 'duration-200',
    slow: 'duration-300',
  },
} as const;

// Component Styles
export const componentStyles = {
  stepNumber: {
    container: 'w-10 h-10 bg-gradient-to-br text-white rounded-xl flex items-center justify-center shadow-md',
    largeContainer: 'w-14 h-14 bg-gradient-to-br text-white rounded-2xl flex items-center justify-center shadow-lg',
    text: 'font-black text-xl',
    largeText: 'font-black text-2xl',
  },
  button: {
    primary: 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white hover:from-sky-600 hover:to-cyan-600',
    secondary: 'bg-white text-sky-600 hover:bg-sky-50',
    disabled: 'bg-gray-300 text-gray-500 cursor-not-allowed',
    pill: 'rounded-full',
    rounded: 'rounded-xl',
  },
  card: {
    base: 'bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg border border-sky-100 p-6 hover:shadow-xl transition-shadow',
    simple: 'bg-white rounded-2xl p-5 shadow-sm border-2',
  },
  badge: {
    base: 'text-xs px-2 py-1 rounded-full font-bold',
    required: 'bg-pink-100 text-pink-700',
    optional: 'bg-green-100 text-green-700',
    info: 'bg-sky-100 text-sky-700',
    purple: 'bg-purple-100 text-purple-700',
  },
} as const;