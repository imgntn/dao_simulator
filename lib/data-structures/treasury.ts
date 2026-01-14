// Treasury and Liquidity Pool implementations

import type { EventBus } from '../utils/event-bus';
import type { PriceOracle } from '@/types/simulation';
import { RandomWalkOracle } from '../utils/oracles';

/**
 * Constant product automated market maker (AMM)
 * Implements x * y = k formula
 */
export class LiquidityPool {
  tokenA: string;
  tokenB: string;
  reserveA: number = 0;
  reserveB: number = 0;
  eventBus: EventBus | null;

  constructor(tokenA: string, tokenB: string, eventBus: EventBus | null = null) {
    this.tokenA = tokenA;
    this.tokenB = tokenB;
    this.eventBus = eventBus;
  }

  addLiquidity(amountA: number, amountB: number, step: number = 0): void {
    this.reserveA += amountA;
    this.reserveB += amountB;

    if (this.eventBus) {
      this.eventBus.publish('liquidity_added', {
        step,
        tokenA: this.tokenA,
        tokenB: this.tokenB,
        amountA,
        amountB,
      });
    }
  }

  removeLiquidity(share: number, step: number = 0): [number, number] {
    share = Math.max(0, Math.min(1, share));
    const amountA = this.reserveA * share;
    const amountB = this.reserveB * share;

    this.reserveA -= amountA;
    this.reserveB -= amountB;

    if (this.eventBus) {
      this.eventBus.publish('liquidity_removed', {
        step,
        tokenA: this.tokenA,
        tokenB: this.tokenB,
        amountA,
        amountB,
      });
    }

    return [amountA, amountB];
  }

  swap(tokenIn: string, amountIn: number, step: number = 0): number {
    let inReserve: number, outReserve: number, tokenOut: string;

    if (tokenIn === this.tokenA) {
      inReserve = this.reserveA;
      outReserve = this.reserveB;
      tokenOut = this.tokenB;
    } else {
      inReserve = this.reserveB;
      outReserve = this.reserveA;
      tokenOut = this.tokenA;
    }

    // Constant product formula: x * y = k
    const k = inReserve * outReserve;
    const newIn = inReserve + amountIn;
    const newOut = k / newIn;
    const amountOut = outReserve - newOut;

    // Update reserves
    if (tokenIn === this.tokenA) {
      this.reserveA = newIn;
      this.reserveB = newOut;
    } else {
      this.reserveB = newIn;
      this.reserveA = newOut;
    }

    if (this.eventBus) {
      this.eventBus.publish('token_swap', {
        step,
        tokenIn,
        tokenOut,
        amountIn,
        amountOut,
      });
    }

    return amountOut;
  }
}

/**
 * Treasury manages DAO tokens, prices, and liquidity pools
 */
export class Treasury {
  tokens: Map<string, number> = new Map();
  private lockedTokens: Map<string, number> = new Map();
  tokenPrices: Map<string, number> = new Map();
  private revenue: number = 0;
  eventBus: EventBus | null;
  private pricePressure: Map<string, number> = new Map();
  oracle: PriceOracle;
  pools: Map<string, LiquidityPool> = new Map();

  constructor(eventBus: EventBus | null = null, oracle?: PriceOracle) {
    this.eventBus = eventBus;
    this.oracle = oracle || new RandomWalkOracle();
    this.tokenPrices.set('DAO_TOKEN', 1.0); // Default price
    this.tokens.set('DAO_TOKEN', 0);
    // Sync oracle price with treasury initial price
    this.oracle.setPrice('DAO_TOKEN', 1.0);
  }

  private ensureTokenPrice(token: string): number {
    const existingPrice = this.tokenPrices.get(token);
    if (existingPrice && existingPrice > 0) {
      return existingPrice;
    }

    const oraclePrice = this.oracle.getPrice(token);
    const safePrice = Number.isFinite(oraclePrice) && oraclePrice > 0 ? oraclePrice : 1;
    this.tokenPrices.set(token, safePrice);
    this.oracle.setPrice(token, safePrice);
    return safePrice;
  }

  deposit(token: string, amount: number, step: number = 0): void {
    this.ensureTokenPrice(token);
    const current = this.tokens.get(token) || 0;
    this.tokens.set(token, current + amount);

    const pressure = this.pricePressure.get(token) || 0;
    this.pricePressure.set(token, pressure - amount);

    if (this.eventBus) {
      this.eventBus.publish('token_deposit', { step, token, amount });
    }
  }

  withdraw(token: string, amount: number, step: number = 0): number {
    const current = this.tokens.get(token) || 0;
    let withdrawn: number;

    if (current >= amount) {
      this.tokens.set(token, current - amount);
      withdrawn = amount;
    } else {
      this.tokens.set(token, 0);
      withdrawn = current;
    }

    const pressure = this.pricePressure.get(token) || 0;
    this.pricePressure.set(token, pressure + withdrawn);

    if (this.eventBus) {
      this.eventBus.publish('token_withdraw', { step, token, amount: withdrawn });
    }

    return withdrawn;
  }

  lockTokens(token: string, amount: number, step: number = 0): number {
    const locked = this.withdraw(token, amount, step);

    if (locked > 0) {
      const currentLocked = this.lockedTokens.get(token) || 0;
      this.lockedTokens.set(token, currentLocked + locked);

      if (this.eventBus) {
        this.eventBus.publish('token_locked', { step, token, amount: locked });
      }
    }

    return locked;
  }

  withdrawLocked(token: string, amount: number, step: number = 0): number {
    const currentLocked = this.lockedTokens.get(token) || 0;
    let withdrawn: number;

    if (currentLocked >= amount) {
      this.lockedTokens.set(token, currentLocked - amount);
      withdrawn = amount;
    } else {
      this.lockedTokens.set(token, 0);
      withdrawn = currentLocked;
    }

    if (this.eventBus) {
      this.eventBus.publish('token_withdraw_locked', { step, token, amount: withdrawn });
    }

    return withdrawn;
  }

  mintTokens(token: string, amount: number, step: number = 0): void {
    if (amount <= 0) return;

    this.ensureTokenPrice(token);
    const current = this.tokens.get(token) || 0;
    this.tokens.set(token, current + amount);

    const pressure = this.pricePressure.get(token) || 0;
    this.pricePressure.set(token, pressure + amount);

    if (this.eventBus) {
      this.eventBus.publish('token_minted', { step, token, amount });
    }
  }

  burnTokens(token: string, amount: number, step: number = 0): number {
    const current = this.tokens.get(token) || 0;
    const burn = Math.min(amount, current);

    if (burn <= 0) return 0;

    this.tokens.set(token, current - burn);

    const pressure = this.pricePressure.get(token) || 0;
    this.pricePressure.set(token, pressure - burn);

    if (this.eventBus) {
      this.eventBus.publish('token_burned', { step, token, amount: burn });
    }

    return burn;
  }

  getLockedBalance(token: string): number {
    return this.lockedTokens.get(token) || 0;
  }

  updateTokenPrice(token: string, newPrice: number): void {
    this.tokenPrices.set(token, newPrice);
  }

  getTokenPrice(token: string): number {
    return this.tokenPrices.get(token) || 0;
  }

  updatePrices(volatility: number = 0.05): void {
    // Update prices for all tokens using both oracle randomness AND market pressure
    for (const token of this.tokens.keys()) {
      // Get accumulated price pressure (positive = selling pressure, negative = buying pressure)
      const pressure = this.pricePressure.get(token) || 0;
      const currentPrice = this.ensureTokenPrice(token);
      const supply = this.tokens.get(token) || 1;

      // Calculate market-driven price adjustment based on pressure relative to supply
      // Pressure is normalized by supply to prevent wild swings with large treasuries
      const pressureRatio = pressure / Math.max(supply, 1000);

      // Price impact: positive pressure (selling) decreases price, negative (buying) increases
      // Capped at ±5% per step to prevent extreme movements
      const pressureImpact = Math.max(-0.05, Math.min(0.05, -pressureRatio * 0.1));

      // Apply random walk from oracle for market noise
      this.oracle.updatePrice(token, volatility);
      const oraclePrice = this.oracle.getPrice(token);

      // Blend oracle randomness with market pressure effects
      // 70% oracle movement + 30% pressure-based adjustment
      const oracleChange = (oraclePrice - currentPrice) / currentPrice;
      const blendedChange = oracleChange * 0.7 + pressureImpact * 0.3;

      // Calculate new price with floor to prevent negative/zero prices
      const newPrice = Math.max(0.0001, currentPrice * (1 + blendedChange));

      // Sync oracle with the blended price for consistency
      this.oracle.setPrice(token, newPrice);
      this.updateTokenPrice(token, newPrice);

      // Decay pressure over time (80% retained each step) to model market absorption
      this.pricePressure.set(token, pressure * 0.8);
    }
  }

  getTokenValue(token: string): number {
    const balance = this.tokens.get(token) || 0;
    const price = this.getTokenPrice(token);
    return balance * price;
  }

  getTokenBalance(token: string): number {
    return this.tokens.get(token) || 0;
  }

  get tokenBalance(): number {
    let total = 0;
    for (const balance of this.tokens.values()) {
      total += balance;
    }
    return total;
  }

  get holdings(): Record<string, number> {
    const obj: Record<string, number> = {};
    for (const [token, balance] of this.tokens.entries()) {
      obj[token] = balance;
    }
    return obj;
  }

  get funds(): number {
    return this.tokenBalance;
  }

  addRevenue(amount: number): void {
    this.revenue += amount;
  }

  getRevenueAmount(): number {
    const revenue = this.revenue;
    this.revenue = 0;
    return revenue;
  }

  // Liquidity Pool Management

  private getPoolKey(tokenA: string, tokenB: string): string {
    return [tokenA, tokenB].sort().join('|');
  }

  private getPool(tokenA: string, tokenB: string, create: boolean = false): LiquidityPool | null {
    const key = this.getPoolKey(tokenA, tokenB);
    let pool = this.pools.get(key);

    if (!pool && create) {
      const [ta, tb] = key.split('|');
      pool = new LiquidityPool(ta, tb, this.eventBus);
      this.pools.set(key, pool);
    }

    return pool || null;
  }

  createPool(tokenA: string, tokenB: string): LiquidityPool {
    return this.getPool(tokenA, tokenB, true)!;
  }

  addLiquidity(tokenA: string, tokenB: string, amtA: number, amtB: number, step: number = 0): number {
    const pool = this.getPool(tokenA, tokenB, true)!;
    this.withdraw(tokenA, amtA, step);
    this.withdraw(tokenB, amtB, step);
    pool.addLiquidity(amtA, amtB, step);
    // Return LP tokens proportional to liquidity added
    return Math.sqrt(amtA * amtB);
  }

  /**
   * Get the price ratio of tokenA to tokenB in a pool
   */
  getPoolPrice(poolKey: string): number | null {
    const pool = this.pools.get(poolKey);
    if (!pool || pool.reserveA === 0) return null;
    return pool.reserveB / pool.reserveA;
  }

  removeLiquidity(tokenA: string, tokenB: string, share: number, step: number = 0): [number, number] {
    const pool = this.getPool(tokenA, tokenB);
    if (!pool) return [0, 0];

    const [amtA, amtB] = pool.removeLiquidity(share, step);
    this.deposit(pool.tokenA, amtA, step);
    this.deposit(pool.tokenB, amtB, step);

    return [amtA, amtB];
  }

  swap(tokenIn: string, tokenOut: string, amountIn: number, step: number = 0): number {
    const pool = this.getPool(tokenIn, tokenOut);
    if (!pool) {
      throw new Error('Pool does not exist');
    }

    this.withdraw(tokenIn, amountIn, step);
    const amountOut = pool.swap(tokenIn, amountIn, step);
    this.deposit(tokenOut, amountOut, step);

    return amountOut;
  }

  toDict(): any {
    const poolsObj: Record<string, any> = {};
    for (const [key, pool] of this.pools.entries()) {
      poolsObj[key] = {
        reserveA: pool.reserveA,
        reserveB: pool.reserveB,
      };
    }

    return {
      tokens: Object.fromEntries(this.tokens),
      lockedTokens: Object.fromEntries(this.lockedTokens),
      tokenPrices: Object.fromEntries(this.tokenPrices),
      revenue: this.revenue,
      pools: poolsObj,
    };
  }

  static fromDict(data: any, eventBus: EventBus | null = null): Treasury {
    const treasury = new Treasury(eventBus);

    treasury.tokens = new Map(Object.entries(data.tokens || {}));
    treasury.lockedTokens = new Map(Object.entries(data.lockedTokens || {}));
    treasury.tokenPrices = new Map(Object.entries(data.tokenPrices || { DAO_TOKEN: 1.0 }));
    treasury.revenue = data.revenue || 0;
    treasury.pricePressure = new Map();

    for (const [key, poolData] of Object.entries(data.pools || {})) {
      const tokens = key.split('|');
      const pool = new LiquidityPool(tokens[0], tokens[1], eventBus);
      pool.reserveA = (poolData as any).reserveA || 0;
      pool.reserveB = (poolData as any).reserveB || 0;
      treasury.pools.set(key, pool);
    }

    return treasury;
  }
}
