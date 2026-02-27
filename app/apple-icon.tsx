import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1f7a8c 0%, #165f6d 100%)',
          borderRadius: 36,
        }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Governance glyph: pillars + arch */}
          <path
            d="M8 24V14l8-6 8 6v10"
            stroke="#f6f0e4"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line x1="12" y1="24" x2="12" y2="17" stroke="#c4a06a" strokeWidth="2" strokeLinecap="round" />
          <line x1="16" y1="24" x2="16" y2="15" stroke="#c4a06a" strokeWidth="2" strokeLinecap="round" />
          <line x1="20" y1="24" x2="20" y2="17" stroke="#c4a06a" strokeWidth="2" strokeLinecap="round" />
          <line x1="7" y1="24" x2="25" y2="24" stroke="#f6f0e4" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
