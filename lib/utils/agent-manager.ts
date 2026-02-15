// Agent Manager - manages agent creation, caching, and lifecycle
// Port from utils/agent_manager.py

import type { DAOModel } from '../engine/model';
import type { DAOMember } from '../agents/base';
import {
  Developer,
  Investor,
  Trader,
  AdaptiveInvestor,
  Delegator,
  LiquidDelegator,
  ProposalCreator,
  Validator,
  ServiceProvider,
  Arbitrator,
  Regulator,
  Auditor,
  BountyHunter,
  ExternalPartner,
  Artist,
  Collector,
  Speculator,
  PassiveMember,
  StakerAgent,
  GovernanceWhale,
} from '../agents';
import { generateRandomLocation } from './locations';
import * as constants from '../config/constants';
import { randomChoice } from './random';

type AgentClass = new (
  uniqueId: string,
  model: DAOModel,
  ...args: any[]
) => DAOMember;

interface AgentConfig {
  tokens: number;
  reputation: number;
  [key: string]: any;
}

export class AgentManager {
  simulation: DAOModel;
  private agentTypeCache: Map<string, DAOMember[]> = new Map();
  private cacheDirty: boolean = true;

  // Agent configuration templates
  agentConfigs: Map<AgentClass, AgentConfig> = new Map<AgentClass, AgentConfig>([
    [Developer as AgentClass, {
      tokens: constants.DEVELOPER_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
      skillset: ['TypeScript', 'JavaScript', 'Solidity'],
    }],
    [Investor as AgentClass, {
      tokens: constants.INVESTOR_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
      investmentBudget: constants.INVESTOR_BUDGET,
    }],
    [Trader as AgentClass, {
      tokens: constants.TRADER_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
    }],
    [AdaptiveInvestor as AgentClass, {
      tokens: constants.ADAPTIVE_INVESTOR_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
      investmentBudget: constants.ADAPTIVE_INVESTOR_BUDGET,
    }],
    [Delegator as AgentClass, {
      tokens: constants.DELEGATOR_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
      delegationBudget: constants.DELEGATOR_BUDGET,
    }],
    [LiquidDelegator as AgentClass, {
      tokens: constants.LIQUID_DELEGATOR_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
      delegationBudget: constants.LIQUID_DELEGATOR_BUDGET,
    }],
    [ProposalCreator as AgentClass, {
      tokens: constants.PROPOSAL_CREATOR_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
    }],
    [Validator as AgentClass, {
      tokens: constants.VALIDATOR_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
    }],
    [ServiceProvider as AgentClass, {
      tokens: constants.SERVICE_PROVIDER_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
      serviceBudget: constants.SERVICE_PROVIDER_BUDGET,
    }],
    [Arbitrator as AgentClass, {
      tokens: constants.ARBITRATOR_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
      arbitrationCapacity: constants.ARBITRATOR_CAPACITY,
    }],
    [Regulator as AgentClass, {
      tokens: constants.REGULATOR_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
    }],
    [Auditor as AgentClass, {
      tokens: constants.AUDITOR_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
    }],
    [BountyHunter as AgentClass, {
      tokens: constants.BOUNTY_HUNTER_TOKENS,
      reputation: constants.BOUNTY_HUNTER_REPUTATION,
    }],
    [ExternalPartner as AgentClass, {
      tokens: constants.EXTERNAL_PARTNER_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
      votingStrategy: null,
    }],
    [Artist as AgentClass, {
      tokens: constants.ARTIST_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
    }],
    [Collector as AgentClass, {
      tokens: constants.COLLECTOR_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
    }],
    [Speculator as AgentClass, {
      tokens: constants.SPECULATOR_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
    }],
    [StakerAgent as AgentClass, {
      tokens: constants.STAKER_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
    }],
    [PassiveMember as AgentClass, {
      tokens: constants.PASSIVE_MEMBER_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
    }],
    [GovernanceWhale as AgentClass, {
      tokens: constants.GOVERNANCE_WHALE_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
    }],
  ]);

  constructor(simulation: DAOModel) {
    this.simulation = simulation;
  }

  /**
   * Get agents by type using cache for performance
   */
  getAgentsByType(agentType: string): DAOMember[] {
    if (this.cacheDirty || !this.agentTypeCache.has(agentType)) {
      this.rebuildAgentCache();
    }

    return this.agentTypeCache.get(agentType) || [];
  }

  /**
   * Rebuild the agent type cache
   */
  private rebuildAgentCache(): void {
    this.agentTypeCache.clear();

    for (const agent of this.simulation.dao.members) {
      const agentClass = agent.constructor.name;

      if (!this.agentTypeCache.has(agentClass)) {
        this.agentTypeCache.set(agentClass, []);
      }

      this.agentTypeCache.get(agentClass)!.push(agent);
    }

    this.cacheDirty = false;
  }

  /**
   * Mark cache as dirty - call when agents are added/removed
   */
  invalidateCache(): void {
    this.cacheDirty = true;
  }

  /**
   * Create a new agent with appropriate configuration
   */
  createAgent(
    agentClass: AgentClass,
    agentId: string,
    overrides: Partial<AgentConfig> = {}
  ): DAOMember {
    const baseConfig = this.agentConfigs.get(agentClass) || {
      tokens: constants.DEFAULT_AGENT_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
    };

    // Merge base config with overrides
    const config = { ...baseConfig, ...overrides };
    const location = overrides.location || generateRandomLocation();

    if (agentClass === StakerAgent) {
      const totalTokens = Math.max(0, config.tokens || 0);
      const stakedTokens = Math.min(
        totalTokens,
        Math.floor(totalTokens * constants.STAKER_STAKE_RATIO)
      );
      const liquidTokens = Math.max(0, totalTokens - stakedTokens);

      return new StakerAgent(
        agentId,
        this.simulation,
        liquidTokens,
        config.reputation,
        location,
        stakedTokens
      );
    }

    return new agentClass(
      agentId,
      this.simulation,
      config.tokens,
      config.reputation,
      location,
      config.votingStrategy,
      ...Object.values(config).slice(2) // Additional params
    );
  }

  /**
   * Add new members periodically if treasury has funds
   */
  addNewMembers(): void {
    const agentClasses: AgentClass[] = [
      Developer,
      Investor,
      Trader,
      AdaptiveInvestor,
      Delegator,
      LiquidDelegator,
      ProposalCreator,
      Validator,
      ServiceProvider,
      Arbitrator,
      Regulator,
      Auditor,
      BountyHunter,
      ExternalPartner,
      Artist,
      Collector,
      Speculator,
      StakerAgent,
      PassiveMember,
    ];

    for (let i = 0; i < constants.NEW_MEMBERS_PER_INTERVAL; i++) {
      const shouldAdd =
        this.simulation.currentStep > 0 &&
        this.simulation.currentStep % constants.NEW_MEMBER_INTERVAL === 0;

      if (!shouldAdd) {
        continue;
      }

      if (
        this.simulation.dao.treasury.funds < constants.NEW_MEMBER_FUND_REQUIREMENT
      ) {
        continue;
      }

      // Choose random agent type
      const agentClass = randomChoice(agentClasses);

      const newAgent = this.createAgent(
        agentClass,
        `${agentClass.name}_${this.simulation.currentStep}`
      );

      // Add any agent with non-negative reputation (lowered from 25 to enable
      // realistic population dynamics — previously almost all agents were rejected
      // since DEFAULT_AGENT_REPUTATION = 0)
      if (newAgent.reputation >= 0) {
        this.simulation.dao.addMember(newAgent);
        this.simulation.schedule.add(newAgent);
        this.invalidateCache();

        // Deduct cost from treasury
        this.simulation.dao.treasury.withdraw(
          'DAO_TOKEN',
          constants.NEW_MEMBER_COST,
          this.simulation.currentStep
        );
      }
    }
  }

  /**
   * Remove members with negative reputation.
   * NOTE: Creates selection pressure favoring high-initial-reputation agents
   * (GovernanceExpert: 75, RiskManager: 60) over lower-rep types.
   * This is an intentional simplification documented in limitations.
   */
  cullMembers(): void {
    const agentsToRemove: DAOMember[] = [];

    for (const agent of this.simulation.dao.members) {
      if (agent.reputation < 0) {
        agentsToRemove.push(agent);
      }
    }

    for (const agent of agentsToRemove) {
      this.simulation.dao.removeMember(agent);
      this.simulation.schedule.remove(agent);
      this.invalidateCache();
    }
  }

  /**
   * Get agent statistics by type
   */
  getAgentStatistics(): Map<string, number> {
    if (this.cacheDirty) {
      this.rebuildAgentCache();
    }

    const stats = new Map<string, number>();
    this.agentTypeCache.forEach((agents, type) => {
      stats.set(type, agents.length);
    });

    return stats;
  }

  /**
   * Get total agent count
   */
  getTotalAgents(): number {
    return this.simulation.dao.members.length;
  }
}
