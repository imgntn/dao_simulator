// RL Trader Agent - uses Q-learning to optimize trading strategy
// Port from agents/rl_trader.py

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';

type Action = 'buy' | 'sell' | 'add_lp' | 'remove_lp';
type State = string; // Encoded as "price,depth"

export class RLTrader extends DAOMember {
  static readonly ACTIONS: readonly Action[] = ['buy', 'sell', 'add_lp', 'remove_lp'];

  learningRate: number;
  discount: number;
  epsilon: number;
  qTable: Map<string, number> = new Map(); // key: "state,action"
  prevState: State | null = null;
  prevAction: Action | null = null;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy: any = null,
    learningRate: number = 0.1,
    discount: number = 0.9,
    epsilon: number = 0.1
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
    this.learningRate = learningRate;
    this.discount = discount;
    this.epsilon = epsilon;
  }

  /**
   * Get current state representation
   */
  private getState(): State {
    const price = Math.round(
      this.model.dao.treasury.getTokenPrice('DAO_TOKEN') * 100
    ) / 100;

    // Get first pool's depth
    const pools = this.model.dao.treasury.pools;
    const firstPool = pools.values().next().value;
    const depth = firstPool
      ? Math.round((firstPool.reserveA + firstPool.reserveB) * 100) / 100
      : 0;

    return `${price},${depth}`;
  }

  /**
   * Choose action using epsilon-greedy strategy
   */
  private chooseAction(state: State): Action {
    // Epsilon-greedy exploration
    if (Math.random() < this.epsilon) {
      return RLTrader.ACTIONS[
        Math.floor(Math.random() * RLTrader.ACTIONS.length)
      ];
    }

    // Exploitation: choose action with highest Q-value
    let bestAction = RLTrader.ACTIONS[0];
    let bestQValue = this.qTable.get(`${state},${bestAction}`) || 0;

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
   * Update Q-value using Q-learning algorithm
   */
  private updateQ(reward: number, newState: State): void {
    if (this.prevState === null || this.prevAction === null) {
      return;
    }

    const oldKey = `${this.prevState},${this.prevAction}`;
    const oldQ = this.qTable.get(oldKey) || 0;

    // Find max Q-value for new state
    let maxFutureQ = 0;
    for (const action of RLTrader.ACTIONS) {
      const q = this.qTable.get(`${newState},${action}`) || 0;
      if (q > maxFutureQ) {
        maxFutureQ = q;
      }
    }

    // Q-learning update: Q(s,a) = Q(s,a) + α * (r + γ * max(Q(s',a')) - Q(s,a))
    const newQ = oldQ + this.learningRate * (reward + this.discount * maxFutureQ - oldQ);
    this.qTable.set(oldKey, newQ);
  }

  step(): void {
    const state = this.getState();
    const action = this.chooseAction(state);
    let reward = 0;

    const treasury = this.model.dao.treasury;

    try {
      switch (action) {
        case 'buy':
          if (this.tokens > 0) {
            const amt = Math.min(1, this.tokens);
            treasury.deposit('USDC', amt, this.model.currentStep);
            const out = treasury.swap('USDC', 'DAO_TOKEN', amt, this.model.currentStep);
            this.tokens -= amt;
            this.tokens += treasury.withdraw('DAO_TOKEN', out, this.model.currentStep);
            reward = treasury.getTokenPrice('DAO_TOKEN') * out - amt;
          }
          break;

        case 'sell':
          if (this.tokens > 0) {
            const amt = Math.min(1, this.tokens);
            treasury.deposit('DAO_TOKEN', amt, this.model.currentStep);
            const out = treasury.swap('DAO_TOKEN', 'USDC', amt, this.model.currentStep);
            this.tokens -= amt;
            this.tokens += treasury.withdraw('USDC', out, this.model.currentStep);
            reward = out - treasury.getTokenPrice('DAO_TOKEN') * amt;
          }
          break;

        case 'add_lp':
          if (this.tokens >= 2) {
            treasury.deposit('DAO_TOKEN', 1, this.model.currentStep);
            treasury.deposit('USDC', 1, this.model.currentStep);
            treasury.addLiquidity('DAO_TOKEN', 'USDC', 1, 1, this.model.currentStep);
            reward = 0.01; // Small positive reward for providing liquidity
          }
          break;

        case 'remove_lp':
          treasury.removeLiquidity('DAO_TOKEN', 'USDC', 0.1, this.model.currentStep);
          reward = -0.01; // Small negative reward for removing liquidity
          break;
      }
    } catch {
      // Action failed, give small negative reward
      reward = -0.05;
    }

    this.updateQ(reward, state);
    this.prevState = state;
    this.prevAction = action;
    this.markActive();
  }
}
