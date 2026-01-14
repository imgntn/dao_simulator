/**
 * Digital Twin DAO Type Definitions
 *
 * TypeScript interfaces for the digital twin JSON schema (v0.2)
 * Used to parse and validate DAO configuration files from digital_twins/
 */

// =============================================================================
// INDEX FILE TYPES
// =============================================================================

export interface DigitalTwinIndexEntry {
  id: string;
  name: string;
  category: string[];
  file: string;
}

export interface DigitalTwinIndex {
  schema_version: string;
  generated_utc: string;
  count: number;
  daos: DigitalTwinIndexEntry[];
}

// =============================================================================
// GOVERNANCE TOKEN
// =============================================================================

export interface GovernanceToken {
  symbol: string;
  type: string; // e.g., "ERC-20"
  contract_address?: string;
  voting_power_model: string;
  notes?: string;
}

// =============================================================================
// GOVERNANCE STACK
// =============================================================================

export interface OffchainVotingConfig {
  platform: string;
  used_for?: string[];
  typical_poll_duration_days?: number;
  typical_duration_days?: number;
  typical_pass_rule?: string;
  proposal_gate?: {
    min_delegated_pct_votable?: number;
  };
}

export interface OnchainVotingConfig {
  platform?: string;
  framework?: string;
  voting_delay_days?: number;
  voting_period_days?: number | { min: number; max: number };
  pass_rule?: string;
  proposal_threshold_arb?: number;
  proposal_threshold_uni?: number;
  proposal_categories?: {
    constitutional?: { quorum_pct_votable: number };
    non_constitutional?: { quorum_pct_votable: number };
  };
}

export interface TimelockExecution {
  min_delay_days?: number;
  notes?: string;
}

export interface ExecutionConfig {
  timelock?: TimelockExecution;
  timelock_and_bridging?: {
    notes?: string[];
    typical_components?: Array<{
      component: string;
      typical_delay_days: number;
    }>;
  };
}

// Optimism-specific: Bicameral governance
export interface TokenHouseConfig {
  who: string;
  primary_decisions: string[];
  quorum: {
    type: string;
    value_pct: number;
  };
  approval_threshold: {
    type: string;
    value_pct: number;
  };
  cadence?: string;
}

export interface CitizensHouseConfig {
  who: string;
  primary_decisions: string[];
  veto_window_days?: number;
}

export interface HousesConfig {
  token_house?: TokenHouseConfig;
  citizens_house?: CitizensHouseConfig;
}

// Lido-specific: Dual governance safeguard
export interface DualGovernanceSafeguard {
  name: string;
  who: string;
  normal_review_window?: {
    pending_days: number;
    buffer_days: number;
  };
  veto_signalling_threshold_pct_steth_supply?: number;
  rage_quit_threshold_pct_steth_supply?: number;
  dynamic_timelock_days_range?: [number, number];
  effects?: {
    veto_signalling?: string;
    rage_quit?: string;
  };
}

// Fast track / Easy Track
export interface FastTrackConfig {
  name: string;
  platform: string;
  purpose: string;
}

export interface UpgradeSafetyConfig {
  developer_advisory_board_review?: boolean;
  veto_period_days?: number;
  notes?: string[];
}

export interface GovernanceStack {
  discussion_forum?: string;
  offchain_voting?: OffchainVotingConfig;
  onchain_voting?: OnchainVotingConfig;
  execution?: ExecutionConfig;
  // Optimism bicameral
  houses?: HousesConfig;
  upgrade_safety?: UpgradeSafetyConfig;
  // Lido dual governance
  fast_track?: FastTrackConfig;
  safeguard_layer?: DualGovernanceSafeguard;
}

// =============================================================================
// TREASURY
// =============================================================================

export interface TreasuryConfig {
  treasury_controller: string;
  primary_treasury_address?: string;
  spending_mechanism: string | string[];
  budgeting_patterns?: string[];
  revenue_streams?: string[];
  notes?: string[];
}

// =============================================================================
// MEMBERSHIP
// =============================================================================

export interface MemberTypeConfig {
  type: string;
  who: string;
  rights: string[];
}

export interface MembershipConfig {
  member_types: MemberTypeConfig[];
  notable_institutions?: string[];
}

// =============================================================================
// PROPOSAL PROCESS
// =============================================================================

export interface ProposalStageConfig {
  stage: string;
  platform?: string;
  min_duration_days?: number;
  duration_days?: number;
  duration_days_range?: [number, number];
  duration?: string; // For flexible descriptions like "3 days + 1 day buffer"
  pass_condition?: string;
  entry_requirement?: string;
  purpose?: string;
  typical_duration_days?: number;
  typical_voting_window_days?: number;
  voting_delay_days?: number;
  voting_period_days?: number;
  timelock_days?: number;
  notes?: string;
}

export interface ProposalProcessConfig {
  stages: ProposalStageConfig[];
  proposal_types?: string[];
}

// =============================================================================
// PROPOSAL ACTIVITY
// =============================================================================

export interface ProposalActivityConfig {
  activity_level: 'high' | 'medium-high' | 'medium' | 'low';
  cadence_pattern: string;
  primary_artifacts?: string[];
}

// =============================================================================
// SECURITY CONTROLS
// =============================================================================

export interface SecurityControlsConfig {
  timelock?: boolean;
  timelock_delay_days?: number;
  voting_delay_days?: number;
  multi_stage_execution?: boolean;
  veto_mechanism?: boolean;
  veto_period_days?: number;
  dual_governance?: boolean;
  notes?: string[];
}

// =============================================================================
// SIMULATION PARAMETERS
// =============================================================================

export interface ProposalThresholdParam {
  unit: string;
  value: number;
}

export interface QuorumParam {
  unit?: string;
  value?: number;
}

export interface GovernanceSimParams {
  vote_weight: string;
  proposal_threshold?: ProposalThresholdParam;
  quorum?: QuorumParam;
  quorum_pct_votable?: number | { constitutional: number; non_constitutional: number };
  voting_delay_days?: number;
  voting_period_days?: number;
  voting_period_days_range?: [number, number];
  timelock_delay_days?: number;
  pass_rule?: string;
  temperature_check_gate_pct?: number;
  // Optimism bicameral
  token_house?: {
    vote_weight: string;
    quorum_pct_votable_supply: number;
    approval_threshold_pct: number;
    typical_voting_window_days: number;
  };
  citizens_house?: {
    vote_weight: string;
    upgrade_veto_window_days: number;
  };
  // Aave short/long executors
  short_executor?: {
    proposal_threshold_pct_supply: number;
    quorum_pct_supply: number;
    differential_pct: number;
    timelock_days: number;
  };
  long_executor?: {
    proposal_threshold_pct_supply: number;
    quorum_pct_supply: number;
    differential_pct: number;
    timelock_days: number;
  };
  offchain_vote_days?: number;
  onchain_vote_days?: number;
}

export interface DualGovernanceSimParams {
  review_pending_days: number;
  buffer_days: number;
  veto_threshold_pct: number;
  rage_quit_threshold_pct: number;
  dynamic_timelock_days_range: [number, number];
}

export interface ExecutionSimParams {
  l2_timelock_days?: number;
  l2_to_l1_delay_days?: number;
  l1_timelock_days?: number;
}

export interface ProcessSimParams {
  temperature_check_days?: number;
  rfc_min_days?: number;
}

export interface SimulationParameters {
  governance: GovernanceSimParams;
  dual_governance?: DualGovernanceSimParams;
  execution?: ExecutionSimParams;
  process?: ProcessSimParams;
}

// =============================================================================
// SOURCES
// =============================================================================

export interface SourceReference {
  title: string;
  url: string;
}

// =============================================================================
// MAIN DAO CONFIG
// =============================================================================

export interface DAOSpec {
  id: string;
  name: string;
  category: string[];
  primary_chain: string;
  governance_token: GovernanceToken;
  governance_stack: GovernanceStack;
  treasury: TreasuryConfig;
  membership: MembershipConfig;
  proposal_process: ProposalProcessConfig;
  proposal_activity: ProposalActivityConfig;
  security_controls: SecurityControlsConfig;
  simulation_parameters: SimulationParameters;
  sources: SourceReference[];
}

export interface DigitalTwinConfig {
  schema_version: string;
  last_verified_utc: string;
  dao: DAOSpec;
}

// =============================================================================
// SIMULATION INTEGRATION TYPES
// =============================================================================

/**
 * Converted config ready for simulation engine
 */
export interface TwinDAOConfig {
  id: string;
  name: string;
  tokenSymbol: string;
  color?: string;
  category: string[];

  // Governance settings
  proposalThreshold: number;
  quorumPercent: number;
  votingPeriodSteps: number;
  timelockDelaySteps: number;

  // Treasury
  initialTreasury: number;

  // Multi-stage proposal config
  proposalStages: SimProposalStageConfig[];

  // Special governance features
  isBicameral: boolean;
  hasDualGovernance: boolean;
  hasSecurityCouncil: boolean;

  // Bicameral config (Optimism)
  tokenHouse?: {
    quorumPercent: number;
    approvalThresholdPercent: number;
  };
  citizensHouse?: {
    vetoEnabled: boolean;
    vetoPeriodSteps: number;
  };

  // Dual governance config (Lido)
  dualGovernance?: {
    vetoThresholdPercent: number;
    rageQuitThresholdPercent: number;
    minTimelockSteps: number;
    maxTimelockSteps: number;
  };

  // Member archetype distribution
  memberArchetypes: MemberArchetypeConfig[];

  // Activity level for agent behavior tuning
  activityLevel: 'high' | 'medium-high' | 'medium' | 'low';
}

export interface SimProposalStageConfig {
  stage: ProposalStageType;
  durationSteps: number;
  platform?: string;
  passCondition?: string;
}

export type ProposalStageType =
  | 'rfc'
  | 'temp_check'
  | 'on_chain'
  | 'timelock'
  | 'veto_window'
  | 'execution'
  | 'executed'
  | 'cancelled'
  | 'vetoed';

export interface MemberArchetypeConfig {
  type: string;
  rights: string[];
  suggestedAgentTypes: string[];
  distributionWeight: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default steps per day for simulation time conversion
 * Digital twins specify durations in days, simulation runs in steps
 */
export const STEPS_PER_DAY = 24;

/**
 * Map of DAO categories to suggested colors for visualization
 */
export const CATEGORY_COLORS: Record<string, string> = {
  DeFi: '#4ADE80', // green
  'Layer 2': '#60A5FA', // blue
  'Public goods': '#F472B6', // pink
  Staking: '#FBBF24', // yellow
  Lending: '#34D399', // teal
  Identity: '#A78BFA', // purple
  Grants: '#FB7185', // red-pink
  Stablecoin: '#6EE7B7', // mint
  DEX: '#22D3EE', // cyan
};

/**
 * Map of member types from twins to simulation agent classes
 */
export const MEMBER_TYPE_TO_AGENTS: Record<string, string[]> = {
  token_holder: ['PassiveMember', 'Investor', 'Trader'],
  op_holder: ['PassiveMember', 'Investor', 'Trader'],
  delegate: ['Delegator', 'LiquidDelegator', 'GovernanceExpert'],
  security_council: ['SecurityCouncilMember'],
  citizen: ['CitizenAgent'],
  steward: ['StewardAgent'],
  dAB: ['AdvisoryBoardMember'],
  node_operator: ['Validator'],
  staker: ['StakerAgent', 'Investor'],
  contributor: ['Developer', 'ServiceProvider'],
  service_provider: ['ServiceProvider'],
  governance_token_holder: ['PassiveMember', 'Investor', 'Delegator'],
  foundation: ['ExternalPartner'],
};
