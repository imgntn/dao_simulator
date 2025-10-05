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
} from '../agents';
import { generateRandomLocation } from './locations';
import * as constants from '../config/constants';

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
  agentConfigs: Map<AgentClass, AgentConfig> = new Map([
    [Developer, {
      tokens: constants.DEVELOPER_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
      skillset: ['TypeScript', 'JavaScript', 'Solidity'],
    }],
    [Investor, {
      tokens: constants.INVESTOR_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
      investmentBudget: constants.INVESTOR_BUDGET,
    }],
    [Trader, {
      tokens: constants.TRADER_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
    }],
    [AdaptiveInvestor, {
      tokens: constants.ADAPTIVE_INVESTOR_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
      investmentBudget: constants.ADAPTIVE_INVESTOR_BUDGET,
    }],
    [Delegator, {
      tokens: constants.DELEGATOR_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
      delegationBudget: constants.DELEGATOR_BUDGET,
    }],
    [LiquidDelegator, {
      tokens: constants.LIQUID_DELEGATOR_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
      delegationBudget: constants.LIQUID_DELEGATOR_BUDGET,
    }],
    [ProposalCreator, {
      tokens: constants.PROPOSAL_CREATOR_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
    }],
    [Validator, {
      tokens: constants.VALIDATOR_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
    }],
    [ServiceProvider, {
      tokens: constants.SERVICE_PROVIDER_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
      serviceBudget: constants.SERVICE_PROVIDER_BUDGET,
    }],
    [Arbitrator, {
      tokens: constants.ARBITRATOR_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
      arbitrationCapacity: constants.ARBITRATOR_CAPACITY,
    }],
    [Regulator, {
      tokens: constants.REGULATOR_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
    }],
    [Auditor, {
      tokens: constants.AUDITOR_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
    }],
    [BountyHunter, {
      tokens: constants.BOUNTY_HUNTER_TOKENS,
      reputation: constants.BOUNTY_HUNTER_REPUTATION,
    }],
    [ExternalPartner, {
      tokens: constants.EXTERNAL_PARTNER_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
      votingStrategy: null,
    }],
    [Artist, {
      tokens: constants.ARTIST_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
    }],
    [Collector, {
      tokens: constants.COLLECTOR_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
    }],
    [Speculator, {
      tokens: constants.SPECULATOR_TOKENS,
      reputation: constants.DEFAULT_AGENT_REPUTATION,
    }],
    [PassiveMember, {
      tokens: constants.PASSIVE_MEMBER_TOKENS,
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
      const agentClass = agentClasses[
        Math.floor(Math.random() * agentClasses.length)
      ];

      const newAgent = this.createAgent(
        agentClass,
        `${agentClass.name}_${this.simulation.currentStep}`
      );

      // Add only if reputation is above threshold
      if (newAgent.reputation > 25) {
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
   * Remove members with negative reputation
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
