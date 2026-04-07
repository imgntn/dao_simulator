/**
 * RQ6 — LLM Governance (Exp 17: Gemma 4 E4B, 50 runs)
 * Key finding: Thinking mode reverses LLM governance degradation — all-LLM+thinking boosts pass rate +6.7pt
 */
export function LLMComparisonChart() {
  const modes = ['Rule-based', 'Hybrid+Think', 'All-LLM+Think'];
  const modeColors = ['#c4a06a', '#5ba3b0', '#1f7a8c'];

  const metrics = [
    {
      label: 'Pass Rate',
      values: [0.729, 0.769, 0.796],
      format: (v: number) => (v * 100).toFixed(1) + '%',
    },
    {
      label: 'Participation',
      values: [0.286, 0.275, 0.278],
      format: (v: number) => (v * 100).toFixed(1) + '%',
    },
    {
      label: 'Latency (ms)',
      values: [0, 3566, 3908],
      format: (v: number) => (v === 0 ? '\u2014' : v.toFixed(0)),
      maxOverride: 4500,
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
    <figure className="flex flex-col items-center" role="img" aria-label="LLM thinking mode improves governance: all-LLM+thinking boosts pass rate from 72.9% to 79.6% (50 runs, Gemma 4 E4B)">
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
        Thinking mode boosts LLM pass rate above rule-based baseline (50 runs, Gemma 4 E4B)
      </figcaption>
    </figure>
  );
}
