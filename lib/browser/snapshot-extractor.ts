/**
 * Snapshot Extractor
 *
 * Lightweight read of DAOSimulation state into a serializable DTO
 * for postMessage transfer to the main thread.
 */

import type { DAOSimulation } from '../engine/simulation';
import type {
  SimulationSnapshot,
  AgentSnapshot,
  ProposalSnapshot,
  BlackSwanSnapshot,
  SimulationEvent,
} from './worker-protocol';

/**
 * Extract a snapshot from the current simulation state.
 * Designed to be fast — no deep cloning, just reads scalar values.
 */
export function extractSnapshot(
  sim: DAOSimulation,
  recentEvents: SimulationEvent[]
): SimulationSnapshot {
  const dao = sim.dao;
  const members = dao.members;
  const proposals = dao.proposals;

  // Agent snapshots
  const agents: AgentSnapshot[] = members.map(m => ({
    id: m.uniqueId,
    type: m.constructor.name,
    tokens: m.tokens,
    reputation: m.reputation,
    optimism: m.optimism,
    stakedTokens: m.stakedTokens,
    oppositionBias: m.oppositionBias,
    lastVote: getLastVote(m),
    voterFatigue: m.voterFatigue,
    lastVoteStep: m.lastVoteStep,
    delegateTo: m.representative?.uniqueId ?? null,
  }));

  // Proposal snapshots
  const proposalSnapshots: ProposalSnapshot[] = proposals.map(p => ({
    id: p.uniqueId,
    status: p.status,
    votesFor: p.votesFor,
    votesAgainst: p.votesAgainst,
    type: p.type,
    creationStep: p.creationTime,
    fundingGoal: p.fundingGoal,
    totalVoters: p.votes.size,
  }));

  // Black swan state
  const blackSwan: BlackSwanSnapshot = {
    active: sim.activeBlackSwans.length > 0,
    count: sim.activeBlackSwans.length,
    severity: sim.activeBlackSwans.reduce((max, e) => Math.max(max, e.severity), 0),
    category: sim.activeBlackSwans[0]?.category ?? null,
    name: sim.activeBlackSwans[0]?.name ?? null,
  };

  // Aggregate metrics from data collector
  const lastEntry = getLastDataEntry(sim);

  // Token price
  const tokenPrice = dao.treasury.tokenPrices.get(dao.getPrimaryTokenSymbol()) ?? 1;
  const treasuryFunds = dao.treasury.funds;

  return {
    step: sim.currentStep,
    tokenPrice,
    treasuryFunds,
    memberCount: members.length,
    proposalCount: proposals.length,
    openProposalCount: proposals.filter(p => p.status === 'open').length,
    gini: lastEntry?.gini ?? 0,
    agents,
    proposals: proposalSnapshots,
    blackSwan,
    recentEvents,
    proposalsApproved: lastEntry?.proposalsApproved ?? 0,
    proposalsRejected: lastEntry?.proposalsRejected ?? 0,
    proposalsExpired: lastEntry?.proposalsExpired ?? 0,
    avgParticipationRate: lastEntry?.avgParticipationRate ?? 0,
    forumTopics: lastEntry?.forumTopics ?? 0,
    forumPosts: lastEntry?.forumPosts ?? 0,
  };
}

/** Get the last vote cast by a member (most recent proposal) */
function getLastVote(member: { votes: Map<string, { vote: boolean | 'abstain'; weight: number }> }): boolean | null {
  let lastVote: boolean | null = null;
  for (const [, v] of member.votes) {
    if (typeof v.vote === 'boolean') {
      lastVote = v.vote;
    }
  }
  return lastVote;
}

/** Get the most recent data collector entry */
function getLastDataEntry(sim: DAOSimulation): {
  gini: number;
  proposalsApproved: number;
  proposalsRejected: number;
  proposalsExpired: number;
  avgParticipationRate: number;
  forumTopics: number;
  forumPosts: number;
} | null {
  const dc = sim.dataCollector;
  if (!dc) return null;

  const last = dc.getLatestStats();
  if (!last) return null;

  return {
    gini: last.gini ?? 0,
    proposalsApproved: last.proposalsApproved ?? 0,
    proposalsRejected: last.proposalsRejected ?? 0,
    proposalsExpired: last.proposalsExpired ?? 0,
    avgParticipationRate: last.avgParticipationRate ?? 0,
    forumTopics: last.forumTopics ?? 0,
    forumPosts: last.forumPosts ?? 0,
  };
}
