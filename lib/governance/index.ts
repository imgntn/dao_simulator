/**
 * Governance Systems Index
 *
 * Exports all governance-related systems for digital twin DAOs
 */

// Easy Track (Lido)
export {
  EasyTrackController,
  createLidoEasyTrack,
  type EasyTrackMotion,
  type EasyTrackMotionType,
  type MotionStatus,
  type EasyTrackConfig,
} from './easy-track';

// RetroPGF (Optimism)
export {
  RetroPGFController,
  createOptimismRetroPGF,
  type RetroPGFRound,
  type RetroPGFProject,
  type RetroPGFRoundStatus,
  type ProjectCategory,
  type CitizenAllocation,
  type RetroPGFConfig,
} from './retropgf';

// Token Locking (MakerDAO)
export {
  TokenLockingController,
  createMakerTokenLocking,
  type LockedPosition,
  type VotingProxy,
  type TokenLockingConfig,
} from './token-locking';

// Approval Voting (MakerDAO)
export {
  ApprovalVotingController,
  createMakerApprovalVoting,
  type ExecutiveSpell,
  type SpellStatus,
  type ApprovalVotingConfig,
} from './approval-voting';

// Rage Quit (Lido)
export {
  RageQuitController,
  createLidoRageQuit,
  type RageQuitState,
  type RageQuitSignal,
  type RageQuitEscrow,
  type RageQuitConfig,
} from './rage-quit';

// Bridge Timelock (Arbitrum)
export {
  BridgeTimelockController,
  createArbitrumBridgeTimelock,
  type BridgeTimelockEntry,
  type BridgeTimelockStage,
  type BridgeTimelockConfig,
} from './bridge-timelock';

// Governance Cycles (Optimism)
export {
  GovernanceCycleController,
  createOptimismGovernanceCycles,
  type GovernanceCycle,
  type GovernanceSeason,
  type CyclePhase,
  type SeasonStatus,
  type GovernanceCycleConfig,
} from './governance-cycle';

// Proposal Gates
export {
  ProposalGatesController,
  createArbitrumProposalGates,
  createUniswapProposalGates,
  createCompoundProposalGates,
  createAaveProposalGates,
  type ProposalGate,
  type GateType,
  type ProposalStageGate,
  type GateCheckResult,
  type ProposalGatesConfig,
} from './proposal-gates';

// Citizenship (Optimism)
export {
  CitizenshipController,
  createOptimismCitizenship,
  type CitizenshipBadge,
  type CitizenshipStatus,
  type CitizenshipType,
  type CitizenshipConfig,
} from './citizenship';

// stETH Supply Tracking (Lido)
export {
  StETHSupplyTracker,
  createLidoStETHTracker,
  type StakerPosition,
  type SupplySnapshot,
} from './steth-supply';

// Proposal State Machine (existing)
export {
  ProposalStateMachine,
  type StateMachineConfig,
} from './proposal-state-machine';

// Governance Processor (integration)
export {
  GovernanceProcessor,
  createGovernanceProcessor,
  type GovernanceSystemsConfig,
  type GovernanceSystems,
} from './governance-processor';

// Vote Escrow (Curve/Balancer-style veTokens)
export {
  VoteEscrowController,
  createCurveVoteEscrow,
  createBalancerVoteEscrow,
  type VeTokenPosition,
  type VoteEscrowConfig,
  type VeTokenStats,
} from './vote-escrow';
