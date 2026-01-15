/**
 * DAO Designer Module
 *
 * Provides configuration types, templates, and builders for designing custom DAOs.
 */

// Types
export type {
  DAODesignerConfig,
  VotingSystemType,
  VotingPowerModel,
  VotingSystemConfig,
  ProposalStageType,
  ProposalStageConfig,
  ProposalProcessConfig,
  QuorumType,
  QuorumConfig,
  GovernanceFeatures,
  HouseType,
  MembershipCriteria,
  HouseConfig,
  BicameralConfig,
  DualGovernanceConfig,
  TimelockConfig,
  ApprovalVotingConfig,
  ConvictionVotingConfig,
  EasyTrackConfig,
  GateType,
  GateConfig,
  ProposalGatesConfig,
  RagequitConfig,
  TokenLockingConfig,
  GovernanceCyclesConfig,
  RetroPGFConfig,
  SecurityCouncilConfig,
  CitizenBadgeType,
  CitizenHouseConfig,
  MemberArchetype,
  ArchetypeDistribution,
  MemberDistributionConfig,
  TreasuryAsset,
  TreasuryConfig,
  SimulationParamsConfig,
  TemplateComplexity,
  TemplateMetadata,
  ValidationError,
  ValidationResult,
} from './types';

// Default values
export {
  DEFAULT_GOVERNANCE_FEATURES,
  DEFAULT_VOTING_SYSTEM,
  DEFAULT_PROPOSAL_PROCESS,
  DEFAULT_QUORUM_CONFIG,
  DEFAULT_MEMBER_DISTRIBUTION,
  DEFAULT_TREASURY,
  DEFAULT_SIMULATION_PARAMS,
  DEFAULT_DAO_DESIGNER_CONFIG,
} from './types';

// Templates
export {
  TEMPLATE_METADATA,
  SIMPLE_DAO_TEMPLATE,
  COMPOUND_TEMPLATE,
  UNISWAP_TEMPLATE,
  AAVE_TEMPLATE,
  OPTIMISM_TEMPLATE,
  ARBITRUM_TEMPLATE,
  MAKERDAO_TEMPLATE,
  LIDO_TEMPLATE,
  GITCOIN_TEMPLATE,
  ENS_TEMPLATE,
  DAO_TEMPLATES,
  getTemplate,
  getTemplateMetadata,
  getTemplateIds,
  getTemplatesByComplexity,
} from './templates';

// Builder
export {
  DAOConfigBuilder,
  builder,
  validateConfig,
  toSimulationConfig,
  getRecommendations,
} from './builder';
