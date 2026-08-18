// Trader Agent - swaps tokens in liquidity pools
// Upgraded with Q-learning to learn optimal trading strategies

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import { random, randomChoice, randomBool } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

// Trade sizing configuration
const MIN_TRADE_FRACTION = 0.01;
const MAX_TRADE_FRACTION = 0.1;
const MIN_TRADE_AMOUNT = 0.1;

type TraderAction = 'buy_aggressive' | 'buy_moderate' | 'sell_aggressive' | 'sell_moderate' | 'hold';

export class Trader extends DAOMember {
  static readonly ACTIONS: readonly TraderAction[] = [
    'buy_aggressive', 'buy_moderate', 'sell_aggressive', 'sell_moderate', 'hold'
  ];

  // Learning infrastructure
  learning: LearningMixin;

  lastPrice: number;
  tradeFraction: number;

  // Learning tracking
  lastAction: TraderAction | null = null;
  lastState: string | null = null;
  lastTokens: number;
  priceHistory: number[] = [];
  tradeHistory: Array<{ profit: number; action: TraderAction }> = [];

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number,
    reputation: number,
    location: string,
    votingStrategy?: string
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
    this.lastPrice = model.dao?.treasury.getTokenPrice('DAO_TOKEN') || 100;
    this.tradeFraction = MIN_TRADE_FRACTION + random() * (MAX_TRADE_FRACTION - MIN_TRADE_FRACTION);
    this.lastTokens = tokens;

    // Initialize learning
    const config: Partial<LearningConfig> = {
      learningRate: settings.learning_global_learning_rate,
      discountFactor: settings.learning_discount_factor,
      explorationRate: settings.learning_exploration_rate,
      explorationDecay: settings.learning_exploration_decay,
      minExploration: settings.learning_min_exploration,
      qBounds: [-50, 50],
    };

    this.learning = new LearningMixin(config);
  }

  /**
   * Get state representation for trading decisions
   */
  private getTradingState(): string {
    if (!this.model.dao) return 'normal|stable|medium';

    const price = this.model.dao.treasury.getTokenPrice('DAO_TOKEN');
    this.priceHistory.push(price);
    if (this.priceHistory.length > 10) {
      this.priceHistory.shift();
    }

    // Position state (how much of our wealth is in DAO tokens)
    const totalValue = this.tokens;
    const positionState = totalValue < 50 ? 'small' :
                          totalValue < 200 ? 'medium' :
                          totalValue < 500 ? 'large' : 'whale';

    return StateDiscretizer.combineState(
      StateDiscretizer.discretizePrice(price, 1.0),
      StateDiscretizer.discretizeTrend(this.priceHistory),
      positionState
    );
  }

  /**
   * Choose trading action using Q-learning
   */
  private chooseTradingAction(): TraderAction {
    const state = this.getTradingState();

    if (!settings.learning_enabled) {
      return this.heuristicTradingAction();
    }

    return this.learning.selectAction(
      state,
      [...Trader.ACTIONS]
    ) as TraderAction;
  }

  /**
   * Heuristic-based trading action (fallback)
   */
  private heuristicTradingAction(): TraderAction {
    if (!this.model.dao) return 'hold';

    const price = this.model.dao.treasury.getTokenPrice('DAO_TOKEN');
    const shock = this.model.dao.currentShock;

    // Buy when price is rising or positive shock (momentum trading)
    if (price > this.lastPrice || shock > 0) {
      if (this.tokens > 200) {
        return 'buy_aggressive';
      }
      return 'buy_moderate';
    }

    // Sell when price is falling
    if (price < this.lastPrice || shock < 0) {
      if (this.tokens > 200) {
        return 'sell_moderate';
      }
      return 'sell_aggressive';
    }

    return 'hold';
  }

  /**
   * Execute trading action and return reward
   */
  private executeTradingAction(action: TraderAction): number {
    if (!this.model.dao) return 0;

    const treasury = this.model.dao.treasury;
    if (treasury.pools.size === 0) return -0.1;

    const poolKeys = Array.from(treasury.pools.keys());
    if (poolKeys.length === 0) return -0.1;

    const primaryToken = this.model.dao.tokenSymbol;
    // Find a pool containing this DAO's primary token.
    const daoPool = poolKeys.find(k => k.split('|').includes(primaryToken));
    if (!daoPool) return -0.1;

    const parts = daoPool.split('|');
    if (parts.length !== 2) return -0.1;
    const [tokenA, tokenB] = parts;
    const other = tokenA === primaryToken ? tokenB : tokenA;

    let sell: string, buy: string;
    let tradeFraction: number;

    switch (action) {
      case 'buy_aggressive':
        sell = other;
        buy = primaryToken;
        tradeFraction = this.tradeFraction * 2;
        break;
      case 'buy_moderate':
        sell = other;
        buy = primaryToken;
        tradeFraction = this.tradeFraction;
        break;
      case 'sell_aggressive':
        sell = primaryToken;
        buy = other;
        tradeFraction = this.tradeFraction * 2;
        break;
      case 'sell_moderate':
        sell = primaryToken;
        buy = other;
        tradeFraction = this.tradeFraction;
        break;
      case 'hold':
        return 0;
    }

    // Calculate trade amount
    const available = this.getAssetBalance(sell);
    const baseAmount = available * tradeFraction;
    const amount = Math.max(MIN_TRADE_AMOUNT, baseAmount * (0.5 + random()));

    if (amount <= 0 || amount > available) {
      return -0.1;
    }

    // Execute a per-asset transfer into the AMM.
    const debited = this.debitAsset(sell, amount);
    if (debited !== amount) return -0.1;
    treasury.deposit(sell, amount, this.model.currentStep, {
      source: `member:${this.uniqueId}`,
      destination: 'treasury:swap-input',
      event: 'member_trade_deposit',
    });

    try {
      const out = treasury.swap(sell, buy, amount, this.model.currentStep);
      if (out <= 0) {
        const refunded = treasury.withdraw(sell, amount, this.model.currentStep);
        this.creditAsset(sell, refunded);
        return -0.2;
      }

      const gained = treasury.withdraw(buy, out, this.model.currentStep);
      this.creditAsset(buy, gained);
      this.markActive();

      // Calculate profit in the treasury's common price-value units.
      const profit =
        gained * treasury.getTokenPrice(buy) -
        amount * treasury.getTokenPrice(sell);
      this.tradeHistory.push({ profit, action });
      if (this.tradeHistory.length > 20) {
        this.tradeHistory.shift();
      }

      if (this.model.eventBus) {
        this.model.eventBus.publish('trade_executed', {
          step: this.model.currentStep,
          trader: this.uniqueId,
          sell,
          buy,
          amountIn: amount,
          amountOut: gained,
        });
      }

      // Return scaled profit as reward
      return profit / 10;
    } catch {
      const refunded = treasury.withdraw(sell, amount, this.model.currentStep);
      this.creditAsset(sell, refunded);
      return -0.2;
    }
  }

  /**
   * Update Q-values based on performance
   */
  private updateLearning(): void {
    if (!settings.learning_enabled || !this.lastAction || !this.lastState) return;

    // Calculate reward from token change
    const tokenChange = this.tokens - this.lastTokens;

    // Normalize reward
    let reward = tokenChange / Math.max(50, this.lastTokens) * 10;
    reward = Math.max(-10, Math.min(10, reward));

    const currentState = this.getTradingState();

    this.learning.update(
      this.lastState,
      this.lastAction,
      reward,
      currentState,
      [...Trader.ACTIONS]
    );
  }

  step(): void {
    if (!this.model.dao) return;

    // Update learning from previous step
    this.updateLearning();

    // Track state before action
    this.lastTokens = this.tokens;
    this.lastState = this.getTradingState();

    // Participate in governance
    this.voteOnRandomProposal();

    const treasury = this.model.dao.treasury;
    if (treasury.pools.size === 0) {
      this.lastPrice = treasury.getTokenPrice('DAO_TOKEN');
      return;
    }

    // Choose and execute action
    const action = this.chooseTradingAction();
    this.executeTradingAction(action);
    this.lastAction = action;

    this.lastPrice = treasury.getTokenPrice('DAO_TOKEN');
  }

  /**
   * Signal end of episode
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
    avgProfit: number;
    winRate: number;
  } {
    const avgProfit = this.tradeHistory.length > 0
      ? this.tradeHistory.reduce((sum, t) => sum + t.profit, 0) / this.tradeHistory.length
      : 0;

    const winRate = this.tradeHistory.length > 0
      ? this.tradeHistory.filter(t => t.profit > 0).length / this.tradeHistory.length
      : 0;

    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      tradeCount: this.tradeHistory.length,
      avgProfit,
      winRate,
    };
  }
}
