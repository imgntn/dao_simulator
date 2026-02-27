/**
 * RQ5 — Cooperation Success
 * Topology comparison: isolated vs generic vs specialized
 */
export function CooperationChart() {
  const data = [
    { label: 'Isolated', value: 0, proposals: 0, treasury: '$—' },
    { label: 'Generic', value: 21.4, proposals: 50.3, treasury: '$24,071' },
    { label: 'Specialized', value: 23.4, proposals: 75.8, treasury: '$26,107' },
  ];

  const chartW = 320;
  const chartH = 168;
  const barW = 56;
  const gap = 28;
  const totalBarsW = data.length * barW + (data.length - 1) * gap;
  const offsetX = (chartW - totalBarsW) / 2;
  const topPad = 20;
  const botPad = 46;
  const maxH = chartH - topPad - botPad;
  const maxVal = 30;

  const colors = ['#c4a06a', '#5ba3b0', '#1f7a8c'];

  return (
    <figure className="flex flex-col items-center" role="img" aria-label="Inter-DAO cooperation success: isolated 0%, generic 21.4%, specialized 23.4%">
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="w-full max-w-[320px]"
        shapeRendering="geometricPrecision"
        textRendering="optimizeLegibility"
        aria-hidden="true"
      >
        {data.map((d, i) => {
          const x = offsetX + i * (barW + gap);
          const h = (d.value / maxVal) * maxH;
          const y = topPad + maxH - h;
          return (
            <g key={d.label}>
              {/* Bar */}
              <rect
                x={x}
                y={d.value === 0 ? topPad + maxH - 2 : y}
                width={barW}
                height={d.value === 0 ? 2 : h}
                rx={4}
                fill={colors[i]}
                opacity={0.85}
              />
              {/* Value label */}
              <text
                x={x + barW / 2}
                y={(d.value === 0 ? topPad + maxH : y) - 5}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="#1d1a14"
              >
                {d.value}%
              </text>
              {/* Secondary stat */}
              <text
                x={x + barW / 2}
                y={chartH - 26}
                textAnchor="middle"
                fontSize="8"
                fill="#5c7083"
              >
                {d.proposals > 0 ? `${d.proposals} proposals` : 'no activity'}
              </text>
              {/* Topology label */}
              <text
                x={x + barW / 2}
                y={chartH - 14}
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="500"
                fill="#3f5163"
              >
                {d.label}
              </text>
              {/* Treasury */}
              <text
                x={x + barW / 2}
                y={chartH - 4}
                textAnchor="middle"
                fontSize="7.5"
                fill="#8f6f42"
              >
                {d.treasury}
              </text>
            </g>
          );
        })}

        {/* Axis line */}
        <line
          x1={offsetX - 6}
          y1={topPad + maxH}
          x2={offsetX + totalBarsW + 6}
          y2={topPad + maxH}
          stroke="#d8cab4"
          strokeWidth="1"
          shapeRendering="crispEdges"
        />
      </svg>
      <figcaption className="mt-1 text-center text-[0.7rem] text-[var(--text-muted)]">
        Cooperation topology → success rate
      </figcaption>
    </figure>
  );
}
