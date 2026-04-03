// GlobalMarketplace - Shared cross-DAO token trading and price rankings

import { EventBus } from '../utils/event-bus';
import { LiquidityPool } from './treasury';
import type {
  TokenRanking,
  TokenPricePoint,
  TokenInfo,
  GlobalMarketplaceConfig,
  GlobalMarketplaceState,
} from '../types/dao-city';

/**
 * GlobalMarketplace manages token trading across all DAOs in the city.
 * It provides:
 * - Cross-DAO token swaps via liquidity pools
 * - Token price tracking and rankings
 * - Volume and market cap calculations
 */
export class GlobalMarketplace {
  // Token data
  private tokens: Map<string, TokenInfo> = new Map();
  private tokenToDao: Map<string, string> = new Map(); // symbol -> daoId

  // Liquidity pools for cross-DAO trading
  private pools: Map<string, LiquidityPool> = new Map();

  // Price history tracking (last 100 steps)
  private readonly HISTORY_LENGTH = 100;

  // Volume tracking (24-step window)
  private volume24h: Map<string, number> = new Map();
  private volumeHistory: Map<string, number[]> = new Map();

  // Configuration
  private volatility: number;
  private priceUpdateFrequency: number;
  private baseTokenSymbol: string;

  // Event bus for marketplace events
  private eventBus: EventBus | null;

  constructor(config: GlobalMarketplaceConfig, eventBus?: EventBus) {
    this.volatility = config.volatility;
    this.priceUpdateFrequency = config.priceUpdateFrequency;
    this.baseTokenSymbol = config.baseTokenSymbol || 'STABLE';
    this.eventBus = eventBus || null;

    // Register base stable token
    this.registerToken(this.baseTokenSymbol, 'global', 1000000, 1.0);
  }

  /**
   * Register a new token in the marketplace
   */
  registerToken(
    symbol: string,
    daoId: string,
    initialSupply: number,
    initialPrice: number = 1.0
  ): void {
    if (this.tokens.has(symbol)) {
      return; // Token already registered
    }

    this.tokens.set(symbol, {
      symbol,
      daoId,
      totalSupply: initialSupply,
      circulatingSupply: initialSupply,
      price: initialPrice,
      priceHistory: [{ step: 0, price: initialPrice }],
    });

    this.tokenToDao.set(symbol, daoId);
    this.volume24h.set(symbol, 0);
    this.volumeHistory.set(symbol, []);

    // Create liquidity pool with base token if not base token itself
    if (symbol !== this.baseTokenSymbol) {
      this.createPool(symbol, this.baseTokenSymbol, initialSupply * 0.1, initialSupply * 0.1 * initialPrice);
    }

    if (this.eventBus) {
      this.eventBus.publish('token_registered', {
        step: 0,
        symbol,
        daoId,
        initialPrice,
      });
    }
  }

  /**
   * Create a liquidity pool between two tokens
   */
  private createPool(tokenA: string, tokenB: string, reserveA: number, reserveB: number): LiquidityPool {
    const key = this.getPoolKey(tokenA, tokenB);
    const [sortedA, sortedB] = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA];
    const [sortedReserveA, sortedReserveB] = tokenA < tokenB ? [reserveA, reserveB] : [reserveB, reserveA];

    const pool = new LiquidityPool(sortedA, sortedB);
    pool.addLiquidity(sortedReserveA, sortedReserveB);
    this.pools.set(key, pool);
    return pool;
  }

  /**
   * Get pool key (sorted alphabetically)
   */
  private getPoolKey(tokenA: string, tokenB: string): string {
    return tokenA < tokenB ? `${tokenA}|${tokenB}` : `${tokenB}|${tokenA}`;
  }

  /**
   * Get current price of a token
   */
  getTokenPrice(symbol: string): number {
    return this.tokens.get(symbol)?.price || 0;
  }

  /**
   * Set token price (called by DAOs when their treasury updates prices)
   */
  setTokenPrice(symbol: string, price: number, step: number): void {
    const token = this.tokens.get(symbol);
    if (!token) return;

    const oldPrice = token.price;
    token.price = price;

    // Add to history
    token.priceHistory.push({ step, price });
    if (token.priceHistory.length > this.HISTORY_LENGTH) {
      token.priceHistory.shift();
    }

    if (this.eventBus && Math.abs(price - oldPrice) / oldPrice > 0.01) {
      this.eventBus.publish('token_price_changed', {
        step,
        symbol,
        oldPrice,
        newPrice: price,
        change: ((price - oldPrice) / oldPrice) * 100,
      });
    }
  }

  /**
   * Update all token prices based on pool ratios and market activity
   */
  updatePrices(step: number): void {
    for (const [symbol, token] of this.tokens) {
      if (symbol === this.baseTokenSymbol) continue;

      // Get price from pool with base token
      const poolKey = this.getPoolKey(symbol, this.baseTokenSymbol);
      const pool = this.pools.get(poolKey);

      if (pool) {
        // Calculate implied price from pool ratio
        const [reserveA, reserveB] = symbol < this.baseTokenSymbol
          ? [pool.reserveA, pool.reserveB]
          : [pool.reserveB, pool.reserveA];

        if (reserveA > 0) {
          const impliedPrice = reserveB / reserveA;
          // Blend with current price (smooth transitions)
          const newPrice = token.price * 0.7 + impliedPrice * 0.3;
          this.setTokenPrice(symbol, newPrice, step);
        }
      }
    }

    // Roll over volume tracking
    this.rollVolume(step);
  }

  /**
   * Execute a swap between two tokens
   */
  swap(
    fromToken: string,
    toToken: string,
    amountIn: number,
    step: number
  ): { amountOut: number; priceImpact: number } {
    const poolKey = this.getPoolKey(fromToken, toToken);
    const pool = this.pools.get(poolKey);

    if (!pool) {
      // Try routing through base token
      if (fromToken !== this.baseTokenSymbol && toToken !== this.baseTokenSymbol) {
        // Two-hop swap: fromToken -> STABLE -> toToken
        const hop1 = this.swap(fromToken, this.baseTokenSymbol, amountIn, step);
        const hop2 = this.swap(this.baseTokenSymbol, toToken, hop1.amountOut, step);
        return {
          amountOut: hop2.amountOut,
          priceImpact: 1 - (1 - hop1.priceImpact) * (1 - hop2.priceImpact),
        };
      }
      return { amountOut: 0, priceImpact: 0 };
    }

    // Calculate price before swap
    const priceBefore = this.getSwapPrice(pool, fromToken);

    // Execute swap
    const amountOut = pool.swap(fromToken, amountIn, step);

    // Calculate price after swap
    const priceAfter = this.getSwapPrice(pool, fromToken);
    const priceImpact = Math.abs(priceAfter - priceBefore) / priceBefore;

    // Track volume
    this.recordVolume(fromToken, amountIn);
    this.recordVolume(toToken, amountOut);

    if (this.eventBus) {
      this.eventBus.publish('marketplace_swap', {
        step,
        fromToken,
        toToken,
        amountIn,
        amountOut,
        priceImpact,
      });
    }

    return { amountOut, priceImpact };
  }

  /**
   * Get swap price from pool
   */
  private getSwapPrice(pool: LiquidityPool, token: string): number {
    if (token === pool.tokenA) {
      return pool.reserveB / pool.reserveA;
    }
    return pool.reserveA / pool.reserveB;
  }

  /**
   * Record trading volume
   */
  private recordVolume(token: string, amount: number): void {
    const current = this.volume24h.get(token) || 0;
    this.volume24h.set(token, current + amount);
  }

  /**
   * Roll over 24-step volume tracking
   */
  private rollVolume(step: number): void {
    if (step % 24 !== 0) return;

    for (const [symbol, volume] of this.volume24h) {
      const history = this.volumeHistory.get(symbol) || [];
      history.push(volume);
      if (history.length > 7) { // Keep 7 days of daily volumes
        history.shift();
      }
      this.volumeHistory.set(symbol, history);
      this.volume24h.set(symbol, 0);
    }
  }

  /**
   * Add liquidity to a pool
   */
  addLiquidity(
    tokenA: string,
    tokenB: string,
    amountA: number,
    amountB: number,
    step: number
  ): number {
    const poolKey = this.getPoolKey(tokenA, tokenB);
    let pool = this.pools.get(poolKey);

    if (!pool) {
      pool = this.createPool(tokenA, tokenB, amountA, amountB);
      return Math.sqrt(amountA * amountB);
    }

    pool.addLiquidity(
      tokenA < tokenB ? amountA : amountB,
      tokenA < tokenB ? amountB : amountA,
      step
    );

    // LP tokens are proportional to liquidity added
    const lpTokens = Math.sqrt(amountA * amountB);

    if (this.eventBus) {
      this.eventBus.publish('marketplace_liquidity_added', {
        step,
        tokenA,
        tokenB,
        amountA,
        amountB,
        lpTokens,
      });
    }

    return lpTokens;
  }

  /**
   * Get token rankings sorted by market cap
   */
  getTokenRankings(): TokenRanking[] {
    const rankings: TokenRanking[] = [];

    for (const [symbol, token] of this.tokens) {
      if (symbol === this.baseTokenSymbol) continue; // Skip stable token

      const history = token.priceHistory;
      const price24hAgo = history.length >= 24
        ? history[Math.max(0, history.length - 24)].price
        : history[0].price;

      const priceChange = token.price - price24hAgo;
      const priceChangePercent = price24hAgo > 0 ? (priceChange / price24hAgo) * 100 : 0;

      const daoId = this.tokenToDao.get(symbol) || 'unknown';

      rankings.push({
        daoId,
        daoName: daoId, // Will be resolved by DAOCity
        tokenSymbol: symbol,
        currentPrice: token.price,
        previousPrice: price24hAgo,
        priceChange24h: priceChange,
        priceChangePercent,
        volume24h: this.volume24h.get(symbol) || 0,
        marketCap: token.price * token.circulatingSupply,
        rank: 0, // Set after sorting
        color: '#888888', // Will be set by DAOCity
      });
    }

    // Sort by market cap descending
    rankings.sort((a, b) => b.marketCap - a.marketCap);

    // Assign ranks
    rankings.forEach((r, i) => {
      r.rank = i + 1;
    });

    return rankings;
  }

  /**
   * Get full marketplace state for broadcasting
   */
  getState(): GlobalMarketplaceState {
    const rankings = this.getTokenRankings();

    return {
      tokenCount: this.tokens.size - 1, // Exclude base token
      totalVolume24h: Array.from(this.volume24h.values()).reduce((a, b) => a + b, 0),
      totalMarketCap: rankings.reduce((sum, r) => sum + r.marketCap, 0),
      poolCount: this.pools.size,
      rankings,
    };
  }

  /**
   * Get token info
   */
  getTokenInfo(symbol: string): TokenInfo | undefined {
    return this.tokens.get(symbol);
  }

  /**
   * Get current 24h volume for a token
   */
  getTokenVolume24h(symbol: string): number {
    return this.volume24h.get(symbol) || 0;
  }

  /**
   * Get all registered tokens
   */
  getAllTokens(): string[] {
    return Array.from(this.tokens.keys()).filter(s => s !== this.baseTokenSymbol);
  }

  /**
   * Get price history for a token
   */
  getPriceHistory(symbol: string): TokenPricePoint[] {
    return this.tokens.get(symbol)?.priceHistory || [];
  }

  /**
   * Update token supply (called when DAO mints/burns)
   */
  updateTokenSupply(symbol: string, newSupply: number): void {
    const token = this.tokens.get(symbol);
    if (token) {
      token.totalSupply = newSupply;
      token.circulatingSupply = newSupply;
    }
  }

  /**
   * Get DAO ID for a token
   */
  getDaoForToken(symbol: string): string | undefined {
    return this.tokenToDao.get(symbol);
  }
}
