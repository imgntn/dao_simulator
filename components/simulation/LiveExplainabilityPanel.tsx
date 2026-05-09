'use client';

import { useMemo } from 'react';
import { useSimulationStore } from '@/lib/browser/simulation-store';
import type { AgentSnapshot, SimulationEvent, SimulationSnapshot } from '@/lib/browser/worker-protocol';

function pct(n: number): string {
  if (!Number.isFinite(n)) return '--';
  return `${(n * 100).toFixed(0)}%`;
}

function signed(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '--';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(digits)}`;
}

function topTokenHolders(agents: AgentSnapshot[], count: number): AgentSnapshot[] {
  const top: AgentSnapshot[] = [];
  for (const agent of agents) {
    const insertAt = top.findIndex(item => agent.tokens > item.tokens);
    if (insertAt === -1) {
      if (top.length < count) top.push(agent);
    } else {
      top.splice(insertAt, 0, agent);
      if (top.length > count) top.pop();
    }
  }
  return top;
}

function explainEventProvenance(
  event: SimulationEvent | undefined,
  snapshot: SimulationSnapshot,
  previous: SimulationSnapshot | null
) {
  const priceDelta = previous ? snapshot.tokenPrice - previous.tokenPrice : 0;
  const treasuryDelta = previous ? snapshot.treasuryFunds - previous.treasuryFunds : 0;
  const turnoutDelta = previous ? snapshot.avgParticipationRate - previous.avgParticipationRate : 0;
  const giniDelta = previous ? snapshot.gini - previous.gini : 0;

  if (snapshot.blackSwan.active) {
    return {
      source: snapshot.blackSwan.name ?? 'Active shock',
      driver: `${snapshot.blackSwan.category ?? 'shock'} severity ${snapshot.blackSwan.severity}`,
      impact: `Stress is active; price ${signed(priceDelta)}, treasury ${signed(treasuryDelta, 0)}, turnout ${signed(turnoutDelta * 100, 1)} pts.`,
    };
  }

  if (!event) {
    return {
      source: 'No recent event',
      driver: 'Latest snapshot only',
      impact: 'Metrics are stable enough that no discrete event is leading the explanation.',
    };
  }

  const label = event.type.replaceAll('_', ' ');
  if (event.type === 'treasury_change') {
    return {
      source: `${label} at s${event.step}`,
      driver: event.message,
      impact: `Treasury moved ${signed(treasuryDelta, 0)} while token price moved ${signed(priceDelta)}.`,
    };
  }
  if (event.type === 'price_change') {
    return {
      source: `${label} at s${event.step}`,
      driver: event.message,
      impact: `Token price moved ${signed(priceDelta)}; turnout moved ${signed(turnoutDelta * 100, 1)} pts.`,
    };
  }
  if (event.type.startsWith('proposal_') || event.type === 'vote_cast') {
    return {
      source: `${label} at s${event.step}`,
      driver: `${snapshot.openProposalCount} open proposal${snapshot.openProposalCount === 1 ? '' : 's'}`,
      impact: `Turnout moved ${signed(turnoutDelta * 100, 1)} pts and inequality moved ${signed(giniDelta * 100, 1)} pts.`,
    };
  }
  if (event.type === 'delegation') {
    return {
      source: `${label} at s${event.step}`,
      driver: event.message,
      impact: `Delegation concentration can affect quorum; inequality moved ${signed(giniDelta * 100, 1)} pts.`,
    };
  }
  return {
    source: `${label} at s${event.step}`,
    driver: event.message,
    impact: `Price ${signed(priceDelta)}, treasury ${signed(treasuryDelta, 0)}, turnout ${signed(turnoutDelta * 100, 1)} pts.`,
  };
}

export function LiveExplainabilityPanel() {
  const snapshot = useSimulationStore(s => s.snapshot);
  const previousSnapshot = useSimulationStore(s => s.previousSnapshot);

  const cards = useMemo(() => {
    if (!snapshot) return [];
    const previous = previousSnapshot;
    const priceDelta = previous ? snapshot.tokenPrice - previous.tokenPrice : 0;
    const treasuryDelta = previous ? snapshot.treasuryFunds - previous.treasuryFunds : 0;
    const participationDelta = previous ? snapshot.avgParticipationRate - previous.avgParticipationRate : 0;
    const giniDelta = previous ? snapshot.gini - previous.gini : 0;
    const latestEvent = snapshot.recentEvents[0];
    const latestProposal = snapshot.proposals[snapshot.proposals.length - 1];
    const voteTotal = latestProposal ? Math.max(1, latestProposal.votesFor + latestProposal.votesAgainst) : 1;
    const approvalLean = latestProposal ? latestProposal.votesFor / voteTotal : 0;
    const activeDelegations = snapshot.agents.filter(agent => agent.delegateTo).length;
    const fatiguedAgents = snapshot.agents.filter(agent => agent.voterFatigue > 0.55).length;
    const highInfluence = topTokenHolders(snapshot.agents, 3);

    return [
      {
        title: 'Market',
        value: `$${snapshot.tokenPrice.toFixed(2)}`,
        tone: priceDelta >= 0 ? 'text-emerald-300' : 'text-rose-300',
        reason: priceDelta === 0
          ? 'Price is flat this tick.'
          : `Price moved ${signed(priceDelta)} since the last snapshot.`,
      },
      {
        title: 'Governance',
        value: pct(snapshot.avgParticipationRate),
        tone: participationDelta >= 0 ? 'text-cyan-200' : 'text-amber-200',
        reason: `${snapshot.openProposalCount} open proposal${snapshot.openProposalCount === 1 ? '' : 's'}; turnout moved ${signed(participationDelta * 100, 1)} pts.`,
      },
      {
        title: 'Treasury',
        value: `$${Math.round(snapshot.treasuryFunds).toLocaleString()}`,
        tone: treasuryDelta >= 0 ? 'text-emerald-300' : 'text-rose-300',
        reason: treasuryDelta === 0
          ? 'No treasury movement in the latest tick.'
          : `Treasury changed by $${Math.round(Math.abs(treasuryDelta)).toLocaleString()}.`,
      },
      {
        title: 'Risk',
        value: snapshot.blackSwan.active ? 'Active' : pct(snapshot.gini),
        tone: snapshot.blackSwan.active ? 'text-rose-300' : giniDelta <= 0 ? 'text-emerald-300' : 'text-amber-200',
        reason: snapshot.blackSwan.active
          ? `${snapshot.blackSwan.name ?? 'Black swan'} is applying severity ${snapshot.blackSwan.severity}.`
          : `Inequality moved ${signed(giniDelta * 100, 1)} pts; latest event: ${latestEvent?.type.replaceAll('_', ' ') ?? 'none'}.`,
      },
      {
        title: 'Vote Drivers',
        value: latestProposal ? `${Math.round(approvalLean * 100)}% for` : 'No vote',
        tone: approvalLean >= 0.5 ? 'text-emerald-300' : 'text-rose-300',
        reason: latestProposal
          ? `${latestProposal.type} has ${latestProposal.totalVoters} voters; quorum pressure rises when fatigue and delegations concentrate.`
          : 'No proposal is currently driving vote behavior.',
      },
      {
        title: 'Power Flow',
        value: `${activeDelegations}`,
        tone: activeDelegations > snapshot.memberCount * 0.35 ? 'text-amber-200' : 'text-cyan-200',
        reason: `${fatiguedAgents} agents are fatigued; top token holders: ${highInfluence.map(agent => agent.type.replaceAll('_', ' ')).join(', ') || 'none'}.`,
      },
    ];
  }, [previousSnapshot, snapshot]);

  const provenance = useMemo(() => {
    if (!snapshot) return null;
    return explainEventProvenance(snapshot.recentEvents[0], snapshot, previousSnapshot);
  }, [previousSnapshot, snapshot]);

  const chain = useMemo(() => {
    if (!snapshot) return [];
    const previous = previousSnapshot;
    const event = snapshot.recentEvents[0];
    const chainItems = [];
    if (event) chainItems.push(`${event.type.replaceAll('_', ' ')} at s${event.step}`);
    if (previous && snapshot.openProposalCount !== previous.openProposalCount) {
      chainItems.push(`Open proposals ${previous.openProposalCount} -> ${snapshot.openProposalCount}`);
    }
    if (previous && Math.abs(snapshot.avgParticipationRate - previous.avgParticipationRate) > 0.005) {
      chainItems.push(`Turnout ${pct(previous.avgParticipationRate)} -> ${pct(snapshot.avgParticipationRate)}`);
    }
    if (previous && Math.abs(snapshot.gini - previous.gini) > 0.002) {
      chainItems.push(`Inequality ${pct(previous.gini)} -> ${pct(snapshot.gini)}`);
    }
    if (snapshot.blackSwan.active) {
      chainItems.push(`${snapshot.blackSwan.category ?? 'shock'} severity ${snapshot.blackSwan.severity}`);
    }
    return chainItems.slice(0, 4);
  }, [previousSnapshot, snapshot]);

  if (!snapshot) {
    return <div className="p-3 text-xs text-[var(--sim-text-muted)]">Run the simulation to explain live changes.</div>;
  }

  return (
    <div className="space-y-2 p-3">
      {chain.length > 0 && (
        <div className="rounded border p-2" style={{ borderColor: 'var(--sim-border)', background: 'rgba(64,232,255,0.04)' }}>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-[var(--sim-text-muted)]">Cause Chain</div>
          <ol className="space-y-1 text-[11px] text-[var(--sim-text-muted)]">
            {chain.map((item, index) => (
              <li key={`${item}-${index}`} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-1">
                <span className="tabular-nums text-[var(--sim-accent)]">{index + 1}</span>
                <span className="truncate">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {provenance && (
        <div className="rounded border p-2" style={{ borderColor: 'var(--sim-border)', background: 'rgba(134,239,172,0.035)' }}>
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-wider text-[var(--sim-text-muted)]">Evidence</span>
            <span className="max-w-[9rem] truncate text-[10px] text-emerald-200" title={provenance.source}>{provenance.source}</span>
          </div>
          <p className="text-[11px] leading-snug text-[var(--sim-text-muted)]">{provenance.driver}</p>
          <p className="mt-1 text-[11px] leading-snug text-[var(--sim-text-muted)]">{provenance.impact}</p>
        </div>
      )}
      {cards.map(card => (
        <div key={card.title} className="rounded border p-2" style={{ borderColor: 'var(--sim-border)', background: 'rgba(255,255,255,0.02)' }}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-wider text-[var(--sim-text-muted)]">{card.title}</span>
            <span className={`text-xs font-semibold tabular-nums ${card.tone}`}>{card.value}</span>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-[var(--sim-text-muted)]">{card.reason}</p>
        </div>
      ))}
    </div>
  );
}
