// Treasury and Liquidity Pool implementations

import type { EventBus } from '../utils/event-bus';
import type { PriceOracle } from '@/types/simulation';
import { RandomWalkOracle } from '../utils/oracles';

function isPositiveFiniteAmount(amount: number): boolean {
  return Number.isFinite(amount) && amount > 0;
}

export type TreasuryLedgerOperation =
  | 'deposit'
  | 'withdraw'
  | 'lock'
  | 'withdraw_locked'
  | 'mint'
  | 'burn'
  | 'restore';

export interface TreasuryLedgerEntry {
  sequence: number;
  step: number;
  operation: TreasuryLedgerOperation;
  token: string;
  amount: number;
  source: string;
  destination: string;
  event: string;
  flowClass: 'transfer' | 'mint' | 'burn' | 'restore';
  liquidDelta: number;
  lockedDelta: number;
  liquidBalanceAfter: number;
  lockedBalanceAfter: number;
}

export interface TreasuryFlowMetadata {
  source?: string;
  destination?: string;
  event?: string;
}

export interface TreasuryLedgerValidation {
  valid: boolean;
  entriesChecked: number;
  issues: string[];
}

/**
 * Constant product automated market maker (AMM)
 * Implements x * y = k formula
 */
export class LiquidityPool {
  tokenA: string;
  tokenB: string;
  reserveA: number = 0;
  reserveB: number = 0;
  totalLPSupply: number = 0;
  eventBus: EventBus | null;

  constructor(tokenA: string, tokenB: string, eventBus: EventBus | null = null) {
    this.tokenA = tokenA;
    this.tokenB = tokenB;
    this.eventBus = eventBus;
  }

  addLiquidity(amountA: number, amountB: number, step: number = 0): number {
    // Validate amounts - must be positive and finite
    if (!isPositiveFiniteAmount(amountA) || !isPositiveFiniteAmount(amountB)) {
      return 0;
    }

    const lpMinted = this.totalLPSupply === 0
      ? Math.sqrt(amountA * amountB)
      : Math.min(
          amountA * this.totalLPSupply / Math.max(this.reserveA, Number.EPSILON),
          amountB * this.totalLPSupply / Math.max(this.reserveB, Number.EPSILON)
        );
    this.reserveA += amountA;
    this.reserveB += amountB;
    this.totalLPSupply += lpMinted;

    if (this.eventBus) {
      this.eventBus.publish('liquidity_added', {
        step,
        tokenA: this.tokenA,
        tokenB: this.tokenB,
        amountA,
        amountB,
        lpMinted,
      });
    }
    return lpMinted;
  }

  removeLiquidity(share: number, step: number = 0): [number, number] {
    if (!Number.isFinite(share) || share <= 0) {
      return [0, 0];
    }

    share = Math.max(0, Math.min(1, share));
    const amountA = this.reserveA * share;
    const amountB = this.reserveB * share;

    this.reserveA -= amountA;
    this.reserveB -= amountB;
    this.totalLPSupply *= 1 - share;

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

  removeLiquidityByLP(lpAmount: number, step: number = 0): [number, number] {
    if (!isPositiveFiniteAmount(lpAmount) || this.totalLPSupply <= 0) return [0, 0];
    return this.removeLiquidity(Math.min(1, lpAmount / this.totalLPSupply), step);
  }

  swap(tokenIn: string, amountIn: number, step: number = 0): number {
    // Validate input amount
    if (!isPositiveFiniteAmount(amountIn)) {
      return 0;
    }

    if (tokenIn !== this.tokenA && tokenIn !== this.tokenB) {
      return 0;
    }

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

    // Validate reserves - can't swap with empty pool
    if (inReserve <= 0 || outReserve <= 0) {
      return 0;
    }

    // Apply 0.3% swap fee — fee stays in pool (added to inReserve)
    const feeRate = 0.003;
    const fee = amountIn * feeRate;
    const amountInAfterFee = amountIn - fee;

    // Constant product formula: x * y = k
    const k = inReserve * outReserve;
    const newIn = inReserve + amountInAfterFee;

    // Safety check to prevent division issues
    if (newIn <= 0) {
      return 0;
    }

    const newOut = k / newIn;
    let amountOut = outReserve - newOut;

    // Ensure amountOut is valid and positive
    if (!Number.isFinite(amountOut) || amountOut < 0) {
      return 0;
    }

    // Prevent draining the pool completely (leave at least 0.01% reserve)
    const minReserve = outReserve * 0.0001;
    if (newOut < minReserve) {
      amountOut = outReserve - minReserve;
    }

    // Update reserves (fee stays in pool, so add full amountIn to inReserve)
    if (tokenIn === this.tokenA) {
      this.reserveA = inReserve + amountIn;
      this.reserveB = Math.max(0, outReserve - amountOut);
    } else {
      this.reserveB = inReserve + amountIn;
      this.reserveA = Math.max(0, outReserve - amountOut);
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
  private ledger: TreasuryLedgerEntry[] = [];
  private ledgerSequence: number = 0;
  tokenPrices: Map<string, number> = new Map();
  private revenue: number = 0;
  eventBus: EventBus | null;
  private pricePressure: Map<string, number> = new Map();
  oracle: PriceOracle;
  pools: Map<string, LiquidityPool> = new Map();
  private primaryTokenSymbol: string = 'DAO_TOKEN';

  constructor(eventBus: EventBus | null = null, oracle?: PriceOracle) {
    this.eventBus = eventBus;
    this.oracle = oracle || new RandomWalkOracle();
    this.tokenPrices.set('DAO_TOKEN', 1.0); // Default price
    this.tokens.set('DAO_TOKEN', 0);
    // Sync oracle price with treasury initial price
    this.oracle.setPrice('DAO_TOKEN', 1.0);
  }

  /**
   * Configure the DAO's canonical primary asset. The historical DAO_TOKEN
   * spelling remains an input alias so older agents and saved configurations
   * cannot accidentally create a second primary-token ledger.
   */
  setPrimaryTokenSymbol(token: string): void {
    const normalized = typeof token === 'string' && token.trim() ? token.trim() : 'DAO_TOKEN';
    if (normalized === this.primaryTokenSymbol) return;

    const previous = this.primaryTokenSymbol;
    const previousBalance = this.tokens.get(previous) || 0;
    const previousLocked = this.lockedTokens.get(previous) || 0;
    const previousPrice = this.tokenPrices.get(previous) || 1;
    const previousPressure = this.pricePressure.get(previous) || 0;
    this.primaryTokenSymbol = normalized;

    this.tokens.set(normalized, (this.tokens.get(normalized) || 0) + previousBalance);
    this.lockedTokens.set(normalized, (this.lockedTokens.get(normalized) || 0) + previousLocked);
    this.tokenPrices.set(normalized, this.tokenPrices.get(normalized) || previousPrice);
    this.pricePressure.set(normalized, (this.pricePressure.get(normalized) || 0) + previousPressure);
    this.oracle.setPrice(normalized, this.tokenPrices.get(normalized)!);

    this.ledger = this.ledger.map(entry => (
      entry.token === previous ? { ...entry, token: normalized } : entry
    ));
    const migratedPools = new Map<string, LiquidityPool>();
    for (const pool of this.pools.values()) {
      if (pool.tokenA === previous) pool.tokenA = normalized;
      if (pool.tokenB === previous) pool.tokenB = normalized;
      migratedPools.set([pool.tokenA, pool.tokenB].sort().join('|'), pool);
    }
    this.pools = migratedPools;

    if (previous !== normalized) {
      this.tokens.delete(previous);
      this.lockedTokens.delete(previous);
      this.tokenPrices.delete(previous);
      this.pricePressure.delete(previous);
    }
  }

  getPrimaryTokenSymbol(): string {
    return this.primaryTokenSymbol;
  }

  getTokenSymbols(): string[] {
    const symbols = new Set<string>([
      ...this.tokens.keys(),
      ...this.lockedTokens.keys(),
      ...this.tokenPrices.keys(),
      ...this.ledger.map(entry => entry.token),
    ]);
    for (const pool of this.pools.values()) {
      symbols.add(pool.tokenA);
      symbols.add(pool.tokenB);
    }
    return Array.from(symbols).sort();
  }

  private normalizeToken(token: string): string {
    return token === 'DAO_TOKEN' ? this.primaryTokenSymbol : token;
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

  private recordLedgerEntry(
    operation: TreasuryLedgerOperation,
    token: string,
    amount: number,
    liquidDelta: number,
    lockedDelta: number,
    step: number,
    metadata: TreasuryFlowMetadata = {}
  ): void {
    const defaults = operation === 'mint'
      ? { source: 'protocol:issuance', destination: 'treasury:liquid', event: 'token_minted', flowClass: 'mint' as const }
      : operation === 'burn'
        ? { source: 'treasury:liquid', destination: 'protocol:burn_sink', event: 'token_burned', flowClass: 'burn' as const }
        : operation === 'restore'
          ? { source: 'checkpoint:opening_balance', destination: 'treasury', event: 'state_restored', flowClass: 'restore' as const }
          : operation === 'deposit'
            ? { source: 'counterparty:unspecified', destination: 'treasury:liquid', event: 'token_deposit', flowClass: 'transfer' as const }
            : operation === 'withdraw'
              ? { source: 'treasury:liquid', destination: 'counterparty:unspecified', event: 'token_withdraw', flowClass: 'transfer' as const }
              : operation === 'lock'
                ? { source: 'treasury:lock_transit', destination: 'treasury:locked', event: 'token_locked', flowClass: 'transfer' as const }
                : { source: 'treasury:locked', destination: 'counterparty:unspecified', event: 'token_withdraw_locked', flowClass: 'transfer' as const };
    this.ledgerSequence += 1;
    this.ledger.push({
      sequence: this.ledgerSequence,
      step,
      operation,
      token,
      amount,
      source: metadata.source ?? defaults.source,
      destination: metadata.destination ?? defaults.destination,
      event: metadata.event ?? defaults.event,
      flowClass: defaults.flowClass,
      liquidDelta,
      lockedDelta,
      liquidBalanceAfter: this.getTokenBalance(token),
      lockedBalanceAfter: this.getLockedBalance(token),
    });
  }

  getLedger(): readonly TreasuryLedgerEntry[] {
    return this.ledger.map(entry => ({ ...entry }));
  }

  validateLedger(tolerance: number = 1e-9): TreasuryLedgerValidation {
    const issues: string[] = [];
    const liquid = new Map<string, number>();
    const locked = new Map<string, number>();
    let expectedSequence = 1;

    for (const entry of this.ledger) {
      if (entry.sequence !== expectedSequence) {
        issues.push(`Ledger sequence ${entry.sequence} should be ${expectedSequence}`);
      }
      expectedSequence += 1;
      if (!entry.source || !entry.destination || !entry.event || !entry.flowClass) {
        issues.push(`Ledger flow metadata is incomplete at sequence ${entry.sequence}`);
      }

      const nextLiquid = (liquid.get(entry.token) || 0) + entry.liquidDelta;
      const nextLocked = (locked.get(entry.token) || 0) + entry.lockedDelta;
      if (!Number.isFinite(nextLiquid) || nextLiquid < -tolerance) {
        issues.push(`Invalid replayed liquid balance for ${entry.token} at sequence ${entry.sequence}`);
      }
      if (!Number.isFinite(nextLocked) || nextLocked < -tolerance) {
        issues.push(`Invalid replayed locked balance for ${entry.token} at sequence ${entry.sequence}`);
      }
      if (Math.abs(nextLiquid - entry.liquidBalanceAfter) > tolerance) {
        issues.push(`Liquid balance mismatch for ${entry.token} at sequence ${entry.sequence}`);
      }
      if (Math.abs(nextLocked - entry.lockedBalanceAfter) > tolerance) {
        issues.push(`Locked balance mismatch for ${entry.token} at sequence ${entry.sequence}`);
      }
      liquid.set(entry.token, nextLiquid);
      locked.set(entry.token, nextLocked);
    }

    const tokens = new Set([...this.tokens.keys(), ...this.lockedTokens.keys(), ...liquid.keys(), ...locked.keys()]);
    for (const token of tokens) {
      if (Math.abs((liquid.get(token) || 0) - this.getTokenBalance(token)) > tolerance) {
        issues.push(`Final liquid balance for ${token} does not reconcile to the ledger`);
      }
      if (Math.abs((locked.get(token) || 0) - this.getLockedBalance(token)) > tolerance) {
        issues.push(`Final locked balance for ${token} does not reconcile to the ledger`);
      }
    }

    return { valid: issues.length === 0, entriesChecked: this.ledger.length, issues };
  }

  deposit(
    token: string,
    amount: number,
    step: number = 0,
    metadata: TreasuryFlowMetadata = {}
  ): void {
    token = this.normalizeToken(token);
    if (!isPositiveFiniteAmount(amount)) {
      return;
    }

    this.ensureTokenPrice(token);
    const current = this.tokens.get(token) || 0;
    this.tokens.set(token, current + amount);
    this.recordLedgerEntry('deposit', token, amount, amount, 0, step, metadata);

    // No price pressure from deposit — just moving existing tokens in.
    // Only mintTokens and burnTokens should affect price pressure.

    if (this.eventBus) {
      this.eventBus.publish('token_deposit', { step, token, amount });
    }
  }

  withdraw(
    token: string,
    amount: number,
    step: number = 0,
    metadata: TreasuryFlowMetadata = {}
  ): number {
    token = this.normalizeToken(token);
    if (!isPositiveFiniteAmount(amount)) {
      return 0;
    }

    const current = this.tokens.get(token) || 0;
    let withdrawn: number;

    if (current >= amount) {
      this.tokens.set(token, current - amount);
      withdrawn = amount;
    } else {
      this.tokens.set(token, 0);
      withdrawn = current;
    }
    if (withdrawn > 0) {
      this.recordLedgerEntry('withdraw', token, withdrawn, -withdrawn, 0, step, metadata);
    }

    const pressure = this.pricePressure.get(token) || 0;
    this.pricePressure.set(token, pressure + withdrawn);

    if (this.eventBus) {
      this.eventBus.publish('token_withdraw', { step, token, amount: withdrawn });
    }

    return withdrawn;
  }

  lockTokens(token: string, amount: number, step: number = 0): number {
    token = this.normalizeToken(token);
    const locked = this.withdraw(token, amount, step, {
      source: 'treasury:liquid',
      destination: 'treasury:lock_transit',
      event: 'token_lock_debit',
    });

    if (locked > 0) {
      const currentLocked = this.lockedTokens.get(token) || 0;
      this.lockedTokens.set(token, currentLocked + locked);
      this.recordLedgerEntry('lock', token, locked, 0, locked, step);

      if (this.eventBus) {
        this.eventBus.publish('token_locked', { step, token, amount: locked });
      }
    }

    return locked;
  }

  withdrawLocked(token: string, amount: number, step: number = 0): number {
    token = this.normalizeToken(token);
    if (!isPositiveFiniteAmount(amount)) {
      return 0;
    }

    const currentLocked = this.lockedTokens.get(token) || 0;
    let withdrawn: number;

    if (currentLocked >= amount) {
      this.lockedTokens.set(token, currentLocked - amount);
      withdrawn = amount;
    } else {
      this.lockedTokens.set(token, 0);
      withdrawn = currentLocked;
    }
    if (withdrawn > 0) {
      this.recordLedgerEntry('withdraw_locked', token, withdrawn, 0, -withdrawn, step);
    }

    if (this.eventBus) {
      this.eventBus.publish('token_withdraw_locked', { step, token, amount: withdrawn });
    }

    return withdrawn;
  }

  mintTokens(
    token: string,
    amount: number,
    step: number = 0,
    metadata: TreasuryFlowMetadata = {}
  ): void {
    token = this.normalizeToken(token);
    if (!isPositiveFiniteAmount(amount)) return;

    this.ensureTokenPrice(token);
    const current = this.tokens.get(token) || 0;
    this.tokens.set(token, current + amount);
    this.recordLedgerEntry('mint', token, amount, amount, 0, step, metadata);

    const pressure = this.pricePressure.get(token) || 0;
    this.pricePressure.set(token, pressure + amount);

    if (this.eventBus) {
      this.eventBus.publish('token_minted', { step, token, amount });
    }
  }

  burnTokens(
    token: string,
    amount: number,
    step: number = 0,
    metadata: TreasuryFlowMetadata = {}
  ): number {
    token = this.normalizeToken(token);
    if (!isPositiveFiniteAmount(amount)) return 0;

    const current = this.tokens.get(token) || 0;
    const burn = Math.min(amount, current);

    if (burn <= 0) return 0;

    this.tokens.set(token, current - burn);
    this.recordLedgerEntry('burn', token, burn, -burn, 0, step, metadata);

    const pressure = this.pricePressure.get(token) || 0;
    this.pricePressure.set(token, pressure - burn);

    if (this.eventBus) {
      this.eventBus.publish('token_burned', { step, token, amount: burn });
    }

    return burn;
  }

  getLockedBalance(token: string): number {
    token = this.normalizeToken(token);
    return this.lockedTokens.get(token) || 0;
  }

  updateTokenPrice(token: string, newPrice: number): void {
    token = this.normalizeToken(token);
    if (!isPositiveFiniteAmount(newPrice)) {
      return;
    }

    this.tokenPrices.set(token, newPrice);
    if (this.oracle) {
      this.oracle.setPrice(token, newPrice);
    }
  }

  getTokenPrice(token: string): number {
    token = this.normalizeToken(token);
    return this.tokenPrices.get(token) || 0;
  }

  updatePrices(step: number, volatility: number = 0.05): void {
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
      this.oracle.updatePrice(token, step, volatility);
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
    token = this.normalizeToken(token);
    const balance = this.tokens.get(token) || 0;
    const price = this.getTokenPrice(token);
    return balance * price;
  }

  getTokenBalance(token: string): number {
    token = this.normalizeToken(token);
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
    return this.getTokenBalance(this.primaryTokenSymbol);
  }

  get totalBalance(): number {
    let total = 0;
    for (const [, balance] of this.tokens) {
      total += balance;
    }
    return total;
  }

  addRevenue(amount: number): void {
    if (!isPositiveFiniteAmount(amount)) {
      return;
    }

    this.revenue += amount;
  }

  getRevenueAmount(): number {
    const revenue = this.revenue;
    this.revenue = 0;
    return revenue;
  }

  // Liquidity Pool Management

  private getPoolKey(tokenA: string, tokenB: string): string {
    tokenA = this.normalizeToken(tokenA);
    tokenB = this.normalizeToken(tokenB);
    return [tokenA, tokenB].sort().join('|');
  }

  private getPool(tokenA: string, tokenB: string, create: boolean = false): LiquidityPool | null {
    tokenA = this.normalizeToken(tokenA);
    tokenB = this.normalizeToken(tokenB);
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
    tokenA = this.normalizeToken(tokenA);
    tokenB = this.normalizeToken(tokenB);
    const pool = this.getPool(tokenA, tokenB, true)!;
    const actualA = this.withdraw(tokenA, amtA, step);
    const actualB = this.withdraw(tokenB, amtB, step);
    if (actualA <= 0 || actualB <= 0) {
      // Return any withdrawn tokens
      if (actualA > 0) this.deposit(tokenA, actualA, step);
      if (actualB > 0) this.deposit(tokenB, actualB, step);
      return 0;
    }
    return pool.addLiquidity(actualA, actualB, step);
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
    tokenA = this.normalizeToken(tokenA);
    tokenB = this.normalizeToken(tokenB);
    const pool = this.getPool(tokenA, tokenB);
    if (!pool) return [0, 0];

    const [amtA, amtB] = pool.removeLiquidity(share, step);
    this.deposit(pool.tokenA, amtA, step);
    this.deposit(pool.tokenB, amtB, step);

    return [amtA, amtB];
  }

  removeLiquidityByLP(
    tokenA: string,
    tokenB: string,
    lpAmount: number,
    step: number = 0
  ): [number, number] {
    tokenA = this.normalizeToken(tokenA);
    tokenB = this.normalizeToken(tokenB);
    const pool = this.getPool(tokenA, tokenB);
    if (!pool) return [0, 0];

    const [amtA, amtB] = pool.removeLiquidityByLP(lpAmount, step);
    this.deposit(pool.tokenA, amtA, step);
    this.deposit(pool.tokenB, amtB, step);
    return [amtA, amtB];
  }

  swap(tokenIn: string, tokenOut: string, amountIn: number, step: number = 0): number {
    tokenIn = this.normalizeToken(tokenIn);
    tokenOut = this.normalizeToken(tokenOut);
    const pool = this.getPool(tokenIn, tokenOut);
    if (!pool) {
      throw new Error('Pool does not exist');
    }

    const actualIn = this.withdraw(tokenIn, amountIn, step);
    if (actualIn <= 0) {
      return 0;
    }

    const amountOut = pool.swap(tokenIn, actualIn, step);
    if (amountOut <= 0) {
      this.deposit(tokenIn, actualIn, step);
      return 0;
    }

    this.deposit(tokenOut, amountOut, step);

    return amountOut;
  }

  toDict(): any {
    const poolsObj: Record<string, any> = {};
    for (const [key, pool] of this.pools.entries()) {
      poolsObj[key] = {
        reserveA: pool.reserveA,
        reserveB: pool.reserveB,
        totalLPSupply: pool.totalLPSupply,
      };
    }

    return {
      primaryTokenSymbol: this.primaryTokenSymbol,
      tokens: Object.fromEntries(this.tokens),
      lockedTokens: Object.fromEntries(this.lockedTokens),
      tokenPrices: Object.fromEntries(this.tokenPrices),
      revenue: this.revenue,
      ledger: this.ledger.map(entry => ({ ...entry })),
      ledgerSequence: this.ledgerSequence,
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
    if (Array.isArray(data.ledger)) {
      treasury.ledger = data.ledger.map((entry: TreasuryLedgerEntry) => ({
        ...entry,
        source: entry.source || 'legacy:unknown',
        destination: entry.destination || 'legacy:unknown',
        event: entry.event || `legacy_${entry.operation}`,
        flowClass: entry.flowClass || (
          entry.operation === 'mint'
            ? 'mint'
            : entry.operation === 'burn'
              ? 'burn'
              : entry.operation === 'restore'
                ? 'restore'
                : 'transfer'
        ),
      }));
      treasury.ledgerSequence = Number.isInteger(data.ledgerSequence)
        ? data.ledgerSequence
        : treasury.ledger.length;
    } else {
      const tokenNames = new Set([...treasury.tokens.keys(), ...treasury.lockedTokens.keys()]);
      for (const token of tokenNames) {
        const liquid = treasury.getTokenBalance(token);
        const locked = treasury.getLockedBalance(token);
        if (liquid > 0 || locked > 0) {
          treasury.recordLedgerEntry('restore', token, liquid + locked, liquid, locked, 0);
        }
      }
    }

    for (const [key, poolData] of Object.entries(data.pools || {})) {
      const tokens = key.split('|');
      const pool = new LiquidityPool(tokens[0], tokens[1], eventBus);
      const poolRecord = poolData as {
        reserveA?: number;
        reserveB?: number;
        totalLPSupply?: number;
      };
      pool.reserveA = poolRecord.reserveA || 0;
      pool.reserveB = poolRecord.reserveB || 0;
      pool.totalLPSupply =
        poolRecord.totalLPSupply || Math.sqrt(pool.reserveA * pool.reserveB);
      treasury.pools.set(key, pool);
    }

    treasury.setPrimaryTokenSymbol(data.primaryTokenSymbol || 'DAO_TOKEN');

    return treasury;
  }
}
