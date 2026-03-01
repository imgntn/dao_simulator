/**
 * RQ6 — LLM Modes
 * Grouped bars: rule-based vs hybrid vs all-LLM
 */
export function LLMComparisonChart() {
  const modes = ['Rule-based', 'Hybrid', 'All-LLM'];
  const modeColors = ['#c4a06a', '#5ba3b0', '#1f7a8c'];

  const metrics = [
    {
      label: 'Pass Rate',
      values: [0.0, 0.5, 0.5],
      format: (v: number) => v.toFixed(2),
    },
    {
      label: 'Participation',
      values: [0.0, 0.1863, 0.3115],
      format: (v: number) => v.toFixed(2),
    },
    {
      label: 'Latency (ms)',
      values: [0, 808, 1381],
      format: (v: number) => (v === 0 ? '—' : v.toFixed(0)),
      maxOverride: 1500,
    },
  ];

  const chartW = 320;
  const chartH = 180;
  const topPad = 16;
  const botPad = 32;
  const leftPad = 72;
  const rightPad = 10;
  const barAreaW = chartW - leftPad - rightPad;
  const barH = 12;
  const groupGap = 18;
  const barGap = 3;
  const groupH = modes.length * barH + (modes.length - 1) * barGap;
  const totalH = metrics.length * groupH + (metrics.length - 1) * groupGap;
  const startY = topPad + (chartH - topPad - botPad - totalH) / 2;

  return (
    <figure className="flex flex-col items-center" role="img" aria-label="LLM governance comparison: hybrid mode achieves 0.50 pass rate at 808ms latency vs all-LLM at 1381ms">
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="w-full max-w-[320px]"
        shapeRendering="geometricPrecision"
        textRendering="optimizeLegibility"
        aria-hidden="true"
      >
        {metrics.map((metric, mi) => {
          const gy = startY + mi * (groupH + groupGap);
          const maxVal = metric.maxOverride ?? Math.max(...metric.values, 0.01);
          return (
            <g key={metric.label}>
              {/* Metric label */}
              <text
                x={leftPad - 6}
                y={gy + groupH / 2}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="9"
                fontWeight="500"
                fill="#3f5163"
              >
                {metric.label}
              </text>

              {modes.map((mode, bi) => {
                const by = gy + bi * (barH + barGap);
                const val = metric.values[bi];
                const w = maxVal > 0 ? (val / maxVal) * barAreaW : 0;
                return (
                  <g key={mode}>
                    <rect
                      x={leftPad}
                      y={by}
                      width={Math.max(w, 1)}
                      height={barH}
                      rx={3}
                      fill={modeColors[bi]}
                      opacity={0.82}
                    />
                    <text
                      x={leftPad + Math.max(w, 1) + 4}
                      y={by + barH / 2}
                      dominantBaseline="middle"
                      fontSize="8.5"
                      fontWeight="600"
                      fill="#1d1a14"
                    >
                      {metric.format(val)}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Legend */}
        {modes.map((mode, i) => {
          const lx = leftPad + i * 82;
          return (
            <g key={`legend-${mode}`}>
              <rect x={lx} y={chartH - 14} width={8} height={8} rx={2} fill={modeColors[i]} opacity={0.82} />
              <text x={lx + 12} y={chartH - 7} fontSize="8" fill="#5c7083">{mode}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 text-center text-[0.7rem] text-[var(--text-muted)]">
        Rule-based vs Hybrid vs All-LLM governance
      </figcaption>
    </figure>
  );
}
