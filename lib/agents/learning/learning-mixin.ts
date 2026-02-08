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
  /** Enable adaptive learning rate based on visit counts. Default: true */
  adaptiveLearningRate: boolean;
  /** Decay coefficient for adaptive rate: α_eff = α / (1 + coefficient * visits). Default: 0.01 */
  adaptiveLearningRateDecay: number;
  /** Enable curiosity bonus (UCB1-inspired). Default: false */
  curiosityEnabled: boolean;
  /** Weight for curiosity bonus: bonus = weight / sqrt(1 + visits). Default: 1.0 */
  curiosityWeight: number;
  /** Enable experience replay. Default: false */
  experienceReplayEnabled: boolean;
  /** Size of experience replay buffer. Default: 1000 */
  experienceReplaySize: number;
  /** Mini-batch size for experience replay. Default: 8 */
  experienceReplayBatchSize: number;
  /** How often to replay (every N updates). Default: 5 */
  experienceReplayInterval: number;
  /** Enable eligibility traces Q(λ). Default: false */
  eligibilityTracesEnabled: boolean;
  /** Lambda for trace decay (0 = Q-learning, 1 = Monte Carlo). Default: 0.7 */
  eligibilityLambda: number;
  /** Maximum trace length (oldest entries evicted). Default: 50 */
  eligibilityMaxLength: number;
  /** Enable n-step returns. Default: false */
  nStepEnabled: boolean;
  /** Number of steps for n-step returns. Default: 3 */
  nStepN: number;
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
  visitCounts?: { [stateAction: string]: number };
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
  adaptiveLearningRate: true,
  adaptiveLearningRateDecay: 0.01,
  curiosityEnabled: false,
  curiosityWeight: 1.0,
  experienceReplayEnabled: false,
  experienceReplaySize: 1000,
  experienceReplayBatchSize: 8,
  experienceReplayInterval: 5,
  eligibilityTracesEnabled: false,
  eligibilityLambda: 0.7,
  eligibilityMaxLength: 50,
  nStepEnabled: false,
  nStepN: 3,
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
/**
 * Experience transition for replay buffer
 */
export interface Transition {
  state: string;
  action: string;
  reward: number;
  nextState: string;
  nextActions: string[];
  tdError: number;
}

/**
 * Eligibility trace entry
 */
interface TraceEntry {
  state: string;
  action: string;
  eligibility: number;
}

/**
 * N-step buffer entry
 */
interface NStepEntry {
  state: string;
  action: string;
  reward: number;
  nextActions: string[];
}

export class LearningMixin {
  protected qTable: QTable = {};
  protected config: LearningConfig;
  protected episodeCount: number = 0;
  protected currentExplorationRate: number;
  protected lastState: string | null = null;
  protected lastAction: string | null = null;
  protected totalReward: number = 0;

  // Visit counts for adaptive learning rate and curiosity exploration
  protected visitCounts: Map<string, number> = new Map();

  // Experience replay buffer
  protected replayBuffer: Transition[] = [];
  protected replayHead: number = 0;
  protected replayCount: number = 0;
  protected updatesSinceReplay: number = 0;

  // Eligibility traces
  protected traces: TraceEntry[] = [];

  // N-step return buffer
  protected nStepBuffer: NStepEntry[] = [];

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
   * Get visit count for a state-action pair
   */
  getVisitCount(state: string, action: string): number {
    return this.visitCounts.get(`${state}|${action}`) || 0;
  }

  /**
   * Increment visit count for a state-action pair
   */
  protected incrementVisitCount(state: string, action: string): void {
    const key = `${state}|${action}`;
    this.visitCounts.set(key, (this.visitCounts.get(key) || 0) + 1);
  }

  /**
   * Get effective learning rate for a state-action pair
   * Uses adaptive decay: α_eff = α / (1 + decay * visits)
   * Satisfies Robbins-Monro convergence conditions
   */
  protected getEffectiveLearningRate(state: string, action: string): number {
    if (!this.config.adaptiveLearningRate) {
      return this.config.learningRate;
    }
    const visits = this.getVisitCount(state, action);
    return this.config.learningRate / (1 + this.config.adaptiveLearningRateDecay * visits);
  }

  /**
   * Select an action using epsilon-greedy strategy with optional curiosity bonus
   *
   * When curiosity is enabled, adds UCB1-inspired bonus to Q-values:
   * effective_Q = Q(s,a) + curiosity_weight / sqrt(1 + visit_count)
   * This preferentially explores under-visited state-action pairs.
   *
   * @param state - Current state representation
   * @param availableActions - List of available actions
   * @returns Selected action
   */
  selectAction(state: string, availableActions: string[]): string {
    if (availableActions.length === 0) {
      throw new Error('No available actions to select from');
    }

    // Exploration: random action (standard epsilon-greedy)
    if (random() < this.currentExplorationRate) {
      return randomChoice(availableActions);
    }

    // Exploitation: use curiosity-augmented Q-values if enabled
    if (this.config.curiosityEnabled) {
      return this.selectWithCuriosity(state, availableActions);
    }

    // Standard exploitation: best known action
    return this.getBestAction(state, availableActions) ?? availableActions[0];
  }

  /**
   * Select action with curiosity bonus (UCB1-inspired)
   * effective_Q = Q(s,a) + curiosity_weight / sqrt(1 + visit_count)
   */
  protected selectWithCuriosity(state: string, availableActions: string[]): string {
    let bestAction = availableActions[0];
    let bestScore = -Infinity;

    for (const action of availableActions) {
      const q = this.getQValue(state, action);
      const visits = this.getVisitCount(state, action);
      const bonus = this.config.curiosityWeight / Math.sqrt(1 + visits);
      const score = q + bonus;

      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    }

    return bestAction;
  }

  /**
   * Update Q-value using the Q-learning update rule:
   * Q(s,a) = Q(s,a) + α_eff * (r + γ * max(Q(s',a')) - Q(s,a))
   *
   * With adaptive learning rate: α_eff = α / (1 + decay * visits)
   * Also handles experience replay, eligibility traces, and n-step returns.
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
    // Increment visit count
    this.incrementVisitCount(state, action);

    // N-step returns: buffer transitions and defer Q-update
    if (this.config.nStepEnabled) {
      this.nStepBuffer.push({ state, action, reward, nextActions: nextAvailableActions });

      if (this.nStepBuffer.length >= this.config.nStepN) {
        this.processNStepUpdate(nextState, nextAvailableActions);
      }
      this.totalReward += reward;
      this.lastState = state;
      this.lastAction = action;
      return;
    }

    // Standard single-step Q-update
    const tdError = this.performQUpdate(state, action, reward, nextState, nextAvailableActions);

    // Eligibility traces: propagate TD-error backward
    if (this.config.eligibilityTracesEnabled) {
      this.updateTraces(state, action, tdError, nextAvailableActions);
    }

    // Experience replay: store transition and periodically replay
    if (this.config.experienceReplayEnabled) {
      this.storeTransition(state, action, reward, nextState, nextAvailableActions, tdError);
      this.updatesSinceReplay++;

      if (this.updatesSinceReplay >= this.config.experienceReplayInterval) {
        this.replayBatch();
        this.updatesSinceReplay = 0;
      }
    }

    this.totalReward += reward;
    this.lastState = state;
    this.lastAction = action;
  }

  /**
   * Core Q-update with adaptive learning rate. Returns TD-error.
   */
  protected performQUpdate(
    state: string,
    action: string,
    reward: number,
    nextState: string,
    nextAvailableActions: string[]
  ): number {
    const oldQ = this.getQValue(state, action);
    const maxFutureQ = this.getMaxQValue(nextState, nextAvailableActions);
    const tdError = reward + this.config.discountFactor * maxFutureQ - oldQ;

    const alpha = this.getEffectiveLearningRate(state, action);
    const newQ = oldQ + alpha * tdError;

    this.setQValue(state, action, newQ);
    return tdError;
  }

  // --- Experience Replay ---

  /**
   * Store a transition in the replay buffer (circular)
   */
  protected storeTransition(
    state: string,
    action: string,
    reward: number,
    nextState: string,
    nextActions: string[],
    tdError: number
  ): void {
    const transition: Transition = { state, action, reward, nextState, nextActions, tdError: Math.abs(tdError) };
    const maxSize = this.config.experienceReplaySize;

    if (this.replayBuffer.length < maxSize) {
      this.replayBuffer.push(transition);
    } else {
      this.replayBuffer[this.replayHead] = transition;
    }
    this.replayHead = (this.replayHead + 1) % maxSize;
    this.replayCount++;
  }

  /**
   * Sample and replay a mini-batch of transitions
   * Uses prioritized sampling based on TD-error magnitude
   */
  protected replayBatch(): void {
    const bufLen = this.replayBuffer.length;
    if (bufLen === 0) return;

    const batchSize = Math.min(this.config.experienceReplayBatchSize, bufLen);

    // Compute sampling weights from TD-error (prioritized replay)
    const totalPriority = this.replayBuffer.reduce((sum, t) => sum + t.tdError + 0.01, 0);

    for (let i = 0; i < batchSize; i++) {
      // Weighted random sampling
      let r = random() * totalPriority;
      let idx = 0;
      for (let j = 0; j < bufLen; j++) {
        r -= this.replayBuffer[j].tdError + 0.01;
        if (r <= 0) {
          idx = j;
          break;
        }
      }

      const t = this.replayBuffer[idx];
      // Replay update (uses adaptive learning rate but doesn't increment visit count)
      const oldQ = this.getQValue(t.state, t.action);
      const maxFutureQ = this.getMaxQValue(t.nextState, t.nextActions);
      const newTdError = t.reward + this.config.discountFactor * maxFutureQ - oldQ;
      const alpha = this.getEffectiveLearningRate(t.state, t.action);
      this.setQValue(t.state, t.action, oldQ + alpha * newTdError);

      // Update stored TD-error for future prioritized sampling
      this.replayBuffer[idx].tdError = Math.abs(newTdError);
    }
  }

  // --- Eligibility Traces ---

  /**
   * Update eligibility traces after a Q-update
   * Propagates TD-error backward through recent state-action history
   */
  protected updateTraces(state: string, action: string, tdError: number, _nextActions: string[]): void {
    const lambda = this.config.eligibilityLambda;
    const gamma = this.config.discountFactor;

    // Decay existing traces and apply TD-error
    for (let i = this.traces.length - 1; i >= 0; i--) {
      const trace = this.traces[i];
      trace.eligibility *= gamma * lambda;

      // Prune negligible traces
      if (trace.eligibility < 0.001) {
        this.traces.splice(i, 1);
        continue;
      }

      // Apply proportional update to past state-action pairs
      const alpha = this.getEffectiveLearningRate(trace.state, trace.action);
      const oldQ = this.getQValue(trace.state, trace.action);
      this.setQValue(trace.state, trace.action, oldQ + alpha * tdError * trace.eligibility);
    }

    // Add current state-action to traces with eligibility 1.0 (replacing if exists)
    const existingIdx = this.traces.findIndex(t => t.state === state && t.action === action);
    if (existingIdx >= 0) {
      this.traces[existingIdx].eligibility = 1.0;
    } else {
      this.traces.push({ state, action, eligibility: 1.0 });

      // Evict oldest if exceeding max length
      if (this.traces.length > this.config.eligibilityMaxLength) {
        this.traces.shift();
      }
    }
  }

  // --- N-Step Returns ---

  /**
   * Process n-step return update
   * Computes: G = r_t + γ*r_{t+1} + ... + γ^(n-1)*r_{t+n-1} + γ^n * max_a Q(s_{t+n}, a)
   */
  protected processNStepUpdate(finalNextState: string, finalNextActions: string[]): void {
    if (this.nStepBuffer.length === 0) return;

    const n = this.nStepBuffer.length;
    const gamma = this.config.discountFactor;

    // Compute discounted n-step return
    let G = this.getMaxQValue(finalNextState, finalNextActions);
    for (let i = n - 1; i >= 0; i--) {
      G = this.nStepBuffer[i].reward + gamma * G;
    }

    // Update the first state-action pair with the n-step return
    const first = this.nStepBuffer[0];
    const oldQ = this.getQValue(first.state, first.action);
    const alpha = this.getEffectiveLearningRate(first.state, first.action);
    const tdError = G - oldQ;
    this.setQValue(first.state, first.action, oldQ + alpha * tdError);

    // Shift buffer: remove the first entry
    this.nStepBuffer.shift();
  }

  /**
   * Flush remaining n-step buffer entries (call at end of episode)
   */
  protected flushNStepBuffer(): void {
    while (this.nStepBuffer.length > 0) {
      const last = this.nStepBuffer[this.nStepBuffer.length - 1];
      // Use terminal state (no future value)
      this.processNStepUpdate(last.state, last.nextActions);
    }
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
   * Signal end of episode - decay exploration rate, flush buffers
   */
  endEpisode(): void {
    this.episodeCount++;

    // Decay exploration rate
    this.currentExplorationRate = Math.max(
      this.config.minExploration,
      this.currentExplorationRate * this.config.explorationDecay
    );

    // Flush n-step buffer with terminal returns
    if (this.config.nStepEnabled) {
      this.flushNStepBuffer();
    }

    // Clear eligibility traces (episode boundary)
    if (this.config.eligibilityTracesEnabled) {
      this.traces = [];
    }
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
    // Convert visit counts Map to plain object for serialization
    const visitCountsObj: { [key: string]: number } = {};
    for (const [key, count] of this.visitCounts) {
      visitCountsObj[key] = count;
    }

    return {
      qTable: JSON.parse(JSON.stringify(this.qTable)),
      episodeCount: this.episodeCount,
      explorationRate: this.currentExplorationRate,
      lastState: this.lastState,
      lastAction: this.lastAction,
      totalReward: this.totalReward,
      visitCounts: visitCountsObj,
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
    if (state.visitCounts) {
      this.visitCounts = new Map(Object.entries(state.visitCounts));
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
    this.visitCounts.clear();
    this.replayBuffer = [];
    this.replayHead = 0;
    this.replayCount = 0;
    this.updatesSinceReplay = 0;
    this.traces = [];
    this.nStepBuffer = [];
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
   * Get total visit count across all state-action pairs
   */
  getTotalVisits(): number {
    let total = 0;
    for (const count of this.visitCounts.values()) {
      total += count;
    }
    return total;
  }

  /**
   * Get number of unique visited state-action pairs
   */
  getVisitedPairCount(): number {
    return this.visitCounts.size;
  }

  /**
   * Get experience replay buffer size
   */
  getReplayBufferSize(): number {
    return this.replayBuffer.length;
  }

  /**
   * Get current eligibility trace length
   */
  getTraceLength(): number {
    return this.traces.length;
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
