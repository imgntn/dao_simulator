/**
 * Twin Agent Factory
 *
 * Creates agent instances based on digital twin member archetypes.
 * Maps member types from digital twin configurations to actual agent classes.
 */

import type { DAOModel } from '../engine/model';
import type { TwinDAOConfig, MemberArchetypeConfig } from '../digital-twins/types';
import { MEMBER_TYPE_TO_AGENTS } from '../digital-twins/types';

import { DAOMember } from './base';
import { PassiveMember } from './passive-member';
import { Investor } from './investor';
import { Delegator } from './delegator';
import { LiquidDelegator } from './liquid-delegator';
import { GovernanceExpert } from './governance-expert';
import { SecurityCouncilMember } from './security-council-member';
import { CitizenAgent } from './citizen-agent';
import { StewardAgent, WorkstreamType } from './steward-agent';
import { StakerAgent } from './staker-agent';
import { Trader } from './trader';
import { Developer } from './developer';
import { ProposalCreator } from './proposal-creator';
import { Validator } from './validator';
import { Auditor } from './auditor';
import { DABMember } from './dab-member';
import { NodeOperator } from './node-operator';
import { FoundationAgent, FoundationType } from './foundation-agent';

import { random, randomInt, randomChoice } from '../utils/random';

// =============================================================================
// TYPES
// =============================================================================

export type AgentClass =
  | typeof DAOMember
  | typeof PassiveMember
  | typeof Investor
  | typeof Delegator
  | typeof LiquidDelegator
  | typeof GovernanceExpert
  | typeof SecurityCouncilMember
  | typeof CitizenAgent
  | typeof StewardAgent
  | typeof StakerAgent
  | typeof Trader
  | typeof Developer
  | typeof ProposalCreator
  | typeof Validator
  | typeof Auditor
  | typeof DABMember
  | typeof NodeOperator
  | typeof FoundationAgent;

export interface AgentCreationConfig {
  archetype: string;
  count: number;
  tokenDistribution: { min: number; max: number };
  reputationDistribution: { min: number; max: number };
  options?: Record<string, unknown>;
}

export interface FactoryResult {
  agents: DAOMember[];
  summary: {
    totalAgents: number;
    byArchetype: Record<string, number>;
    totalTokensDistributed: number;
  };
}

// =============================================================================
// ARCHETYPE TO AGENT CLASS MAPPING
// =============================================================================

/**
 * Maps archetype names to agent classes
 */
const ARCHETYPE_TO_AGENT_CLASS: Record<string, AgentClass[]> = {
  // Generic token holders
  token_holder: [PassiveMember, Investor],
  holder: [PassiveMember, Investor],

  // Active governance participants
  delegate: [Delegator, LiquidDelegator, GovernanceExpert],
  delegator: [Delegator, LiquidDelegator],

  // Twin-specific types
  citizen: [CitizenAgent],
  citizens_house: [CitizenAgent],
  security_council: [SecurityCouncilMember],
  steward: [StewardAgent],
  staker: [StakerAgent],

  // Technical roles
  developer: [Developer],
  validator: [Validator],
  auditor: [Auditor],

  // Economic roles
  trader: [Trader],
  investor: [Investor],
  liquidity_provider: [Investor, StakerAgent],

  // Governance roles
  proposal_creator: [ProposalCreator],
  governance_expert: [GovernanceExpert],

  // Advisory and operational roles
  dab: [DABMember],
  developer_advisory_board: [DABMember],
  advisory_board: [DABMember],
  node_operator: [NodeOperator],
  operator: [NodeOperator],
  foundation: [FoundationAgent],

  // Default fallback
  member: [PassiveMember],
  default: [PassiveMember],
};

// =============================================================================
// TWIN AGENT FACTORY
// =============================================================================

export class TwinAgentFactory {
  private model: DAOModel;
  private agentCounter: number = 0;
  private daoId: string;

  constructor(model: DAOModel, daoId: string = 'default') {
    this.model = model;
    this.daoId = daoId;
  }

  /**
   * Create agents from a digital twin configuration
   */
  createAgentsForTwin(twinConfig: TwinDAOConfig): FactoryResult {
    const agents: DAOMember[] = [];
    const byArchetype: Record<string, number> = {};
    let totalTokens = 0;

    // Get member distribution from twin config
    const memberDistribution = this.getMemberDistribution(twinConfig);

    for (const config of memberDistribution) {
      const created = this.createAgentBatch(config);
      agents.push(...created.agents);
      byArchetype[config.archetype] = (byArchetype[config.archetype] || 0) + created.agents.length;
      totalTokens += created.totalTokens;
    }

    return {
      agents,
      summary: {
        totalAgents: agents.length,
        byArchetype,
        totalTokensDistributed: totalTokens,
      },
    };
  }

  /**
   * Create a batch of agents for a specific archetype
   */
  createAgentBatch(config: AgentCreationConfig): { agents: DAOMember[]; totalTokens: number } {
    const agents: DAOMember[] = [];
    let totalTokens = 0;

    const agentClasses = this.getAgentClassesForArchetype(config.archetype);

    for (let i = 0; i < config.count; i++) {
      const AgentClass = randomChoice(agentClasses);
      const tokens = randomInt(config.tokenDistribution.min, config.tokenDistribution.max);
      const reputation = randomInt(config.reputationDistribution.min, config.reputationDistribution.max);

      const agent = this.createAgent(AgentClass, config.archetype, tokens, reputation, config.options);
      agents.push(agent);
      totalTokens += tokens;
    }

    return { agents, totalTokens };
  }

  /**
   * Create a single agent of a specific class
   */
  private createAgent(
    AgentClass: AgentClass,
    archetype: string,
    tokens: number,
    reputation: number,
    options?: Record<string, unknown>
  ): DAOMember {
    const uniqueId = `${this.daoId}_${archetype}_${this.agentCounter++}`;
    const location = `node_${randomInt(0, 9)}`;

    // Handle special agent types
    if (AgentClass === StewardAgent) {
      const workstream = (options?.workstream as WorkstreamType) || this.randomWorkstream();
      return new StewardAgent(uniqueId, this.model, tokens, reputation, location, workstream, this.daoId);
    }

    if (AgentClass === CitizenAgent) {
      const badge = (options?.badge as string) || 'citizen';
      return new CitizenAgent(uniqueId, this.model, tokens, reputation, location, badge, this.daoId);
    }

    if (AgentClass === StakerAgent) {
      const stakedTokens = Math.floor(tokens * (0.5 + random() * 0.4));
      return new StakerAgent(uniqueId, this.model, tokens - stakedTokens, reputation, location, stakedTokens, this.daoId);
    }

    if (AgentClass === DABMember) {
      return new DABMember(uniqueId, this.model, tokens, reputation, location, this.daoId);
    }

    if (AgentClass === NodeOperator) {
      const operatorName = (options?.operatorName as string) || `Operator_${this.agentCounter}`;
      return new NodeOperator(uniqueId, this.model, tokens, reputation, location, operatorName, this.daoId);
    }

    if (AgentClass === FoundationAgent) {
      const foundationType = (options?.foundationType as FoundationType) || 'generic';
      const foundationName = options?.foundationName as string;
      return new FoundationAgent(uniqueId, this.model, tokens, reputation, location, foundationType, foundationName, this.daoId);
    }

    // Standard agent creation - cast to base type for generic instantiation
    return new (AgentClass as typeof DAOMember)(uniqueId, this.model, tokens, reputation, location, undefined, this.daoId);
  }

  /**
   * Get agent classes for a given archetype
   */
  private getAgentClassesForArchetype(archetype: string): AgentClass[] {
    const normalizedArchetype = archetype.toLowerCase().replace(/\s+/g, '_');

    // Check direct mapping first
    if (ARCHETYPE_TO_AGENT_CLASS[normalizedArchetype]) {
      return ARCHETYPE_TO_AGENT_CLASS[normalizedArchetype];
    }

    // Check MEMBER_TYPE_TO_AGENTS mapping from digital twins types
    const memberTypeAgents = MEMBER_TYPE_TO_AGENTS[normalizedArchetype];
    if (memberTypeAgents) {
      // Map string names to actual classes
      const classes: AgentClass[] = [];
      for (const agentName of memberTypeAgents) {
        const agentClass = this.getAgentClassByName(agentName);
        if (agentClass) {
          classes.push(agentClass);
        }
      }
      if (classes.length > 0) {
        return classes;
      }
    }

    // Default fallback
    return ARCHETYPE_TO_AGENT_CLASS.default;
  }

  /**
   * Get agent class by name
   */
  private getAgentClassByName(name: string): AgentClass | null {
    const nameMap: Record<string, AgentClass> = {
      PassiveMember,
      Investor,
      Delegator,
      LiquidDelegator,
      GovernanceExpert,
      SecurityCouncilMember,
      CitizenAgent,
      StewardAgent,
      StakerAgent,
      Trader,
      Developer,
      ProposalCreator,
      Validator,
      Auditor,
      DABMember,
      NodeOperator,
      FoundationAgent,
    };

    return nameMap[name] || null;
  }

  /**
   * Get member distribution from twin config
   */
  private getMemberDistribution(twinConfig: TwinDAOConfig): AgentCreationConfig[] {
    const distribution: AgentCreationConfig[] = [];

    // Base distribution (always include)
    distribution.push({
      archetype: 'token_holder',
      count: 50,
      tokenDistribution: { min: 100, max: 10000 },
      reputationDistribution: { min: 10, max: 100 },
    });

    distribution.push({
      archetype: 'delegate',
      count: 15,
      tokenDistribution: { min: 5000, max: 100000 },
      reputationDistribution: { min: 50, max: 200 },
    });

    // Bicameral-specific agents
    if (twinConfig.isBicameral) {
      distribution.push({
        archetype: 'citizen',
        count: 20,
        tokenDistribution: { min: 0, max: 1000 },  // Citizens may have few tokens
        reputationDistribution: { min: 100, max: 300 },
      });
    }

    // Security council
    if (twinConfig.hasSecurityCouncil) {
      distribution.push({
        archetype: 'security_council',
        count: 12,  // Typical council size
        tokenDistribution: { min: 1000, max: 50000 },
        reputationDistribution: { min: 200, max: 500 },
      });
    }

    // Dual governance stakers
    if (twinConfig.hasDualGovernance) {
      distribution.push({
        archetype: 'staker',
        count: 30,
        tokenDistribution: { min: 1000, max: 50000 },
        reputationDistribution: { min: 30, max: 150 },
      });
    }

    // Stewards (common in grant-focused DAOs)
    if (twinConfig.name.toLowerCase().includes('gitcoin') ||
        twinConfig.name.toLowerCase().includes('ens')) {
      distribution.push({
        archetype: 'steward',
        count: 10,
        tokenDistribution: { min: 5000, max: 50000 },
        reputationDistribution: { min: 100, max: 300 },
      });
    }

    // Developer Advisory Board (Optimism)
    if (twinConfig.name.toLowerCase().includes('optimism')) {
      distribution.push({
        archetype: 'dab',
        count: 5,
        tokenDistribution: { min: 1000, max: 20000 },
        reputationDistribution: { min: 150, max: 400 },
      });
    }

    // Node Operators (Lido)
    if (twinConfig.name.toLowerCase().includes('lido')) {
      distribution.push({
        archetype: 'node_operator',
        count: 20,
        tokenDistribution: { min: 10000, max: 100000 },
        reputationDistribution: { min: 100, max: 300 },
      });
    }

    // Foundation agents (most DAOs have foundations)
    if (twinConfig.name.toLowerCase().includes('arbitrum') ||
        twinConfig.name.toLowerCase().includes('optimism') ||
        twinConfig.name.toLowerCase().includes('ens')) {
      distribution.push({
        archetype: 'foundation',
        count: 1,
        tokenDistribution: { min: 100000, max: 500000 },
        reputationDistribution: { min: 300, max: 500 },
        options: {
          foundationType: twinConfig.name.toLowerCase().includes('arbitrum') ? 'arbitrum' :
                          twinConfig.name.toLowerCase().includes('optimism') ? 'optimism' :
                          twinConfig.name.toLowerCase().includes('ens') ? 'ens' : 'generic',
        },
      });
    }

    return distribution;
  }

  /**
   * Get a random workstream type
   */
  private randomWorkstream(): WorkstreamType {
    const workstreams: WorkstreamType[] = [
      'public_goods',
      'ecosystem',
      'metagovernance',
      'treasury',
      'community',
      'technical',
    ];
    return randomChoice(workstreams);
  }

  /**
   * Create a specific count of agents with a specific archetype
   */
  createAgentsOfType(
    archetype: string,
    count: number,
    tokenRange: [number, number] = [100, 10000],
    reputationRange: [number, number] = [10, 100]
  ): DAOMember[] {
    const config: AgentCreationConfig = {
      archetype,
      count,
      tokenDistribution: { min: tokenRange[0], max: tokenRange[1] },
      reputationDistribution: { min: reputationRange[0], max: reputationRange[1] },
    };

    return this.createAgentBatch(config).agents;
  }

  /**
   * Create a single agent of a specific type
   */
  createSingleAgent(
    archetype: string,
    tokens: number,
    reputation: number,
    options?: Record<string, unknown>
  ): DAOMember {
    const agentClasses = this.getAgentClassesForArchetype(archetype);
    const AgentClass = agentClasses[0];
    return this.createAgent(AgentClass, archetype, tokens, reputation, options);
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a twin agent factory for a model
 */
export function createTwinAgentFactory(model: DAOModel, daoId?: string): TwinAgentFactory {
  return new TwinAgentFactory(model, daoId || model.dao?.daoId || 'default');
}

/**
 * Create agents for a twin configuration
 */
export function createAgentsFromTwin(
  model: DAOModel,
  twinConfig: TwinDAOConfig
): FactoryResult {
  const factory = createTwinAgentFactory(model, twinConfig.id);
  return factory.createAgentsForTwin(twinConfig);
}

/**
 * Get supported archetypes
 */
export function getSupportedArchetypes(): string[] {
  return Object.keys(ARCHETYPE_TO_AGENT_CLASS);
}
