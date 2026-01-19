/**
 * DAO Designer Builder
 *
 * Transforms DAODesignerConfig into DAOSimulationConfig and validates configurations.
 */

import type {
  DAODesignerConfig,
  ValidationResult,
  ValidationError,
  MemberArchetype,
  VotingSystemType,
  GovernanceFeatures,
  ProposalStageConfig,
} from './types';

import type { DAOSimulationConfig } from '../engine/simulation';
import type { SimulationSettings } from '../config/settings';
import type { GovernanceRuleConfig } from '../utils/governance-plugins';

// =============================================================================
// ARCHETYPE TO AGENT MAPPING
// =============================================================================

/**
 * Maps designer archetypes to simulation agent types and their relative counts
 */
const ARCHETYPE_AGENT_MAP: Record<MemberArchetype, { agents: string[]; weights: number[] }> = {
  passive_holder: {
    agents: ['passive_members'],
    weights: [1],
  },
  active_voter: {
    agents: ['proposal_creators', 'delegators'],
    weights: [0.4, 0.6],
  },
  delegate: {
    agents: ['delegators', 'liquid_delegators', 'governance_experts'],
    weights: [0.4, 0.3, 0.3],
  },
  whale: {
    agents: ['investors', 'adaptive_investors'],
    weights: [0.6, 0.4],
  },
  governance_expert: {
    agents: ['governance_experts', 'proposal_creators'],
    weights: [0.7, 0.3],
  },
  security_council: {
    agents: ['validators', 'risk_managers', 'auditors'],
    weights: [0.4, 0.3, 0.3],
  },
  citizen: {
    agents: ['proposal_creators', 'delegators', 'passive_members'],
    weights: [0.3, 0.3, 0.4],
  },
  steward: {
    agents: ['governance_experts', 'proposal_creators', 'auditors'],
    weights: [0.4, 0.4, 0.2],
  },
  staker: {
    agents: ['validators', 'investors'],
    weights: [0.6, 0.4],
  },
  builder: {
    agents: ['developers', 'service_providers'],
    weights: [0.7, 0.3],
  },
};

/**
 * Maps agent type names to SimulationSettings keys
 */
const AGENT_KEY_MAP: Record<string, keyof SimulationSettings> = {
  developers: 'num_developers',
  investors: 'num_investors',
  traders: 'num_traders',
  adaptive_investors: 'num_adaptive_investors',
  delegators: 'num_delegators',
  liquid_delegators: 'num_liquid_delegators',
  proposal_creators: 'num_proposal_creators',
  validators: 'num_validators',
  service_providers: 'num_service_providers',
  arbitrators: 'num_arbitrators',
  regulators: 'num_regulators',
  auditors: 'num_auditors',
  bounty_hunters: 'num_bounty_hunters',
  external_partners: 'num_external_partners',
  passive_members: 'num_passive_members',
  artists: 'num_artists',
  collectors: 'num_collectors',
  speculators: 'num_speculators',
  rl_traders: 'num_rl_traders',
  governance_experts: 'num_governance_experts',
  risk_managers: 'num_risk_managers',
  market_makers: 'num_market_makers',
  whistleblowers: 'num_whistleblowers',
};

// =============================================================================
// VOTING SYSTEM TO GOVERNANCE RULE MAPPING
// =============================================================================

const VOTING_SYSTEM_RULE_MAP: Record<VotingSystemType, string> = {
  simple_majority: 'majority',
  supermajority: 'supermajority',
  quadratic: 'quadratic',
  conviction: 'conviction',
  approval: 'majority', // Approval voting uses different mechanism
  ranked_choice: 'ranked_choice',
};

// =============================================================================
// DAO CONFIG BUILDER
// =============================================================================

export class DAOConfigBuilder {
  /**
   * Convert DAODesignerConfig to DAOSimulationConfig
   */
  toSimulationConfig(designer: DAODesignerConfig): DAOSimulationConfig {
    // Start with base configuration
    const config: DAOSimulationConfig = {
      // Governance rule based on voting system
      governance_rule: this.mapVotingSystemToRule(designer.votingSystem.type),

      // Governance rule configuration (quorum, thresholds, etc.)
      // Convert quorum from percentage (0-100) to fraction (0-1)
      governance_config: {
        quorumPercentage: designer.quorumConfig.baseQuorumPercent / 100,
        threshold: designer.votingSystem.passingThreshold,
      },

      // Basic simulation parameters
      enable_marketing: false,
      marketing_level: 'low',
      enable_player: false,

      // Convert steps per day to various rates
      token_emission_rate: designer.simulationParams.stepsPerDay > 0 ? 0.01 : 0,
      token_burn_rate: 0,

      // Economic parameters
      staking_interest_rate: designer.features.tokenLocking ? 0.01 : 0,
      slash_fraction: 0,
      reputation_decay_rate: 0.01,
      market_shock_frequency: designer.simulationParams.externalShockProbability,

      // Learning parameters
      adaptive_learning_rate: 0.1,
      adaptive_epsilon: 0.1,

      // Behavior probabilities
      violation_probability: 0.05,
      reputation_penalty: 5,
      comment_probability: 0.3,  // Fixed comment probability
      voting_activity: designer.simulationParams.votingActivity,  // Voting participation rate
      external_partner_interact_probability: 0.1,

      // Event logging
      eventLogging: true,
      useIndexedDB: true,
    };

    // Calculate agent counts from member distribution
    const agentCounts = this.calculateAgentCounts(designer);
    Object.assign(config, agentCounts);

    return config;
  }

  /**
   * Map voting system type to governance rule name
   */
  private mapVotingSystemToRule(votingType: VotingSystemType): string {
    return VOTING_SYSTEM_RULE_MAP[votingType] || 'majority';
  }

  /**
   * Calculate agent counts from member distribution
   */
  private calculateAgentCounts(designer: DAODesignerConfig): Partial<SimulationSettings> {
    const totalMembers = designer.memberDistribution.totalMembers;
    const distribution = designer.memberDistribution.distribution;

    // Initialize all agent counts to 0
    const counts: Record<string, number> = {};
    for (const agentType of Object.keys(AGENT_KEY_MAP)) {
      counts[agentType] = 0;
    }

    // Distribute members across agent types based on archetypes
    for (const entry of distribution) {
      const archetypeMembers = Math.round(totalMembers * (entry.percentage / 100));
      const mapping = ARCHETYPE_AGENT_MAP[entry.archetype];

      if (mapping) {
        for (let i = 0; i < mapping.agents.length; i++) {
          const agentType = mapping.agents[i];
          const weight = mapping.weights[i];
          counts[agentType] = (counts[agentType] || 0) + Math.round(archetypeMembers * weight);
        }
      }
    }

    // Ensure at least 1 of critical agent types
    if (counts.proposal_creators < 1) counts.proposal_creators = 1;
    if (counts.delegators < 1) counts.delegators = 1;

    // Add some diversity agents for richer simulation
    counts.traders = Math.max(1, Math.round(totalMembers * 0.02));
    counts.speculators = Math.max(1, Math.round(totalMembers * 0.02));
    counts.whistleblowers = Math.max(1, Math.round(totalMembers * 0.01));

    // Convert to SimulationSettings keys
    const result: Partial<SimulationSettings> = {};
    for (const [agentType, count] of Object.entries(counts)) {
      const key = AGENT_KEY_MAP[agentType];
      if (key) {
        (result as any)[key] = count;
      }
    }

    return result;
  }

  /**
   * Validate a DAODesignerConfig
   */
  validate(config: DAODesignerConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Basic info validation
    if (!config.name || config.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'DAO name is required',
        severity: 'error',
      });
    }

    if (!config.tokenSymbol || config.tokenSymbol.length < 2 || config.tokenSymbol.length > 6) {
      errors.push({
        field: 'tokenSymbol',
        message: 'Token symbol must be 2-6 characters',
        severity: 'error',
      });
    }

    if (config.tokenSupply <= 0) {
      errors.push({
        field: 'tokenSupply',
        message: 'Token supply must be positive',
        severity: 'error',
      });
    }

    // Voting system validation
    if (config.votingSystem.passingThreshold < 0 || config.votingSystem.passingThreshold > 1) {
      errors.push({
        field: 'votingSystem.passingThreshold',
        message: 'Passing threshold must be between 0 and 1',
        severity: 'error',
      });
    }

    if (config.votingSystem.votingPeriodDays < 0) {
      errors.push({
        field: 'votingSystem.votingPeriodDays',
        message: 'Voting period cannot be negative',
        severity: 'error',
      });
    }

    // Proposal process validation
    if (config.proposalProcess.stages.length === 0) {
      errors.push({
        field: 'proposalProcess.stages',
        message: 'At least one proposal stage is required',
        severity: 'error',
      });
    }

    // Validate each stage
    for (let i = 0; i < config.proposalProcess.stages.length; i++) {
      const stage = config.proposalProcess.stages[i];
      if (stage.durationDays < 0) {
        errors.push({
          field: `proposalProcess.stages[${i}].durationDays`,
          message: `Stage "${stage.name}" duration cannot be negative`,
          severity: 'error',
        });
      }
    }

    // Quorum validation
    if (config.quorumConfig.baseQuorumPercent < 0 || config.quorumConfig.baseQuorumPercent > 100) {
      errors.push({
        field: 'quorumConfig.baseQuorumPercent',
        message: 'Quorum percentage must be between 0 and 100',
        severity: 'error',
      });
    }

    // Member distribution validation
    const totalPercentage = config.memberDistribution.distribution.reduce(
      (sum, entry) => sum + entry.percentage,
      0
    );
    if (Math.abs(totalPercentage - 100) > 0.01) {
      errors.push({
        field: 'memberDistribution.distribution',
        message: `Member distribution must sum to 100% (currently ${totalPercentage.toFixed(1)}%)`,
        severity: 'error',
      });
    }

    if (config.memberDistribution.totalMembers < 1) {
      errors.push({
        field: 'memberDistribution.totalMembers',
        message: 'Must have at least 1 member',
        severity: 'error',
      });
    }

    // Treasury validation
    if (config.treasury.initialBalance < 0) {
      errors.push({
        field: 'treasury.initialBalance',
        message: 'Treasury balance cannot be negative',
        severity: 'error',
      });
    }

    if (config.treasury.diversified && config.treasury.assets) {
      const assetTotal = config.treasury.assets.reduce((sum, a) => sum + a.percentage, 0);
      if (Math.abs(assetTotal - 100) > 0.01) {
        errors.push({
          field: 'treasury.assets',
          message: `Treasury assets must sum to 100% (currently ${assetTotal.toFixed(1)}%)`,
          severity: 'error',
        });
      }
    }

    // Simulation params validation
    if (config.simulationParams.stepsPerDay < 1) {
      errors.push({
        field: 'simulationParams.stepsPerDay',
        message: 'Steps per day must be at least 1',
        severity: 'error',
      });
    }

    if (
      config.simulationParams.votingActivity < 0 ||
      config.simulationParams.votingActivity > 1
    ) {
      errors.push({
        field: 'simulationParams.votingActivity',
        message: 'Voting activity must be between 0 and 1',
        severity: 'error',
      });
    }

    // Feature-specific validation
    this.validateFeatures(config.features, errors, warnings);

    // Warnings for potentially problematic configs
    if (config.memberDistribution.totalMembers < 10) {
      warnings.push({
        field: 'memberDistribution.totalMembers',
        message: 'Very small DAOs may not produce interesting simulation dynamics',
        severity: 'warning',
      });
    }

    if (config.quorumConfig.baseQuorumPercent > 50) {
      warnings.push({
        field: 'quorumConfig.baseQuorumPercent',
        message: 'High quorum requirements may cause many proposals to fail',
        severity: 'warning',
      });
    }

    if (config.votingSystem.passingThreshold > 0.8) {
      warnings.push({
        field: 'votingSystem.passingThreshold',
        message: 'Very high passing threshold may make it difficult to pass proposals',
        severity: 'warning',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate governance features
   */
  private validateFeatures(
    features: GovernanceFeatures,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    // Bicameral validation
    if (features.bicameral && features.bicameralConfig) {
      if (features.bicameralConfig.houses.length < 2) {
        errors.push({
          field: 'features.bicameralConfig.houses',
          message: 'Bicameral governance requires at least 2 houses',
          severity: 'error',
        });
      }
    }

    // Dual governance validation
    if (features.dualGovernance && features.dualGovernanceConfig) {
      const dg = features.dualGovernanceConfig;
      if (dg.vetoThresholdPercent < 0 || dg.vetoThresholdPercent > 100) {
        errors.push({
          field: 'features.dualGovernanceConfig.vetoThresholdPercent',
          message: 'Veto threshold must be between 0 and 100',
          severity: 'error',
        });
      }
      if (dg.maxTimelockDays < dg.minTimelockDays) {
        errors.push({
          field: 'features.dualGovernanceConfig.maxTimelockDays',
          message: 'Max timelock cannot be less than min timelock',
          severity: 'error',
        });
      }
    }

    // Timelock validation
    if (features.timelockEnabled && features.timelockConfig) {
      if (features.timelockConfig.standardDelayDays < 0) {
        errors.push({
          field: 'features.timelockConfig.standardDelayDays',
          message: 'Timelock delay cannot be negative',
          severity: 'error',
        });
      }
    }

    // Security council validation
    if (features.securityCouncil && features.securityCouncilConfig) {
      const sc = features.securityCouncilConfig;
      if (sc.multisigThreshold > sc.memberCount) {
        errors.push({
          field: 'features.securityCouncilConfig.multisigThreshold',
          message: 'Multisig threshold cannot exceed member count',
          severity: 'error',
        });
      }
    }

    // Conflicting features warning
    if (features.approvalVoting && features.convictionVoting) {
      warnings.push({
        field: 'features',
        message: 'Both approval voting and conviction voting are enabled - this may cause conflicts',
        severity: 'warning',
      });
    }
  }

  /**
   * Get recommended settings based on DAO size and complexity
   */
  getRecommendations(
    memberCount: number,
    complexity: 'beginner' | 'intermediate' | 'advanced'
  ): Partial<DAODesignerConfig> {
    const recommendations: Partial<DAODesignerConfig> = {};

    // Voting period recommendations
    if (memberCount < 50) {
      recommendations.votingSystem = {
        type: 'simple_majority',
        passingThreshold: 0.5,
        votingPeriodDays: 3,
        votingPowerModel: 'token_weighted',
      };
    } else if (memberCount < 200) {
      recommendations.votingSystem = {
        type: 'simple_majority',
        passingThreshold: 0.5,
        votingPeriodDays: 5,
        votingPowerModel: 'token_weighted',
      };
    } else {
      recommendations.votingSystem = {
        type: 'simple_majority',
        passingThreshold: 0.5,
        votingPeriodDays: 7,
        votingPowerModel: 'token_weighted',
      };
    }

    // Quorum recommendations (lower for larger DAOs)
    if (memberCount < 50) {
      recommendations.quorumConfig = {
        type: 'fixed_percent',
        baseQuorumPercent: 20,
      };
    } else if (memberCount < 200) {
      recommendations.quorumConfig = {
        type: 'fixed_percent',
        baseQuorumPercent: 10,
      };
    } else {
      recommendations.quorumConfig = {
        type: 'fixed_percent',
        baseQuorumPercent: 4,
      };
    }

    // Feature recommendations based on complexity
    if (complexity === 'beginner') {
      recommendations.features = {
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
    } else if (complexity === 'intermediate') {
      recommendations.features = {
        bicameral: false,
        dualGovernance: false,
        timelockEnabled: true,
        timelockConfig: { standardDelayDays: 2 },
        approvalVoting: false,
        convictionVoting: false,
        easyTrack: false,
        proposalGates: true,
        ragequit: false,
        tokenLocking: false,
        governanceCycles: false,
        retroPGF: false,
        securityCouncil: false,
        citizenHouse: false,
      };
    } else {
      recommendations.features = {
        bicameral: memberCount > 100,
        dualGovernance: false,
        timelockEnabled: true,
        timelockConfig: { standardDelayDays: 3 },
        approvalVoting: false,
        convictionVoting: false,
        easyTrack: true,
        proposalGates: true,
        ragequit: false,
        tokenLocking: false,
        governanceCycles: memberCount > 200,
        retroPGF: false,
        securityCouncil: memberCount > 500,
        citizenHouse: false,
      };
    }

    return recommendations;
  }

  /**
   * Calculate total proposal duration from stages
   */
  calculateProposalDuration(stages: ProposalStageConfig[]): number {
    return stages.reduce((total, stage) => total + stage.durationDays, 0);
  }

  /**
   * Convert days to simulation steps
   */
  daysToSteps(days: number, stepsPerDay: number = 24): number {
    return days * stepsPerDay;
  }

  /**
   * Convert simulation steps to days
   */
  stepsToDays(steps: number, stepsPerDay: number = 24): number {
    return steps / stepsPerDay;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const builder = new DAOConfigBuilder();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Validate a DAO designer configuration
 */
export function validateConfig(config: DAODesignerConfig): ValidationResult {
  return builder.validate(config);
}

/**
 * Convert designer config to simulation config
 */
export function toSimulationConfig(config: DAODesignerConfig): DAOSimulationConfig {
  return builder.toSimulationConfig(config);
}

/**
 * Get recommendations for a DAO design
 */
export function getRecommendations(
  memberCount: number,
  complexity: 'beginner' | 'intermediate' | 'advanced'
): Partial<DAODesignerConfig> {
  return builder.getRecommendations(memberCount, complexity);
}
