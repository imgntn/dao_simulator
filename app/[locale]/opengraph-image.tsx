import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'DAO Research Atlas — Actionable governance findings from 16,370 simulation runs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  // Quorum reach data for the mini chart
  const bars = [
    { label: '5%', value: 99.9, color: '#1f7a8c' },
    { label: '10%', value: 82.0, color: '#1f7a8c' },
    { label: '20%', value: 25.4, color: '#5ba3b0' },
    { label: '30%', value: 4.0, color: '#c4a06a' },
    { label: '40%', value: 0.0, color: '#c4a06a' },
  ];

  const stats = [
    { value: '16,370', label: 'Simulation Runs' },
    { value: '14', label: 'DAO Digital Twins' },
    { value: '6', label: 'Decision Briefs' },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '60px 72px',
          background: 'linear-gradient(135deg, #fffef9 0%, #f5efe2 52%, #ebe4d6 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Left side: text */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '16px' }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 700,
              letterSpacing: '0.2em',
              color: '#8f6f42',
              textTransform: 'uppercase' as const,
            }}
          >
            DAO Research, Made Actionable
          </div>
          <div
            style={{
              fontSize: '52px',
              fontWeight: 700,
              lineHeight: 1.1,
              color: '#1d1a14',
            }}
          >
            DAO Research Atlas
          </div>
          <div
            style={{
              fontSize: '20px',
              lineHeight: 1.5,
              color: '#3f5163',
              maxWidth: '480px',
            }}
          >
            Actionable governance findings from 16,370 simulation runs across 21 experiment configurations.
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '24px', marginTop: '16px' }}>
            {stats.map((s) => (
              <div
                key={s.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#fff9ef',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  border: '1px solid #e7dbc8',
                }}
              >
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#1f7a8c' }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#5c7083', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right side: mini bar chart */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'white',
            borderRadius: '20px',
            padding: '28px 32px 20px',
            border: '1px solid #d8cab4',
            marginLeft: '48px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1f7a8c', marginBottom: '16px', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
            Quorum Cliff Effect
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '200px' }}>
            {bars.map((b) => (
              <div key={b.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#1d1a14' }}>
                  {b.value > 0 ? `${b.value}%` : '0%'}
                </div>
                <div
                  style={{
                    width: '40px',
                    height: `${Math.max(b.value / 100 * 180, 2)}px`,
                    background: b.color,
                    borderRadius: '6px',
                    opacity: 0.88,
                  }}
                />
                <div style={{ fontSize: '12px', color: '#5c7083' }}>{b.label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '11px', color: '#5c7083', marginTop: '8px' }}>
            Quorum threshold → reach rate
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
