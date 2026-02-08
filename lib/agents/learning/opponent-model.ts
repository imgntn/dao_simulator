// Opponent Modeling for Adversarial Agents
//
// Tracks observed opponent actions and builds a predictive model.
// Adjusts Q-updates to account for expected opponent behavior.
// Creates proper attacker-defender arms race dynamics.
//
// Best for: FlashLoanAttacker vs Whistleblower/Auditor pairs
//
// The model maintains per-opponent action frequency distributions
// and uses them to compute "expected opponent response" as part
// of the agent's value function.

/**
 * Observation of an opponent's action
 */
export interface OpponentObservation {
  /** Opponent's unique ID */
  opponentId: string;
  /** The action the opponent took */
  action: string;
  /** The state in which the action was taken */
  state: string;
  /** Simulation step */
  step: number;
}

/**
 * Per-opponent action frequency model
 */
interface ActionFrequencyModel {
  /** state → action → count */
  actionCounts: Map<string, Map<string, number>>;
  /** Total observations for this opponent */
  totalObservations: number;
  /** Last observed step */
  lastObservedStep: number;
}

/**
 * Configuration for opponent modeling
 */
export interface OpponentModelConfig {
  /** How many recent observations to consider per opponent. Default: 200 */
  maxObservationsPerOpponent: number;
  /** Smoothing factor for action probabilities (Laplace smoothing). Default: 1.0 */
  smoothingFactor: number;
  /** Weight for opponent-adjusted Q-values [0,1]. Default: 0.3 */
  opponentWeight: number;
  /** Maximum number of opponents to track. Default: 20 */
  maxTrackedOpponents: number;
  /** Decay factor for old observations. Default: 0.99 */
  observationDecay: number;
}

const DEFAULT_OPPONENT_CONFIG: OpponentModelConfig = {
  maxObservationsPerOpponent: 200,
  smoothingFactor: 1.0,
  opponentWeight: 0.3,
  maxTrackedOpponents: 20,
  observationDecay: 0.99,
};

/**
 * Serializable opponent model state
 */
export interface OpponentModelState {
  models: Array<{
    opponentId: string;
    actionCounts: { [state: string]: { [action: string]: number } };
    totalObservations: number;
    lastObservedStep: number;
  }>;
}

/**
 * OpponentModel tracks and predicts opponent behavior.
 *
 * Key capabilities:
 * 1. Records opponent actions observed through events
 * 2. Builds per-state action frequency distributions
 * 3. Predicts likely opponent actions
 * 4. Computes opponent-adjusted Q-value estimates
 *
 * Usage:
 * ```typescript
 * const model = new OpponentModel();
 *
 * // Record observations (from event bus or direct observation)
 * model.recordObservation({
 *   opponentId: 'Whistleblower_0',
 *   action: 'investigate',
 *   state: 'high_risk',
 *   step: currentStep,
 * });
 *
 * // Predict opponent's next action
 * const prediction = model.predictAction('Whistleblower_0', 'high_risk');
 * // { action: 'investigate', probability: 0.65 }
 *
 * // Get opponent-adjusted Q-value
 * // This modifies Q(s,a) based on expected opponent response
 * const adjustedQ = model.adjustQValue(
 *   myQValue,
 *   'attack',
 *   'high_risk',
 *   rewardIfOpponentCounters,
 *   rewardIfOpponentDoesNotCounter,
 * );
 * ```
 */
export class OpponentModel {
  private models: Map<string, ActionFrequencyModel> = new Map();
  private config: OpponentModelConfig;

  constructor(config: Partial<OpponentModelConfig> = {}) {
    this.config = { ...DEFAULT_OPPONENT_CONFIG, ...config };
  }

  /**
   * Record an observation of an opponent's action
   */
  recordObservation(obs: OpponentObservation): void {
    let model = this.models.get(obs.opponentId);

    if (!model) {
      // Check capacity
      if (this.models.size >= this.config.maxTrackedOpponents) {
        // Evict least recently observed opponent
        let oldestId: string | null = null;
        let oldestStep = Infinity;
        for (const [id, m] of this.models) {
          if (m.lastObservedStep < oldestStep) {
            oldestStep = m.lastObservedStep;
            oldestId = id;
          }
        }
        if (oldestId) {
          this.models.delete(oldestId);
        }
      }

      model = {
        actionCounts: new Map(),
        totalObservations: 0,
        lastObservedStep: obs.step,
      };
      this.models.set(obs.opponentId, model);
    }

    // Get or create state-action counts
    let stateCounts = model.actionCounts.get(obs.state);
    if (!stateCounts) {
      stateCounts = new Map();
      model.actionCounts.set(obs.state, stateCounts);
    }

    // Increment count
    stateCounts.set(obs.action, (stateCounts.get(obs.action) || 0) + 1);
    model.totalObservations++;
    model.lastObservedStep = obs.step;

    // Decay old observations to weight recent behavior more
    if (model.totalObservations > this.config.maxObservationsPerOpponent) {
      this.decayObservations(model);
    }
  }

  /**
   * Decay all observation counts for a model
   */
  private decayObservations(model: ActionFrequencyModel): void {
    const decay = this.config.observationDecay;
    let newTotal = 0;

    for (const [state, counts] of model.actionCounts) {
      const toRemove: string[] = [];
      for (const [action, count] of counts) {
        const decayed = count * decay;
        if (decayed < 0.1) {
          toRemove.push(action);
        } else {
          counts.set(action, decayed);
          newTotal += decayed;
        }
      }
      for (const action of toRemove) {
        counts.delete(action);
      }
      if (counts.size === 0) {
        model.actionCounts.delete(state);
      }
    }

    model.totalObservations = newTotal;
  }

  /**
   * Predict the most likely action an opponent will take in a given state.
   *
   * @returns The predicted action and its probability, or null if no data
   */
  predictAction(
    opponentId: string,
    state: string
  ): { action: string; probability: number } | null {
    const model = this.models.get(opponentId);
    if (!model) return null;

    const stateCounts = model.actionCounts.get(state);
    if (!stateCounts || stateCounts.size === 0) return null;

    // Find most frequent action with Laplace smoothing
    const smoothing = this.config.smoothingFactor;
    const numActions = stateCounts.size;
    const totalCount = Array.from(stateCounts.values()).reduce((a, b) => a + b, 0);
    const denominator = totalCount + smoothing * numActions;

    let bestAction: string | null = null;
    let bestProb = 0;

    for (const [action, count] of stateCounts) {
      const prob = (count + smoothing) / denominator;
      if (prob > bestProb) {
        bestProb = prob;
        bestAction = action;
      }
    }

    return bestAction ? { action: bestAction, probability: bestProb } : null;
  }

  /**
   * Get full action probability distribution for an opponent in a state
   */
  getActionDistribution(
    opponentId: string,
    state: string
  ): Map<string, number> {
    const distribution = new Map<string, number>();
    const model = this.models.get(opponentId);
    if (!model) return distribution;

    const stateCounts = model.actionCounts.get(state);
    if (!stateCounts || stateCounts.size === 0) return distribution;

    const smoothing = this.config.smoothingFactor;
    const numActions = stateCounts.size;
    const totalCount = Array.from(stateCounts.values()).reduce((a, b) => a + b, 0);
    const denominator = totalCount + smoothing * numActions;

    for (const [action, count] of stateCounts) {
      distribution.set(action, (count + smoothing) / denominator);
    }

    return distribution;
  }

  /**
   * Adjust a Q-value based on expected opponent behavior.
   *
   * Computes: Q_adj = (1-w)*Q + w*(p_counter*R_counter + p_no_counter*R_no_counter)
   *
   * Where:
   *   w = opponent weight
   *   p_counter = probability opponent takes a counter-action
   *   R_counter = reward if opponent counters
   *   R_no_counter = reward if opponent doesn't counter
   *
   * @param qValue - Original Q-value
   * @param myAction - Action being evaluated
   * @param state - Current state
   * @param opponentId - Target opponent
   * @param counterActions - Set of opponent actions that counter myAction
   * @param rewardIfCountered - Reward if opponent successfully counters
   * @param rewardIfNotCountered - Reward if opponent doesn't counter
   */
  adjustQValue(
    qValue: number,
    _myAction: string,
    state: string,
    opponentId: string,
    counterActions: Set<string>,
    rewardIfCountered: number,
    rewardIfNotCountered: number
  ): number {
    const distribution = this.getActionDistribution(opponentId, state);
    if (distribution.size === 0) return qValue;

    // Calculate probability of being countered
    let pCounter = 0;
    for (const [action, prob] of distribution) {
      if (counterActions.has(action)) {
        pCounter += prob;
      }
    }
    const pNoCounter = 1 - pCounter;

    // Expected value given opponent's response
    const expectedOpponentValue = pCounter * rewardIfCountered + pNoCounter * rewardIfNotCountered;

    // Blend with original Q-value
    const w = this.config.opponentWeight;
    return (1 - w) * qValue + w * expectedOpponentValue;
  }

  /**
   * Get number of tracked opponents
   */
  getTrackedOpponentCount(): number {
    return this.models.size;
  }

  /**
   * Get total observations across all opponents
   */
  getTotalObservations(): number {
    let total = 0;
    for (const model of this.models.values()) {
      total += model.totalObservations;
    }
    return total;
  }

  /**
   * Get list of tracked opponent IDs
   */
  getTrackedOpponents(): string[] {
    return Array.from(this.models.keys());
  }

  /**
   * Export state for serialization
   */
  exportState(): OpponentModelState {
    const models: OpponentModelState['models'] = [];

    for (const [opponentId, model] of this.models) {
      const actionCounts: { [state: string]: { [action: string]: number } } = {};
      for (const [state, counts] of model.actionCounts) {
        actionCounts[state] = {};
        for (const [action, count] of counts) {
          actionCounts[state][action] = count;
        }
      }

      models.push({
        opponentId,
        actionCounts,
        totalObservations: model.totalObservations,
        lastObservedStep: model.lastObservedStep,
      });
    }

    return { models };
  }

  /**
   * Import state from serialization
   */
  importState(state: OpponentModelState): void {
    this.models.clear();

    for (const entry of state.models) {
      const actionCounts = new Map<string, Map<string, number>>();
      for (const [stateKey, counts] of Object.entries(entry.actionCounts)) {
        const countMap = new Map<string, number>();
        for (const [action, count] of Object.entries(counts)) {
          countMap.set(action, count);
        }
        actionCounts.set(stateKey, countMap);
      }

      this.models.set(entry.opponentId, {
        actionCounts,
        totalObservations: entry.totalObservations,
        lastObservedStep: entry.lastObservedStep,
      });
    }
  }

  /**
   * Reset all models
   */
  reset(): void {
    this.models.clear();
  }
}
