// Policy Gradient (REINFORCE) with Baseline
//
// Collects full episode trajectories and updates policy via Monte Carlo returns.
// Naturally handles 10-100 step delay between action and reward (e.g., vote → proposal outcome).
// Uses baseline (average return) for variance reduction.
//
// This is complementary to Q-learning:
// - Q-learning is better for immediate rewards (trading, staking)
// - Policy gradient is better for heavily delayed rewards (governance, delegation)

import { random } from '../../utils/random';

/**
 * A single step in an episode trajectory
 */
interface TrajectoryStep {
  state: string;
  action: string;
  reward: number;
  /** Log probability of the action under the policy */
  logProb: number;
}

/**
 * Configuration for policy gradient
 */
export interface PolicyGradientConfig {
  /** Learning rate for policy updates. Default: 0.01 */
  learningRate: number;
  /** Discount factor for computing returns. Default: 0.99 */
  discountFactor: number;
  /** Temperature for softmax action selection. Default: 1.0 */
  temperature: number;
  /** Minimum temperature (decays over episodes). Default: 0.1 */
  minTemperature: number;
  /** Temperature decay rate per episode. Default: 0.995 */
  temperatureDecay: number;
  /** Use baseline (average return) for variance reduction. Default: true */
  useBaseline: boolean;
  /** Maximum trajectory length before forced update. Default: 200 */
  maxTrajectoryLength: number;
  /** Entropy bonus weight (encourages exploration). Default: 0.01 */
  entropyWeight: number;
}

const DEFAULT_PG_CONFIG: PolicyGradientConfig = {
  learningRate: 0.01,
  discountFactor: 0.99,
  temperature: 1.0,
  minTemperature: 0.1,
  temperatureDecay: 0.995,
  useBaseline: true,
  maxTrajectoryLength: 200,
  entropyWeight: 0.01,
};

/**
 * Serializable state for policy gradient
 */
export interface PolicyGradientState {
  /** Policy parameters: state → action → preference (logit) */
  policy: { [state: string]: { [action: string]: number } };
  /** Running average of returns (baseline) */
  baseline: number;
  /** Episode count */
  episodeCount: number;
  /** Temperature */
  temperature: number;
}

/**
 * PolicyGradientMixin provides REINFORCE with baseline for agents
 * with heavily delayed rewards.
 *
 * Unlike Q-learning which updates after each step, policy gradient
 * collects a full trajectory (sequence of state-action-reward tuples)
 * and updates the policy at the end of the episode/trajectory using
 * Monte Carlo returns.
 *
 * The policy is a softmax over preference values (logits):
 *   π(a|s) = exp(h(s,a)/τ) / Σ exp(h(s,a')/τ)
 *
 * Update rule (REINFORCE with baseline):
 *   h(s,a) += α * (G_t - b) * ∇ log π(a|s)
 *
 * Where:
 *   G_t = discounted return from step t
 *   b = baseline (average return)
 *   ∇ log π(a|s) = 1 - π(a|s) for the taken action
 *
 * Usage:
 * ```typescript
 * const pg = new PolicyGradientMixin();
 * // During episode:
 * const action = pg.selectAction(state, availableActions);
 * pg.recordStep(state, action, reward);
 * // At episode end:
 * pg.endEpisode();
 * ```
 */
export class PolicyGradientMixin {
  /** Policy parameters: state → action → preference (logit) */
  private policy: { [state: string]: { [action: string]: number } } = {};
  private config: PolicyGradientConfig;
  private trajectory: TrajectoryStep[] = [];
  private baseline: number = 0;
  private episodeCount: number = 0;
  private temperature: number;
  private totalReward: number = 0;

  constructor(config: Partial<PolicyGradientConfig> = {}) {
    this.config = { ...DEFAULT_PG_CONFIG, ...config };
    this.temperature = this.config.temperature;
  }

  /**
   * Get preference value for a state-action pair
   */
  private getPreference(state: string, action: string): number {
    if (!this.policy[state]) return 0;
    return this.policy[state][action] ?? 0;
  }

  /**
   * Set preference value for a state-action pair
   */
  private setPreference(state: string, action: string, value: number): void {
    if (!this.policy[state]) {
      this.policy[state] = {};
    }
    // Clamp to prevent overflow in exp()
    this.policy[state][action] = Math.max(-20, Math.min(20, value));
  }

  /**
   * Compute softmax probabilities for all actions in a state
   */
  private softmax(state: string, actions: string[]): number[] {
    const prefs = actions.map(a => this.getPreference(state, a) / this.temperature);

    // Numerical stability: subtract max
    const maxPref = Math.max(...prefs);
    const exps = prefs.map(p => Math.exp(p - maxPref));
    const sum = exps.reduce((a, b) => a + b, 0);

    return exps.map(e => e / sum);
  }

  /**
   * Select action using softmax policy
   */
  selectAction(state: string, availableActions: string[]): string {
    if (availableActions.length === 0) {
      throw new Error('No available actions to select from');
    }

    if (availableActions.length === 1) {
      return availableActions[0];
    }

    const probs = this.softmax(state, availableActions);

    // Sample from distribution
    const r = random();
    let cumProb = 0;
    for (let i = 0; i < availableActions.length; i++) {
      cumProb += probs[i];
      if (r <= cumProb) {
        return availableActions[i];
      }
    }

    // Fallback (shouldn't reach here)
    return availableActions[availableActions.length - 1];
  }

  /**
   * Get action probability under current policy
   */
  getActionProbability(state: string, action: string, availableActions: string[]): number {
    const probs = this.softmax(state, availableActions);
    const idx = availableActions.indexOf(action);
    return idx >= 0 ? probs[idx] : 0;
  }

  /**
   * Record a step in the current trajectory
   */
  recordStep(state: string, action: string, reward: number, availableActions?: string[]): void {
    const actions = availableActions || [action];
    const prob = this.getActionProbability(state, action, actions);
    const logProb = Math.log(Math.max(prob, 1e-10));

    this.trajectory.push({ state, action, reward, logProb });
    this.totalReward += reward;

    // Force update if trajectory gets too long
    if (this.trajectory.length >= this.config.maxTrajectoryLength) {
      this.updatePolicy();
      this.trajectory = [];
    }
  }

  /**
   * End episode: compute returns and update policy
   */
  endEpisode(): void {
    if (this.trajectory.length > 0) {
      this.updatePolicy();
    }
    this.trajectory = [];
    this.episodeCount++;

    // Decay temperature
    this.temperature = Math.max(
      this.config.minTemperature,
      this.temperature * this.config.temperatureDecay
    );
  }

  /**
   * Update policy using REINFORCE with baseline
   */
  private updatePolicy(): void {
    const n = this.trajectory.length;
    if (n === 0) return;

    const gamma = this.config.discountFactor;

    // Compute discounted returns G_t for each step
    const returns: number[] = new Array(n);
    let G = 0;
    for (let t = n - 1; t >= 0; t--) {
      G = this.trajectory[t].reward + gamma * G;
      returns[t] = G;
    }

    // Update baseline (exponential moving average of episode return)
    const episodeReturn = returns[0];
    if (this.config.useBaseline) {
      this.baseline = 0.9 * this.baseline + 0.1 * episodeReturn;
    }

    // Compute entropy for regularization
    // (encourages exploration by penalizing overly deterministic policies)
    let totalEntropy = 0;

    // Update policy parameters
    const alpha = this.config.learningRate;
    for (let t = 0; t < n; t++) {
      const { state, action } = this.trajectory[t];
      const advantage = returns[t] - (this.config.useBaseline ? this.baseline : 0);

      // Get current probability of the taken action
      // We need all actions that were available, but since we don't store them,
      // we use all actions known for this state
      const knownActions = this.policy[state]
        ? Object.keys(this.policy[state])
        : [action];
      // Ensure the taken action is included
      if (!knownActions.includes(action)) {
        knownActions.push(action);
      }

      const probs = this.softmax(state, knownActions);
      const actionIdx = knownActions.indexOf(action);
      const prob = probs[actionIdx];

      // Policy gradient: ∇ log π(a|s) * (G_t - b)
      // For softmax: ∇h(s,a) = (1 - π(a|s)) * advantage for taken action
      //              ∇h(s,a') = -π(a'|s) * advantage for other actions
      for (let i = 0; i < knownActions.length; i++) {
        const a = knownActions[i];
        const currentPref = this.getPreference(state, a);

        if (i === actionIdx) {
          // Taken action: increase preference proportional to advantage
          this.setPreference(state, a, currentPref + alpha * advantage * (1 - prob));
        } else {
          // Other actions: decrease preference proportional to advantage
          this.setPreference(state, a, currentPref - alpha * advantage * probs[i]);
        }
      }

      // Entropy: -Σ π(a|s) log π(a|s)
      for (let i = 0; i < probs.length; i++) {
        if (probs[i] > 1e-10) {
          totalEntropy -= probs[i] * Math.log(probs[i]);
        }
      }
    }

    // Apply entropy bonus (increase preferences toward more uniform distribution)
    if (this.config.entropyWeight > 0 && totalEntropy > 0) {
      // The entropy bonus is implicitly handled by temperature,
      // but we can also explicitly flatten preferences when entropy is low
      const avgEntropy = totalEntropy / n;
      if (avgEntropy < 0.5) { // Low entropy = too deterministic
        // Decay all preferences slightly toward zero
        for (const state of Object.keys(this.policy)) {
          for (const action of Object.keys(this.policy[state])) {
            this.policy[state][action] *= (1 - this.config.entropyWeight);
          }
        }
      }
    }
  }

  /**
   * Export state for serialization
   */
  exportState(): PolicyGradientState {
    return {
      policy: JSON.parse(JSON.stringify(this.policy)),
      baseline: this.baseline,
      episodeCount: this.episodeCount,
      temperature: this.temperature,
    };
  }

  /**
   * Import state from serialization
   */
  importState(state: PolicyGradientState): void {
    if (state.policy) {
      this.policy = JSON.parse(JSON.stringify(state.policy));
    }
    if (typeof state.baseline === 'number') {
      this.baseline = state.baseline;
    }
    if (typeof state.episodeCount === 'number') {
      this.episodeCount = state.episodeCount;
    }
    if (typeof state.temperature === 'number') {
      this.temperature = state.temperature;
    }
  }

  /**
   * Reset all learned state
   */
  reset(): void {
    this.policy = {};
    this.trajectory = [];
    this.baseline = 0;
    this.episodeCount = 0;
    this.temperature = this.config.temperature;
    this.totalReward = 0;
  }

  /**
   * Get number of states in policy
   */
  getStateCount(): number {
    return Object.keys(this.policy).length;
  }

  /**
   * Get total reward accumulated
   */
  getTotalReward(): number {
    return this.totalReward;
  }

  /**
   * Get episode count
   */
  getEpisodeCount(): number {
    return this.episodeCount;
  }

  /**
   * Get current temperature
   */
  getTemperature(): number {
    return this.temperature;
  }

  /**
   * Get baseline value
   */
  getBaseline(): number {
    return this.baseline;
  }

  /**
   * Merge policy from another PolicyGradientMixin
   */
  mergeFrom(other: PolicyGradientMixin, weight: number = 0.3): void {
    const clampedWeight = Math.max(0, Math.min(1, weight));
    const otherPolicy = (other as any).policy;

    for (const state of Object.keys(otherPolicy)) {
      if (!this.policy[state]) {
        this.policy[state] = {};
      }
      for (const action of Object.keys(otherPolicy[state])) {
        const thisPref = this.getPreference(state, action);
        const otherPref = otherPolicy[state][action] ?? 0;
        this.setPreference(state, action,
          thisPref * (1 - clampedWeight) + otherPref * clampedWeight
        );
      }
    }
  }
}
