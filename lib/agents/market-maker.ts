// Market Maker Agent - Provides liquidity with profit motives
// Upgraded with Q-learning to learn optimal market making strategies

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import { logger } from '../utils/logger';
import { random, randomBool } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

// Market making configuration
const MIN_LIQUIDITY_FRACTION = 0.1;
const MAX_LIQUIDITY_FRACTION = 0.5;
const SPREAD_TARGET = 0.02;
const REBALANCE_THRESHOLD = 0.05;

type MarketAction = 'add_liquidity' | 'remove_liquidity' | 'tighten_spread' | 'widen_spread' | 'rebalance' | 'hold';

interface LiquidityPosition {
  poolKey: string;
  tokenA: string;
  tokenB: string;
  amountA: number;
  amountB: number;
  entryPrice: number;
  lpTokens: number;
}

interface TradingStats {
  feesEarned: number;
  impermanentLoss: number;
  totalVolume: number;
  tradesExecuted: number;
}

export class MarketMaker extends DAOMember {
  static readonly ACTIONS: readonly MarketAction[] = [
    'add_liquidity', 'remove_liquidity', 'tighten_spread', 'widen_spread', 'rebalance', 'hold'
  ];

  // Learning infrastructure
  learning: LearningMixin;

  // Market making state
  positions: Map<string, LiquidityPosition> = new Map();
  stats: TradingStats;
  targetLiquidityRatio: number;
  riskAversion: number;
  lastPrices: Map<string, number> = new Map();
  priceHistory: number[] = [];
  private pendingFees: number = 0;

  // Learning tracking
  lastAction: MarketAction | null = null;
  lastState: string | null = null;
  lastTokens: number;
  actionStep: number = 0;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 500,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy?: string
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);

    this.targetLiquidityRatio = MIN_LIQUIDITY_FRACTION +
      random() * (MAX_LIQUIDITY_FRACTION - MIN_LIQUIDITY_FRACTION);
    this.riskAversion = 0.3 + random() * 0.4;
    this.lastTokens = tokens;

    this.stats = {
      feesEarned: 0,
      impermanentLoss: 0,
      totalVolume: 0,
      tradesExecuted: 0,
    };

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
   * Get state representation for market making decisions
   */
  private getMarketState(): string {
    if (!this.model.dao) return 'normal|calm|medium';

    const price = this.model.dao.treasury.getTokenPrice('DAO_TOKEN');

    // Track price history
    this.priceHistory.push(price);
    if (this.priceHistory.length > 10) {
      this.priceHistory.shift();
    }

    // Calculate inventory imbalance (how much of our wealth is in LP positions)
    const totalPositionValue = Array.from(this.positions.values())
      .reduce((sum, p) => sum + p.amountA + p.amountB, 0);
    const totalWealth = this.tokens + totalPositionValue;
    const inventoryRatio = totalWealth > 0 ? totalPositionValue / totalWealth : 0;
    const inventoryState = inventoryRatio < 0.2 ? 'low' :
                          inventoryRatio < 0.4 ? 'moderate' :
                          inventoryRatio < 0.6 ? 'balanced' : 'high';

    return StateDiscretizer.combineState(
      StateDiscretizer.discretizePrice(price, 1.0),
      StateDiscretizer.discretizeVolatility(this.priceHistory),
      inventoryState
    );
  }

  /**
   * Choose market action using Q-learning
   */
  private chooseMarketAction(): MarketAction {
    const state = this.getMarketState();

    if (!settings.learning_enabled) {
      return this.heuristicMarketAction();
    }

    return this.learning.selectAction(
      state,
      [...MarketMaker.ACTIONS]
    ) as MarketAction;
  }

  /**
   * Heuristic-based market action (fallback)
   */
  private heuristicMarketAction(): MarketAction {
    if (!this.model.dao) return 'hold';

    const price = this.model.dao.treasury.getTokenPrice('DAO_TOKEN');
    const deviation = Math.abs(price - 1.0);
    const volatility = StateDiscretizer.discretizeVolatility(this.priceHistory);

    // No positions - add liquidity
    if (this.positions.size === 0 && this.tokens > 100) {
      return 'add_liquidity';
    }

    // High volatility - consider removing liquidity
    if (volatility === 'extreme' && this.positions.size > 0) {
      return 'remove_liquidity';
    }

    // Price deviation - rebalance
    if (deviation > REBALANCE_THRESHOLD && this.positions.size > 0) {
      return 'rebalance';
    }

    // Tight spreads when calm
    if (volatility === 'calm' && this.tokens > 50) {
      return 'tighten_spread';
    }

    // Wide spreads when volatile
    if (volatility === 'volatile') {
      return 'widen_spread';
    }

    return 'hold';
  }

  /**
   * Execute market action and calculate reward
   */
  private executeMarketAction(action: MarketAction): number {
    if (!this.model.dao) return 0;

    let reward = 0;

    switch (action) {
      case 'add_liquidity':
        reward = this.addLiquidity();
        break;
      case 'remove_liquidity':
        reward = this.removeLiquidity();
        break;
      case 'tighten_spread':
        reward = this.tightenSpread();
        break;
      case 'widen_spread':
        reward = this.widenSpread();
        break;
      case 'rebalance':
        reward = this.rebalancePositions();
        break;
      case 'hold':
        // Collect fees passively
        reward = this.pendingFees * 0.1;
        break;
    }

    return reward;
  }

  /**
   * Add liquidity to the pool
   */
  private addLiquidity(): number {
    if (!this.model.dao) return -0.1;

    const treasury = this.model.dao.treasury;
    const liquidityAmount = Math.min(this.tokens * 0.3, 500);
    if (liquidityAmount <= 10) return -0.1;

    this.tokens -= liquidityAmount;
    treasury.deposit('DAO_TOKEN', liquidityAmount, this.model.currentStep);

    const usdcAvailable = treasury.getTokenBalance('USDC');
    const usdcAmount = Math.min(liquidityAmount, usdcAvailable);
    if (usdcAmount <= 0) {
      this.tokens += liquidityAmount;
      treasury.withdraw('DAO_TOKEN', liquidityAmount, this.model.currentStep);
      return -0.2;
    }

    treasury.addLiquidity('DAO_TOKEN', 'USDC', liquidityAmount, usdcAmount);

    // Track position
    const poolKey = 'DAO_TOKEN/USDC';
    const existing = this.positions.get(poolKey);
    if (existing) {
      existing.amountA += liquidityAmount;
      existing.amountB += usdcAmount;
    } else {
      this.positions.set(poolKey, {
        poolKey,
        tokenA: 'DAO_TOKEN',
        tokenB: 'USDC',
        amountA: liquidityAmount,
        amountB: usdcAmount,
        entryPrice: treasury.getTokenPrice('DAO_TOKEN'),
        lpTokens: liquidityAmount,
      });
    }

    this.stats.totalVolume += liquidityAmount;
    this.markActive();

    return 0.5; // Reward for providing liquidity
  }

  /**
   * Remove liquidity from the pool
   */
  private removeLiquidity(): number {
    if (!this.model.dao || this.positions.size === 0) return -0.1;

    const treasury = this.model.dao.treasury;
    const poolKey = 'DAO_TOKEN/USDC';
    const position = this.positions.get(poolKey);
    if (!position) return -0.1;

    try {
      const removed = treasury.removeLiquidity('DAO_TOKEN', 'USDC', 0.3, this.model.currentStep);
      if (removed && removed[0] > 0) {
        const claimed = treasury.withdraw('DAO_TOKEN', removed[0], this.model.currentStep);
        this.tokens += claimed;

        // Update position
        position.amountA -= removed[0];
        position.amountB -= removed[1] || 0;
        if (position.amountA <= 0) {
          this.positions.delete(poolKey);
        }

        this.markActive();
        return 0.2; // Small reward for successful removal
      }
    } catch (error) {
      logger.debug('MarketMaker: removeLiquidity failed', error);
      return -0.1;
    }

    return 0;
  }

  /**
   * Tighten spread (add more liquidity around current price)
   */
  private tightenSpread(): number {
    // In a simplified AMM, this means adding more liquidity
    const reward = this.addLiquidity();
    return reward > 0 ? reward + 0.2 : reward; // Extra reward for tightening
  }

  /**
   * Widen spread (reduce liquidity to protect from IL)
   */
  private widenSpread(): number {
    // In a simplified AMM, this means removing some liquidity
    const reward = this.removeLiquidity();
    return reward > 0 ? reward + 0.1 : reward;
  }

  /**
   * Rebalance positions based on price movement
   */
  private rebalancePositions(): number {
    if (!this.model.dao) return 0;

    const treasury = this.model.dao.treasury;
    let totalReward = 0;

    for (const [poolKey, position] of this.positions) {
      const currentPrice = treasury.getPoolPrice(poolKey);
      if (currentPrice === null) continue;

      const priceRatio = currentPrice / position.entryPrice;
      const il = 2 * Math.sqrt(priceRatio) / (1 + priceRatio) - 1;
      this.stats.impermanentLoss += Math.abs(il) * (position.amountA + position.amountB);

      // Update entry price
      position.entryPrice = currentPrice;

      // Reward for rebalancing (reduces IL)
      totalReward += Math.abs(il) > 0.05 ? 0.5 : 0.1;

      if (this.model.eventBus) {
        this.model.eventBus.publish('position_rebalanced', {
          step: this.model.currentStep,
          marketMaker: this.uniqueId,
          poolKey,
          impermanentLoss: il,
          newEntryPrice: currentPrice,
        });
      }
    }

    this.markActive();
    return totalReward;
  }

  /**
   * Update Q-values based on performance
   */
  private updateLearning(): void {
    if (!settings.learning_enabled || !this.lastAction || !this.lastState) return;

    // Calculate reward from token change and fees
    const tokenChange = this.tokens - this.lastTokens;
    const feeReward = this.pendingFees;

    // Normalize reward
    let reward = (tokenChange / Math.max(100, this.lastTokens)) * 10 + feeReward * 0.5;
    reward = Math.max(-10, Math.min(10, reward));

    const currentState = this.getMarketState();

    this.learning.update(
      this.lastState,
      this.lastAction,
      reward,
      currentState,
      [...MarketMaker.ACTIONS]
    );
  }

  /**
   * Track current prices for all pools
   */
  private trackPrices(): void {
    if (!this.model.dao) return;

    for (const [poolKey] of this.model.dao.treasury.pools) {
      const price = this.model.dao.treasury.getPoolPrice(poolKey);
      if (price !== null) {
        this.lastPrices.set(poolKey, price);
      }
    }
  }

  /**
   * Collect trading fees
   */
  private collectFees(): void {
    if (this.pendingFees > 0) {
      this.tokens += this.pendingFees;
      this.stats.feesEarned += this.pendingFees;
      this.pendingFees = 0;
    }
  }

  /**
   * Check for arbitrage opportunities
   */
  private checkArbitrageOpportunity(): void {
    if (!this.model.dao) return;

    const treasury = this.model.dao.treasury;
    const price = treasury.getTokenPrice('DAO_TOKEN');
    const deviation = Math.abs(price - 1.0);

    if (deviation > SPREAD_TARGET && this.tokens > 10) {
      const tradeAmount = Math.min(this.tokens * 0.1, 10);
      if (this.tokens < tradeAmount) return;

      try {
        if (price < 1.0) {
          this.tokens -= tradeAmount;
          treasury.deposit('USDC', tradeAmount, this.model.currentStep);
          const out = treasury.swap('USDC', 'DAO_TOKEN', tradeAmount, this.model.currentStep);
          if (out > 0) {
            this.tokens += treasury.withdraw('DAO_TOKEN', out, this.model.currentStep);
            this.pendingFees += out * 0.003;
            this.stats.totalVolume += tradeAmount;
            this.stats.tradesExecuted++;
          } else {
            treasury.withdraw('USDC', tradeAmount, this.model.currentStep);
            this.tokens += tradeAmount;
          }
        } else {
          this.tokens -= tradeAmount;
          treasury.deposit('DAO_TOKEN', tradeAmount, this.model.currentStep);
          const out = treasury.swap('DAO_TOKEN', 'USDC', tradeAmount, this.model.currentStep);
          if (out > 0) {
            this.tokens += treasury.withdraw('USDC', out, this.model.currentStep);
            this.pendingFees += out * 0.003;
            this.stats.totalVolume += tradeAmount;
            this.stats.tradesExecuted++;
          } else {
            treasury.withdraw('DAO_TOKEN', tradeAmount, this.model.currentStep);
            this.tokens += tradeAmount;
          }
        }
        this.markActive();
      } catch (error) {
        logger.debug('MarketMaker: arbitrage trade failed', error);
      }
    }
  }

  step(): void {
    if (!this.model.dao) return;

    // Update learning from previous step
    this.updateLearning();

    // Track state before action
    this.lastTokens = this.tokens;
    this.lastState = this.getMarketState();

    // Update price tracking
    this.trackPrices();

    // Choose and execute action
    const action = this.chooseMarketAction();
    this.executeMarketAction(action);
    this.lastAction = action;

    // Collect fees
    this.collectFees();

    // Arbitrage opportunities
    if (randomBool(0.3)) {
      this.checkArbitrageOpportunity();
    }

    // Participate in governance
    this.voteOnRandomProposal();

    // Occasionally comment
    if (random() < (this.model.dao?.commentProbability || 0.1)) {
      this.leaveCommentOnRandomProposal();
    }
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
   * Get learning and trading statistics
   */
  getLearningStats(): {
    qTableSize: number;
    stateCount: number;
    episodeCount: number;
    totalReward: number;
    explorationRate: number;
    feesEarned: number;
    impermanentLoss: number;
    totalVolume: number;
    tradesExecuted: number;
  } {
    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      ...this.stats,
    };
  }
}
