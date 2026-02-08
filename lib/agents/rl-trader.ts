// RL Trader Agent - uses Q-learning to optimize trading strategy
// Refactored to use LearningMixin for standardized Q-learning

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

type Action = 'buy' | 'sell' | 'add_lp' | 'remove_lp' | 'hold';

// Trade sizing
const TRADE_FRACTION = 0.1;  // Trade 10% of holdings
const MIN_TRADE_AMOUNT = 0.1;

export class RLTrader extends DAOMember {
  static readonly ACTIONS: readonly Action[] = ['buy', 'sell', 'add_lp', 'remove_lp', 'hold'];

  // Learning infrastructure
  learning: LearningMixin;

  // Trading state
  prevPrice: number | null = null;
  prevTokens: number;
  tradeCount: number = 0;
  priceHistory: number[] = [];

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy?: string,
    learningRate?: number,
    discount?: number,
    epsilon?: number
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);

    // Create learning config from parameters or settings
    const config: Partial<LearningConfig> = {
      learningRate: learningRate ?? settings.learning_global_learning_rate,
      discountFactor: discount ?? settings.learning_discount_factor,
      explorationRate: epsilon ?? settings.learning_exploration_rate,
      explorationDecay: settings.learning_exploration_decay,
      minExploration: settings.learning_min_exploration,
      qBounds: [-50, 50],
    };

    this.learning = new LearningMixin(config);
    this.prevTokens = tokens;
  }

  /**
   * Get current state representation using StateDiscretizer
   * 4-dimensional: price bucket, pool depth, trend, volatility
   */
  private getState(price: number): string {
    if (!this.model.dao) return 'normal|medium|stable|normal';

    // Get pool depth
    const pools = this.model.dao.treasury.pools;
    const firstPool = pools.values().next().value;
    const reserveA = firstPool?.reserveA ?? 0;
    const reserveB = firstPool?.reserveB ?? 0;

    // Use StateDiscretizer for consistent bucketing (3 base dimensions + volatility)
    return StateDiscretizer.combineState(
      StateDiscretizer.discretizePrice(price, 1.0),
      StateDiscretizer.discretizePoolDepth(reserveA, reserveB),
      StateDiscretizer.discretizeTrend(this.priceHistory),
      StateDiscretizer.discretizeVolatility(this.priceHistory)
    );
  }

  /**
   * Execute trading action and return reward
   */
  private executeAction(action: Action): number {
    if (!this.model.dao) return -0.05;

    const treasury = this.model.dao.treasury;
    const tradeAmount = Math.max(MIN_TRADE_AMOUNT, this.tokens * TRADE_FRACTION);
    let reward = 0;

    try {
      switch (action) {
        case 'buy':
          if (this.tokens >= tradeAmount) {
            treasury.deposit('USDC', tradeAmount, this.model.currentStep);
            const out = treasury.swap('USDC', 'DAO_TOKEN', tradeAmount, this.model.currentStep);
            if (out > 0) {
              this.tokens -= tradeAmount;
              this.tokens += treasury.withdraw('DAO_TOKEN', out, this.model.currentStep);
              reward = treasury.getTokenPrice('DAO_TOKEN') * out - tradeAmount;
              this.tradeCount++;
            } else {
              treasury.withdraw('USDC', tradeAmount, this.model.currentStep);
            }
          }
          break;

        case 'sell':
          if (this.tokens >= tradeAmount) {
            treasury.deposit('DAO_TOKEN', tradeAmount, this.model.currentStep);
            const out = treasury.swap('DAO_TOKEN', 'USDC', tradeAmount, this.model.currentStep);
            if (out > 0) {
              this.tokens -= tradeAmount;
              this.tokens += treasury.withdraw('USDC', out, this.model.currentStep);
              reward = out - treasury.getTokenPrice('DAO_TOKEN') * tradeAmount;
              this.tradeCount++;
            } else {
              treasury.withdraw('DAO_TOKEN', tradeAmount, this.model.currentStep);
            }
          }
          break;

        case 'add_lp':
          if (this.tokens >= tradeAmount * 2) {
            const lpAmount = tradeAmount / 2;
            treasury.deposit('DAO_TOKEN', lpAmount, this.model.currentStep);
            treasury.deposit('USDC', lpAmount, this.model.currentStep);
            treasury.addLiquidity('DAO_TOKEN', 'USDC', lpAmount, lpAmount, this.model.currentStep);
            this.tokens -= tradeAmount;
            reward = 0.02; // Small positive reward for providing liquidity
          }
          break;

        case 'remove_lp': {
          try {
            const removed = treasury.removeLiquidity('DAO_TOKEN', 'USDC', 0.1, this.model.currentStep);
            if (removed) {
              // Agent claims the DAO_TOKEN portion
              const claimed = treasury.withdraw('DAO_TOKEN', removed[0] || 0, this.model.currentStep);
              this.tokens += claimed;
            }
            reward = -0.01; // Small negative reward for removing liquidity
          } catch {
            reward = -0.02; // Penalty for failed action
          }
          break;
        }

        case 'hold': {
          // Calculate reward based on portfolio change
          const portfolioChange = this.tokens - this.prevTokens;
          reward = portfolioChange > 0 ? 0.01 : portfolioChange < 0 ? -0.01 : 0;
          break;
        }
      }
    } catch {
      // Action failed, give small negative reward
      reward = -0.05;
    }

    // Clamp reward
    return Math.max(-1, Math.min(1, reward));
  }

  step(): void {
    if (!this.model.dao) return;

    // RL traders participate in governance like other token holders
    this.voteOnRandomProposal();

    // Check if learning is enabled
    if (!settings.learning_enabled) {
      // Fall back to simple hold behavior
      this.markActive();
      return;
    }

    const price = this.model.dao.treasury.getTokenPrice('DAO_TOKEN');

    // Update price history for trend detection
    this.priceHistory.push(price);
    if (this.priceHistory.length > 10) {
      this.priceHistory.shift();
    }

    const state = this.getState(price);

    // Select action using learning mixin
    const action = this.learning.selectAction(
      state,
      [...RLTrader.ACTIONS]
    ) as Action;

    // Execute action and get reward
    const reward = this.executeAction(action);

    // Get next state for Q-update
    const nextPrice = this.model.dao.treasury.getTokenPrice('DAO_TOKEN');
    const nextState = this.getState(nextPrice);

    // Update Q-values
    this.learning.update(
      state,
      action,
      reward,
      nextState,
      [...RLTrader.ACTIONS]
    );

    // Update tracking
    this.prevPrice = price;
    this.prevTokens = this.tokens;
    this.markActive();
  }

  /**
   * Signal end of episode (e.g., simulation reset)
   */
  endEpisode(): void {
    this.learning.endEpisode();
  }

  /**
   * Export learning state for checkpoints
   */
  exportLearningState(): LearningState {
    return this.learning.exportLearningState();
  }

  /**
   * Import learning state from checkpoint
   */
  importLearningState(state: LearningState): void {
    this.learning.importLearningState(state);
  }

  /**
   * Get learning statistics
   */
  getLearningStats(): {
    qTableSize: number;
    stateCount: number;
    episodeCount: number;
    totalReward: number;
    explorationRate: number;
    tradeCount: number;
  } {
    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      tradeCount: this.tradeCount,
    };
  }

  // Legacy compatibility getters
  get epsilon(): number {
    return this.learning.getExplorationRate();
  }

  get totalReward(): number {
    return this.learning.getTotalReward();
  }

  get learningRate(): number {
    return this.learning.getConfig().learningRate;
  }

  get discount(): number {
    return this.learning.getConfig().discountFactor;
  }
}
