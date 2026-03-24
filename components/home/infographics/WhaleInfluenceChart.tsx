/**
 * RQ2 — Whale Power Reduction (2,700 runs)
 * Quadratic voting threshold=250 is the only effective anti-capture tool.
 * Vote power caps and velocity penalties have zero measurable effect.
 */
export function WhaleInfluenceChart() {
  const metrics = [
    {
      label: 'Whale Influence',
      before: 0.445,
      after: 0.257,
      delta: '−43%',
    },
    {
      label: 'Capture Risk',
      before: 0.453,
      after: 0.270,
      delta: '−40%',
    },
  ];

  const chartW = 320;
  const chartH = 170;
  const groupW = 100;
  const barW = 34;
  const groupGap = 60;
  const totalW = metrics.length * groupW + (metrics.length - 1) * groupGap;
  const offsetX = (chartW - totalW) / 2;
  const topPad = 24;
  const botPad = 40;
  const maxH = chartH - topPad - botPad;

  return (
    <figure className="flex flex-col items-center" role="img" aria-label="Whale influence dropped 43% from 0.449 to 0.256; capture risk dropped 42% from 0.464 to 0.269">
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="w-full max-w-[320px]"
        shapeRendering="geometricPrecision"
        textRendering="optimizeLegibility"
        aria-hidden="true"
      >
        {metrics.map((m, i) => {
          const gx = offsetX + i * (groupW + groupGap);
          const bH = (m.before / 0.5) * maxH;
          const aH = (m.after / 0.5) * maxH;
          const bY = topPad + maxH - bH;
          const aY = topPad + maxH - aH;
          return (
            <g key={m.label}>
              {/* Before bar */}
              <rect x={gx} y={bY} width={barW} height={bH} rx={4} fill="#c4a06a" opacity={0.75} />
              <text x={gx + barW / 2} y={bY - 4} textAnchor="middle" fontSize="9.5" fontWeight="600" fill="#7b5f3d">
                {m.before.toFixed(3)}
              </text>

              {/* After bar */}
              <rect x={gx + barW + 6} y={aY} width={barW} height={aH} rx={4} fill="#1f7a8c" opacity={0.88} />
              <text x={gx + barW + 6 + barW / 2} y={aY - 4} textAnchor="middle" fontSize="9.5" fontWeight="600" fill="#1d1a14">
                {m.after.toFixed(3)}
              </text>

              {/* Delta badge */}
              <text x={gx + groupW / 2} y={topPad - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="#1f7a8c">
                {m.delta}
              </text>

              {/* Group label */}
              <text x={gx + groupW / 2} y={chartH - 16} textAnchor="middle" fontSize="9.5" fill="#3f5163" fontWeight="500">
                {m.label}
              </text>
            </g>
          );
        })}

        {/* Axis line */}
        <line x1={offsetX - 6} y1={topPad + maxH} x2={offsetX + totalW + 6} y2={topPad + maxH} stroke="#d8cab4" strokeWidth="1" shapeRendering="crispEdges" />

        {/* Legend */}
        <rect x={chartW - 92} y={chartH - 10} width={8} height={8} rx={2} fill="#c4a06a" opacity={0.75} />
        <text x={chartW - 80} y={chartH - 3} fontSize="8.5" fill="#5c7083">Before</text>
        <rect x={chartW - 48} y={chartH - 10} width={8} height={8} rx={2} fill="#1f7a8c" opacity={0.88} />
        <text x={chartW - 36} y={chartH - 3} fontSize="8.5" fill="#5c7083">After</text>
      </svg>
      <figcaption className="mt-1 text-center text-[0.7rem] text-[var(--text-muted)]">
        Quadratic voting: influence &amp; capture reduction
      </figcaption>
    </figure>
  );
}
