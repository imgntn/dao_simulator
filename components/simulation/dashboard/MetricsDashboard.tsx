'use client';

import { useSimulationStore } from '@/lib/browser/simulation-store';
import { TreasuryChart } from './TreasuryChart';
import { PriceChart } from './PriceChart';
import { ParticipationChart } from './ParticipationChart';
import { GiniChart } from './GiniChart';
import { AgentDistribution } from './AgentDistribution';
import { ProposalOutcomes } from './ProposalOutcomes';

export function MetricsDashboard() {
  const { snapshot, history } = useSimulationStore();

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
        <MetricCard label="Treasury" value={formatCompact(snapshot.treasuryFunds)} />
        <MetricCard label="Token Price" value={`$${snapshot.tokenPrice.toFixed(2)}`} />
        <MetricCard label="Members" value={snapshot.memberCount.toString()} />
        <MetricCard label="Proposals" value={snapshot.proposalCount.toString()} />
        <MetricCard label="Gini" value={snapshot.gini.toFixed(3)} />
        <MetricCard label="Participation" value={`${(snapshot.avgParticipationRate * 100).toFixed(1)}%`} />
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--sim-surface)] rounded px-3 py-2 border border-[var(--sim-border)]">
      <div className="text-[10px] text-[var(--sim-text-muted)] uppercase tracking-wider">{label}</div>
      <div className="text-sm font-mono text-[var(--sim-text)] mt-0.5">{value}</div>
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}
