/**
 * Worker Protocol
 *
 * Message type definitions for main thread ↔ Web Worker communication.
 * Uses structured clone via postMessage (~5-10KB per step snapshot).
 */

import type { CalibrationProfile } from '../digital-twins/calibration-loader';

// =============================================================================
// SNAPSHOT TYPES (Worker → Main)
// =============================================================================

export interface AgentSnapshot {
  id: string;
  type: string;
  tokens: number;
  reputation: number;
  optimism: number;
  stakedTokens: number;
  oppositionBias: number;
  lastVote: boolean | null;
  voterFatigue: number;
  lastVoteStep: number;
  delegateTo: string | null;
  totalVotesCast: number;
  tokenHistory: number[];  // last 20 token balances (ring buffer)
}

export interface CustomAgentProfile {
  type: string;
  tokens: number;
  optimism: number;
  oppositionBias: number;
  name?: string;
}

export interface ProposalSnapshot {
  id: string;
  status: string;
  votesFor: number;
  votesAgainst: number;
  type: string;
  creationStep: number;
  fundingGoal: number;
  totalVoters: number;
}

export interface BlackSwanSnapshot {
  active: boolean;
  count: number;
  severity: number;
  category: string | null;
  name: string | null;
}

export interface SimulationEvent {
  step: number;
  type: 'proposal_created' | 'proposal_approved' | 'proposal_rejected' | 'proposal_expired'
    | 'vote_cast' | 'black_swan' | 'treasury_change' | 'member_joined' | 'member_left'
    | 'delegation' | 'forum_topic' | 'price_change';
  message: string;
}

export interface SimulationSnapshot {
  step: number;
  tokenPrice: number;
  treasuryFunds: number;
  memberCount: number;
  proposalCount: number;
  openProposalCount: number;
  gini: number;
  agents: AgentSnapshot[];
  proposals: ProposalSnapshot[];
  blackSwan: BlackSwanSnapshot;
  recentEvents: SimulationEvent[];
  // Aggregate metrics
  proposalsApproved: number;
  proposalsRejected: number;
  proposalsExpired: number;
  avgParticipationRate: number;
  forumTopics: number;
  forumPosts: number;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface BrowserSimConfig {
  daoId: string;
  seed?: number;
  stepsPerSecond: number;
  totalSteps: number;
  // Agent counts
  numDevelopers?: number;
  numInvestors?: number;
  numTraders?: number;
  numDelegators?: number;
  numProposalCreators?: number;
  numValidators?: number;
  numPassiveMembers?: number;
  numGovernanceExperts?: number;
  numGovernanceWhales?: number;
  numRiskManagers?: number;
  numSpeculators?: number;
  numStakers?: number;
  // Governance
  governanceRule?: string;
  // Features
  forumEnabled?: boolean;
  blackSwanEnabled?: boolean;
  blackSwanFrequency?: number;
  scheduledBlackSwans?: Array<{ step: number; category: string; severity: number }>;
}

// =============================================================================
// MESSAGES (Main → Worker)
// =============================================================================

export type WorkerInMessage =
  | { type: 'init'; config: BrowserSimConfig; calibrationProfiles: Record<string, CalibrationProfile>; marketData: Record<string, Array<{ step: number; price: number }>> }
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'step' }
  | { type: 'setSpeed'; stepsPerSecond: number }
  | { type: 'updateConfig'; config: Partial<BrowserSimConfig> }
  | { type: 'reset'; config: BrowserSimConfig }
  | { type: 'dispose' }
  | { type: 'injectConfig'; changes: Partial<BrowserSimConfig> }
  | { type: 'injectAgent'; profile: CustomAgentProfile }
  | { type: 'forkState' };

// =============================================================================
// MESSAGES (Worker → Main)
// =============================================================================

export type WorkerOutMessage =
  | { type: 'ready' }
  | { type: 'initialized'; daoId: string; agentCount: number }
  | { type: 'stepComplete'; snapshot: SimulationSnapshot }
  | { type: 'error'; message: string; stack?: string }
  | { type: 'disposed' }
  | { type: 'forkedState'; snapshot: SimulationSnapshot; config: BrowserSimConfig; step: number };
