// RL Trader Agent - uses Q-learning to optimize trading strategy
// Port from agents/rl_trader.py

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import { random, randomChoice } from '../utils/random';

type Action = 'buy' | 'sell' | 'add_lp' | 'remove_lp' | 'hold';
type State = string; // Encoded as "price_bucket,depth_bucket,trend"

// Q-learning configuration
const DEFAULT_LEARNING_RATE = 0.1;
const DEFAULT_DISCOUNT = 0.9;
const DEFAULT_EPSILON = 0.1;
const MAX_Q_VALUE = 50;
const MIN_Q_VALUE = -50;

// Trade sizing
const TRADE_FRACTION = 0.1;  // Trade 10% of holdings
const MIN_TRADE_AMOUNT = 0.1;

export class RLTrader extends DAOMember {
  static readonly ACTIONS: readonly Action[] = ['buy', 'sell', 'add_lp', 'remove_lp', 'hold'];

  learningRate: number;
  discount: number;
  epsilon: number;
  qTable: Map<string, number> = new Map(); // key: "state,action"
  prevState: State | null = null;
  prevAction: Action | null = null;
  prevPrice: number | null = null;
  prevTokens: number;
  totalReward: number = 0;
  tradeCount: number = 0;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy?: string,
    learningRate: number = DEFAULT_LEARNING_RATE,
    discount: number = DEFAULT_DISCOUNT,
    epsilon: number = DEFAULT_EPSILON
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
    this.learningRate = Math.max(0, Math.min(1, learningRate));
    this.discount = Math.max(0, Math.min(1, discount));
    this.epsilon = Math.max(0, Math.min(1, epsilon));
    this.prevTokens = tokens;
  }

  /**
   * Get current state representation with bucketed values
   */
  private getState(price: number): State {
    if (!this.model.dao) return '0,0,neutral';

    // Bucket price into categories
    const priceBucket = price < 0.5 ? 'low' : price < 1.5 ? 'mid' : 'high';

    // Get first pool's depth
    const pools = this.model.dao.treasury.pools;
    const firstPool = pools.values().next().value;
    const depth = firstPool
      ? firstPool.reserveA + firstPool.reserveB
      : 0;

    // Bucket depth
    const depthBucket = depth < 100 ? 'shallow' : depth < 500 ? 'medium' : 'deep';

    // Determine trend based on previous state
    const trend = this.prevPrice !== null
      ? price > this.prevPrice ? 'up'
        : price < this.prevPrice ? 'down' : 'flat'
      : 'neutral';

    return `${priceBucket},${depthBucket},${trend}`;
  }

  /**
   * Choose action using epsilon-greedy strategy
   */
  private chooseAction(state: State): Action {
    // Epsilon-greedy exploration
    if (random() < this.epsilon) {
      return randomChoice([...RLTrader.ACTIONS]);
    }

    // Exploitation: choose action with highest Q-value
    let bestAction: Action = 'hold';
    let bestQValue = this.qTable.get(`${state},hold`) || 0;

    for (const action of RLTrader.ACTIONS) {
      const qValue = this.qTable.get(`${state},${action}`) || 0;
      if (qValue > bestQValue) {
        bestQValue = qValue;
        bestAction = action;
      }
    }

    return bestAction;
  }

  /**
   * Update Q-value using Q-learning algorithm with bounded values
   */
  private updateQ(reward: number, newState: State): void {
    if (this.prevState === null || this.prevAction === null) {
      return;
    }

    const oldKey = `${this.prevState},${this.prevAction}`;
    const oldQ = this.qTable.get(oldKey) || 0;

    // Find max Q-value for new state
    let maxFutureQ = -Infinity;
    for (const action of RLTrader.ACTIONS) {
      const q = this.qTable.get(`${newState},${action}`) || 0;
      if (q > maxFutureQ) {
        maxFutureQ = q;
      }
    }
    if (!Number.isFinite(maxFutureQ)) maxFutureQ = 0;

    // Q-learning update: Q(s,a) = Q(s,a) + α * (r + γ * max(Q(s',a')) - Q(s,a))
    let newQ = oldQ + this.learningRate * (reward + this.discount * maxFutureQ - oldQ);

    // Clamp Q-values
    newQ = Math.max(MIN_Q_VALUE, Math.min(MAX_Q_VALUE, newQ));

    this.qTable.set(oldKey, newQ);
    this.totalReward += reward;
  }

  step(): void {
    if (!this.model.dao) return;

    // RL traders participate in governance like other token holders
    this.voteOnRandomProposal();

    const price = this.model.dao.treasury.getTokenPrice('DAO_TOKEN');
    const state = this.getState(price);
    const action = this.chooseAction(state);
    let reward = 0;

    const treasury = this.model.dao.treasury;
    const tradeAmount = Math.max(MIN_TRADE_AMOUNT, this.tokens * TRADE_FRACTION);

    try {
      switch (action) {
        case 'buy':
          if (this.tokens >= tradeAmount) {
            treasury.deposit('USDC', tradeAmount, this.model.currentStep);
            const out = treasury.swap('USDC', 'DAO_TOKEN', tradeAmount, this.model.currentStep);
            if (out > 0) {
              this.tokens -= tradeAmount;
              this.tokens += treasury.withdraw('DAO_TOKEN', out, this.model.currentStep);
              reward = treasury.getTokenPrice('DAO_TOKEN') * out - tradeAmount;
              this.tradeCount++;
            } else {
              treasury.withdraw('USDC', tradeAmount, this.model.currentStep);
            }
          }
          break;

        case 'sell':
          if (this.tokens >= tradeAmount) {
            treasury.deposit('DAO_TOKEN', tradeAmount, this.model.currentStep);
            const out = treasury.swap('DAO_TOKEN', 'USDC', tradeAmount, this.model.currentStep);
            if (out > 0) {
              this.tokens -= tradeAmount;
              this.tokens += treasury.withdraw('USDC', out, this.model.currentStep);
              reward = out - treasury.getTokenPrice('DAO_TOKEN') * tradeAmount;
              this.tradeCount++;
            } else {
              treasury.withdraw('DAO_TOKEN', tradeAmount, this.model.currentStep);
            }
          }
          break;

        case 'add_lp':
          if (this.tokens >= tradeAmount * 2) {
            const lpAmount = tradeAmount / 2;
            treasury.deposit('DAO_TOKEN', lpAmount, this.model.currentStep);
            treasury.deposit('USDC', lpAmount, this.model.currentStep);
            treasury.addLiquidity('DAO_TOKEN', 'USDC', lpAmount, lpAmount, this.model.currentStep);
            this.tokens -= tradeAmount;
            reward = 0.02; // Small positive reward for providing liquidity
          }
          break;

        case 'remove_lp': {
          try {
            const removed = treasury.removeLiquidity('DAO_TOKEN', 'USDC', 0.1, this.model.currentStep);
            if (removed) {
              // Agent claims the DAO_TOKEN portion
              const claimed = treasury.withdraw('DAO_TOKEN', removed[0] || 0, this.model.currentStep);
              this.tokens += claimed;
            }
            reward = -0.01; // Small negative reward for removing liquidity
          } catch {
            reward = -0.02; // Penalty for failed action
          }
          break;
        }

        case 'hold': {
          // Calculate reward based on portfolio change
          const portfolioChange = this.tokens - this.prevTokens;
          reward = portfolioChange > 0 ? 0.01 : portfolioChange < 0 ? -0.01 : 0;
          break;
        }
      }
    } catch {
      // Action failed, give small negative reward
      reward = -0.05;
    }

    // Clamp reward
    reward = Math.max(-1, Math.min(1, reward));

    this.updateQ(reward, state);
    this.prevState = state;
    this.prevAction = action;
    this.prevPrice = price;
    this.prevTokens = this.tokens;
    this.markActive();
  }
}
