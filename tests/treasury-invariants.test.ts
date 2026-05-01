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
