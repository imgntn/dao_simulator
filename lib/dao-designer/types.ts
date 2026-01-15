/**
 * DAO Designer Types
 *
 * Comprehensive TypeScript interfaces for the DAO Designer feature.
 * These types capture all customization options for designing DAOs.
 */

// =============================================================================
// MASTER CONFIGURATION
// =============================================================================

/**
 * Master configuration interface for DAO Designer.
 * This is the main type that represents a complete DAO design.
 */
export interface DAODesignerConfig {
  // Basic Info
  name: string;
  description: string;
  tokenSymbol: string;
  tokenSupply: number;

  // Governance Model
  votingSystem: VotingSystemConfig;
  proposalProcess: ProposalProcessConfig;
  quorumConfig: QuorumConfig;

  // Advanced Governance Features
  features: GovernanceFeatures;

  // Member Configuration
  memberDistribution: MemberDistributionConfig;

  // Economic Parameters
  treasury: TreasuryConfig;

  // Simulation Settings
  simulationParams: SimulationParamsConfig;
}

// =============================================================================
// VOTING SYSTEM
// =============================================================================

/**
 * Available voting system types
 */
export type VotingSystemType =
  | 'simple_majority'    // Basic >50% wins
  | 'supermajority'      // Requires 66%+
  | 'quadratic'          // Sqrt-weighted votes
  | 'conviction'         // Time-weighted voting
  | 'approval'           // MakerDAO-style continuous approval
  | 'ranked_choice';     // Ranked preferences

/**
 * Voting power calculation models
 */
export type VotingPowerModel =
  | 'token_weighted'         // 1 token = 1 vote
  | 'quadratic'              // sqrt(tokens) votes
  | 'one_person_one_vote';   // Equal voting power

/**
 * Configuration for the voting system
 */
export interface VotingSystemConfig {
  type: VotingSystemType;
  passingThreshold: number;       // 0.5 for majority, 0.66 for supermajority
  votingPeriodDays: number;       // Duration in days
  votingPowerModel: VotingPowerModel;
}

// =============================================================================
// PROPOSAL PROCESS
// =============================================================================

/**
 * Types of proposal stages
 */
export type ProposalStageType =
  | 'discussion'      // Forum/RFC discussion
  | 'temp_check'      // Temperature check / Snapshot signaling
  | 'voting'          // On-chain voting
  | 'timelock'        // Execution delay
  | 'veto_window'     // Citizens/staker veto period
  | 'execution';      // Ready to execute

/**
 * Configuration for a single proposal stage
 */
export interface ProposalStageConfig {
  id?: string;
  name: string;
  type: ProposalStageType;
  durationDays: number;
  quorumPercent?: number;
  passThreshold?: number;
  description?: string;
}

/**
 * Configuration for the entire proposal process
 */
export interface ProposalProcessConfig {
  stages: ProposalStageConfig[];
  proposalThreshold: number;                         // Tokens needed to create proposal
  proposalThresholdType: 'absolute' | 'percentage';  // How threshold is interpreted
}

// =============================================================================
// QUORUM CONFIGURATION
// =============================================================================

/**
 * Types of quorum calculation
 */
export type QuorumType =
  | 'fixed_percent'    // Static percentage of total supply
  | 'dynamic'          // Adjusts based on participation history
  | 'per_category';    // Different quorum for different proposal types

/**
 * Configuration for quorum requirements
 */
export interface QuorumConfig {
  type: QuorumType;
  baseQuorumPercent: number;
  constitutionalQuorumPercent?: number;  // For Arbitrum-style proposals
  minParticipation?: number;             // Minimum tokens that must vote
}

// =============================================================================
// GOVERNANCE FEATURES
// =============================================================================

/**
 * Toggleable governance features with their configurations
 */
export interface GovernanceFeatures {
  // Multi-house / Bicameral
  bicameral: boolean;
  bicameralConfig?: BicameralConfig;

  // Veto mechanisms
  dualGovernance: boolean;                 // Lido-style staker veto
  dualGovernanceConfig?: DualGovernanceConfig;

  // Timelocks
  timelockEnabled: boolean;
  timelockConfig?: TimelockConfig;

  // Special voting types
  approvalVoting: boolean;                 // MakerDAO-style
  approvalVotingConfig?: ApprovalVotingConfig;
  convictionVoting: boolean;               // Gitcoin-style
  convictionVotingConfig?: ConvictionVotingConfig;

  // Proposal management
  easyTrack: boolean;                      // Lido fast-track
  easyTrackConfig?: EasyTrackConfig;
  proposalGates: boolean;                  // Threshold requirements
  proposalGatesConfig?: ProposalGatesConfig;

  // Economic features
  ragequit: boolean;                       // Exit with share of treasury
  ragequitConfig?: RagequitConfig;
  tokenLocking: boolean;                   // Lock tokens for voting
  tokenLockingConfig?: TokenLockingConfig;

  // Structured governance
  governanceCycles: boolean;               // Optimism seasons
  governanceCyclesConfig?: GovernanceCyclesConfig;
  retroPGF: boolean;                       // Retroactive public goods funding
  retroPGFConfig?: RetroPGFConfig;

  // Security
  securityCouncil: boolean;                // Emergency powers
  securityCouncilConfig?: SecurityCouncilConfig;
  citizenHouse: boolean;                   // Optimism-style second house
  citizenHouseConfig?: CitizenHouseConfig;
}

// =============================================================================
// BICAMERAL CONFIGURATION
// =============================================================================

/**
 * House types for bicameral governance
 */
export type HouseType =
  | 'token_house'
  | 'citizens_house'
  | 'security_council'
  | 'advisory';

/**
 * Membership criteria for houses
 */
export type MembershipCriteria =
  | 'token_holders'
  | 'badge_holders'
  | 'elected'
  | 'appointed';

/**
 * Configuration for a single governance house
 */
export interface HouseConfig {
  id?: string;
  name: string;
  type: HouseType;
  membershipCriteria: MembershipCriteria;
  quorumPercent: number;
  vetoCapable: boolean;
  vetoPeriodDays?: number;
  memberCount?: number;
}

/**
 * Configuration for bicameral governance
 */
export interface BicameralConfig {
  houses: HouseConfig[];
  requiredHouses: 'all' | 'any' | number;  // How many houses must approve
}

// =============================================================================
// DUAL GOVERNANCE (Lido-style)
// =============================================================================

/**
 * Configuration for dual governance / staker veto
 */
export interface DualGovernanceConfig {
  vetoThresholdPercent: number;      // Signal percentage needed to trigger veto
  minTimelockDays: number;           // Normal execution delay
  maxTimelockDays: number;           // Extended delay under veto pressure
  ragequitEnabled: boolean;          // Allow exit during veto
  escrowPeriodDays?: number;         // Cooldown before ragequit
}

// =============================================================================
// TIMELOCK CONFIGURATION
// =============================================================================

/**
 * Configuration for timelock delays
 */
export interface TimelockConfig {
  standardDelayDays: number;
  constitutionalDelayDays?: number;  // Longer delay for constitutional changes
  emergencyDelayDays?: number;       // Shorter delay for emergencies
  bridgeDelayDays?: number;          // L2→L1 bridge time (Arbitrum-style)
}

// =============================================================================
// APPROVAL VOTING (MakerDAO-style)
// =============================================================================

/**
 * Configuration for continuous approval voting
 */
export interface ApprovalVotingConfig {
  spellLifetimeDays: number;         // How long spells stay active
  minSupportToExecute: number;       // Minimum support to become hat
  allowMultipleSupport: boolean;     // Can support multiple spells?
  executionDelayDays: number;        // Delay after becoming hat
}

// =============================================================================
// CONVICTION VOTING (Gitcoin-style)
// =============================================================================

/**
 * Configuration for conviction voting
 */
export interface ConvictionVotingConfig {
  halfLifeDays: number;              // Time for conviction to halve
  maxConvictionPercent: number;      // Cap on conviction accumulation
  minConvictionToPass: number;       // Threshold for proposal passing
}

// =============================================================================
// EASY TRACK (Lido-style)
// =============================================================================

/**
 * Configuration for fast-track motions
 */
export interface EasyTrackConfig {
  objectionThresholdPercent: number; // Objection needed to block
  votingPeriodDays: number;          // Shorter than regular proposals
  allowedMotionTypes: string[];      // Which motions can use easy track
}

// =============================================================================
// PROPOSAL GATES
// =============================================================================

/**
 * Types of proposal gate requirements
 */
export type GateType =
  | 'delegation_percent'
  | 'token_amount'
  | 'reputation_score'
  | 'proposal_count'
  | 'membership_duration';

/**
 * Configuration for a single proposal gate
 */
export interface GateConfig {
  id?: string;
  gateType: GateType;
  stage: 'temperature_check' | 'on_chain' | 'any';
  threshold: number;
  description: string;
  enabled: boolean;
}

/**
 * Configuration for proposal gates
 */
export interface ProposalGatesConfig {
  gates: GateConfig[];
  totalVotableSupply: number;
}

// =============================================================================
// RAGEQUIT
// =============================================================================

/**
 * Configuration for ragequit functionality
 */
export interface RagequitConfig {
  minLockPeriodDays: number;         // Minimum time before exit
  penaltyPercent: number;            // Exit penalty (0-100)
  cooldownPeriodDays: number;        // Cooldown between ragequits
}

// =============================================================================
// TOKEN LOCKING
// =============================================================================

/**
 * Configuration for token locking
 */
export interface TokenLockingConfig {
  minLockDays: number;
  maxLockDays: number;
  multiplierPerDay: number;          // Voting power multiplier per lock day
  earlyUnlockPenaltyPercent: number;
}

// =============================================================================
// GOVERNANCE CYCLES (Optimism-style)
// =============================================================================

/**
 * Configuration for structured governance cycles/seasons
 */
export interface GovernanceCyclesConfig {
  proposalSubmissionDays: number;
  reviewDays: number;
  votingDays: number;
  executionDays: number;
  reflectionDays: number;
  cyclesPerSeason: number;
  breakBetweenSeasonsDays: number;
}

// =============================================================================
// RETROPGF
// =============================================================================

/**
 * Configuration for retroactive public goods funding
 */
export interface RetroPGFConfig {
  roundBudget: number;
  roundFrequencyDays: number;
  nominationPeriodDays: number;
  votingPeriodDays: number;
  minBadgeholders: number;
}

// =============================================================================
// SECURITY COUNCIL
// =============================================================================

/**
 * Configuration for security council
 */
export interface SecurityCouncilConfig {
  memberCount: number;
  termLengthDays: number;
  rotationEnabled: boolean;
  emergencyPowers: ('pause' | 'upgrade' | 'veto')[];
  multisigThreshold: number;         // e.g., 9 of 12
}

// =============================================================================
// CITIZEN HOUSE
// =============================================================================

/**
 * Badge types for citizenship
 */
export type CitizenBadgeType =
  | 'contributor'
  | 'builder'
  | 'community_leader'
  | 'investor'
  | 'partner';

/**
 * Configuration for citizen house
 */
export interface CitizenHouseConfig {
  badgeTypes: CitizenBadgeType[];
  vetoEnabled: boolean;
  vetoPeriodDays: number;
  quorumPercent: number;
}

// =============================================================================
// MEMBER DISTRIBUTION
// =============================================================================

/**
 * Member archetype options
 */
export type MemberArchetype =
  | 'passive_holder'
  | 'active_voter'
  | 'delegate'
  | 'whale'
  | 'governance_expert'
  | 'security_council'
  | 'citizen'
  | 'steward'
  | 'staker'
  | 'builder';

/**
 * Distribution entry for a single archetype
 */
export interface ArchetypeDistribution {
  archetype: MemberArchetype;
  percentage: number;                // Must sum to 100%
  tokenAllocationPercent?: number;   // Optional: share of total supply
}

/**
 * Configuration for member distribution
 */
export interface MemberDistributionConfig {
  totalMembers: number;
  distribution: ArchetypeDistribution[];
}

// =============================================================================
// TREASURY CONFIGURATION
// =============================================================================

/**
 * Asset allocation in treasury
 */
export interface TreasuryAsset {
  symbol: string;
  percentage: number;
}

/**
 * Configuration for treasury
 */
export interface TreasuryConfig {
  initialBalance: number;
  tokenSymbol: string;
  diversified: boolean;
  assets?: TreasuryAsset[];
}

// =============================================================================
// SIMULATION PARAMETERS
// =============================================================================

/**
 * Configuration for simulation settings
 */
export interface SimulationParamsConfig {
  stepsPerDay: number;                   // Usually 24
  proposalFrequency: number;             // Proposals per day
  votingActivity: number;                // 0-1 participation rate
  externalShockProbability: number;      // Market events probability
}

// =============================================================================
// TEMPLATE METADATA
// =============================================================================

/**
 * Complexity levels for templates
 */
export type TemplateComplexity = 'beginner' | 'intermediate' | 'advanced';

/**
 * Metadata for a DAO template
 */
export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  complexity: TemplateComplexity;
  features: string[];
  icon: string;
  realWorldDAO?: string;             // Name of the real DAO this is based on
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validation error for configuration
 */
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Result of validating a configuration
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

/**
 * Default governance features (all disabled)
 */
export const DEFAULT_GOVERNANCE_FEATURES: GovernanceFeatures = {
  bicameral: false,
  dualGovernance: false,
  timelockEnabled: false,
  approvalVoting: false,
  convictionVoting: false,
  easyTrack: false,
  proposalGates: false,
  ragequit: false,
  tokenLocking: false,
  governanceCycles: false,
  retroPGF: false,
  securityCouncil: false,
  citizenHouse: false,
};

/**
 * Default voting system configuration
 */
export const DEFAULT_VOTING_SYSTEM: VotingSystemConfig = {
  type: 'simple_majority',
  passingThreshold: 0.5,
  votingPeriodDays: 7,
  votingPowerModel: 'token_weighted',
};

/**
 * Default proposal process configuration
 */
export const DEFAULT_PROPOSAL_PROCESS: ProposalProcessConfig = {
  stages: [
    { name: 'Discussion', type: 'discussion', durationDays: 3 },
    { name: 'Voting', type: 'voting', durationDays: 7, quorumPercent: 4, passThreshold: 0.5 },
  ],
  proposalThreshold: 1000,
  proposalThresholdType: 'absolute',
};

/**
 * Default quorum configuration
 */
export const DEFAULT_QUORUM_CONFIG: QuorumConfig = {
  type: 'fixed_percent',
  baseQuorumPercent: 4,
};

/**
 * Default member distribution
 */
export const DEFAULT_MEMBER_DISTRIBUTION: MemberDistributionConfig = {
  totalMembers: 100,
  distribution: [
    { archetype: 'passive_holder', percentage: 50 },
    { archetype: 'active_voter', percentage: 25 },
    { archetype: 'delegate', percentage: 15 },
    { archetype: 'whale', percentage: 5 },
    { archetype: 'governance_expert', percentage: 5 },
  ],
};

/**
 * Default treasury configuration
 */
export const DEFAULT_TREASURY: TreasuryConfig = {
  initialBalance: 1000000,
  tokenSymbol: 'GOV',
  diversified: false,
};

/**
 * Default simulation parameters
 */
export const DEFAULT_SIMULATION_PARAMS: SimulationParamsConfig = {
  stepsPerDay: 24,
  proposalFrequency: 0.5,
  votingActivity: 0.3,
  externalShockProbability: 0.05,
};

/**
 * Default complete DAO Designer configuration
 */
export const DEFAULT_DAO_DESIGNER_CONFIG: DAODesignerConfig = {
  name: 'My DAO',
  description: 'A decentralized autonomous organization',
  tokenSymbol: 'GOV',
  tokenSupply: 10000000,
  votingSystem: DEFAULT_VOTING_SYSTEM,
  proposalProcess: DEFAULT_PROPOSAL_PROCESS,
  quorumConfig: DEFAULT_QUORUM_CONFIG,
  features: DEFAULT_GOVERNANCE_FEATURES,
  memberDistribution: DEFAULT_MEMBER_DISTRIBUTION,
  treasury: DEFAULT_TREASURY,
  simulationParams: DEFAULT_SIMULATION_PARAMS,
};
