// Deep Q-Network (DQN) Mixin
//
// Neural network approximates Q(s,a) instead of tabular lookup.
// Enables continuous state inputs (raw price, volume, etc.) without discretization.
// Uses experience replay and target network soft-updates for stability.
//
// Best for: Financial agents (RLTrader, MarketMaker, Speculator) with rich state spaces.
// For governance agents with delayed rewards, prefer PolicyGradientMixin.

import { random, randomChoice } from '../../utils/random';
import { NeuralNetwork, type LayerDef, type NetworkState } from './neural-network';

/**
 * Experience transition for DQN replay buffer
 */
interface DQNTransition {
  state: number[];
  actionIndex: number;
  reward: number;
  nextState: number[];
  done: boolean;
  priority: number;
}

/**
 * Configuration for DQN
 */
export interface DQNConfig {
  /** Neural network learning rate. Default: 0.001 */
  learningRate: number;
  /** Discount factor (gamma). Default: 0.95 */
  discountFactor: number;
  /** Exploration rate (epsilon). Default: 0.3 */
  explorationRate: number;
  /** Epsilon decay per episode. Default: 0.995 */
  explorationDecay: number;
  /** Minimum epsilon. Default: 0.01 */
  minExploration: number;
  /** Hidden layer definitions. Default: [32 relu, 16 relu] */
  hiddenLayers: LayerDef[];
  /** Experience replay buffer size. Default: 2000 */
  replayBufferSize: number;
  /** Mini-batch size for training. Default: 32 */
  batchSize: number;
  /** Train every N steps. Default: 4 */
  trainInterval: number;
  /** Soft-update rate for target network (tau). Default: 0.01 */
  targetUpdateRate: number;
  /** Update target network every N steps. Default: 10 */
  targetUpdateInterval: number;
  /** Reward clipping bounds. Default: [-10, 10] */
  rewardClip: [number, number];
}

const DEFAULT_DQN_CONFIG: DQNConfig = {
  learningRate: 0.001,
  discountFactor: 0.95,
  explorationRate: 0.3,
  explorationDecay: 0.995,
  minExploration: 0.01,
  hiddenLayers: [
    { size: 32, activation: 'relu' },
    { size: 16, activation: 'relu' },
  ],
  replayBufferSize: 2000,
  batchSize: 32,
  trainInterval: 4,
  targetUpdateRate: 0.01,
  targetUpdateInterval: 10,
  rewardClip: [-10, 10],
};

/**
 * Serializable DQN state
 */
export interface DQNState {
  onlineNetwork: NetworkState;
  targetNetwork: NetworkState;
  explorationRate: number;
  episodeCount: number;
  totalReward: number;
  stepCount: number;
}

/**
 * DQNMixin provides Deep Q-Network learning for agents.
 *
 * Key differences from tabular Q-learning:
 * - State is a continuous vector (no discretization needed)
 * - Q-values approximated by neural network
 * - Target network for stable training
 * - Experience replay for sample efficiency
 *
 * Usage:
 * ```typescript
 * const dqn = new DQNMixin(stateSize, actionCount);
 * // During step:
 * const stateVec = this.getStateVector(); // number[]
 * const actionIdx = dqn.selectAction(stateVec);
 * const action = MY_ACTIONS[actionIdx];
 * // ... execute action, get reward ...
 * const nextStateVec = this.getStateVector();
 * dqn.update(stateVec, actionIdx, reward, nextStateVec, false);
 * ```
 */
export class DQNMixin {
  private onlineNetwork: NeuralNetwork;
  private targetNetwork: NeuralNetwork;
  private config: DQNConfig;
  private actions: string[];
  private stateSize: number;

  // Experience replay
  private replayBuffer: DQNTransition[] = [];
  private replayHead: number = 0;

  // State tracking
  private explorationRate: number;
  private episodeCount: number = 0;
  private totalReward: number = 0;
  private stepCount: number = 0;
  private lastTrainStep: number = 0;
  private lastTargetUpdateStep: number = 0;

  /**
   * @param stateSize - Dimension of the continuous state vector
   * @param actions - List of available action names
   * @param config - DQN configuration
   */
  constructor(stateSize: number, actions: string[], config: Partial<DQNConfig> = {}) {
    this.config = { ...DEFAULT_DQN_CONFIG, ...config };
    this.stateSize = stateSize;
    this.actions = actions;
    this.explorationRate = this.config.explorationRate;

    // Build network architecture: input → hidden layers → output (one Q-value per action)
    const layers: LayerDef[] = [
      ...this.config.hiddenLayers,
      { size: actions.length, activation: 'linear' }, // Q-values are unbounded
    ];

    this.onlineNetwork = new NeuralNetwork(stateSize, layers);
    this.targetNetwork = new NeuralNetwork(stateSize, layers);
    this.targetNetwork.copyFrom(this.onlineNetwork);
  }

  /**
   * Select action using epsilon-greedy over Q-values from the online network
   */
  selectAction(state: number[]): number {
    // Exploration
    if (random() < this.explorationRate) {
      return Math.floor(random() * this.actions.length);
    }

    // Exploitation: choose action with highest Q-value
    const qValues = this.onlineNetwork.forward(state);
    let bestIdx = 0;
    let bestQ = qValues[0];
    for (let i = 1; i < qValues.length; i++) {
      if (qValues[i] > bestQ) {
        bestQ = qValues[i];
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  /**
   * Select action by name
   */
  selectActionName(state: number[]): string {
    return this.actions[this.selectAction(state)];
  }

  /**
   * Get Q-values for all actions in a state
   */
  getQValues(state: number[]): number[] {
    return this.onlineNetwork.forward(state);
  }

  /**
   * Store transition and train if scheduled
   */
  update(
    state: number[],
    actionIndex: number,
    reward: number,
    nextState: number[],
    done: boolean
  ): void {
    // Clip reward
    const clippedReward = Math.max(
      this.config.rewardClip[0],
      Math.min(this.config.rewardClip[1], reward)
    );

    // Compute initial TD-error for prioritized replay
    const qValues = this.onlineNetwork.forward(state);
    const targetQ = this.targetNetwork.forward(nextState);
    const maxTargetQ = Math.max(...targetQ);
    const target = clippedReward + (done ? 0 : this.config.discountFactor * maxTargetQ);
    const tdError = Math.abs(target - qValues[actionIndex]);

    // Store in replay buffer
    this.storeTransition({
      state: [...state],
      actionIndex,
      reward: clippedReward,
      nextState: [...nextState],
      done,
      priority: tdError + 0.01,
    });

    this.totalReward += reward;
    this.stepCount++;

    // Train every N steps
    if (this.stepCount - this.lastTrainStep >= this.config.trainInterval) {
      this.train();
      this.lastTrainStep = this.stepCount;
    }

    // Update target network
    if (this.stepCount - this.lastTargetUpdateStep >= this.config.targetUpdateInterval) {
      this.targetNetwork.softUpdate(this.onlineNetwork, this.config.targetUpdateRate);
      this.lastTargetUpdateStep = this.stepCount;
    }
  }

  /**
   * Store transition in circular replay buffer
   */
  private storeTransition(transition: DQNTransition): void {
    if (this.replayBuffer.length < this.config.replayBufferSize) {
      this.replayBuffer.push(transition);
    } else {
      this.replayBuffer[this.replayHead] = transition;
    }
    this.replayHead = (this.replayHead + 1) % this.config.replayBufferSize;
  }

  /**
   * Train on a mini-batch from replay buffer
   */
  private train(): void {
    const bufLen = this.replayBuffer.length;
    if (bufLen < this.config.batchSize) return;

    // Prioritized sampling
    const totalPriority = this.replayBuffer.reduce((sum, t) => sum + t.priority, 0);

    for (let b = 0; b < this.config.batchSize; b++) {
      // Sample transition
      let r = random() * totalPriority;
      let idx = 0;
      for (let j = 0; j < bufLen; j++) {
        r -= this.replayBuffer[j].priority;
        if (r <= 0) {
          idx = j;
          break;
        }
      }

      const t = this.replayBuffer[idx];

      // Compute target Q-value
      const currentQ = this.onlineNetwork.forward(t.state);
      const targetQ = this.targetNetwork.forward(t.nextState);
      const maxTargetQ = Math.max(...targetQ);
      const target = t.reward + (t.done ? 0 : this.config.discountFactor * maxTargetQ);

      // Create target vector (only modify the taken action's Q-value)
      const targets = [...currentQ];
      targets[t.actionIndex] = target;

      // Backprop
      this.onlineNetwork.forward(t.state); // Re-compute for cached activations
      this.onlineNetwork.backward(targets, this.config.learningRate);

      // Update priority
      this.replayBuffer[idx].priority = Math.abs(target - currentQ[t.actionIndex]) + 0.01;
    }
  }

  /**
   * End episode: decay exploration
   */
  endEpisode(): void {
    this.episodeCount++;
    this.explorationRate = Math.max(
      this.config.minExploration,
      this.explorationRate * this.config.explorationDecay
    );
  }

  /**
   * Export state for serialization
   */
  exportState(): DQNState {
    return {
      onlineNetwork: this.onlineNetwork.exportState(),
      targetNetwork: this.targetNetwork.exportState(),
      explorationRate: this.explorationRate,
      episodeCount: this.episodeCount,
      totalReward: this.totalReward,
      stepCount: this.stepCount,
    };
  }

  /**
   * Import state from serialization
   */
  importState(state: DQNState): void {
    this.onlineNetwork.importState(state.onlineNetwork);
    this.targetNetwork.importState(state.targetNetwork);
    this.explorationRate = state.explorationRate;
    this.episodeCount = state.episodeCount;
    this.totalReward = state.totalReward;
    this.stepCount = state.stepCount;
  }

  /**
   * Reset all learned state
   */
  reset(): void {
    const layers: LayerDef[] = [
      ...this.config.hiddenLayers,
      { size: this.actions.length, activation: 'linear' },
    ];
    this.onlineNetwork = new NeuralNetwork(this.stateSize, layers);
    this.targetNetwork = new NeuralNetwork(this.stateSize, layers);
    this.targetNetwork.copyFrom(this.onlineNetwork);
    this.replayBuffer = [];
    this.replayHead = 0;
    this.explorationRate = this.config.explorationRate;
    this.episodeCount = 0;
    this.totalReward = 0;
    this.stepCount = 0;
    this.lastTrainStep = 0;
    this.lastTargetUpdateStep = 0;
  }

  // --- Getters ---

  getExplorationRate(): number { return this.explorationRate; }
  getEpisodeCount(): number { return this.episodeCount; }
  getTotalReward(): number { return this.totalReward; }
  getStepCount(): number { return this.stepCount; }
  getReplayBufferSize(): number { return this.replayBuffer.length; }
  getActions(): string[] { return [...this.actions]; }
  getParameterCount(): number { return this.onlineNetwork.getParameterCount(); }
}
