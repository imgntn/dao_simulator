// Comprehensive type definitions for the DAO simulation

import type { DAOMember as DAOMemberViz } from './visualization';

/**
 * Core simulation configuration
 */
export interface SimulationConfig {
  // Agent counts
  num_developers?: number;
  num_investors?: number;
  num_traders?: number;
  num_adaptive_investors?: number;
  num_delegators?: number;
  num_liquid_delegators?: number;
  num_proposal_creators?: number;
  num_validators?: number;
  num_service_providers?: number;
  num_arbitrators?: number;
  num_regulators?: number;
  num_auditors?: number;
  num_bounty_hunters?: number;
  num_external_partners?: number;
  num_passive_members?: number;
  num_artists?: number;
  num_collectors?: number;
  num_speculators?: number;

  // Simulation parameters
  governance_rule?: 'majority' | 'quorum' | 'supermajority' | string;
  enable_marketing?: boolean;
  marketing_level?: string;
  enable_player?: boolean;
  token_emission_rate?: number;
  token_burn_rate?: number;
  staking_interest_rate?: number;
  slash_fraction?: number;
  reputation_decay_rate?: number;
  market_shock_frequency?: number;
  adaptive_learning_rate?: number;
  adaptive_epsilon?: number;

  // Probabilities
  comment_probability?: number;
  voting_activity?: number;  // 0-1 probability that agents vote when given the chance
  external_partner_interact_probability?: number;
  violation_probability?: number;
  reputation_penalty?: number;

  // Export/logging
  exportCsv?: boolean;
  csvFilename?: string;
  useParallel?: boolean;
  useAsync?: boolean;
  maxWorkers?: number;
  eventLogging?: boolean;
  eventLogFilename?: string;
  useIndexedDB?: boolean;
  checkpointInterval?: number;
  marketShockSchedule?: Record<number, number>;
  eventsFile?: string | EventDefinition[];
  reportFile?: string;
  seed?: number;
  centralityInterval?: number;

  // Dashboard-specific
  marketShockFrequency?: number;
  [key: string]: unknown;
}

/**
 * Snapshot of simulation config for persistence
 */
export interface SimulationConfigSnapshot {
  numDevelopers: number;
  numInvestors: number;
  numTraders: number;
  governanceRule: string;
  enableMarketing: boolean;
  tokenEmissionRate: number;
  tokenBurnRate: number;
  stakingInterestRate: number;
  marketShockFrequency: number;
  seed?: number;
}

/**
 * Member snapshot for persistence
 */
export interface MemberSnapshot {
  uniqueId: string;
  tokens: number;
  reputation: number;
  stakedTokens?: number;
}

/**
 * DAO state snapshot for persistence
 */
export interface DAOStateSnapshot {
  name: string;
  members: MemberSnapshot[];
  proposals: number;
  projects: number;
  treasuryFunds: number;
  tokenPrice: number;
}

/**
 * Full simulation snapshot for persistence
 */
export interface SimulationSnapshot {
  id: string;
  step: number;
  config: SimulationConfigSnapshot;
  daoState: DAOStateSnapshot;
  timestamp: number;
  simulation?: unknown; // For in-memory store that keeps actual instance
}

/**
 * Summary listing for list() method
 */
export interface SimulationListItem {
  id: string;
  step: number;
  members: number;
}

/**
 * Event definition for event engine
 */
export interface EventDefinition {
  step: number;
  type: string;
  payload?: Record<string, unknown>;
}

/**
 * Market shock event data
 */
export interface MarketShockEvent {
  step: number;
  severity: number;
  oldPrice: number;
  newPrice: number;
}

/**
 * Simulation summary returned by getSummary()
 */
export interface SimulationSummary {
  step: number;
  members: number;
  proposals: number;
  projects: number;
  tokenPrice: number;
  treasuryFunds: number;
  dataCollector: DataCollectorStats;
}

/**
 * Stats from data collector
 */
export interface DataCollectorStats {
  step: number;
  total_members: number;
  active_proposals: number;
  treasury_balance: number;
  token_price: number;
  [key: string]: number;
}

/**
 * API request schemas
 */
export interface CreateSimulationRequest extends SimulationConfig {
  id?: string;
}

export interface StepSimulationRequest {
  id: string;
  steps?: number;
}

export interface SimulationResponse {
  id: string;
  message?: string;
  summary?: SimulationSummary;
  error?: string;
}

/**
 * WebSocket event payloads
 */
export interface SimulationStepPayload {
  step: number;
  dao_token_price: number;
  treasury_balance: number;
  total_members: number;
  active_proposals: number;
  [key: string]: number | string;
}

export interface SimulationStatusPayload {
  running: boolean;
  step: number;
}

export interface MembersUpdatePayload {
  members: Array<{
    id: string;
    unique_id: string;
    type: string;
    tokens: number;
    reputation: number;
    location: string;
  }>;
}

export interface ProposalsUpdatePayload {
  proposals: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    votes_for: number;
    votes_against: number;
    creator: string;
  }>;
}

export interface NetworkUpdatePayload {
  nodes: Array<{
    id: string;
    type: 'member';
    position: [number, number, number];
    size: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: string;
    weight: number;
  }>;
}

export interface LeaderboardUpdatePayload {
  token: Array<{ member: string; value: number }>;
  influence: Array<{ member: string; value: number }>;
}

/**
 * Socket.IO start simulation config
 */
export interface StartSimulationConfig {
  stepsPerSecond?: number;
  simulationConfig?: SimulationConfig;
}

/**
 * Re-export visualization types for convenience
 */
export type { DAOMemberViz };
