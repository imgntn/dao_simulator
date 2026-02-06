// Trader Agent - swaps tokens in liquidity pools

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import { random, randomChoice, randomBool } from '../utils/random';

// Trade sizing configuration
const MIN_TRADE_FRACTION = 0.01; // Trade at least 1% of holdings
const MAX_TRADE_FRACTION = 0.1;  // Trade at most 10% of holdings
const MIN_TRADE_AMOUNT = 0.1;    // Minimum trade size

export class Trader extends DAOMember {
  lastPrice: number;
  tradeFraction: number; // Personal trade sizing preference

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
    // Each trader has a personal trade sizing preference
    this.tradeFraction = MIN_TRADE_FRACTION + random() * (MAX_TRADE_FRACTION - MIN_TRADE_FRACTION);
  }

  step(): void {
    if (!this.model.dao) return;

    // Traders participate in governance like other token holders
    this.voteOnRandomProposal();

    const treasury = this.model.dao.treasury;
    if (treasury.pools.size === 0) return;

    const price = treasury.getTokenPrice('DAO_TOKEN');
    const poolKeys = Array.from(treasury.pools.keys());

    // Safe random selection with null check
    if (poolKeys.length === 0) return;
    const poolKey = randomChoice(poolKeys);
    const parts = poolKey.split('|');
    if (parts.length !== 2) return;
    const [tokenA, tokenB] = parts;

    let sell: string, buy: string;

    // Decide trade direction based on price momentum and market conditions
    if (poolKey.includes('DAO_TOKEN')) {
      const other = tokenA === 'DAO_TOKEN' ? tokenB : tokenA;
      const shock = this.model.dao.currentShock;

      // Buy DAO_TOKEN when price is rising or positive shock (momentum trading)
      // Sell DAO_TOKEN when price is falling or negative shock
      if (price > this.lastPrice || shock > 0) {
        sell = other;
        buy = 'DAO_TOKEN';
      } else {
        sell = 'DAO_TOKEN';
        buy = other;
      }
    } else {
      // Non-DAO_TOKEN pool - random direction
      sell = tokenA;
      buy = tokenB;
      if (randomBool(0.5)) {
        [sell, buy] = [buy, sell];
      }
    }

    // Calculate trade amount as fraction of holdings (more realistic sizing)
    const baseAmount = this.tokens * this.tradeFraction;
    // Add some randomness to trade size
    const amount = Math.max(MIN_TRADE_AMOUNT, baseAmount * (0.5 + random()));

    if (amount <= 0 || amount > this.tokens) {
      this.lastPrice = price;
      return;
    }

    // Execute trade - deposit first
    treasury.deposit(sell, amount, this.model.currentStep);

    try {
      const out = treasury.swap(sell, buy, amount, this.model.currentStep);
      if (out <= 0) {
        // Swap returned nothing, recover deposit
        treasury.withdraw(sell, amount, this.model.currentStep);
        this.lastPrice = price;
        return;
      }

      const gained = treasury.withdraw(buy, out, this.model.currentStep);

      // Only update tokens on successful trade
      this.tokens -= amount;
      this.tokens += gained;
      this.markActive();

      // Publish trade event
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
    } catch {
      // Swap failed, return deposited tokens
      treasury.withdraw(sell, amount, this.model.currentStep);
    }

    this.lastPrice = price;
  }
}
