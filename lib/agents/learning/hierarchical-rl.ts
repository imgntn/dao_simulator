// Hierarchical RL - Options Framework
//
// Two-level decision hierarchy:
//   1. Meta-policy selects "options" (high-level goals/strategies)
//   2. Sub-policy executes primitive actions within the selected option
//
// Each level has its own Q-table with independent learning.
//
// Example for FlashLoanAttacker:
//   Options: "scout", "prepare_attack", "execute_attack", "lay_low"
//   Actions within "execute_attack": "target_proposal_A", "target_proposal_B", "manipulate_vote"
//
// Example for RiskManager:
//   Options: "monitor", "defensive", "opportunistic", "emergency"
//   Actions within "defensive": "unstake", "hedge", "raise_alert"

import { LearningMixin, type LearningConfig, type LearningState } from './learning-mixin';

/**
 * An "option" in the options framework - a temporally extended action
 */
export interface Option {
  /** Unique name for this option */
  name: string;
  /** Primitive actions available when this option is active */
  actions: string[];
  /** Minimum number of steps this option runs before it can terminate. Default: 1 */
  minDuration: number;
  /** Maximum number of steps before forced termination. Default: 50 */
  maxDuration: number;
}

/**
 * Configuration for hierarchical RL
 */
export interface HierarchicalConfig {
  /** Learning config for meta-policy (option selection). */
  metaConfig: Partial<LearningConfig>;
  /** Learning config for sub-policies (action selection within options). */
  subConfig: Partial<LearningConfig>;
  /** Discount factor for meta-level returns. Default: 0.99 */
  metaDiscountFactor: number;
}

const DEFAULT_HIERARCHICAL_CONFIG: HierarchicalConfig = {
  metaConfig: {
    learningRate: 0.05,
    discountFactor: 0.99,
    explorationRate: 0.3,
    explorationDecay: 0.995,
    minExploration: 0.02,
    adaptiveLearningRate: true,
  },
  subConfig: {
    learningRate: 0.1,
    discountFactor: 0.95,
    explorationRate: 0.3,
    explorationDecay: 0.995,
    minExploration: 0.01,
    adaptiveLearningRate: true,
  },
  metaDiscountFactor: 0.99,
};

/**
 * Serializable state for hierarchical RL
 */
export interface HierarchicalState {
  metaState: LearningState;
  subStates: { [optionName: string]: LearningState };
  currentOption: string | null;
  optionStepCount: number;
  episodeCount: number;
}

/**
 * HierarchicalRLMixin provides the options framework for agents
 * with multi-phase behaviors.
 *
 * The meta-policy learns WHEN to switch between high-level strategies,
 * while sub-policies learn HOW to execute each strategy optimally.
 *
 * Benefits over flat Q-learning:
 * - Temporal abstraction: meta-policy doesn't need to reason about every step
 * - Modular learning: each option's sub-policy learns independently
 * - Transfer: pre-learned options can be reused across scenarios
 *
 * Usage:
 * ```typescript
 * const options = [
 *   { name: 'aggressive', actions: ['buy_heavy', 'leverage', 'short'], minDuration: 3, maxDuration: 20 },
 *   { name: 'defensive', actions: ['sell', 'hedge', 'hold'], minDuration: 2, maxDuration: 15 },
 *   { name: 'passive', actions: ['hold', 'observe'], minDuration: 5, maxDuration: 50 },
 * ];
 * const hrl = new HierarchicalRLMixin(options);
 *
 * // Each step:
 * const action = hrl.selectAction(metaState, subState);
 * hrl.update(metaState, subState, reward, nextMetaState, nextSubState);
 * ```
 */
export class HierarchicalRLMixin {
  private options: Option[];
  private metaPolicy: LearningMixin;
  private subPolicies: Map<string, LearningMixin> = new Map();
  private config: HierarchicalConfig;

  // Current option state
  private currentOption: string | null = null;
  private optionStepCount: number = 0;
  private optionCumulativeReward: number = 0;
  private optionStartMetaState: string | null = null;

  // Episode tracking
  private episodeCount: number = 0;
  private totalReward: number = 0;

  constructor(options: Option[], config: Partial<HierarchicalConfig> = {}) {
    this.options = options;
    this.config = {
      metaConfig: { ...DEFAULT_HIERARCHICAL_CONFIG.metaConfig, ...config.metaConfig },
      subConfig: { ...DEFAULT_HIERARCHICAL_CONFIG.subConfig, ...config.subConfig },
      metaDiscountFactor: config.metaDiscountFactor ?? DEFAULT_HIERARCHICAL_CONFIG.metaDiscountFactor,
    };

    // Create meta-policy (selects between options)
    this.metaPolicy = new LearningMixin(this.config.metaConfig);

    // Create one sub-policy per option
    for (const option of options) {
      this.subPolicies.set(option.name, new LearningMixin(this.config.subConfig));
    }
  }

  /**
   * Select an action given meta-state (high-level) and sub-state (detail-level).
   *
   * 1. If no option is active or current option should terminate, select new option
   * 2. Use sub-policy of active option to select primitive action
   */
  selectAction(metaState: string, subState: string): string {
    // Check if we need to select a new option
    if (this.shouldSelectNewOption()) {
      // End current option if one was active
      if (this.currentOption !== null) {
        this.terminateCurrentOption(metaState);
      }

      // Select new option using meta-policy
      const optionNames = this.options.map(o => o.name);
      this.currentOption = this.metaPolicy.selectAction(metaState, optionNames);
      this.optionStepCount = 0;
      this.optionCumulativeReward = 0;
      this.optionStartMetaState = metaState;
    }

    // Get sub-policy for current option
    const subPolicy = this.subPolicies.get(this.currentOption!);
    if (!subPolicy) {
      // Fallback: return first action of first option
      return this.options[0].actions[0];
    }

    // Get available actions for this option
    const option = this.options.find(o => o.name === this.currentOption);
    const actions = option?.actions || [this.options[0].actions[0]];

    return subPolicy.selectAction(subState, actions);
  }

  /**
   * Update both meta and sub policies with a reward.
   *
   * Sub-policy is updated every step.
   * Meta-policy is updated when an option terminates.
   */
  update(
    metaState: string,
    subState: string,
    reward: number,
    nextMetaState: string,
    nextSubState: string
  ): void {
    this.totalReward += reward;
    this.optionCumulativeReward += reward;
    this.optionStepCount++;

    // Update sub-policy (every step) using recordReward for delayed update
    if (this.currentOption) {
      const subPolicy = this.subPolicies.get(this.currentOption);
      const option = this.options.find(o => o.name === this.currentOption);
      if (subPolicy && option) {
        subPolicy.recordReward(reward, nextSubState, option.actions);
      }
    }
  }

  /**
   * Check if current option should terminate
   */
  private shouldSelectNewOption(): boolean {
    if (this.currentOption === null) return true;

    const option = this.options.find(o => o.name === this.currentOption);
    if (!option) return true;

    // Must run for at least minDuration
    if (this.optionStepCount < option.minDuration) return false;

    // Must terminate at maxDuration
    if (this.optionStepCount >= option.maxDuration) return true;

    // Probabilistic termination based on how close to maxDuration
    // (more likely to terminate as we approach max)
    const progress = this.optionStepCount / option.maxDuration;
    return Math.random() < progress * 0.3; // Up to 30% termination probability
  }

  /**
   * Terminate current option and update meta-policy
   */
  private terminateCurrentOption(currentMetaState: string): void {
    if (this.currentOption === null || this.optionStartMetaState === null) return;

    // Meta-policy reward: discounted cumulative reward over the option's duration
    const gamma = this.config.metaDiscountFactor;
    const discountedReward = this.optionCumulativeReward *
      Math.pow(gamma, this.optionStepCount);

    // Update meta-policy Q-value
    const optionNames = this.options.map(o => o.name);
    this.metaPolicy.update(
      this.optionStartMetaState,
      this.currentOption,
      discountedReward,
      currentMetaState,
      optionNames
    );
  }

  /**
   * Get currently active option name
   */
  getCurrentOption(): string | null {
    return this.currentOption;
  }

  /**
   * Get steps spent in current option
   */
  getOptionStepCount(): number {
    return this.optionStepCount;
  }

  /**
   * End episode for both meta and sub policies
   */
  endEpisode(): void {
    this.episodeCount++;
    this.metaPolicy.endEpisode();
    for (const sub of this.subPolicies.values()) {
      sub.endEpisode();
    }
    this.currentOption = null;
    this.optionStepCount = 0;
    this.optionCumulativeReward = 0;
    this.optionStartMetaState = null;
  }

  /**
   * Export state for serialization
   */
  exportState(): HierarchicalState {
    const subStates: { [name: string]: LearningState } = {};
    for (const [name, sub] of this.subPolicies) {
      subStates[name] = sub.exportLearningState();
    }

    return {
      metaState: this.metaPolicy.exportLearningState(),
      subStates,
      currentOption: this.currentOption,
      optionStepCount: this.optionStepCount,
      episodeCount: this.episodeCount,
    };
  }

  /**
   * Import state from serialization
   */
  importState(state: HierarchicalState): void {
    if (state.metaState) {
      this.metaPolicy.importLearningState(state.metaState);
    }
    if (state.subStates) {
      for (const [name, subState] of Object.entries(state.subStates)) {
        const sub = this.subPolicies.get(name);
        if (sub) {
          sub.importLearningState(subState);
        }
      }
    }
    this.currentOption = state.currentOption;
    this.optionStepCount = state.optionStepCount;
    this.episodeCount = state.episodeCount;
  }

  /**
   * Reset all learned state
   */
  reset(): void {
    this.metaPolicy.reset();
    for (const sub of this.subPolicies.values()) {
      sub.reset();
    }
    this.currentOption = null;
    this.optionStepCount = 0;
    this.optionCumulativeReward = 0;
    this.optionStartMetaState = null;
    this.episodeCount = 0;
    this.totalReward = 0;
  }

  // --- Getters ---

  getMetaQTableSize(): number { return this.metaPolicy.getQTableSize(); }
  getSubQTableSize(optionName: string): number {
    return this.subPolicies.get(optionName)?.getQTableSize() ?? 0;
  }
  getTotalQTableSize(): number {
    let total = this.metaPolicy.getQTableSize();
    for (const sub of this.subPolicies.values()) {
      total += sub.getQTableSize();
    }
    return total;
  }
  getEpisodeCount(): number { return this.episodeCount; }
  getTotalReward(): number { return this.totalReward; }
  getMetaExplorationRate(): number { return this.metaPolicy.getExplorationRate(); }
  getOptions(): Option[] { return [...this.options]; }
}
