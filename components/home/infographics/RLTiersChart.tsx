/**
 * RQ — RL Tier Progression (150 runs)
 * Basic Q-learning captures 95% of RL benefit.
 * Subsequent tiers (replay, shared, DQN) show diminishing returns.
 */
export function RLTiersChart() {
  const tiers = [
    { label: 'No Learning', passRate: 0.875, captureRisk: 0.292, gini: 0.523 },
    { label: 'Q-Learning', passRate: 0.956, captureRisk: 0.283, gini: 0.469 },
    { label: '+Replay', passRate: 0.958, captureRisk: 0.279, gini: 0.473 },
    { label: '+Shared', passRate: 0.958, captureRisk: 0.280, gini: 0.471 },
    { label: '+DQN', passRate: 0.948, captureRisk: 0.281, gini: 0.467 },
  ];

  const chartW = 320;
  const chartH = 190;
  const topPad = 26;
  const botPad = 40;
  const leftPad = 58;
  const rightPad = 10;
  const barAreaW = chartW - leftPad - rightPad;

  const barH = 18;
  const barGap = 8;
  const totalH = tiers.length * barH + (tiers.length - 1) * barGap;
  const startY = topPad + (chartH - topPad - botPad - totalH) / 2;

  // Scale pass rate: show 0.85 to 1.0 range to emphasize differences
  const scaleMin = 0.85;
  const scaleMax = 1.0;

  function barWidth(val: number) {
    const t = (val - scaleMin) / (scaleMax - scaleMin);
    return Math.max(t * barAreaW, 2);
  }

  // Colors: first tier muted, Q-Learning highlighted, rest subdued
  const colors = ['#5c7083', '#1f7a8c', '#8ab4bd', '#8ab4bd', '#8ab4bd'];
  const opacities = [0.65, 0.92, 0.65, 0.65, 0.65];

  // The big jump delta
  const bigJump = ((tiers[1].passRate - tiers[0].passRate) * 100).toFixed(1);

  return (
    <figure
      className="flex flex-col items-center"
      role="img"
      aria-label="Basic Q-learning captures 95% of RL benefit with an 8.1 percentage point pass rate increase. Subsequent tiers including replay, shared learning, and DQN show diminishing returns across 150 runs"
    >
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="w-full max-w-[320px]"
        shapeRendering="geometricPrecision"
        textRendering="optimizeLegibility"
        aria-hidden="true"
      >
        {/* Title / delta annotation */}
        <text
          x={chartW / 2}
          y={topPad - 10}
          textAnchor="middle"
          fontSize="10"
          fontWeight="700"
          fill="#1f7a8c"
        >
          +{bigJump}pt pass rate from Q-Learning alone
        </text>

        {/* Scale reference lines */}
        {[0.85, 0.90, 0.95, 1.0].map((tick) => {
          const x = leftPad + barWidth(tick);
          return (
            <g key={tick}>
              <line
                x1={x}
                y1={startY - 4}
                x2={x}
                y2={startY + totalH + 4}
                stroke="#e8ddd0"
                strokeWidth="0.5"
                shapeRendering="crispEdges"
              />
              <text
                x={x}
                y={startY - 8}
                textAnchor="middle"
                fontSize="7"
                fill="#5c7083"
              >
                {(tick * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}

        {tiers.map((tier, i) => {
          const by = startY + i * (barH + barGap);
          const w = barWidth(tier.passRate);
          const isFirst = i === 0;
          const isQLearn = i === 1;
          return (
            <g key={tier.label}>
              {/* Tier label */}
              <text
                x={leftPad - 6}
                y={by + barH / 2}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="8.5"
                fontWeight={isQLearn ? '700' : '500'}
                fill={isQLearn ? '#1d1a14' : '#3f5163'}
              >
                {tier.label}
              </text>

              {/* Bar */}
              <rect
                x={leftPad}
                y={by}
                width={w}
                height={barH}
                rx={3}
                fill={colors[i]}
                opacity={opacities[i]}
              />

              {/* Pass rate value */}
              <text
                x={leftPad + w + 4}
                y={by + barH / 2}
                dominantBaseline="middle"
                fontSize="8.5"
                fontWeight="600"
                fill="#1d1a14"
              >
                {tier.passRate.toFixed(3)}
              </text>

              {/* Secondary metrics inside bar (only if wide enough) */}
              {w > 80 && (
                <text
                  x={leftPad + 6}
                  y={by + barH / 2}
                  dominantBaseline="middle"
                  fontSize="7"
                  fill="#fff"
                  opacity={0.9}
                >
                  CR {tier.captureRisk.toFixed(3)} / Gini {tier.gini.toFixed(3)}
                </text>
              )}

              {/* Jump arrow between No Learning and Q-Learning */}
              {isFirst && (
                <g>
                  <line
                    x1={leftPad + w + 24}
                    y1={by + barH + 2}
                    x2={leftPad + w + 24}
                    y2={by + barH + barGap - 2}
                    stroke="#1f7a8c"
                    strokeWidth="1.5"
                    markerEnd="none"
                  />
                  <polygon
                    points={`${leftPad + w + 21},${by + barH + barGap - 4} ${leftPad + w + 27},${by + barH + barGap - 4} ${leftPad + w + 24},${by + barH + barGap - 1}`}
                    fill="#1f7a8c"
                  />
                  <text
                    x={leftPad + w + 30}
                    y={by + barH + barGap / 2 + 1}
                    dominantBaseline="middle"
                    fontSize="8"
                    fontWeight="700"
                    fill="#1f7a8c"
                  >
                    +{bigJump}pt
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Diminishing returns bracket */}
        {(() => {
          const bracketX = leftPad + barAreaW + 4;
          const y2 = startY + 1 * (barH + barGap) + barH / 2;
          const y5 = startY + 4 * (barH + barGap) + barH / 2;
          return (
            <g>
              <path
                d={`M${bracketX},${y2} L${bracketX + 5},${y2} L${bracketX + 5},${y5} L${bracketX},${y5}`}
                fill="none"
                stroke="#5c7083"
                strokeWidth="0.8"
                opacity={0.6}
              />
            </g>
          );
        })()}

        {/* Legend row */}
        <rect x={leftPad} y={chartH - 14} width={8} height={8} rx={2} fill="#1f7a8c" opacity={0.92} />
        <text x={leftPad + 12} y={chartH - 7} fontSize="7.5" fill="#5c7083">Pass Rate</text>

        <text x={leftPad + 66} y={chartH - 7} fontSize="7.5" fill="#5c7083">
          CR = Capture Risk
        </text>
        <text x={leftPad + 146} y={chartH - 7} fontSize="7.5" fill="#5c7083">
          Gini = Inequality
        </text>
      </svg>
      <figcaption className="mt-1 text-center text-[0.7rem] text-[var(--text-muted)]">
        Basic Q-learning captures 95% of RL benefit — diminishing returns beyond (150 runs)
      </figcaption>
    </figure>
  );
}
