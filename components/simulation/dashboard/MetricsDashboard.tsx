'use client';

import { useMemo, useState } from 'react';
import { useSimulationStore } from '@/lib/browser/simulation-store';
import { TreasuryChart } from './TreasuryChart';
import { PriceChart } from './PriceChart';
import { ParticipationChart } from './ParticipationChart';
import { GiniChart } from './GiniChart';
import { AgentDistribution } from './AgentDistribution';
import { ProposalOutcomes } from './ProposalOutcomes';
import { ExportButton } from '../ExportButton';

const SPARKLINE_WINDOW = 50;
const MA_WINDOW = 10;

const SPARKLINE_COLORS: Record<string, string> = {
  Treasury: '#06b6d4',
  'Token Price': '#a855f7',
  Members: '#22c55e',
  Proposals: '#f59e0b',
  Gini: '#ef4444',
  Participation: '#3b82f6',
};

/** Linear regression: returns [slope, intercept] */
function linearRegression(data: number[]): [number, number] {
  const n = data.length;
  if (n < 2) return [0, 0];
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumX2 += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return [slope, intercept];
}

/** Moving average with given window */
function movingAverage(data: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
}

export function MetricsDashboard() {
  const { snapshot, history } = useSimulationStore();
  const [showTrend, setShowTrend] = useState(false);

  const sparklineData = useMemo(() => {
    const tail = history.slice(-SPARKLINE_WINDOW);
    return {
      treasury: tail.map(s => s.treasuryFunds),
      tokenPrice: tail.map(s => s.tokenPrice),
      members: tail.map(s => s.memberCount),
      proposals: tail.map(s => s.proposalCount),
      gini: tail.map(s => s.gini),
      participation: tail.map(s => s.avgParticipationRate),
    };
  }, [history]);

  if (!snapshot) {
    return (
      <div className="p-4 text-center text-[var(--sim-text-muted)] text-sm">
        Press Play to start the simulation
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 flex-1">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[10px] text-[var(--sim-text-muted)] cursor-pointer">
            <input
              type="checkbox"
              checked={showTrend}
              onChange={e => setShowTrend(e.target.checked)}
              className="rounded bg-[var(--sim-border-strong)] border-[var(--sim-border-strong)] text-[var(--sim-accent-hover)] focus:ring-[var(--sim-accent-ring)]"
            />
            Trends
          </label>
        </div>
        <ExportButton />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-2">
        <MetricCard label="Treasury" value={formatCompact(snapshot.treasuryFunds)} data={sparklineData.treasury} color={SPARKLINE_COLORS.Treasury} showTrend={showTrend} />
        <MetricCard label="Token Price" value={`$${snapshot.tokenPrice.toFixed(2)}`} data={sparklineData.tokenPrice} color={SPARKLINE_COLORS['Token Price']} showTrend={showTrend} />
        <MetricCard label="Members" value={snapshot.memberCount.toString()} data={sparklineData.members} color={SPARKLINE_COLORS.Members} showTrend={showTrend} />
        <MetricCard label="Proposals" value={snapshot.proposalCount.toString()} data={sparklineData.proposals} color={SPARKLINE_COLORS.Proposals} showTrend={showTrend} />
        <MetricCard label="Gini" value={snapshot.gini.toFixed(3)} data={sparklineData.gini} color={SPARKLINE_COLORS.Gini} showTrend={showTrend} />
        <MetricCard label="Participation" value={`${(snapshot.avgParticipationRate * 100).toFixed(1)}%`} data={sparklineData.participation} color={SPARKLINE_COLORS.Participation} showTrend={showTrend} />
      </div>

      {/* Charts */}
      <TreasuryChart history={history} />
      <PriceChart history={history} />
      <ParticipationChart history={history} />
      <GiniChart history={history} />
      <AgentDistribution agents={snapshot.agents} />
      <ProposalOutcomes snapshot={snapshot} />
    </div>
  );
}

function Sparkline({ data, color, width = 80, height = 24, showTrend = false }: { data: number[]; color: string; width?: number; height?: number; showTrend?: boolean }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const toY = (v: number) => height - ((v - min) / range) * (height - 2) - 1;
  const toX = (i: number) => (i / (data.length - 1)) * width;

  const points = data
    .map((v, i) => `${toX(i)},${toY(v)}`)
    .join(' ');

  // Compute trend overlays
  let trendLine = '';
  let maLine = '';

  if (showTrend && data.length >= 3) {
    // Linear regression
    const [slope, intercept] = linearRegression(data);
    const startY = toY(intercept);
    const endY = toY(slope * (data.length - 1) + intercept);
    trendLine = `${toX(0)},${startY} ${toX(data.length - 1)},${endY}`;

    // Moving average
    const ma = movingAverage(data, MA_WINDOW);
    maLine = ma.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
  }

  return (
    <svg width={width} height={height} className="mt-1">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
      />
      {showTrend && trendLine && (
        <>
          {/* Trend line (dashed) */}
          <polyline
            points={trendLine}
            fill="none"
            stroke={color}
            strokeWidth={1}
            strokeDasharray="3 2"
            opacity={0.4}
          />
          {/* Moving average (dotted) */}
          {maLine && (
            <polyline
              points={maLine}
              fill="none"
              stroke={color}
              strokeWidth={1}
              strokeDasharray="1 2"
              opacity={0.35}
            />
          )}
        </>
      )}
    </svg>
  );
}

function MetricCard({ label, value, data, color, showTrend }: { label: string; value: string; data?: number[]; color?: string; showTrend?: boolean }) {
  return (
    <div className="bg-[var(--sim-surface)] rounded px-3 py-2 border border-[var(--sim-border)]">
      <div className="text-[10px] text-[var(--sim-text-muted)] uppercase tracking-wider">{label}</div>
      <div className="text-sm font-mono text-[var(--sim-text)] mt-0.5">{value}</div>
      {data && color && <Sparkline data={data} color={color} showTrend={showTrend} />}
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}
