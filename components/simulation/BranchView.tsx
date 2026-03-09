'use client';

import { useMemo } from 'react';
import { useBranchStore } from '@/lib/browser/branch-store';
import { useSimulationStore } from '@/lib/browser/simulation-store';

export function BranchView() {
  const { active, forkStep, closeBranch } = useBranchStore();
  const history = useSimulationStore(s => s.history);

  // Split history into pre-fork and post-fork
  const postForkHistory = useMemo(
    () => history.filter(s => s.step >= forkStep),
    [history, forkStep]
  );

  if (!active) {
    return (
      <div className="p-8 text-center text-[var(--sim-text-muted)]">
        <p className="text-sm mb-2">No active branch</p>
        <p className="text-xs">Pause the simulation and click <b>Fork</b> to create a branch point.</p>
      </div>
    );
  }

  const metrics = ['Treasury', 'Token Price', 'Gini', 'Participation'] as const;

  const metricAccessors: Record<string, (s: typeof history[0]) => number> = {
    Treasury: s => s.treasuryFunds,
    'Token Price': s => s.tokenPrice,
    Gini: s => s.gini,
    Participation: s => s.avgParticipationRate,
  };

  const metricColors: Record<string, string> = {
    Treasury: '#06b6d4',
    'Token Price': '#a855f7',
    Gini: '#ef4444',
    Participation: '#3b82f6',
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--sim-text)]">Branch View</h3>
          <p className="text-[10px] text-[var(--sim-text-muted)]">Forked at step {forkStep}</p>
        </div>
        <button
          onClick={closeBranch}
          className="px-2 py-1 text-xs rounded bg-red-700 hover:bg-red-600 text-white"
        >
          Close Branch
        </button>
      </div>

      {/* Divergence sparklines */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map(metric => {
          const accessor = metricAccessors[metric];
          const data = postForkHistory.map(accessor);
          const color = metricColors[metric];

          return (
            <div key={metric} className="bg-[var(--sim-surface)] rounded px-3 py-2 border border-[var(--sim-border)]">
              <div className="text-[10px] text-[var(--sim-text-muted)] uppercase tracking-wider">{metric}</div>
              <DivergenceSparkline data={data} color={color} />
              {data.length > 1 && (
                <div className="text-[10px] font-mono text-[var(--sim-text-secondary)] mt-1">
                  {formatDelta(data[data.length - 1] - data[0])}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-[var(--sim-text-muted)] text-center">
        Showing main simulation trajectory from fork point. Change governance rules or other parameters, then reset to see divergence.
      </div>
    </div>
  );
}

function DivergenceSparkline({ data, color, width = 140, height = 32 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) {
    return <div className="h-8 flex items-center text-[10px] text-[var(--sim-text-muted)]">Collecting...</div>;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  // Baseline at fork value
  const baseY = height - ((data[0] - min) / range) * (height - 4) - 2;

  return (
    <svg width={width} height={height} className="mt-1">
      {/* Baseline */}
      <line x1={0} y1={baseY} x2={width} y2={baseY} stroke={color} strokeWidth={0.5} strokeDasharray="2 2" opacity={0.3} />
      {/* Main line */}
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.8} />
    </svg>
  );
}

function formatDelta(d: number): string {
  const sign = d >= 0 ? '+' : '';
  if (Math.abs(d) >= 1_000_000) return `${sign}${(d / 1_000_000).toFixed(1)}M`;
  if (Math.abs(d) >= 1_000) return `${sign}${(d / 1_000).toFixed(1)}K`;
  return `${sign}${d.toFixed(2)}`;
}
