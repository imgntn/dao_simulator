// SharedLearningCoordinator - Multi-Agent Reinforcement Learning (MARL Lite)
//
// Coordinates learning across same-type agents for faster convergence.
// Uses federated averaging to merge Q-tables periodically.
// Optional cross-category signals allow traders to inform governance about market conditions.

import type { LearningMixin } from './learning-mixin';

/**
 * Agent category for grouping agents that share knowledge
 */
export type AgentGroup =
  | 'governance'
  | 'financial'
  | 'community'
  | 'security'
  | 'infrastructure';

/**
 * Configuration for shared learning
 */
export interface SharedLearningConfig {
  /** How often to merge Q-tables (every N steps). Default: 50 */
  mergeInterval: number;
  /** Weight for merging: how much to blend from other agents. Default: 0.3 */
  mergeWeight: number;
  /** Enable cross-category signal sharing. Default: false */
  crossCategoryEnabled: boolean;
  /** Weight for cross-category merges (much smaller). Default: 0.05 */
  crossCategoryWeight: number;
  /** Minimum episode count before agent participates in merging. Default: 1 */
  minEpisodesForMerge: number;
}

const DEFAULT_SHARED_LEARNING_CONFIG: SharedLearningConfig = {
  mergeInterval: 50,
  mergeWeight: 0.3,
  crossCategoryEnabled: false,
  crossCategoryWeight: 0.05,
  minEpisodesForMerge: 1,
};

/**
 * Registered agent entry
 */
interface AgentEntry {
  id: string;
  type: string;
  group: AgentGroup;
  learning: LearningMixin;
}

/**
 * Cross-category signal: aggregated statistics from one group
 * shared with related groups to provide context
 */
export interface CrossCategorySignal {
  sourceGroup: AgentGroup;
  /** Average Q-value across all states (sentiment indicator) */
  avgQValue: number;
  /** Average exploration rate (convergence indicator) */
  avgExplorationRate: number;
  /** Total unique states discovered */
  totalStates: number;
  /** Step when this signal was generated */
  step: number;
}

/**
 * Agent type to group mapping
 */
const TYPE_TO_GROUP: Record<string, AgentGroup> = {
  // Governance
  GovernanceExpert: 'governance',
  Delegator: 'governance',
  LiquidDelegator: 'governance',
  Regulator: 'governance',
  GovernanceWhale: 'governance',
  ProposalCreator: 'governance',
  Arbitrator: 'governance',
  // Financial
  RLTrader: 'financial',
  MarketMaker: 'financial',
  Speculator: 'financial',
  Trader: 'financial',
  Investor: 'financial',
  AdaptiveInvestor: 'financial',
  RiskManager: 'financial',
  StakerAgent: 'financial',
  // Community
  Developer: 'community',
  ServiceProvider: 'community',
  BountyHunter: 'community',
  Artist: 'community',
  Collector: 'community',
  PassiveMember: 'community',
  ExternalPartner: 'community',
  // Security
  Whistleblower: 'security',
  Auditor: 'security',
  FlashLoanAttacker: 'security',
  SybilAttacker: 'security',
  // Infrastructure
  Validator: 'infrastructure',
  NodeOperator: 'infrastructure',
};

/**
 * Cross-category influence: which groups benefit from signals from other groups
 */
const CROSS_CATEGORY_INFLUENCE: Record<AgentGroup, AgentGroup[]> = {
  governance: ['financial', 'community'],
  financial: ['governance'],
  community: ['governance', 'financial'],
  security: ['governance', 'financial'],
  infrastructure: ['governance'],
};

/**
 * SharedLearningCoordinator manages federated learning across multiple agents.
 *
 * Key features:
 * - Registers agents by type and category
 * - Periodically merges Q-tables within same-type agents (intra-group)
 * - Optionally shares cross-category signals for broader coordination
 * - Respects minimum episode thresholds to avoid corrupting early learning
 *
 * Usage:
 * ```typescript
 * const coordinator = new SharedLearningCoordinator();
 * // Register agents
 * for (const agent of agents) {
 *   coordinator.register(agent.uniqueId, agent.constructor.name, agent.learning);
 * }
 * // Call periodically
 * coordinator.step(currentStep);
 * ```
 */
export class SharedLearningCoordinator {
  private agents: AgentEntry[] = [];
  private config: SharedLearningConfig;
  private lastMergeStep: number = -1;
  private crossCategorySignals: Map<AgentGroup, CrossCategorySignal> = new Map();

  constructor(config: Partial<SharedLearningConfig> = {}) {
    this.config = { ...DEFAULT_SHARED_LEARNING_CONFIG, ...config };
  }

  /**
   * Register an agent for shared learning
   */
  register(id: string, typeName: string, learning: LearningMixin): void {
    const group = TYPE_TO_GROUP[typeName] || 'community';
    this.agents.push({ id, type: typeName, group, learning });
  }

  /**
   * Unregister an agent (e.g., when removed from simulation)
   */
  unregister(id: string): void {
    this.agents = this.agents.filter(a => a.id !== id);
  }

  /**
   * Process a step: merge if interval reached
   */
  step(currentStep: number): void {
    if (currentStep - this.lastMergeStep < this.config.mergeInterval) {
      return;
    }
    this.lastMergeStep = currentStep;

    // Intra-type merging (same agent type)
    this.mergeWithinTypes();

    // Cross-category signals
    if (this.config.crossCategoryEnabled) {
      this.generateCrossCategorySignals(currentStep);
      this.applyCrossCategorySignals();
    }
  }

  /**
   * Merge Q-tables among agents of the same type.
   * Uses federated averaging: each agent blends knowledge from all same-type peers.
   */
  private mergeWithinTypes(): void {
    // Group agents by type
    const byType = new Map<string, AgentEntry[]>();
    for (const agent of this.agents) {
      if (agent.learning.getEpisodeCount() < this.config.minEpisodesForMerge) continue;
      if (!byType.has(agent.type)) {
        byType.set(agent.type, []);
      }
      byType.get(agent.type)!.push(agent);
    }

    // For each type with 2+ agents, merge
    for (const [, typeAgents] of byType) {
      if (typeAgents.length < 2) continue;

      const weight = this.config.mergeWeight / typeAgents.length;

      for (let i = 0; i < typeAgents.length; i++) {
        for (let j = 0; j < typeAgents.length; j++) {
          if (i === j) continue;
          typeAgents[i].learning.mergeFrom(typeAgents[j].learning, weight);
        }
      }
    }
  }

  /**
   * Generate aggregate signals from each group
   */
  private generateCrossCategorySignals(step: number): void {
    const byGroup = new Map<AgentGroup, AgentEntry[]>();
    for (const agent of this.agents) {
      if (!byGroup.has(agent.group)) {
        byGroup.set(agent.group, []);
      }
      byGroup.get(agent.group)!.push(agent);
    }

    for (const [group, groupAgents] of byGroup) {
      if (groupAgents.length === 0) continue;

      let totalQValue = 0;
      let totalExploration = 0;
      let totalStates = 0;
      let qValueCount = 0;

      for (const agent of groupAgents) {
        totalExploration += agent.learning.getExplorationRate();
        totalStates += agent.learning.getStateCount();

        // Compute average Q-value across all state-action pairs
        const config = agent.learning.getConfig();
        const qTable = (agent.learning as any).qTable;
        if (qTable) {
          for (const state of Object.keys(qTable)) {
            for (const action of Object.keys(qTable[state])) {
              totalQValue += qTable[state][action];
              qValueCount++;
            }
          }
        }
      }

      const n = groupAgents.length;
      this.crossCategorySignals.set(group, {
        sourceGroup: group,
        avgQValue: qValueCount > 0 ? totalQValue / qValueCount : 0,
        avgExplorationRate: totalExploration / n,
        totalStates,
        step,
      });
    }
  }

  /**
   * Apply cross-category signals as soft Q-value adjustments.
   * When financial agents are highly pessimistic (low avg Q),
   * governance agents get a small nudge toward conservative actions.
   */
  private applyCrossCategorySignals(): void {
    const byGroup = new Map<AgentGroup, AgentEntry[]>();
    for (const agent of this.agents) {
      if (!byGroup.has(agent.group)) {
        byGroup.set(agent.group, []);
      }
      byGroup.get(agent.group)!.push(agent);
    }

    for (const [targetGroup, agents] of byGroup) {
      const influenceSources = CROSS_CATEGORY_INFLUENCE[targetGroup] || [];
      if (influenceSources.length === 0) continue;

      // Aggregate signal from influence sources
      let signalSum = 0;
      let signalCount = 0;
      for (const sourceGroup of influenceSources) {
        const signal = this.crossCategorySignals.get(sourceGroup);
        if (signal) {
          signalSum += signal.avgQValue;
          signalCount++;
        }
      }
      if (signalCount === 0) continue;

      const avgSignal = signalSum / signalCount;
      // Only apply if signal is meaningful (not near zero)
      if (Math.abs(avgSignal) < 0.5) continue;

      // Apply small bias to all agents in target group
      const bias = avgSignal * this.config.crossCategoryWeight;
      for (const agent of agents) {
        const qTable = (agent.learning as any).qTable;
        if (!qTable) continue;

        // Add small bias to all Q-values (shifts preferences slightly)
        for (const state of Object.keys(qTable)) {
          for (const action of Object.keys(qTable[state])) {
            const oldQ = qTable[state][action];
            const [min, max] = agent.learning.getConfig().qBounds;
            qTable[state][action] = Math.max(min, Math.min(max, oldQ + bias));
          }
        }
      }
    }
  }

  /**
   * Get the latest cross-category signal for a group
   */
  getSignal(group: AgentGroup): CrossCategorySignal | undefined {
    return this.crossCategorySignals.get(group);
  }

  /**
   * Get all registered agents count by group
   */
  getGroupCounts(): Record<AgentGroup, number> {
    const counts: Record<string, number> = {};
    for (const agent of this.agents) {
      counts[agent.group] = (counts[agent.group] || 0) + 1;
    }
    return counts as Record<AgentGroup, number>;
  }

  /**
   * Get total registered agent count
   */
  getAgentCount(): number {
    return this.agents.length;
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.agents = [];
    this.lastMergeStep = -1;
    this.crossCategorySignals.clear();
  }
}
