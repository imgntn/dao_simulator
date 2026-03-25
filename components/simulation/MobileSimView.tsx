'use client';

import { useActiveSnapshot } from '@/lib/browser/useActiveSnapshot';
import { ControlPanel } from './ControlPanel';
import { MetricsDashboard } from './dashboard/MetricsDashboard';
import { EventFeed } from './dashboard/EventFeed';
import { CollapsiblePanel } from './panels/CollapsiblePanel';
import { ThemeToggle } from './ThemeToggle';
import { ShareButton } from './ShareButton';
import { FeedbackButton } from './FeedbackForm';
import type { AgentSnapshot } from '@/lib/browser/worker-protocol';

function formatNum(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function AgentSummary({ agents }: { agents: AgentSnapshot[] }) {
  const typeCounts = new Map<string, number>();
  for (const a of agents) {
    typeCounts.set(a.type, (typeCounts.get(a.type) ?? 0) + 1);
  }
  const sorted = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {sorted.map(([type, count]) => (
        <div key={type} className="flex items-center justify-between rounded-lg bg-[var(--sim-surface)] px-2.5 py-1.5 text-xs">
          <span className="text-[var(--sim-text-secondary)] truncate">{type}</span>
          <span className="font-mono font-semibold text-[var(--sim-text)] ml-2">{count}</span>
        </div>
      ))}
    </div>
  );
}

export function MobileSimView() {
  const snapshot = useActiveSnapshot();

  return (
    <div className="flex flex-col min-h-screen bg-[var(--sim-bg)] text-[var(--sim-text)]">
      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--sim-border)] bg-[var(--sim-bg)] px-3 py-2">
        <span className="text-sm font-semibold text-[var(--sim-text)]">Simulation</span>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <ShareButton />
          <FeedbackButton />
        </div>
      </div>

      {/* Desktop recommendation banner */}
      <div className="mx-3 mt-3 rounded-lg border border-[var(--sim-border)] bg-[var(--sim-accent-bg)] px-3 py-2 text-center">
        <p className="text-xs text-[var(--sim-accent)]">
          For the full 3D experience, open on desktop
        </p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-3 mt-3">
        {/* Controls */}
        <ControlPanel />

        {/* Live stats summary */}
        {snapshot && (
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Step" value={String(snapshot.step)} />
            <StatCard label="Members" value={String(snapshot.agents.length)} />
            <StatCard label="Proposals" value={String(snapshot.proposals.length)} />
            <StatCard
              label="Treasury"
              value={formatNum(snapshot.treasuryFunds)}
            />
            <StatCard
              label="Token"
              value={`$${snapshot.tokenPrice.toFixed(3)}`}
              color={snapshot.tokenPrice >= 1 ? 'text-green-400' : 'text-red-400'}
            />
            <StatCard
              label="Open"
              value={String(snapshot.proposals.filter(p => p.status === 'open').length)}
            />
          </div>
        )}

        {/* Proposals list */}
        {snapshot && snapshot.proposals.length > 0 && (
          <CollapsiblePanel id="mobile-proposals" title="Proposals">
            <div className="space-y-1.5">
              {snapshot.proposals
                .sort((a, b) => {
                  if (a.status === 'open' && b.status !== 'open') return -1;
                  if (b.status === 'open' && a.status !== 'open') return 1;
                  return b.creationStep - a.creationStep;
                })
                .slice(0, 8)
                .map(p => (
                  <ProposalRow key={p.id} proposal={p} />
                ))}
            </div>
          </CollapsiblePanel>
        )}

        {/* Metrics */}
        <CollapsiblePanel id="mobile-metrics" title="Metrics">
          <div className="metrics-grid-container">
            <MetricsDashboard />
          </div>
        </CollapsiblePanel>

        {/* Agent breakdown */}
        {snapshot && (
          <CollapsiblePanel id="mobile-agents" title={`Agents (${snapshot.agents.length})`}>
            <AgentSummary agents={snapshot.agents} />
          </CollapsiblePanel>
        )}

        {/* Event feed */}
        <CollapsiblePanel id="mobile-events" title="Events">
          <EventFeed />
        </CollapsiblePanel>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-[var(--sim-border)] bg-[var(--sim-surface)] px-2.5 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wider text-[var(--sim-text-muted)]">{label}</div>
      <div className={`mt-0.5 font-mono text-sm font-bold ${color ?? 'text-[var(--sim-text)]'}`}>{value}</div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  open: 'text-cyan-400 border-cyan-400/30',
  approved: 'text-green-400 border-green-400/30',
  rejected: 'text-red-400 border-red-400/30',
  expired: 'text-[var(--sim-text-muted)] border-[var(--sim-border)]',
};

function ProposalRow({ proposal }: { proposal: { id: string; type: string; status: string; votesFor: number; votesAgainst: number; creationStep: number } }) {
  const total = proposal.votesFor + proposal.votesAgainst;
  const forPct = total > 0 ? (proposal.votesFor / total) * 100 : 0;
  const statusStyle = STATUS_COLORS[proposal.status] ?? STATUS_COLORS.expired;

  return (
    <div className={`flex items-center gap-2 rounded-lg border bg-[var(--sim-surface)] px-2.5 py-2 text-xs ${statusStyle.split(' ')[1]}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-[var(--sim-text)] truncate">{proposal.type}</span>
          <span className={`text-[10px] uppercase font-bold ${statusStyle.split(' ')[0]}`}>{proposal.status}</span>
        </div>
        {total > 0 && (
          <div className="mt-1 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-red-400/30 overflow-hidden">
              <div className="h-full bg-green-400 rounded-full" style={{ width: `${forPct}%` }} />
            </div>
            <span className="text-[10px] text-[var(--sim-text-muted)] font-mono">{proposal.votesFor}/{total}</span>
          </div>
        )}
      </div>
    </div>
  );
}
