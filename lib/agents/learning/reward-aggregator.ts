// RewardAggregator - Collects and normalizes reward signals for learning agents
// Subscribes to events and aggregates rewards per agent

import type { EventBus, EventCallback, EventData } from '../../../types/simulation';

/**
 * Agent category types for reward mapping
 */
export type AgentCategory =
  | 'financial'
  | 'governance'
  | 'delegation'
  | 'work'
  | 'staking'
  | 'oversight'
  | 'adversarial';

/**
 * Reward signal definition
 */
export interface RewardSignal {
  event: string;
  weight: number;
  transform?: (value: number) => number;
}

/**
 * Pending reward entry
 */
interface PendingReward {
  value: number;
  step: number;
  event: string;
}

/**
 * Reward mapping configuration by agent category
 */
export const REWARD_MAPPINGS: Record<AgentCategory, RewardSignal[]> = {
  financial: [
    { event: 'token_price_change', weight: 1.0 },
    { event: 'swap_completed', weight: 0.5 },
    { event: 'lp_fees_earned', weight: 0.8 },
    { event: 'arbitrage_profit', weight: 1.5 },
    { event: 'trade_executed', weight: 0.3 },
    { event: 'portfolio_value_change', weight: 0.7 },
  ],
  governance: [
    { event: 'proposal_passed', weight: 10.0 },
    { event: 'proposal_rejected', weight: -2.0 },
    { event: 'vote_with_majority', weight: 2.0 },
    { event: 'vote_against_majority', weight: -0.5 },
    { event: 'proposal_created', weight: 1.0 },
    { event: 'reputation_change', weight: 0.5 },
    { event: 'quorum_reached', weight: 3.0 },
  ],
  delegation: [
    { event: 'delegation_received', weight: 5.0 },
    { event: 'delegation_lost', weight: -3.0 },
    { event: 'voting_power_gained', weight: 2.0 },
    { event: 'delegate_voted_correctly', weight: 3.0 },
    { event: 'delegate_voted_incorrectly', weight: -2.0 },
    { event: 'delegation_return', weight: 1.0 },
  ],
  work: [
    { event: 'grant_approved', weight: 15.0 },
    { event: 'grant_rejected', weight: -3.0 },
    { event: 'bounty_completed', weight: 10.0 },
    { event: 'bounty_failed', weight: -5.0 },
    { event: 'task_completed', weight: 5.0 },
    { event: 'reputation_gained', weight: 2.0 },
    { event: 'payment_received', weight: 1.0 },
  ],
  staking: [
    { event: 'staking_reward', weight: 1.0 },
    { event: 'slashing_avoided', weight: 5.0 },
    { event: 'slashing_penalty', weight: -10.0 },
    { event: 'stake_matured', weight: 2.0 },
    { event: 'validator_reward', weight: 3.0 },
    { event: 'uptime_bonus', weight: 1.5 },
  ],
  oversight: [
    { event: 'attack_detected', weight: 20.0 },
    { event: 'attack_missed', weight: -30.0 },
    { event: 'false_positive', weight: -5.0 },
    { event: 'correct_approval', weight: 5.0 },
    { event: 'violation_caught', weight: 15.0 },
    { event: 'risk_mitigated', weight: 10.0 },
  ],
  adversarial: [
    { event: 'attack_succeeded', weight: 20.0 },
    { event: 'attack_blocked', weight: -15.0 },
    { event: 'attack_detected', weight: -10.0 },
    { event: 'profit_extracted', weight: 1.0 },
    { event: 'disruption_caused', weight: 0.5 },
    { event: 'gas_spent', weight: -0.1 },
  ],
};

/**
 * RewardAggregator collects reward signals from the event bus
 * and provides aggregated rewards per agent.
 *
 * Usage:
 * ```typescript
 * const aggregator = new RewardAggregator('financial');
 * aggregator.subscribeToEvents(eventBus, 'agent_123');
 *
 * // Each step:
 * const reward = aggregator.collectReward('agent_123');
 * aggregator.resetStep('agent_123');
 * ```
 */
export class RewardAggregator {
  private pendingRewards: Map<string, PendingReward[]> = new Map();
  private subscriptions: Map<string, EventCallback[]> = new Map();
  private category: AgentCategory;
  private customSignals: RewardSignal[];
  private rewardClamp: [number, number] = [-10, 10];
  private decayRate: number = 0.9; // Decay for multi-step rewards

  constructor(
    category: AgentCategory,
    customSignals: RewardSignal[] = [],
    rewardClamp: [number, number] = [-10, 10]
  ) {
    this.category = category;
    this.customSignals = customSignals;
    this.rewardClamp = rewardClamp;
  }

  /**
   * Get reward signals for this aggregator's category
   */
  getRewardSignals(): RewardSignal[] {
    return [...REWARD_MAPPINGS[this.category], ...this.customSignals];
  }

  /**
   * Subscribe to relevant events for an agent
   */
  subscribeToEvents(eventBus: EventBus, agentId: string): void {
    if (this.subscriptions.has(agentId)) {
      return; // Already subscribed
    }

    const signals = this.getRewardSignals();
    const callbacks: EventCallback[] = [];

    for (const signal of signals) {
      const callback: EventCallback = (data: EventData) => {
        // Only collect rewards for matching agent
        if (data.agentId !== agentId && data.memberId !== agentId) {
          // Check if this is a global event we should still track
          if (!this.isGlobalEvent(signal.event)) {
            return;
          }
        }

        let value = signal.weight;

        // Apply value from event if available
        if (typeof data.value === 'number') {
          value = signal.weight * data.value;
        } else if (typeof data.amount === 'number') {
          value = signal.weight * data.amount;
        } else if (typeof data.profit === 'number') {
          value = signal.weight * data.profit;
        } else if (typeof data.reward === 'number') {
          value = signal.weight * data.reward;
        }

        // Apply transform if provided
        if (signal.transform) {
          value = signal.transform(value);
        }

        this.addReward(agentId, value, data.step, signal.event);
      };

      eventBus.subscribe(signal.event, callback);
      callbacks.push(callback);
    }

    this.subscriptions.set(agentId, callbacks);
  }

  /**
   * Unsubscribe from all events for an agent
   */
  unsubscribeFromEvents(eventBus: EventBus, agentId: string): void {
    const callbacks = this.subscriptions.get(agentId);
    if (!callbacks) return;

    const signals = this.getRewardSignals();
    for (let i = 0; i < signals.length && i < callbacks.length; i++) {
      eventBus.unsubscribe(signals[i].event, callbacks[i]);
    }

    this.subscriptions.delete(agentId);
    this.pendingRewards.delete(agentId);
  }

  /**
   * Check if an event is global (applies to all agents)
   */
  private isGlobalEvent(event: string): boolean {
    return event === 'token_price_change' || event === 'quorum_reached';
  }

  /**
   * Add a reward to the pending queue
   */
  addReward(agentId: string, value: number, step: number, event: string): void {
    if (!this.pendingRewards.has(agentId)) {
      this.pendingRewards.set(agentId, []);
    }

    this.pendingRewards.get(agentId)!.push({
      value: this.clampReward(value),
      step,
      event,
    });
  }

  /**
   * Manually add a reward (for direct feedback)
   */
  addManualReward(agentId: string, value: number, step: number = 0): void {
    this.addReward(agentId, value, step, 'manual');
  }

  /**
   * Clamp reward to configured bounds
   */
  private clampReward(value: number): number {
    return Math.max(this.rewardClamp[0], Math.min(this.rewardClamp[1], value));
  }

  /**
   * Collect aggregated reward for an agent
   * Applies temporal discounting for older rewards
   */
  collectReward(agentId: string, currentStep?: number): number {
    const rewards = this.pendingRewards.get(agentId);
    if (!rewards || rewards.length === 0) {
      return 0;
    }

    let total = 0;

    for (const reward of rewards) {
      let value = reward.value;

      // Apply temporal discounting if step info available
      if (currentStep !== undefined && reward.step > 0) {
        const age = currentStep - reward.step;
        if (age > 0) {
          value *= Math.pow(this.decayRate, age);
        }
      }

      total += value;
    }

    return this.clampReward(total);
  }

  /**
   * Collect and clear rewards (combines collectReward + resetStep)
   */
  collectAndClear(agentId: string, currentStep?: number): number {
    const reward = this.collectReward(agentId, currentStep);
    this.resetStep(agentId);
    return reward;
  }

  /**
   * Clear pending rewards for an agent (call after processing)
   */
  resetStep(agentId: string): void {
    this.pendingRewards.set(agentId, []);
  }

  /**
   * Reset all pending rewards (for episode reset)
   */
  resetAll(): void {
    this.pendingRewards.clear();
  }

  /**
   * Get count of pending rewards for an agent
   */
  getPendingCount(agentId: string): number {
    return this.pendingRewards.get(agentId)?.length ?? 0;
  }

  /**
   * Get all pending rewards for debugging
   */
  getPendingRewards(agentId: string): PendingReward[] {
    return [...(this.pendingRewards.get(agentId) ?? [])];
  }

  /**
   * Get summary statistics for an agent's pending rewards
   */
  getRewardStats(agentId: string): {
    count: number;
    total: number;
    min: number;
    max: number;
    byEvent: Record<string, number>;
  } {
    const rewards = this.pendingRewards.get(agentId) ?? [];

    if (rewards.length === 0) {
      return { count: 0, total: 0, min: 0, max: 0, byEvent: {} };
    }

    let total = 0;
    let min = Infinity;
    let max = -Infinity;
    const byEvent: Record<string, number> = {};

    for (const reward of rewards) {
      total += reward.value;
      min = Math.min(min, reward.value);
      max = Math.max(max, reward.value);
      byEvent[reward.event] = (byEvent[reward.event] ?? 0) + reward.value;
    }

    return {
      count: rewards.length,
      total,
      min: Number.isFinite(min) ? min : 0,
      max: Number.isFinite(max) ? max : 0,
      byEvent,
    };
  }

  /**
   * Set decay rate for temporal discounting
   */
  setDecayRate(rate: number): void {
    this.decayRate = Math.max(0, Math.min(1, rate));
  }

  /**
   * Set reward clamp bounds
   */
  setRewardClamp(min: number, max: number): void {
    this.rewardClamp = [min, max];
  }
}

/**
 * Factory function to create reward aggregators for common agent types
 */
export function createRewardAggregator(
  agentType: string,
  customSignals: RewardSignal[] = []
): RewardAggregator {
  // Map agent types to categories
  const categoryMap: Record<string, AgentCategory> = {
    // Financial
    investor: 'financial',
    adaptiveinvestor: 'financial',
    marketmaker: 'financial',
    rltrader: 'financial',
    trader: 'financial',
    arbitrageur: 'financial',
    liquidityprovider: 'financial',
    yieldfarmer: 'financial',
    speculator: 'financial',

    // Governance
    governor: 'governance',
    votingblocleader: 'governance',
    protocolpolitician: 'governance',
    metagovernor: 'governance',
    auditor: 'governance',
    whalevoter: 'governance',
    governanceexpert: 'governance',
    proposalcreator: 'governance',

    // Delegation
    delegator: 'delegation',
    liquiddelegator: 'delegation',
    delegationbroker: 'delegation',
    conditionaldelegator: 'delegation',
    transitivedelegator: 'delegation',

    // Work
    worker: 'work',
    contributor: 'work',
    grantproposer: 'work',
    bountyhunter: 'work',
    contentcreator: 'work',
    developer: 'work',
    artist: 'work',

    // Staking
    stakeragent: 'staking',
    validator: 'staking',
    staker: 'staking',

    // Oversight
    watchdog: 'oversight',
    complianceofficer: 'oversight',
    riskmanager: 'oversight',
    emergencyresponder: 'oversight',
    mediator: 'oversight',
    regulator: 'oversight',
    whistleblower: 'oversight',

    // Adversarial
    flashloanattacker: 'adversarial',
    griefingagent: 'adversarial',
    sybiloperator: 'adversarial',
    mevsearcher: 'adversarial',
    sybilattacker: 'adversarial',
  };

  const normalizedType = agentType.toLowerCase().replace(/[_-]/g, '');
  const category = categoryMap[normalizedType] || 'governance';

  return new RewardAggregator(category, customSignals);
}
