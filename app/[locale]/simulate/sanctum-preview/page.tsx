'use client';

/**
 * Preview page for SanctumScene — renders the scene with mock data
 * so you can see the design without wiring into the live simulation.
 *
 * Open at: /en/simulate/sanctum-preview
 */

import { useMemo, useState } from 'react';
import { SanctumScene } from '@/components/simulation/sanctum';
import type {
  AgentSnapshot,
  ProposalSnapshot,
  SimulationSnapshot,
  SimulationEvent,
} from '@/lib/browser/worker-protocol';

const AGENT_TYPES = [
  // Governance
  'ProposalCreator', 'GovernanceExpert', 'GovernanceWhale', 'Delegator', 'LiquidDelegator', 'Validator',
  // Treasury
  'Trader', 'Investor', 'AdaptiveInvestor', 'Speculator', 'MarketMaker',
  // Craft
  'Developer', 'ServiceProvider', 'BountyHunter', 'Artist', 'Auditor',
  // Council
  'Regulator', 'Arbitrator', 'RiskManager', 'Whistleblower',
  // Passive
  'Collector', 'StakerAgent', 'PassiveMember',
];

function buildMockAgents(seed: number, currentStep: number): AgentSnapshot[] {
  // Deterministic pseudo-random so reloads are stable
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  return AGENT_TYPES.map((type, i) => {
    const r = rand();
    // Roughly 60% have voted, 40% haven't yet
    const hasVoted = r < 0.6;
    const votedFor = hasVoted && rand() < 0.65;
    return {
      id: `mock-${i}`,
      type,
      tokens: Math.floor(rand() * 10000) + 100,
      reputation: rand(),
      optimism: rand() * 0.5 + 0.25,
      stakedTokens: Math.floor(rand() * 5000),
      oppositionBias: rand() * 0.3,
      lastVote: hasVoted ? votedFor : null,
      voterFatigue: rand() * 0.2,
      lastVoteStep: hasVoted
        ? currentStep - Math.floor(rand() * 20)
        : 0,
      delegateTo: null,
      totalVotesCast: Math.floor(rand() * 50),
      tokenHistory: [],
    };
  });
}

function buildMockProposal(currentStep: number): ProposalSnapshot {
  return {
    id: 'prop-mock-a3f9e1',
    status: 'open',
    votesFor: 9,
    votesAgainst: 5,
    type: 'Treasury Allocation',
    creationStep: currentStep - 7,
    fundingGoal: 125000,
    totalVoters: 23,
  };
}

function buildMockEvents(currentStep: number): SimulationEvent[] {
  return [
    { step: currentStep - 1, type: 'vote_cast', message: 'GovernanceExpert voted FOR proposal #a3f9e1' },
    { step: currentStep - 3, type: 'forum_topic', message: 'Forum heating up: "Do we trust the new RiskManager?"' },
    { step: currentStep - 6, type: 'proposal_approved', message: 'Proposal #82bc3d approved — 67% turnout' },
    { step: currentStep - 9, type: 'black_swan', message: 'Market shock: token price fell 12% in one step' },
  ];
}

function buildMockSnapshot(step: number, blackSwan: boolean): SimulationSnapshot {
  const agents = buildMockAgents(42 + step, step);
  const proposal = buildMockProposal(step);
  return {
    step,
    tokenPrice: 4.27 + Math.sin(step / 10) * 0.4,
    treasuryFunds: 2_450_000 + step * 137,
    memberCount: agents.length,
    proposalCount: 12,
    openProposalCount: 1,
    gini: 0.41,
    agents,
    proposals: [proposal],
    blackSwan: blackSwan
      ? { active: true, count: 1, severity: 0.7, category: 'market', name: 'Contagion' }
      : { active: false, count: 0, severity: 0, category: null, name: null },
    recentEvents: buildMockEvents(step),
    proposalsApproved: 8,
    proposalsRejected: 3,
    proposalsExpired: 1,
  } as SimulationSnapshot;
}

export default function SanctumPreviewPage() {
  const [step, setStep] = useState(120);
  const [blackSwan, setBlackSwan] = useState(false);
  const snapshot = useMemo(() => buildMockSnapshot(step, blackSwan), [step, blackSwan]);

  return (
    <div className="flex h-screen w-screen flex-col" style={{ background: '#c9b896' }}>
      {/* Preview controls — NOT part of the real scene, just for isolation testing */}
      <div className="flex items-center justify-between gap-3 border-b border-black/20 bg-stone-100 px-3 py-2 text-xs text-stone-700">
        <div className="flex items-center gap-3">
          <strong>Sanctum preview</strong>
          <span className="opacity-60">step {step}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded border border-stone-400 bg-white px-2 py-1 hover:bg-stone-200"
            onClick={() => setStep(s => s + 1)}
          >
            +1 step
          </button>
          <button
            className="rounded border border-stone-400 bg-white px-2 py-1 hover:bg-stone-200"
            onClick={() => setStep(s => s + 10)}
          >
            +10
          </button>
          <button
            className="rounded border border-stone-400 bg-white px-2 py-1 hover:bg-stone-200"
            onClick={() => setStep(120)}
          >
            reset
          </button>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={blackSwan}
              onChange={e => setBlackSwan(e.target.checked)}
            />
            black swan
          </label>
        </div>
      </div>

      {/* The actual scene */}
      <div className="min-h-0 flex-1">
        <SanctumScene snapshot={snapshot} />
      </div>
    </div>
  );
}
