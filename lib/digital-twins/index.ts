/**
 * Digital Twins Module
 *
 * Provides loading and transformation of digital twin DAO configurations
 * for use in the simulation engine.
 *
 * @example
 * ```typescript
 * import { loadTwin, transformToDAOConfig, getAvailableTwins } from '@/lib/digital-twins';
 *
 * // List available twins
 * const twins = await getAvailableTwins();
 * console.log(twins.map(t => t.name)); // ['Uniswap DAO', 'Aave DAO', ...]
 *
 * // Load a specific twin
 * const result = await loadTwin('uniswap');
 * if (result.success) {
 *   const config = transformToDAOConfig(result.data);
 *   // Use config to create a DAOSimulation
 * }
 * ```
 */

// Types
export type {
  // Index types
  DigitalTwinIndex,
  DigitalTwinIndexEntry,
  // Main config types
  DigitalTwinConfig,
  DAOSpec,
  // Governance types
  GovernanceToken,
  GovernanceStack,
  OffchainVotingConfig,
  OnchainVotingConfig,
  ExecutionConfig,
  HousesConfig,
  TokenHouseConfig,
  CitizensHouseConfig,
  DualGovernanceSafeguard,
  FastTrackConfig,
  UpgradeSafetyConfig,
  // Treasury & membership
  TreasuryConfig,
  MembershipConfig,
  MemberTypeConfig,
  // Proposal process
  ProposalProcessConfig,
  ProposalStageConfig,
  ProposalActivityConfig,
  // Security
  SecurityControlsConfig,
  // Simulation parameters
  SimulationParameters,
  GovernanceSimParams,
  DualGovernanceSimParams,
  ExecutionSimParams,
  ProcessSimParams,
  ProposalThresholdParam,
  QuorumParam,
  // Sources
  SourceReference,
  // Transformed config types
  TwinDAOConfig,
  SimProposalStageConfig,
  MemberArchetypeConfig,
  ProposalStageType,
} from './types';

// Constants
export { STEPS_PER_DAY, CATEGORY_COLORS, MEMBER_TYPE_TO_AGENTS } from './types';

// Validation
export {
  validateTwinConfig,
  validateIndex,
  DigitalTwinConfigSchema,
  DigitalTwinIndexSchema,
  DAOSpecSchema,
} from './schemas';

export type { ValidationResult, IndexValidationResult } from './schemas';

// Loader
export {
  DigitalTwinLoader,
  defaultLoader,
  loadTwin,
  loadAllTwins,
  getAvailableTwins,
  transformToDAOConfig,
} from './loader';

export type { LoadResult } from './loader';

// Calibration
export { CalibrationLoader } from './calibration-loader';
export type {
  CalibrationProfile,
  VotingProfile,
  ProposalProfile,
  MarketProfile,
  ForumProfile,
  VoterCluster,
  ProtocolProfile,
  DrawdownEvent,
} from './calibration-loader';
