/**
 * RQ — Black Swan Resilience (1,200 runs)
 * Pass rate under increasing black swan frequency.
 * Conviction voting is most resilient despite lower baseline performance.
 */
export function BlackSwanChart() {
  const frequencies = [0, 1, 3, 5];
  const series = [
    {
      label: 'Majority',
      color: '#1f7a8c',
      values: [0.827, 0.825, 0.758, 0.747],
    },
    {
      label: 'Supermajority',
      color: '#b05b5b',
      values: [0.810, 0.785, 0.762, 0.682],
    },
    {
      label: 'Conviction',
      color: '#c4a06a',
      values: [0.907, 0.889, 0.847, 0.813],
    },
  ];

  const chartW = 320;
  const chartH = 190;
  const topPad = 18;
  const botPad = 38;
  const leftPad = 34;
  const rightPad = 14;
  const plotW = chartW - leftPad - rightPad;
  const plotH = chartH - topPad - botPad;

  const yMin = 0.65;
  const yMax = 0.95;

  const xStep = plotW / (frequencies.length - 1);
  const xs = frequencies.map((_, i) => leftPad + i * xStep);

  function yPos(val: number) {
    const t = (val - yMin) / (yMax - yMin);
    return topPad + plotH - t * plotH;
  }

  function buildPath(values: number[]) {
    return values
      .map((v, i) => {
        const x = xs[i];
        const y = yPos(v);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  // Y-axis tick values
  const yTicks = [0.70, 0.75, 0.80, 0.85, 0.90, 0.95];

  return (
    <figure
      className="flex flex-col items-center"
      role="img"
      aria-label="Conviction voting is most resilient to black swans: pass rate drops from 0.907 to 0.813 versus supermajority dropping from 0.810 to 0.682 across 1200 runs"
    >
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="w-full max-w-[320px]"
        shapeRendering="geometricPrecision"
        textRendering="optimizeLegibility"
        aria-hidden="true"
      >
        {/* Y-axis grid lines and labels */}
        {yTicks.map((tick) => {
          const y = yPos(tick);
          return (
            <g key={tick}>
              <line
                x1={leftPad}
                y1={y}
                x2={leftPad + plotW}
                y2={y}
                stroke="#e8ddd0"
                strokeWidth="0.5"
                shapeRendering="crispEdges"
              />
              <text
                x={leftPad - 4}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="7.5"
                fill="#5c7083"
              >
                {(tick * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {frequencies.map((f, i) => (
          <text
            key={f}
            x={xs[i]}
            y={chartH - 18}
            textAnchor="middle"
            fontSize="8.5"
            fill="#3f5163"
            fontWeight="500"
          >
            {f}
          </text>
        ))}
        <text
          x={leftPad + plotW / 2}
          y={chartH - 6}
          textAnchor="middle"
          fontSize="8"
          fill="#5c7083"
        >
          Black Swan Frequency (per episode)
        </text>

        {/* Stress zone shading */}
        <rect
          x={xs[2]}
          y={topPad}
          width={xs[3] - xs[2]}
          height={plotH}
          fill="#b05b5b"
          opacity={0.04}
        />

        {/* Lines and dots */}
        {series.map((s) => (
          <g key={s.label}>
            <path
              d={buildPath(s.values)}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {s.values.map((v, i) => (
              <circle key={i} cx={xs[i]} cy={yPos(v)} r="3" fill={s.color} />
            ))}
          </g>
        ))}

        {/* End-point labels — right side */}
        {series.map((s) => {
          const lastVal = s.values[s.values.length - 1];
          const lastY = yPos(lastVal);
          return (
            <text
              key={`end-${s.label}`}
              x={xs[3] + 6}
              y={lastY}
              dominantBaseline="middle"
              fontSize="8"
              fontWeight="600"
              fill={s.color}
            >
              {lastVal.toFixed(3)}
            </text>
          );
        })}

        {/* Start-point labels — left side */}
        {series.map((s) => {
          const firstVal = s.values[0];
          const firstY = yPos(firstVal);
          return (
            <text
              key={`start-${s.label}`}
              x={xs[0] - 6}
              y={firstY}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="8"
              fontWeight="600"
              fill={s.color}
            >
              {firstVal.toFixed(3)}
            </text>
          );
        })}

        {/* Axis lines */}
        <line
          x1={leftPad}
          y1={topPad + plotH}
          x2={leftPad + plotW}
          y2={topPad + plotH}
          stroke="#d8cab4"
          strokeWidth="1"
          shapeRendering="crispEdges"
        />
        <line
          x1={leftPad}
          y1={topPad}
          x2={leftPad}
          y2={topPad + plotH}
          stroke="#d8cab4"
          strokeWidth="1"
          shapeRendering="crispEdges"
        />

        {/* Legend */}
        {series.map((s, i) => {
          const lx = leftPad + 8 + i * 96;
          return (
            <g key={`legend-${s.label}`}>
              <line
                x1={lx}
                y1={topPad + 8}
                x2={lx + 14}
                y2={topPad + 8}
                stroke={s.color}
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx={lx + 7} cy={topPad + 8} r="2.5" fill={s.color} />
              <text x={lx + 18} y={topPad + 11} fontSize="8" fill="#5c7083">
                {s.label}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 text-center text-[0.7rem] text-[var(--text-muted)]">
        Conviction voting is most resilient to black swans despite failing normally (1,200 runs)
      </figcaption>
    </figure>
  );
}
