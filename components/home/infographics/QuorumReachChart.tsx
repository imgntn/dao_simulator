/**
 * RQ1 — Quorum Reach Cliff
 * Bar chart: quorum threshold vs reach rate
 */
export function QuorumReachChart() {
  const data = [
    { label: '5%', value: 99.9 },
    { label: '10%', value: 82.0 },
    { label: '20%', value: 25.4 },
    { label: '30%', value: 4.0 },
    { label: '40%', value: 0.0 },
  ];

  const chartW = 320;
  const chartH = 160;
  const barW = 40;
  const gap = 24;
  const totalBarsW = data.length * barW + (data.length - 1) * gap;
  const offsetX = (chartW - totalBarsW) / 2;
  const topPad = 22;
  const botPad = 28;
  const maxH = chartH - topPad - botPad;

  return (
    <figure className="flex flex-col items-center" role="img" aria-label="Quorum reach rate by threshold: 5% quorum yields 99.9% reach, dropping to 0% at 40% quorum">
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="w-full max-w-[320px]"
        shapeRendering="geometricPrecision"
        textRendering="optimizeLegibility"
        aria-hidden="true"
      >
        {data.map((d, i) => {
          const x = offsetX + i * (barW + gap);
          const h = (d.value / 100) * maxH;
          const y = topPad + maxH - h;
          const color = d.value > 80 ? '#1f7a8c' : d.value > 20 ? '#5ba3b0' : '#c4a06a';
          return (
            <g key={d.label}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, 1)}
                rx={4}
                fill={color}
                opacity={0.88}
              />
              {/* Value label */}
              <text
                x={x + barW / 2}
                y={y - 4}
                textAnchor="middle"
                fontSize="10"
                fontWeight="600"
                fill="#1d1a14"
              >
                {d.value > 0 ? `${d.value}%` : '0%'}
              </text>
              {/* Axis label */}
              <text
                x={x + barW / 2}
                y={chartH - 6}
                textAnchor="middle"
                fontSize="10"
                fill="#5c7083"
              >
                {d.label}
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
        Quorum threshold → reach rate
      </figcaption>
    </figure>
  );
}
