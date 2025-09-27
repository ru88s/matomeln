import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
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
          borderRadius: '20%',
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="6" width="10" height="3" rx="1.5" fill="#FFB6C1" />
          <rect x="3" y="10.5" width="12" height="3" rx="1.5" fill="#87CEEB" />
          <rect x="3" y="15" width="8" height="3" rx="1.5" fill="#DDA0DD" />
          <path
            d="M16 7L21 12L16 17"
            stroke="#FF69B4"
            strokeWidth="3"
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