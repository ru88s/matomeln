import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '22%',
        }}
      >
        <svg width="180" height="180" viewBox="0 0 180 180" fill="none">
          <rect x="22" y="45" width="75" height="22" rx="11" fill="#FFB6C1" />
          <rect x="22" y="79" width="90" height="22" rx="11" fill="#87CEEB" />
          <rect x="22" y="113" width="60" height="22" rx="11" fill="#DDA0DD" />
          <path
            d="M120 52L158 90L120 128"
            stroke="#FF69B4"
            strokeWidth="22"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}