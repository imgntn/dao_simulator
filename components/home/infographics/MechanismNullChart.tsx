/**
 * RQ — Mechanism Null Result (500 runs)
 * All four voting mechanisms produce statistically identical outcomes.
 * Advanced mechanism design does not meaningfully affect governance quality.
 */
export function MechanismNullChart() {
  const mechanisms = [
    { label: 'Majority', passRate: 0.976, whaleInfluence: 0.270, captureRisk: 0.269 },
    { label: 'IRV', passRate: 0.983, whaleInfluence: 0.267, captureRisk: 0.265 },
    { label: 'Futarchy', passRate: 0.976, whaleInfluence: 0.270, captureRisk: 0.268 },
    { label: 'Liquid Dem.', passRate: 0.980, whaleInfluence: 0.271, captureRisk: 0.267 },
  ];

  const metrics = [
    { key: 'passRate' as const, label: 'Pass Rate', color: '#1f7a8c' },
    { key: 'whaleInfluence' as const, label: 'Whale Influence', color: '#c4a06a' },
    { key: 'captureRisk' as const, label: 'Capture Risk', color: '#5ba3b0' },
  ];

  const chartW = 320;
  const chartH = 186;
  const topPad = 20;
  const botPad = 30;
  const leftPad = 60;
  const rightPad = 42;
  const barAreaW = chartW - leftPad - rightPad;
  const barH = 8;
  const metricGap = 2;
  const groupGap = 14;
  const groupH = metrics.length * barH + (metrics.length - 1) * metricGap;
  const totalH = mechanisms.length * groupH + (mechanisms.length - 1) * groupGap;
  const startY = topPad + (chartH - topPad - botPad - totalH) / 2;

  // Scale: all values between 0.26 and 0.99 — use 0-1 range
  const scaleMax = 1.0;

  // Mean lines for the "null" visual
  const meanPassRate = mechanisms.reduce((s, m) => s + m.passRate, 0) / mechanisms.length;
  const meanWhale = mechanisms.reduce((s, m) => s + m.whaleInfluence, 0) / mechanisms.length;
  const meanCapture = mechanisms.reduce((s, m) => s + m.captureRisk, 0) / mechanisms.length;
  const means = [meanPassRate, meanWhale, meanCapture];

  return (
    <figure
      className="flex flex-col items-center"
      role="img"
      aria-label="All four voting mechanisms produce identical governance outcomes: pass rates within 0.7 percentage points, whale influence within 0.4 points, capture risk within 0.4 points across 500 runs"
    >
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="w-full max-w-[320px]"
        shapeRendering="geometricPrecision"
        textRendering="optimizeLegibility"
        aria-hidden="true"
      >
        {/* Title annotation */}
        <text
          x={chartW / 2}
          y={topPad - 6}
          textAnchor="middle"
          fontSize="9"
          fontWeight="600"
          fill="#5c7083"
          fontStyle="italic"
        >
          All within noise — mechanism design does not matter
        </text>

        {mechanisms.map((mech, mi) => {
          const gy = startY + mi * (groupH + groupGap);
          return (
            <g key={mech.label}>
              {/* Mechanism label */}
              <text
                x={leftPad - 6}
                y={gy + groupH / 2}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="9"
                fontWeight="500"
                fill="#3f5163"
              >
                {mech.label}
              </text>

              {metrics.map((metric, bi) => {
                const by = gy + bi * (barH + metricGap);
                const val = mech[metric.key];
                const w = (val / scaleMax) * barAreaW;
                const meanW = (means[bi] / scaleMax) * barAreaW;
                return (
                  <g key={metric.key}>
                    <rect
                      x={leftPad}
                      y={by}
                      width={w}
                      height={barH}
                      rx={2}
                      fill={metric.color}
                      opacity={0.78}
                    />
                    {/* Mean dashed line for null-result visual */}
                    <line
                      x1={leftPad + meanW}
                      y1={by - 1}
                      x2={leftPad + meanW}
                      y2={by + barH + 1}
                      stroke="#1d1a14"
                      strokeWidth="0.8"
                      strokeDasharray="2,2"
                      opacity={0.5}
                    />
                    {/* Value */}
                    <text
                      x={leftPad + w + 3}
                      y={by + barH / 2}
                      dominantBaseline="middle"
                      fontSize="7.5"
                      fontWeight="600"
                      fill="#1d1a14"
                    >
                      {val.toFixed(3)}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Legend */}
        {metrics.map((m, i) => {
          const lx = leftPad + i * 90;
          return (
            <g key={`legend-${m.key}`}>
              <rect
                x={lx}
                y={chartH - 14}
                width={8}
                height={8}
                rx={2}
                fill={m.color}
                opacity={0.78}
              />
              <text x={lx + 12} y={chartH - 7} fontSize="7.5" fill="#5c7083">
                {m.label}
              </text>
            </g>
          );
        })}

        {/* Dashed-line legend item */}
        <line
          x1={leftPad}
          y1={chartH - 22}
          x2={leftPad + 14}
          y2={chartH - 22}
          stroke="#1d1a14"
          strokeWidth="0.8"
          strokeDasharray="2,2"
          opacity={0.5}
        />
        <text x={leftPad + 18} y={chartH - 19} fontSize="7" fill="#5c7083">
          mean
        </text>
      </svg>
      <figcaption className="mt-1 text-center text-[0.7rem] text-[var(--text-muted)]">
        Advanced voting mechanisms produce identical governance outcomes (500 runs)
      </figcaption>
    </figure>
  );
}
