'use client';

import { useMemo } from 'react';
import { useSimulationStore } from '@/lib/browser/simulation-store';
import type { SimulationSnapshot } from '@/lib/browser/worker-protocol';
import { TreasuryChart } from './TreasuryChart';
import { PriceChart } from './PriceChart';
import { ParticipationChart } from './ParticipationChart';
import { GiniChart } from './GiniChart';
import { AgentDistribution } from './AgentDistribution';
import { ProposalOutcomes } from './ProposalOutcomes';

const SPARKLINE_WINDOW = 50;

const SPARKLINE_COLORS: Record<string, string> = {
  Treasury: '#06b6d4',
  'Token Price': '#a855f7',
  Members: '#22c55e',
  Proposals: '#f59e0b',
  Gini: '#ef4444',
  Participation: '#3b82f6',
};

export function MetricsDashboard() {
  const { snapshot, history } = useSimulationStore();

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
      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-2">
        <MetricCard label="Treasury" value={formatCompact(snapshot.treasuryFunds)} data={sparklineData.treasury} color={SPARKLINE_COLORS.Treasury} />
        <MetricCard label="Token Price" value={`$${snapshot.tokenPrice.toFixed(2)}`} data={sparklineData.tokenPrice} color={SPARKLINE_COLORS['Token Price']} />
        <MetricCard label="Members" value={snapshot.memberCount.toString()} data={sparklineData.members} color={SPARKLINE_COLORS.Members} />
        <MetricCard label="Proposals" value={snapshot.proposalCount.toString()} data={sparklineData.proposals} color={SPARKLINE_COLORS.Proposals} />
        <MetricCard label="Gini" value={snapshot.gini.toFixed(3)} data={sparklineData.gini} color={SPARKLINE_COLORS.Gini} />
        <MetricCard label="Participation" value={`${(snapshot.avgParticipationRate * 100).toFixed(1)}%`} data={sparklineData.participation} color={SPARKLINE_COLORS.Participation} />
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

function Sparkline({ data, color, width = 80, height = 24 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return `${x},${y}`;
    })
    .join(' ');

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
    </svg>
  );
}

function MetricCard({ label, value, data, color }: { label: string; value: string; data?: number[]; color?: string }) {
  return (
    <div className="bg-[var(--sim-surface)] rounded px-3 py-2 border border-[var(--sim-border)]">
      <div className="text-[10px] text-[var(--sim-text-muted)] uppercase tracking-wider">{label}</div>
      <div className="text-sm font-mono text-[var(--sim-text)] mt-0.5">{value}</div>
      {data && color && <Sparkline data={data} color={color} />}
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}
