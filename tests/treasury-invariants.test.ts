import { beforeEach, describe, expect, it } from 'vitest';
import { LiquidityPool, Treasury } from '../lib/data-structures/treasury';
import { EventBus } from '../lib/utils/event-bus';

describe('Treasury accounting invariants', () => {
  let eventBus: EventBus;
  let treasury: Treasury;
  let events: string[];

  beforeEach(() => {
    eventBus = new EventBus(false);
    treasury = new Treasury(eventBus);
    events = [];
    eventBus.subscribe('*', (event) => events.push(event.event));
  });

  it('ignores invalid direct balance mutations without emitting events', () => {
    treasury.deposit('DAO_TOKEN', 100, 1);
    treasury.deposit('DAO_TOKEN', -10, 2);
    treasury.deposit('DAO_TOKEN', Number.NaN, 2);
    treasury.deposit('DAO_TOKEN', Number.POSITIVE_INFINITY, 2);

    expect(treasury.getTokenBalance('DAO_TOKEN')).toBe(100);
    expect(treasury.withdraw('DAO_TOKEN', -50, 3)).toBe(0);
    expect(treasury.withdraw('DAO_TOKEN', Number.NaN, 3)).toBe(0);
    expect(treasury.getTokenBalance('DAO_TOKEN')).toBe(100);
    expect(events).toEqual(['token_deposit']);
  });

  it('rejects invalid mint, burn, locked withdrawal, price, and revenue updates', () => {
    treasury.mintTokens('DAO_TOKEN', 100, 1);
    treasury.mintTokens('DAO_TOKEN', Number.POSITIVE_INFINITY, 2);
    treasury.burnTokens('DAO_TOKEN', Number.NaN, 3);
    treasury.lockTokens('DAO_TOKEN', 40, 4);

    expect(treasury.withdrawLocked('DAO_TOKEN', -1, 5)).toBe(0);
    expect(treasury.getLockedBalance('DAO_TOKEN')).toBe(40);

    treasury.updateTokenPrice('DAO_TOKEN', 2);
    treasury.updateTokenPrice('DAO_TOKEN', 0);
    treasury.updateTokenPrice('DAO_TOKEN', Number.NaN);
    treasury.addRevenue(25);
    treasury.addRevenue(-100);
    treasury.addRevenue(Number.NaN);

    expect(treasury.getTokenBalance('DAO_TOKEN')).toBe(60);
    expect(treasury.getTokenPrice('DAO_TOKEN')).toBe(2);
    expect(treasury.getRevenueAmount()).toBe(25);
  });

  it('swaps only the amount actually withdrawn from treasury', () => {
    treasury.deposit('DAO_TOKEN', 1000, 1);
    treasury.deposit('USDC', 1000, 1);
    treasury.addLiquidity('DAO_TOKEN', 'USDC', 500, 500, 2);

    const amountOut = treasury.swap('DAO_TOKEN', 'USDC', 1000, 3);

    expect(amountOut).toBeGreaterThan(0);
    expect(amountOut).toBeLessThan(300);
    expect(treasury.getTokenBalance('DAO_TOKEN')).toBe(0);
    expect(treasury.getTokenBalance('USDC')).toBeCloseTo(500 + amountOut, 10);
  });

  it('refunds swap input when a pool cannot produce output', () => {
    treasury.deposit('DAO_TOKEN', 25, 1);
    treasury.createPool('DAO_TOKEN', 'USDC');

    expect(treasury.swap('DAO_TOKEN', 'USDC', 25, 2)).toBe(0);
    expect(treasury.getTokenBalance('DAO_TOKEN')).toBe(25);
    expect(treasury.getTokenBalance('USDC')).toBe(0);
  });

  it('maintains an append-only, replayable ledger across every balance operation', () => {
    treasury.deposit('DAO_TOKEN', 100, 1);
    treasury.lockTokens('DAO_TOKEN', 40, 2);
    treasury.withdrawLocked('DAO_TOKEN', 10, 3);
    treasury.mintTokens('DAO_TOKEN', 25, 4);
    treasury.burnTokens('DAO_TOKEN', 5, 5);
    treasury.withdraw('DAO_TOKEN', 20, 6);

    const ledger = treasury.getLedger();
    expect(ledger.map(entry => entry.operation)).toEqual([
      'deposit',
      'withdraw',
      'lock',
      'withdraw_locked',
      'mint',
      'burn',
      'withdraw',
    ]);
    expect(ledger.map(entry => entry.sequence)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(ledger.every(entry =>
      entry.source.length > 0 &&
      entry.destination.length > 0 &&
      entry.event.length > 0
    )).toBe(true);
    expect(ledger.find(entry => entry.operation === 'mint')?.flowClass).toBe('mint');
    expect(ledger.find(entry => entry.operation === 'burn')?.flowClass).toBe('burn');
    expect(treasury.getTokenBalance('DAO_TOKEN')).toBe(60);
    expect(treasury.getLockedBalance('DAO_TOKEN')).toBe(30);
    expect(treasury.validateLedger()).toEqual({
      valid: true,
      entriesChecked: 7,
      issues: [],
    });
  });

  it('detects mutations that bypass the accounting ledger', () => {
    treasury.deposit('DAO_TOKEN', 100, 1);
    treasury.tokens.set('DAO_TOKEN', 101);

    const validation = treasury.validateLedger();
    expect(validation.valid).toBe(false);
    expect(validation.issues).toContain(
      'Final liquid balance for DAO_TOKEN does not reconcile to the ledger'
    );
  });

  it('serializes its ledger and creates a reconciled opening entry for legacy state', () => {
    treasury.deposit('DAO_TOKEN', 100, 1);
    treasury.lockTokens('DAO_TOKEN', 25, 2);

    const restored = Treasury.fromDict(treasury.toDict(), eventBus);
    expect(restored.validateLedger().valid).toBe(true);
    expect(restored.getLedger()).toEqual(treasury.getLedger());

    const restoredLegacy = Treasury.fromDict({
      tokens: { DAO_TOKEN: 75 },
      lockedTokens: { DAO_TOKEN: 25 },
    });
    expect(restoredLegacy.getLedger()).toHaveLength(1);
    expect(restoredLegacy.getLedger()[0].operation).toBe('restore');
    expect(restoredLegacy.validateLedger().valid).toBe(true);
  });

  it('canonicalizes the legacy DAO_TOKEN alias to a configured primary token', () => {
    treasury.setPrimaryTokenSymbol('CUSTOM');
    treasury.mintTokens('DAO_TOKEN', 100, 1);
    treasury.deposit('CUSTOM', 25, 2);

    expect(treasury.getPrimaryTokenSymbol()).toBe('CUSTOM');
    expect(treasury.getTokenBalance('DAO_TOKEN')).toBe(125);
    expect(treasury.getTokenBalance('CUSTOM')).toBe(125);
    expect(treasury.tokens.has('DAO_TOKEN')).toBe(false);
    expect(treasury.getLedger().map(entry => entry.token)).toEqual(['CUSTOM', 'CUSTOM']);
    expect(treasury.validateLedger().valid).toBe(true);

    const restored = Treasury.fromDict(treasury.toDict(), eventBus);
    expect(restored.getPrimaryTokenSymbol()).toBe('CUSTOM');
    expect(restored.getTokenBalance('DAO_TOKEN')).toBe(125);
    expect(restored.validateLedger().valid).toBe(true);
  });

  it('mints and redeems LP shares without changing either asset supply', () => {
    treasury.deposit('DAO_TOKEN', 1_000);
    treasury.deposit('USDC', 1_000);
    const lp = treasury.addLiquidity('DAO_TOKEN', 'USDC', 500, 500, 1);
    const pool = treasury.pools.get('DAO_TOKEN|USDC')!;

    expect(lp).toBeCloseTo(500);
    expect(pool.totalLPSupply).toBeCloseTo(500);
    expect(
      treasury.getTokenBalance('DAO_TOKEN') + pool.reserveA
    ).toBeCloseTo(1_000);
    expect(treasury.getTokenBalance('USDC') + pool.reserveB).toBeCloseTo(1_000);

    const [primary, stable] = treasury.removeLiquidityByLP(
      'DAO_TOKEN',
      'USDC',
      lp / 4,
      2
    );
    expect(primary).toBeCloseTo(125);
    expect(stable).toBeCloseTo(125);
    expect(pool.totalLPSupply).toBeCloseTo(375);
    expect(
      treasury.getTokenBalance('DAO_TOKEN') + pool.reserveA
    ).toBeCloseTo(1_000);
    expect(treasury.getTokenBalance('USDC') + pool.reserveB).toBeCloseTo(1_000);
    expect(treasury.validateLedger().valid).toBe(true);
  });
});

describe('LiquidityPool accounting invariants', () => {
  it('rejects invalid liquidity removal and foreign-token swaps without poisoning reserves', () => {
    const pool = new LiquidityPool('DAO_TOKEN', 'USDC');
    pool.addLiquidity(100, 200, 1);

    expect(pool.removeLiquidity(Number.NaN, 2)).toEqual([0, 0]);
    expect(pool.removeLiquidity(-1, 2)).toEqual([0, 0]);
    expect(pool.swap('ETH', 10, 3)).toBe(0);

    expect(pool.reserveA).toBe(100);
    expect(pool.reserveB).toBe(200);
  });
});
