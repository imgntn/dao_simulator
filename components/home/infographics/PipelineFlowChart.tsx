/**
 * RQ3 — Pipeline Flow
 * Horizontal funnel: proposal stages with pass rate improvement
 */
export function PipelineFlowChart() {
  const stages = [
    { label: 'Proposals In', sub: '47–50 / cycle', width: 1.0 },
    { label: 'Temp-Check', sub: '5–50% filter', width: 0.82 },
    { label: 'Fast-Track', sub: '12-step min', width: 0.68 },
    { label: 'Approved', sub: '96.4→98.5%', width: 0.55 },
  ];

  const chartW = 320;
  const chartH = 150;
  const stageH = 28;
  const stageGap = 6;
  const maxBarW = 260;
  const offsetX = (chartW - maxBarW) / 2;
  const totalH = stages.length * stageH + (stages.length - 1) * stageGap;
  const startY = (chartH - totalH) / 2;

  const colors = ['#1f7a8c', '#2a8d9e', '#5ba3b0', '#8f6f42'];

  return (
    <figure className="flex flex-col items-center" role="img" aria-label="Proposal pipeline: temp-check filter lifts pass rate from 96.4% to 98.5% while keeping quorum reach above 99%">
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="w-full max-w-[320px]"
        shapeRendering="geometricPrecision"
        textRendering="optimizeLegibility"
        aria-hidden="true"
      >
        {stages.map((s, i) => {
          const w = s.width * maxBarW;
          const x = offsetX + (maxBarW - w) / 2;
          const y = startY + i * (stageH + stageGap);
          return (
            <g key={s.label}>
              <rect
                x={x}
                y={y}
                width={w}
                height={stageH}
                rx={6}
                fill={colors[i]}
                opacity={0.85}
              />
              <text
                x={chartW / 2}
                y={y + stageH / 2 - 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fontWeight="600"
                fill="#fff"
              >
                {s.label}
              </text>
              <text
                x={chartW / 2}
                y={y + stageH / 2 + 10}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="8"
                fill="rgba(255,255,255,0.8)"
              >
                {s.sub}
              </text>
              {/* Connector arrow */}
              {i < stages.length - 1 && (
                <polygon
                  points={`${chartW / 2 - 4},${y + stageH + 1} ${chartW / 2 + 4},${y + stageH + 1} ${chartW / 2},${y + stageH + stageGap - 1}`}
                  fill="#d8cab4"
                />
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 text-center text-[0.7rem] text-[var(--text-muted)]">
        Proposal pipeline stages → 98.5% pass rate
      </figcaption>
    </figure>
  );
}
