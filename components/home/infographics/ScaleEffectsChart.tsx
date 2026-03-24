/**
 * RQ — Scale Effects on Governance (500 runs)
 * Larger DAOs reduce capture risk 18% and single-entity control 60%.
 * Pass rate approaches 1.0 as member count grows.
 */
export function ScaleEffectsChart() {
  const data = [
    { members: 50, captureRisk: 0.299, singleEntity: 0.028, passRate: 0.928 },
    { members: 100, captureRisk: 0.281, singleEntity: 0.024, passRate: 0.954 },
    { members: 200, captureRisk: 0.267, singleEntity: 0.019, passRate: 0.982 },
    { members: 350, captureRisk: 0.255, singleEntity: 0.013, passRate: 0.996 },
    { members: 500, captureRisk: 0.246, singleEntity: 0.011, passRate: 0.997 },
  ];

  const chartW = 320;
  const chartH = 190;
  const topPad = 22;
  const botPad = 36;
  const leftPad = 36;
  const rightPad = 14;
  const plotW = chartW - leftPad - rightPad;
  const plotH = chartH - topPad - botPad;

  // X positions evenly spaced
  const xStep = plotW / (data.length - 1);
  const xs = data.map((_, i) => leftPad + i * xStep);

  // Series definitions — all normalized 0-1 for shared Y axis
  const series = [
    {
      key: 'captureRisk' as const,
      label: 'Capture Risk',
      color: '#1f7a8c',
      min: 0.2,
      max: 0.35,
    },
    {
      key: 'singleEntity' as const,
      label: 'Single Entity',
      color: '#c4a06a',
      min: 0,
      max: 0.04,
    },
    {
      key: 'passRate' as const,
      label: 'Pass Rate',
      color: '#5ba3b0',
      min: 0.9,
      max: 1.0,
    },
  ];

  function yPos(val: number, min: number, max: number) {
    const t = (val - min) / (max - min);
    return topPad + plotH - t * plotH;
  }

  function buildPath(
    key: 'captureRisk' | 'singleEntity' | 'passRate',
    min: number,
    max: number,
  ) {
    return data
      .map((d, i) => {
        const x = xs[i];
        const y = yPos(d[key], min, max);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  return (
    <figure
      className="flex flex-col items-center"
      role="img"
      aria-label="Larger DAOs are safer: 50 to 500 members cuts capture risk 18% and single entity control 60% across 500 runs"
    >
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="w-full max-w-[320px]"
        shapeRendering="geometricPrecision"
        textRendering="optimizeLegibility"
        aria-hidden="true"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = topPad + plotH - t * plotH;
          return (
            <line
              key={t}
              x1={leftPad}
              y1={y}
              x2={leftPad + plotW}
              y2={y}
              stroke="#e8ddd0"
              strokeWidth="0.5"
              shapeRendering="crispEdges"
            />
          );
        })}

        {/* X-axis labels */}
        {data.map((d, i) => (
          <text
            key={d.members}
            x={xs[i]}
            y={chartH - 16}
            textAnchor="middle"
            fontSize="8.5"
            fill="#3f5163"
            fontWeight="500"
          >
            {d.members}
          </text>
        ))}
        <text
          x={leftPad + plotW / 2}
          y={chartH - 4}
          textAnchor="middle"
          fontSize="8"
          fill="#5c7083"
        >
          DAO Members
        </text>

        {/* Lines and dots */}
        {series.map((s) => {
          const path = buildPath(s.key, s.min, s.max);
          return (
            <g key={s.key}>
              <path
                d={path}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {data.map((d, i) => (
                <circle
                  key={i}
                  cx={xs[i]}
                  cy={yPos(d[s.key], s.min, s.max)}
                  r="3"
                  fill={s.color}
                />
              ))}
            </g>
          );
        })}

        {/* End-point value labels */}
        {/* Capture Risk: first and last */}
        <text
          x={xs[0] - 2}
          y={yPos(data[0].captureRisk, series[0].min, series[0].max) - 6}
          textAnchor="start"
          fontSize="8.5"
          fontWeight="600"
          fill="#1f7a8c"
        >
          .299
        </text>
        <text
          x={xs[4] + 2}
          y={yPos(data[4].captureRisk, series[0].min, series[0].max) - 6}
          textAnchor="end"
          fontSize="8.5"
          fontWeight="600"
          fill="#1f7a8c"
        >
          .246
        </text>

        {/* Single Entity: first and last */}
        <text
          x={xs[0] - 2}
          y={yPos(data[0].singleEntity, series[1].min, series[1].max) + 12}
          textAnchor="start"
          fontSize="8.5"
          fontWeight="600"
          fill="#8f6f42"
        >
          .028
        </text>
        <text
          x={xs[4] + 2}
          y={yPos(data[4].singleEntity, series[1].min, series[1].max) + 12}
          textAnchor="end"
          fontSize="8.5"
          fontWeight="600"
          fill="#8f6f42"
        >
          .011
        </text>

        {/* Delta annotations */}
        <text
          x={leftPad + plotW / 2}
          y={topPad - 6}
          textAnchor="middle"
          fontSize="9.5"
          fontWeight="700"
          fill="#1f7a8c"
        >
          Capture −18% &nbsp; Single Entity −60%
        </text>

        {/* Axis line */}
        <line
          x1={leftPad}
          y1={topPad + plotH}
          x2={leftPad + plotW}
          y2={topPad + plotH}
          stroke="#d8cab4"
          strokeWidth="1"
          shapeRendering="crispEdges"
        />

        {/* Legend */}
        {series.map((s, i) => {
          const lx = leftPad + i * 100;
          return (
            <g key={`legend-${s.key}`}>
              <line
                x1={lx}
                y1={chartH - 28}
                x2={lx + 14}
                y2={chartH - 28}
                stroke={s.color}
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx={lx + 7} cy={chartH - 28} r="2.5" fill={s.color} />
              <text x={lx + 18} y={chartH - 25} fontSize="7.5" fill="#5c7083">
                {s.label}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 text-center text-[0.7rem] text-[var(--text-muted)]">
        Larger DAOs are safer: 50&#x2192;500 members cuts capture risk 18% (500 runs)
      </figcaption>
    </figure>
  );
}
