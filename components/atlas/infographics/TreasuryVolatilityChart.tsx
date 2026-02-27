/**
 * RQ4 — Treasury Volatility
 * Split comparison: unstabilized vs stabilized ranges
 */
export function TreasuryVolatilityChart() {
  const groups = [
    { label: 'Unstabilized', low: 0.448, high: 0.5, color: '#c4a06a' },
    { label: 'Stabilized', low: 0.235, high: 0.271, color: '#1f7a8c' },
  ];

  const chartW = 320;
  const chartH = 150;
  const topPad = 26;
  const botPad = 36;
  const leftPad = 50;
  const rightPad = 20;
  const barAreaW = chartW - leftPad - rightPad;
  const barH = 26;
  const barGap = 24;
  const maxVal = 0.55;

  const totalH = groups.length * barH + (groups.length - 1) * barGap;
  const startY = topPad + (chartH - topPad - botPad - totalH) / 2;

  return (
    <figure className="flex flex-col items-center" role="img" aria-label="Treasury volatility drops roughly 50%: from 0.448–0.500 unstabilized to 0.235–0.271 stabilized">
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="w-full max-w-[320px]"
        aria-hidden="true"
      >
        {/* Title badge */}
        <text x={chartW / 2} y={14} textAnchor="middle" fontSize="11" fontWeight="700" fill="#1f7a8c">
          −50% volatility
        </text>

        {groups.map((g, i) => {
          const y = startY + i * (barH + barGap);
          const x1 = leftPad + (g.low / maxVal) * barAreaW;
          const x2 = leftPad + (g.high / maxVal) * barAreaW;
          const w = x2 - x1;
          return (
            <g key={g.label}>
              {/* Range bar */}
              <rect x={x1} y={y} width={w} height={barH} rx={5} fill={g.color} opacity={0.82} />

              {/* Low/high labels */}
              <text x={x1 - 3} y={y + barH / 2 + 1} textAnchor="end" dominantBaseline="middle" fontSize="9" fontWeight="600" fill="#1d1a14">
                {g.low.toFixed(3)}
              </text>
              <text x={x2 + 3} y={y + barH / 2 + 1} textAnchor="start" dominantBaseline="middle" fontSize="9" fontWeight="600" fill="#1d1a14">
                {g.high.toFixed(3)}
              </text>

              {/* Row label */}
              <text x={leftPad - 6} y={y + barH + 14} textAnchor="end" fontSize="9" fill="#5c7083" fontWeight="500">
                {g.label}
              </text>
            </g>
          );
        })}

        {/* Vertical zero line */}
        <line x1={leftPad} y1={startY - 4} x2={leftPad} y2={startY + totalH + 4} stroke="#d8cab4" strokeWidth="1" strokeDasharray="3,3" />
      </svg>
      <figcaption className="mt-1 text-center text-[0.7rem] text-[var(--text-muted)]">
        Volatility range: unstabilized vs stabilized
      </figcaption>
    </figure>
  );
}
