// LearningMixin - Base class for Q-learning enabled agents
// Provides core Q-learning infrastructure that can be mixed into any agent

import { random, randomChoice } from '../../utils/random';

/**
 * Configuration for Q-learning behavior
 */
export interface LearningConfig {
  /** Learning rate (α) - how much new information overrides old. Default: 0.1 */
  learningRate: number;
  /** Discount factor (γ) - importance of future rewards. Default: 0.95 */
  discountFactor: number;
  /** Exploration rate (ε) - probability of random action. Default: 0.3 */
  explorationRate: number;
  /** Decay rate for exploration per episode. Default: 0.995 */
  explorationDecay: number;
  /** Minimum exploration rate floor. Default: 0.01 */
  minExploration: number;
  /** Bounds for Q-values to prevent explosion. Default: [-50, 50] */
  qBounds: [number, number];
}

/**
 * Q-table storage structure
 * Maps state strings to action-value pairs
 */
export interface QTable {
  [state: string]: { [action: string]: number };
}

/**
 * Serializable learning state for checkpoints
 */
export interface LearningState {
  qTable: QTable;
  episodeCount: number;
  explorationRate: number;
  lastState: string | null;
  lastAction: string | null;
  totalReward: number;
}

/**
 * Default learning configuration
 */
export const DEFAULT_LEARNING_CONFIG: LearningConfig = {
  learningRate: 0.1,
  discountFactor: 0.95,
  explorationRate: 0.3,
  explorationDecay: 0.995,
  minExploration: 0.01,
  qBounds: [-50, 50],
};

/**
 * LearningMixin provides Q-learning capabilities for agents.
 *
 * This is designed to be used as a mixin/composition pattern rather than
 * traditional inheritance, allowing any agent type to gain learning abilities.
 *
 * Usage:
 * ```typescript
 * class MyLearningAgent extends DAOMember {
 *   private learning = new LearningMixin();
 *
 *   step() {
 *     const state = this.getState();
 *     const action = this.learning.selectAction(state, this.getAvailableActions());
 *     const reward = this.executeAction(action);
 *     const nextState = this.getState();
 *     this.learning.update(state, action, reward, nextState, this.getAvailableActions());
 *   }
 * }
 * ```
 */
export class LearningMixin {
  protected qTable: QTable = {};
  protected config: LearningConfig;
  protected episodeCount: number = 0;
  protected currentExplorationRate: number;
  protected lastState: string | null = null;
  protected lastAction: string | null = null;
  protected totalReward: number = 0;

  constructor(config: Partial<LearningConfig> = {}) {
    this.config = { ...DEFAULT_LEARNING_CONFIG, ...config };
    this.currentExplorationRate = this.config.explorationRate;
    this.validateConfig();
  }

  /**
   * Validate and clamp configuration values
   */
  private validateConfig(): void {
    const c = this.config;
    c.learningRate = Math.max(0, Math.min(1, c.learningRate));
    c.discountFactor = Math.max(0, Math.min(1, c.discountFactor));
    c.explorationRate = Math.max(0, Math.min(1, c.explorationRate));
    c.explorationDecay = Math.max(0, Math.min(1, c.explorationDecay));
    c.minExploration = Math.max(0, Math.min(1, c.minExploration));

    if (c.qBounds[0] >= c.qBounds[1]) {
      c.qBounds = [-50, 50];
    }

    this.currentExplorationRate = c.explorationRate;
  }

  /**
   * Get Q-value for a state-action pair
   * Returns 0 for unknown state-action pairs
   */
  getQValue(state: string, action: string): number {
    if (!this.qTable[state]) {
      return 0;
    }
    return this.qTable[state][action] ?? 0;
  }

  /**
   * Set Q-value for a state-action pair with bounds checking
   */
  protected setQValue(state: string, action: string, value: number): void {
    if (!this.qTable[state]) {
      this.qTable[state] = {};
    }

    const [min, max] = this.config.qBounds;
    this.qTable[state][action] = Math.max(min, Math.min(max, value));
  }

  /**
   * Get the maximum Q-value for a state across all known actions
   */
  protected getMaxQValue(state: string, availableActions: string[]): number {
    if (!this.qTable[state] || availableActions.length === 0) {
      return 0;
    }

    let maxQ = -Infinity;
    for (const action of availableActions) {
      const q = this.getQValue(state, action);
      if (q > maxQ) {
        maxQ = q;
      }
    }

    return Number.isFinite(maxQ) ? maxQ : 0;
  }

  /**
   * Get the best action for a state (exploitation)
   * Returns null if no actions are available
   */
  getBestAction(state: string, availableActions: string[]): string | null {
    if (availableActions.length === 0) {
      return null;
    }

    let bestAction = availableActions[0];
    let bestQ = this.getQValue(state, bestAction);

    for (let i = 1; i < availableActions.length; i++) {
      const action = availableActions[i];
      const q = this.getQValue(state, action);
      if (q > bestQ) {
        bestQ = q;
        bestAction = action;
      }
    }

    return bestAction;
  }

  /**
   * Select an action using epsilon-greedy strategy
   *
   * @param state - Current state representation
   * @param availableActions - List of available actions
   * @returns Selected action
   */
  selectAction(state: string, availableActions: string[]): string {
    if (availableActions.length === 0) {
      throw new Error('No available actions to select from');
    }

    // Exploration: random action
    if (random() < this.currentExplorationRate) {
      return randomChoice(availableActions);
    }

    // Exploitation: best known action
    return this.getBestAction(state, availableActions) ?? availableActions[0];
  }

  /**
   * Update Q-value using the Q-learning update rule:
   * Q(s,a) = Q(s,a) + α * (r + γ * max(Q(s',a')) - Q(s,a))
   *
   * @param state - Current state
   * @param action - Action taken
   * @param reward - Reward received
   * @param nextState - Resulting state
   * @param nextAvailableActions - Actions available in next state
   */
  update(
    state: string,
    action: string,
    reward: number,
    nextState: string,
    nextAvailableActions: string[]
  ): void {
    const oldQ = this.getQValue(state, action);
    const maxFutureQ = this.getMaxQValue(nextState, nextAvailableActions);

    // Q-learning update rule
    const newQ = oldQ + this.config.learningRate * (
      reward + this.config.discountFactor * maxFutureQ - oldQ
    );

    this.setQValue(state, action, newQ);
    this.totalReward += reward;

    // Track last state/action for delayed updates
    this.lastState = state;
    this.lastAction = action;
  }

  /**
   * Convenience method that combines action selection and delayed update
   * Call this at the start of each step, then call recordReward when reward is known
   */
  act(state: string, availableActions: string[]): string {
    // If we have previous state/action, we can now update with the transition
    // (Reward from previous action is collected separately via recordReward)

    const action = this.selectAction(state, availableActions);
    this.lastState = state;
    this.lastAction = action;
    return action;
  }

  /**
   * Record reward for the last action taken
   * This allows delayed reward feedback
   */
  recordReward(reward: number, nextState: string, nextAvailableActions: string[]): void {
    if (this.lastState !== null && this.lastAction !== null) {
      this.update(this.lastState, this.lastAction, reward, nextState, nextAvailableActions);
    }
  }

  /**
   * Signal end of episode - decay exploration rate
   */
  endEpisode(): void {
    this.episodeCount++;

    // Decay exploration rate
    this.currentExplorationRate = Math.max(
      this.config.minExploration,
      this.currentExplorationRate * this.config.explorationDecay
    );
  }

  /**
   * Reset exploration rate (e.g., for new training phase)
   */
  resetExploration(): void {
    this.currentExplorationRate = this.config.explorationRate;
  }

  /**
   * Get current exploration rate
   */
  getExplorationRate(): number {
    return this.currentExplorationRate;
  }

  /**
   * Get episode count
   */
  getEpisodeCount(): number {
    return this.episodeCount;
  }

  /**
   * Get total accumulated reward
   */
  getTotalReward(): number {
    return this.totalReward;
  }

  /**
   * Get Q-table size (number of state-action pairs)
   */
  getQTableSize(): number {
    let count = 0;
    for (const state of Object.keys(this.qTable)) {
      count += Object.keys(this.qTable[state]).length;
    }
    return count;
  }

  /**
   * Get number of unique states in Q-table
   */
  getStateCount(): number {
    return Object.keys(this.qTable).length;
  }

  /**
   * Export learning state for serialization (checkpoints)
   */
  exportLearningState(): LearningState {
    return {
      qTable: JSON.parse(JSON.stringify(this.qTable)),
      episodeCount: this.episodeCount,
      explorationRate: this.currentExplorationRate,
      lastState: this.lastState,
      lastAction: this.lastAction,
      totalReward: this.totalReward,
    };
  }

  /**
   * Import learning state from serialized form (checkpoint restore)
   */
  importLearningState(state: LearningState): void {
    if (state.qTable) {
      this.qTable = JSON.parse(JSON.stringify(state.qTable));
    }
    if (typeof state.episodeCount === 'number') {
      this.episodeCount = state.episodeCount;
    }
    if (typeof state.explorationRate === 'number') {
      this.currentExplorationRate = state.explorationRate;
    }
    if (state.lastState !== undefined) {
      this.lastState = state.lastState;
    }
    if (state.lastAction !== undefined) {
      this.lastAction = state.lastAction;
    }
    if (typeof state.totalReward === 'number') {
      this.totalReward = state.totalReward;
    }
  }

  /**
   * Clear all learned knowledge
   */
  reset(): void {
    this.qTable = {};
    this.episodeCount = 0;
    this.currentExplorationRate = this.config.explorationRate;
    this.lastState = null;
    this.lastAction = null;
    this.totalReward = 0;
  }

  /**
   * Merge Q-values from another learning mixin (for shared experience)
   * Uses weighted average based on episode counts
   */
  mergeFrom(other: LearningMixin, weight: number = 0.5): void {
    const clampedWeight = Math.max(0, Math.min(1, weight));

    for (const state of Object.keys(other.qTable)) {
      if (!this.qTable[state]) {
        this.qTable[state] = {};
      }

      for (const action of Object.keys(other.qTable[state])) {
        const otherQ = other.getQValue(state, action);
        const thisQ = this.getQValue(state, action);

        // Weighted average
        const mergedQ = thisQ * (1 - clampedWeight) + otherQ * clampedWeight;
        this.setQValue(state, action, mergedQ);
      }
    }
  }

  /**
   * Prune rarely-visited states to control memory usage
   * Removes states with Q-values close to zero across all actions
   */
  prune(threshold: number = 0.1): number {
    let removedCount = 0;
    const statesToRemove: string[] = [];

    for (const state of Object.keys(this.qTable)) {
      const actions = this.qTable[state];
      let maxAbsQ = 0;

      for (const action of Object.keys(actions)) {
        maxAbsQ = Math.max(maxAbsQ, Math.abs(actions[action]));
      }

      if (maxAbsQ < threshold) {
        statesToRemove.push(state);
        removedCount += Object.keys(actions).length;
      }
    }

    for (const state of statesToRemove) {
      delete this.qTable[state];
    }

    return removedCount;
  }

  /**
   * Get configuration
   */
  getConfig(): LearningConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (preserves Q-table)
   */
  updateConfig(updates: Partial<LearningConfig>): void {
    Object.assign(this.config, updates);
    this.validateConfig();
  }
}
