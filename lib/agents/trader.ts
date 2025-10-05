// Trader Agent - swaps tokens in liquidity pools

import { DAOMember } from './base';
import type { DAOSimulation } from '../simulation';

export class Trader extends DAOMember {
  lastPrice: number;

  constructor(
    uniqueId: string,
    model: DAOSimulation,
    tokens: number,
    reputation: number,
    location: string,
    votingStrategy?: string
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
    this.lastPrice = model.dao?.treasury.getTokenPrice('DAO_TOKEN') || 100;
  }

  step(): void {
    if (!this.model.dao) return;

    const treasury = this.model.dao.treasury;
    if (treasury.pools.size === 0) return;

    const price = treasury.getTokenPrice('DAO_TOKEN');
    const poolKeys = Array.from(treasury.pools.keys());
    const poolKey = poolKeys[Math.floor(Math.random() * poolKeys.length)];
    const [tokenA, tokenB] = poolKey.split('|');

    let sell: string, buy: string;

    // Decide trade direction
    if (poolKey.includes('DAO_TOKEN')) {
      const other = tokenA === 'DAO_TOKEN' ? tokenB : tokenA;

      if (price > this.lastPrice || this.model.dao.currentShock > 0) {
        sell = other;
        buy = 'DAO_TOKEN';
      } else {
        sell = 'DAO_TOKEN';
        buy = other;
      }
    } else {
      sell = tokenA;
      buy = tokenB;

      if (Math.random() < 0.5) {
        [sell, buy] = [buy, sell];
      }
    }

    const amount = Math.min(this.tokens, 1);
    if (amount <= 0) {
      this.lastPrice = price;
      return;
    }

    // Execute trade
    treasury.deposit(sell, amount, this.model.currentStep);

    try {
      const out = treasury.swap(sell, buy, amount, this.model.currentStep);
      const gained = treasury.withdraw(buy, out, this.model.currentStep);

      this.tokens -= amount;
      this.tokens += gained;
      this.markActive();
    } catch (error) {
      // Swap failed, return deposited tokens
      treasury.withdraw(sell, amount, this.model.currentStep);
    }

    this.lastPrice = price;
  }
}
