/**
 * DAO Designer Templates
 *
 * Preset configurations based on real-world DAOs.
 * Each template captures the governance structure of a specific DAO.
 */

import type {
  DAODesignerConfig,
  TemplateMetadata,
  GovernanceFeatures,
} from './types';

import {
  DEFAULT_GOVERNANCE_FEATURES,
  DEFAULT_SIMULATION_PARAMS,
} from './types';

// =============================================================================
// TEMPLATE METADATA
// =============================================================================

export const TEMPLATE_METADATA: Record<string, TemplateMetadata> = {
  simple: {
    id: 'simple',
    name: 'Simple DAO',
    description: 'Basic token-weighted voting with majority threshold. Perfect for starting out.',
    complexity: 'beginner',
    features: ['Token Voting', 'Majority Rule', 'Simple Proposals'],
    icon: '🏛️',
  },
  compound: {
    id: 'compound',
    name: 'Compound-style',
    description: 'Token governance with timelocks and delegation. Classic DeFi governance.',
    complexity: 'intermediate',
    features: ['Token Voting', 'Timelocks', 'Delegation', 'Proposal Threshold'],
    icon: '🟢',
    realWorldDAO: 'Compound',
  },
  uniswap: {
    id: 'uniswap',
    name: 'Uniswap-style',
    description: 'Multi-stage proposals with temperature checks and on-chain voting.',
    complexity: 'intermediate',
    features: ['Multi-Stage', 'Temp Check', 'Timelocks', 'High Threshold'],
    icon: '🦄',
    realWorldDAO: 'Uniswap',
  },
  aave: {
    id: 'aave',
    name: 'Aave-style',
    description: 'Two-phase voting with short and long timelocks for different proposal types.',
    complexity: 'intermediate',
    features: ['Token Voting', 'Variable Timelocks', 'Proposal Types'],
    icon: '👻',
    realWorldDAO: 'Aave',
  },
  optimism: {
    id: 'optimism',
    name: 'Optimism-style',
    description: 'Bicameral governance with Token House and Citizens House, plus RetroPGF.',
    complexity: 'advanced',
    features: ['Bicameral', 'RetroPGF', 'Seasons', 'Citizen Badges', 'Veto'],
    icon: '🔴',
    realWorldDAO: 'Optimism Collective',
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum-style',
    description: 'Security Council with emergency powers and constitutional vs standard proposals.',
    complexity: 'advanced',
    features: ['Security Council', 'Constitutional', 'L2→L1 Bridge', 'Timelocks'],
    icon: '🔵',
    realWorldDAO: 'Arbitrum DAO',
  },
  makerdao: {
    id: 'makerdao',
    name: 'MakerDAO-style',
    description: 'Continuous approval voting for executive spells with GSM timelock.',
    complexity: 'advanced',
    features: ['Approval Voting', 'Executive Spells', 'GSM', 'Delegates'],
    icon: '🔷',
    realWorldDAO: 'MakerDAO',
  },
  lido: {
    id: 'lido',
    name: 'Lido-style',
    description: 'Dual governance with stETH holder veto rights and Easy Track for routine decisions.',
    complexity: 'advanced',
    features: ['Dual Governance', 'Staker Veto', 'Easy Track', 'Ragequit'],
    icon: '🌊',
    realWorldDAO: 'Lido DAO',
  },
  gitcoin: {
    id: 'gitcoin',
    name: 'Gitcoin-style',
    description: 'Steward-based governance with quadratic voting for grants.',
    complexity: 'intermediate',
    features: ['Stewards', 'Grants', 'Quadratic Voting', 'Community'],
    icon: '🌱',
    realWorldDAO: 'Gitcoin',
  },
  ens: {
    id: 'ens',
    name: 'ENS-style',
    description: 'Token voting with working groups and steward oversight.',
    complexity: 'intermediate',
    features: ['Token Voting', 'Working Groups', 'Stewards', 'Timelocks'],
    icon: '📘',
    realWorldDAO: 'ENS DAO',
  },
};

// =============================================================================
// SIMPLE DAO TEMPLATE
// =============================================================================

export const SIMPLE_DAO_TEMPLATE: DAODesignerConfig = {
  name: 'Simple DAO',
  description: 'A straightforward token-based governance system',
  tokenSymbol: 'GOV',
  tokenSupply: 10000000,

  votingSystem: {
    type: 'simple_majority',
    passingThreshold: 0.5,
    votingPeriodDays: 7,
    votingPowerModel: 'token_weighted',
  },

  proposalProcess: {
    stages: [
      { name: 'Discussion', type: 'discussion', durationDays: 3 },
      { name: 'Voting', type: 'voting', durationDays: 7, quorumPercent: 4, passThreshold: 0.5 },
    ],
    proposalThreshold: 1000,
    proposalThresholdType: 'absolute',
  },

  quorumConfig: {
    type: 'fixed_percent',
    baseQuorumPercent: 4,
  },

  features: { ...DEFAULT_GOVERNANCE_FEATURES },

  memberDistribution: {
    totalMembers: 100,
    distribution: [
      { archetype: 'passive_holder', percentage: 50 },
      { archetype: 'active_voter', percentage: 30 },
      { archetype: 'delegate', percentage: 15 },
      { archetype: 'whale', percentage: 5 },
    ],
  },

  treasury: {
    initialBalance: 1000000,
    tokenSymbol: 'GOV',
    diversified: false,
  },

  simulationParams: { ...DEFAULT_SIMULATION_PARAMS },
};

// =============================================================================
// COMPOUND-STYLE TEMPLATE
// =============================================================================

export const COMPOUND_TEMPLATE: DAODesignerConfig = {
  name: 'Compound-style DAO',
  description: 'Classic DeFi governance with delegation and timelocks',
  tokenSymbol: 'COMP',
  tokenSupply: 10000000,

  votingSystem: {
    type: 'simple_majority',
    passingThreshold: 0.5,
    votingPeriodDays: 3,
    votingPowerModel: 'token_weighted',
  },

  proposalProcess: {
    stages: [
      { name: 'Voting', type: 'voting', durationDays: 3, quorumPercent: 4, passThreshold: 0.5 },
      { name: 'Timelock', type: 'timelock', durationDays: 2 },
    ],
    proposalThreshold: 25000,
    proposalThresholdType: 'absolute',
  },

  quorumConfig: {
    type: 'fixed_percent',
    baseQuorumPercent: 4,
    minParticipation: 400000,
  },

  features: {
    ...DEFAULT_GOVERNANCE_FEATURES,
    timelockEnabled: true,
    timelockConfig: {
      standardDelayDays: 2,
    },
    proposalGates: true,
    proposalGatesConfig: {
      gates: [
        {
          gateType: 'token_amount',
          stage: 'on_chain',
          threshold: 25000,
          description: 'Minimum 25,000 COMP to propose',
          enabled: true,
        },
      ],
      totalVotableSupply: 10000000,
    },
  },

  memberDistribution: {
    totalMembers: 150,
    distribution: [
      { archetype: 'passive_holder', percentage: 45 },
      { archetype: 'active_voter', percentage: 25 },
      { archetype: 'delegate', percentage: 20 },
      { archetype: 'whale', percentage: 5 },
      { archetype: 'governance_expert', percentage: 5 },
    ],
  },

  treasury: {
    initialBalance: 5000000,
    tokenSymbol: 'COMP',
    diversified: true,
    assets: [
      { symbol: 'COMP', percentage: 60 },
      { symbol: 'ETH', percentage: 25 },
      { symbol: 'USDC', percentage: 15 },
    ],
  },

  simulationParams: {
    ...DEFAULT_SIMULATION_PARAMS,
    proposalFrequency: 0.3,
    votingActivity: 0.25,
  },
};

// =============================================================================
// UNISWAP-STYLE TEMPLATE
// =============================================================================

export const UNISWAP_TEMPLATE: DAODesignerConfig = {
  name: 'Uniswap-style DAO',
  description: 'Multi-stage governance with temperature checks',
  tokenSymbol: 'UNI',
  tokenSupply: 1000000000,

  votingSystem: {
    type: 'simple_majority',
    passingThreshold: 0.5,
    votingPeriodDays: 7,
    votingPowerModel: 'token_weighted',
  },

  proposalProcess: {
    stages: [
      { name: 'RFC Discussion', type: 'discussion', durationDays: 7 },
      { name: 'Temperature Check', type: 'temp_check', durationDays: 5, quorumPercent: 0.25, passThreshold: 0.5 },
      { name: 'On-Chain Vote', type: 'voting', durationDays: 7, quorumPercent: 4, passThreshold: 0.5 },
      { name: 'Timelock', type: 'timelock', durationDays: 2 },
    ],
    proposalThreshold: 2500000,
    proposalThresholdType: 'absolute',
  },

  quorumConfig: {
    type: 'fixed_percent',
    baseQuorumPercent: 4,
    minParticipation: 40000000,
  },

  features: {
    ...DEFAULT_GOVERNANCE_FEATURES,
    timelockEnabled: true,
    timelockConfig: {
      standardDelayDays: 2,
    },
    proposalGates: true,
    proposalGatesConfig: {
      gates: [
        {
          gateType: 'delegation_percent',
          stage: 'temperature_check',
          threshold: 0.0025,
          description: '0.25% delegation for temp check',
          enabled: true,
        },
        {
          gateType: 'token_amount',
          stage: 'on_chain',
          threshold: 2500000,
          description: '2.5M UNI to submit on-chain',
          enabled: true,
        },
      ],
      totalVotableSupply: 1000000000,
    },
  },

  memberDistribution: {
    totalMembers: 200,
    distribution: [
      { archetype: 'passive_holder', percentage: 50 },
      { archetype: 'active_voter', percentage: 20 },
      { archetype: 'delegate', percentage: 20 },
      { archetype: 'whale', percentage: 5 },
      { archetype: 'governance_expert', percentage: 5 },
    ],
  },

  treasury: {
    initialBalance: 50000000,
    tokenSymbol: 'UNI',
    diversified: true,
    assets: [
      { symbol: 'UNI', percentage: 70 },
      { symbol: 'ETH', percentage: 20 },
      { symbol: 'USDC', percentage: 10 },
    ],
  },

  simulationParams: {
    ...DEFAULT_SIMULATION_PARAMS,
    proposalFrequency: 0.2,
    votingActivity: 0.15,
  },
};

// =============================================================================
// AAVE-STYLE TEMPLATE
// =============================================================================

export const AAVE_TEMPLATE: DAODesignerConfig = {
  name: 'Aave-style DAO',
  description: 'Two-phase voting with variable timelocks',
  tokenSymbol: 'AAVE',
  tokenSupply: 16000000,

  votingSystem: {
    type: 'simple_majority',
    passingThreshold: 0.5,
    votingPeriodDays: 3,
    votingPowerModel: 'token_weighted',
  },

  proposalProcess: {
    stages: [
      { name: 'Voting', type: 'voting', durationDays: 3, quorumPercent: 2, passThreshold: 0.5 },
      { name: 'Timelock', type: 'timelock', durationDays: 1 },
    ],
    proposalThreshold: 80000,
    proposalThresholdType: 'absolute',
  },

  quorumConfig: {
    type: 'per_category',
    baseQuorumPercent: 2,
    constitutionalQuorumPercent: 6.5,
  },

  features: {
    ...DEFAULT_GOVERNANCE_FEATURES,
    timelockEnabled: true,
    timelockConfig: {
      standardDelayDays: 1,
      constitutionalDelayDays: 7,
    },
    proposalGates: true,
    proposalGatesConfig: {
      gates: [
        {
          gateType: 'token_amount',
          stage: 'on_chain',
          threshold: 80000,
          description: '80K AAVE to propose',
          enabled: true,
        },
      ],
      totalVotableSupply: 16000000,
    },
  },

  memberDistribution: {
    totalMembers: 120,
    distribution: [
      { archetype: 'passive_holder', percentage: 45 },
      { archetype: 'active_voter', percentage: 25 },
      { archetype: 'delegate', percentage: 20 },
      { archetype: 'staker', percentage: 5 },
      { archetype: 'governance_expert', percentage: 5 },
    ],
  },

  treasury: {
    initialBalance: 10000000,
    tokenSymbol: 'AAVE',
    diversified: true,
    assets: [
      { symbol: 'AAVE', percentage: 50 },
      { symbol: 'ETH', percentage: 30 },
      { symbol: 'USDC', percentage: 20 },
    ],
  },

  simulationParams: {
    ...DEFAULT_SIMULATION_PARAMS,
    proposalFrequency: 0.4,
    votingActivity: 0.2,
  },
};

// =============================================================================
// OPTIMISM-STYLE TEMPLATE
// =============================================================================

export const OPTIMISM_TEMPLATE: DAODesignerConfig = {
  name: 'Optimism-style DAO',
  description: 'Bicameral governance with Token House and Citizens House',
  tokenSymbol: 'OP',
  tokenSupply: 4294967296,

  votingSystem: {
    type: 'simple_majority',
    passingThreshold: 0.5,
    votingPeriodDays: 7,
    votingPowerModel: 'token_weighted',
  },

  proposalProcess: {
    stages: [
      { name: 'Discussion', type: 'discussion', durationDays: 2 },
      { name: 'Review', type: 'temp_check', durationDays: 3 },
      { name: 'Token House Vote', type: 'voting', durationDays: 7, quorumPercent: 30, passThreshold: 0.5 },
      { name: 'Citizens Veto Window', type: 'veto_window', durationDays: 7 },
      { name: 'Execution', type: 'execution', durationDays: 2 },
    ],
    proposalThreshold: 0,
    proposalThresholdType: 'absolute',
  },

  quorumConfig: {
    type: 'fixed_percent',
    baseQuorumPercent: 30,
  },

  features: {
    ...DEFAULT_GOVERNANCE_FEATURES,
    bicameral: true,
    bicameralConfig: {
      houses: [
        {
          name: 'Token House',
          type: 'token_house',
          membershipCriteria: 'token_holders',
          quorumPercent: 30,
          vetoCapable: false,
        },
        {
          name: 'Citizens House',
          type: 'citizens_house',
          membershipCriteria: 'badge_holders',
          quorumPercent: 30,
          vetoCapable: true,
          vetoPeriodDays: 7,
        },
      ],
      requiredHouses: 'all',
    },
    citizenHouse: true,
    citizenHouseConfig: {
      badgeTypes: ['contributor', 'builder', 'community_leader'],
      vetoEnabled: true,
      vetoPeriodDays: 7,
      quorumPercent: 30,
    },
    governanceCycles: true,
    governanceCyclesConfig: {
      proposalSubmissionDays: 2,
      reviewDays: 3,
      votingDays: 7,
      executionDays: 2,
      reflectionDays: 1,
      cyclesPerSeason: 5,
      breakBetweenSeasonsDays: 7,
    },
    retroPGF: true,
    retroPGFConfig: {
      roundBudget: 10000000,
      roundFrequencyDays: 90,
      nominationPeriodDays: 14,
      votingPeriodDays: 14,
      minBadgeholders: 50,
    },
  },

  memberDistribution: {
    totalMembers: 250,
    distribution: [
      { archetype: 'passive_holder', percentage: 35 },
      { archetype: 'active_voter', percentage: 20 },
      { archetype: 'delegate', percentage: 20 },
      { archetype: 'citizen', percentage: 15 },
      { archetype: 'builder', percentage: 10 },
    ],
  },

  treasury: {
    initialBalance: 100000000,
    tokenSymbol: 'OP',
    diversified: true,
    assets: [
      { symbol: 'OP', percentage: 80 },
      { symbol: 'ETH', percentage: 15 },
      { symbol: 'USDC', percentage: 5 },
    ],
  },

  simulationParams: {
    ...DEFAULT_SIMULATION_PARAMS,
    proposalFrequency: 0.5,
    votingActivity: 0.35,
  },
};

// =============================================================================
// ARBITRUM-STYLE TEMPLATE
// =============================================================================

export const ARBITRUM_TEMPLATE: DAODesignerConfig = {
  name: 'Arbitrum-style DAO',
  description: 'L2 governance with Security Council and constitutional proposals',
  tokenSymbol: 'ARB',
  tokenSupply: 10000000000,

  votingSystem: {
    type: 'simple_majority',
    passingThreshold: 0.5,
    votingPeriodDays: 14,
    votingPowerModel: 'token_weighted',
  },

  proposalProcess: {
    stages: [
      { name: 'Temperature Check', type: 'temp_check', durationDays: 7 },
      { name: 'On-Chain Vote', type: 'voting', durationDays: 14, quorumPercent: 3, passThreshold: 0.5 },
      { name: 'L2 Timelock', type: 'timelock', durationDays: 3 },
      { name: 'L2→L1 Bridge', type: 'timelock', durationDays: 7 },
      { name: 'L1 Timelock', type: 'timelock', durationDays: 3 },
    ],
    proposalThreshold: 1000000,
    proposalThresholdType: 'absolute',
  },

  quorumConfig: {
    type: 'per_category',
    baseQuorumPercent: 3,
    constitutionalQuorumPercent: 5,
  },

  features: {
    ...DEFAULT_GOVERNANCE_FEATURES,
    timelockEnabled: true,
    timelockConfig: {
      standardDelayDays: 3,
      constitutionalDelayDays: 3,
      emergencyDelayDays: 1,
      bridgeDelayDays: 7,
    },
    securityCouncil: true,
    securityCouncilConfig: {
      memberCount: 12,
      termLengthDays: 180,
      rotationEnabled: true,
      emergencyPowers: ['pause', 'upgrade'],
      multisigThreshold: 9,
    },
    proposalGates: true,
    proposalGatesConfig: {
      gates: [
        {
          gateType: 'delegation_percent',
          stage: 'temperature_check',
          threshold: 0.01,
          description: '0.01% delegation for temp check',
          enabled: true,
        },
        {
          gateType: 'token_amount',
          stage: 'on_chain',
          threshold: 1000000,
          description: '1M ARB to submit on-chain',
          enabled: true,
        },
      ],
      totalVotableSupply: 10000000000,
    },
  },

  memberDistribution: {
    totalMembers: 300,
    distribution: [
      { archetype: 'passive_holder', percentage: 40 },
      { archetype: 'active_voter', percentage: 20 },
      { archetype: 'delegate', percentage: 25 },
      { archetype: 'security_council', percentage: 5 },
      { archetype: 'governance_expert', percentage: 10 },
    ],
  },

  treasury: {
    initialBalance: 200000000,
    tokenSymbol: 'ARB',
    diversified: true,
    assets: [
      { symbol: 'ARB', percentage: 75 },
      { symbol: 'ETH', percentage: 20 },
      { symbol: 'USDC', percentage: 5 },
    ],
  },

  simulationParams: {
    ...DEFAULT_SIMULATION_PARAMS,
    proposalFrequency: 0.3,
    votingActivity: 0.2,
  },
};

// =============================================================================
// MAKERDAO-STYLE TEMPLATE
// =============================================================================

export const MAKERDAO_TEMPLATE: DAODesignerConfig = {
  name: 'MakerDAO-style DAO',
  description: 'Continuous approval voting for executive spells',
  tokenSymbol: 'MKR',
  tokenSupply: 1000000,

  votingSystem: {
    type: 'approval',
    passingThreshold: 0,
    votingPeriodDays: 0, // Continuous
    votingPowerModel: 'token_weighted',
  },

  proposalProcess: {
    stages: [
      { name: 'Forum Discussion', type: 'discussion', durationDays: 7 },
      { name: 'Signal Request', type: 'temp_check', durationDays: 7 },
      { name: 'Executive Spell', type: 'voting', durationDays: 30, quorumPercent: 0, passThreshold: 0 },
      { name: 'GSM Delay', type: 'timelock', durationDays: 2 },
    ],
    proposalThreshold: 0,
    proposalThresholdType: 'absolute',
  },

  quorumConfig: {
    type: 'fixed_percent',
    baseQuorumPercent: 0, // No quorum for approval voting
  },

  features: {
    ...DEFAULT_GOVERNANCE_FEATURES,
    approvalVoting: true,
    approvalVotingConfig: {
      spellLifetimeDays: 30,
      minSupportToExecute: 0,
      allowMultipleSupport: false,
      executionDelayDays: 0,
    },
    timelockEnabled: true,
    timelockConfig: {
      standardDelayDays: 2,
      emergencyDelayDays: 0,
    },
    tokenLocking: true,
    tokenLockingConfig: {
      minLockDays: 0,
      maxLockDays: 365,
      multiplierPerDay: 0,
      earlyUnlockPenaltyPercent: 0,
    },
  },

  memberDistribution: {
    totalMembers: 100,
    distribution: [
      { archetype: 'passive_holder', percentage: 30 },
      { archetype: 'active_voter', percentage: 25 },
      { archetype: 'delegate', percentage: 30 },
      { archetype: 'whale', percentage: 10 },
      { archetype: 'governance_expert', percentage: 5 },
    ],
  },

  treasury: {
    initialBalance: 50000000,
    tokenSymbol: 'DAI',
    diversified: true,
    assets: [
      { symbol: 'DAI', percentage: 60 },
      { symbol: 'MKR', percentage: 20 },
      { symbol: 'ETH', percentage: 20 },
    ],
  },

  simulationParams: {
    ...DEFAULT_SIMULATION_PARAMS,
    proposalFrequency: 0.5,
    votingActivity: 0.4,
  },
};

// =============================================================================
// LIDO-STYLE TEMPLATE
// =============================================================================

export const LIDO_TEMPLATE: DAODesignerConfig = {
  name: 'Lido-style DAO',
  description: 'Dual governance with staker veto and Easy Track',
  tokenSymbol: 'LDO',
  tokenSupply: 1000000000,

  votingSystem: {
    type: 'simple_majority',
    passingThreshold: 0.5,
    votingPeriodDays: 7,
    votingPowerModel: 'token_weighted',
  },

  proposalProcess: {
    stages: [
      { name: 'Discussion', type: 'discussion', durationDays: 7 },
      { name: 'Snapshot Vote', type: 'temp_check', durationDays: 7, quorumPercent: 5, passThreshold: 0.5 },
      { name: 'On-Chain Vote', type: 'voting', durationDays: 7, quorumPercent: 5, passThreshold: 0.5 },
      { name: 'Veto Window', type: 'veto_window', durationDays: 5 },
      { name: 'Timelock', type: 'timelock', durationDays: 2 },
    ],
    proposalThreshold: 0,
    proposalThresholdType: 'absolute',
  },

  quorumConfig: {
    type: 'fixed_percent',
    baseQuorumPercent: 5,
  },

  features: {
    ...DEFAULT_GOVERNANCE_FEATURES,
    dualGovernance: true,
    dualGovernanceConfig: {
      vetoThresholdPercent: 1,
      minTimelockDays: 5,
      maxTimelockDays: 45,
      ragequitEnabled: true,
      escrowPeriodDays: 5,
    },
    easyTrack: true,
    easyTrackConfig: {
      objectionThresholdPercent: 0.5,
      votingPeriodDays: 3,
      allowedMotionTypes: ['node_operator_reward', 'referral_reward', 'grant_payment'],
    },
    ragequit: true,
    ragequitConfig: {
      minLockPeriodDays: 5,
      penaltyPercent: 0,
      cooldownPeriodDays: 30,
    },
    timelockEnabled: true,
    timelockConfig: {
      standardDelayDays: 5,
    },
  },

  memberDistribution: {
    totalMembers: 200,
    distribution: [
      { archetype: 'passive_holder', percentage: 30 },
      { archetype: 'active_voter', percentage: 20 },
      { archetype: 'staker', percentage: 30 },
      { archetype: 'delegate', percentage: 15 },
      { archetype: 'governance_expert', percentage: 5 },
    ],
  },

  treasury: {
    initialBalance: 100000000,
    tokenSymbol: 'LDO',
    diversified: true,
    assets: [
      { symbol: 'LDO', percentage: 50 },
      { symbol: 'stETH', percentage: 30 },
      { symbol: 'ETH', percentage: 15 },
      { symbol: 'DAI', percentage: 5 },
    ],
  },

  simulationParams: {
    ...DEFAULT_SIMULATION_PARAMS,
    proposalFrequency: 0.4,
    votingActivity: 0.3,
  },
};

// =============================================================================
// GITCOIN-STYLE TEMPLATE
// =============================================================================

export const GITCOIN_TEMPLATE: DAODesignerConfig = {
  name: 'Gitcoin-style DAO',
  description: 'Steward-based governance with grants focus',
  tokenSymbol: 'GTC',
  tokenSupply: 100000000,

  votingSystem: {
    type: 'simple_majority',
    passingThreshold: 0.5,
    votingPeriodDays: 5,
    votingPowerModel: 'token_weighted',
  },

  proposalProcess: {
    stages: [
      { name: 'Discussion', type: 'discussion', durationDays: 5 },
      { name: 'Steward Review', type: 'temp_check', durationDays: 3 },
      { name: 'Snapshot Vote', type: 'voting', durationDays: 5, quorumPercent: 2.5, passThreshold: 0.5 },
      { name: 'Timelock', type: 'timelock', durationDays: 2 },
    ],
    proposalThreshold: 1000000,
    proposalThresholdType: 'absolute',
  },

  quorumConfig: {
    type: 'fixed_percent',
    baseQuorumPercent: 2.5,
    minParticipation: 2500000,
  },

  features: {
    ...DEFAULT_GOVERNANCE_FEATURES,
    timelockEnabled: true,
    timelockConfig: {
      standardDelayDays: 2,
    },
    proposalGates: true,
    proposalGatesConfig: {
      gates: [
        {
          gateType: 'token_amount',
          stage: 'on_chain',
          threshold: 1000000,
          description: '1M GTC to propose',
          enabled: true,
        },
      ],
      totalVotableSupply: 100000000,
    },
  },

  memberDistribution: {
    totalMembers: 150,
    distribution: [
      { archetype: 'passive_holder', percentage: 35 },
      { archetype: 'active_voter', percentage: 25 },
      { archetype: 'steward', percentage: 20 },
      { archetype: 'delegate', percentage: 15 },
      { archetype: 'builder', percentage: 5 },
    ],
  },

  treasury: {
    initialBalance: 30000000,
    tokenSymbol: 'GTC',
    diversified: true,
    assets: [
      { symbol: 'GTC', percentage: 60 },
      { symbol: 'ETH', percentage: 25 },
      { symbol: 'USDC', percentage: 15 },
    ],
  },

  simulationParams: {
    ...DEFAULT_SIMULATION_PARAMS,
    proposalFrequency: 0.6,
    votingActivity: 0.35,
  },
};

// =============================================================================
// ENS-STYLE TEMPLATE
// =============================================================================

export const ENS_TEMPLATE: DAODesignerConfig = {
  name: 'ENS-style DAO',
  description: 'Token governance with working groups',
  tokenSymbol: 'ENS',
  tokenSupply: 100000000,

  votingSystem: {
    type: 'simple_majority',
    passingThreshold: 0.5,
    votingPeriodDays: 7,
    votingPowerModel: 'token_weighted',
  },

  proposalProcess: {
    stages: [
      { name: 'RFC Discussion', type: 'discussion', durationDays: 7 },
      { name: 'Temperature Check', type: 'temp_check', durationDays: 5, quorumPercent: 1 },
      { name: 'On-Chain Vote', type: 'voting', durationDays: 7, quorumPercent: 1, passThreshold: 0.5 },
      { name: 'Timelock', type: 'timelock', durationDays: 2 },
    ],
    proposalThreshold: 100000,
    proposalThresholdType: 'absolute',
  },

  quorumConfig: {
    type: 'fixed_percent',
    baseQuorumPercent: 1,
    minParticipation: 1000000,
  },

  features: {
    ...DEFAULT_GOVERNANCE_FEATURES,
    timelockEnabled: true,
    timelockConfig: {
      standardDelayDays: 2,
    },
    proposalGates: true,
    proposalGatesConfig: {
      gates: [
        {
          gateType: 'token_amount',
          stage: 'on_chain',
          threshold: 100000,
          description: '100K ENS to propose',
          enabled: true,
        },
      ],
      totalVotableSupply: 100000000,
    },
  },

  memberDistribution: {
    totalMembers: 180,
    distribution: [
      { archetype: 'passive_holder', percentage: 40 },
      { archetype: 'active_voter', percentage: 25 },
      { archetype: 'delegate', percentage: 20 },
      { archetype: 'steward', percentage: 10 },
      { archetype: 'builder', percentage: 5 },
    ],
  },

  treasury: {
    initialBalance: 40000000,
    tokenSymbol: 'ENS',
    diversified: true,
    assets: [
      { symbol: 'ENS', percentage: 55 },
      { symbol: 'ETH', percentage: 35 },
      { symbol: 'USDC', percentage: 10 },
    ],
  },

  simulationParams: {
    ...DEFAULT_SIMULATION_PARAMS,
    proposalFrequency: 0.4,
    votingActivity: 0.25,
  },
};

// =============================================================================
// TEMPLATES MAP
// =============================================================================

/**
 * All available DAO templates
 */
export const DAO_TEMPLATES: Record<string, DAODesignerConfig> = {
  simple: SIMPLE_DAO_TEMPLATE,
  compound: COMPOUND_TEMPLATE,
  uniswap: UNISWAP_TEMPLATE,
  aave: AAVE_TEMPLATE,
  optimism: OPTIMISM_TEMPLATE,
  arbitrum: ARBITRUM_TEMPLATE,
  makerdao: MAKERDAO_TEMPLATE,
  lido: LIDO_TEMPLATE,
  gitcoin: GITCOIN_TEMPLATE,
  ens: ENS_TEMPLATE,
};

/**
 * Get a template by ID
 */
export function getTemplate(id: string): DAODesignerConfig | undefined {
  return DAO_TEMPLATES[id];
}

/**
 * Get template metadata by ID
 */
export function getTemplateMetadata(id: string): TemplateMetadata | undefined {
  return TEMPLATE_METADATA[id];
}

/**
 * Get all template IDs
 */
export function getTemplateIds(): string[] {
  return Object.keys(DAO_TEMPLATES);
}

/**
 * Get templates filtered by complexity
 */
export function getTemplatesByComplexity(
  complexity: 'beginner' | 'intermediate' | 'advanced'
): { id: string; metadata: TemplateMetadata; config: DAODesignerConfig }[] {
  return Object.entries(TEMPLATE_METADATA)
    .filter(([_, meta]) => meta.complexity === complexity)
    .map(([id, metadata]) => ({
      id,
      metadata,
      config: DAO_TEMPLATES[id],
    }));
}
