// Market Maker Agent - Provides liquidity with profit motives
// New agent type for AMM liquidity provision

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import { random, randomChoice, randomBool } from '../utils/random';

// Market making configuration
const MIN_LIQUIDITY_FRACTION = 0.1;  // Min 10% of holdings in LP
const MAX_LIQUIDITY_FRACTION = 0.5;  // Max 50% of holdings in LP
const SPREAD_TARGET = 0.02;  // 2% target spread
const REBALANCE_THRESHOLD = 0.05;  // Rebalance if price moves 5%
const FEE_RATE = 0.003;  // 0.3% trading fee

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
  positions: Map<string, LiquidityPosition> = new Map();
  stats: TradingStats;
  targetLiquidityRatio: number;
  riskAversion: number;  // 0-1, higher = more conservative
  lastPrices: Map<string, number> = new Map();
  private pendingFees: number = 0;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 500,  // Higher default for market making
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy?: string
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
    // Random liquidity ratio and risk aversion
    this.targetLiquidityRatio = MIN_LIQUIDITY_FRACTION +
      random() * (MAX_LIQUIDITY_FRACTION - MIN_LIQUIDITY_FRACTION);
    this.riskAversion = 0.3 + random() * 0.4;

    this.stats = {
      feesEarned: 0,
      impermanentLoss: 0,
      totalVolume: 0,
      tradesExecuted: 0,
    };
  }

  step(): void {
    if (!this.model.dao) return;

    // Update price tracking
    this.trackPrices();

    // Manage liquidity positions
    this.manageLiquidity();

    // Collect fees (simulated)
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
   * Manage liquidity positions
   */
  private manageLiquidity(): void {
    if (!this.model.dao) return;

    const treasury = this.model.dao.treasury;

    // Check if we need to add initial liquidity
    if (this.positions.size === 0 && this.tokens > 0) {
      this.addInitialLiquidity();
      return;
    }

    // Rebalance existing positions
    for (const [poolKey, position] of this.positions) {
      const currentPrice = treasury.getPoolPrice(poolKey);
      if (currentPrice === null) continue;

      const priceChange = Math.abs(currentPrice - position.entryPrice) / position.entryPrice;

      // Rebalance if price moved significantly
      if (priceChange > REBALANCE_THRESHOLD) {
        this.rebalancePosition(poolKey, position, currentPrice);
      }
    }
  }

  /**
   * Add initial liquidity to a pool
   */
  private addInitialLiquidity(): void {
    if (!this.model.dao) return;

    const treasury = this.model.dao.treasury;
    const liquidityAmount = Math.min(this.tokens * 0.5, 1000);
    if (liquidityAmount <= 0) return;

    // Agent contributes DAO_TOKEN from own balance
    this.tokens -= liquidityAmount;
    treasury.deposit('DAO_TOKEN', liquidityAmount, this.model.currentStep);

    // Treasury provides matching USDC from its own balance
    const usdcAvailable = treasury.getTokenBalance('USDC');
    const usdcAmount = Math.min(liquidityAmount, usdcAvailable);
    if (usdcAmount <= 0) {
      // Can't add liquidity without matching pair, return tokens
      this.tokens += liquidityAmount;
      treasury.withdraw('DAO_TOKEN', liquidityAmount, this.model.currentStep);
      return;
    }

    treasury.addLiquidity('DAO_TOKEN', 'USDC', liquidityAmount, usdcAmount);

    this.stats.totalVolume += liquidityAmount;
    this.markActive();
  }

  /**
   * Rebalance a liquidity position
   */
  private rebalancePosition(
    poolKey: string,
    position: LiquidityPosition,
    currentPrice: number
  ): void {
    if (!this.model.dao) return;

    // Calculate impermanent loss
    const priceRatio = currentPrice / position.entryPrice;
    const il = 2 * Math.sqrt(priceRatio) / (1 + priceRatio) - 1;
    this.stats.impermanentLoss += Math.abs(il) * (position.amountA + position.amountB);

    // Update entry price
    position.entryPrice = currentPrice;

    // Emit rebalance event
    if (this.model.eventBus) {
      this.model.eventBus.publish('position_rebalanced', {
        step: this.model.currentStep,
        marketMaker: this.uniqueId,
        poolKey,
        impermanentLoss: il,
        newEntryPrice: currentPrice,
      });
    }

    this.markActive();
  }

  /**
   * Collect trading fees (simulated based on pool activity)
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

    // Simple arbitrage: if price deviates from 1.0, trade toward equilibrium
    const deviation = Math.abs(price - 1.0);

    if (deviation > SPREAD_TARGET && this.tokens > 10) {
      const tradeAmount = Math.min(this.tokens * 0.1, 10);

      if (this.tokens < tradeAmount) return;

      try {
        if (price < 1.0) {
          // Buy DAO_TOKEN (it's cheap)
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
          // Sell DAO_TOKEN (it's expensive)
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
      } catch {
        // Trade failed
      }
    }
  }
}
