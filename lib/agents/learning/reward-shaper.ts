// Potential-Based Reward Shaping (Ng et al., 1999)
// F(s, s') = gamma * Phi(s') - Phi(s)
// Provably preserves optimal policy while providing denser reward signal.

/**
 * Potential function type: maps a state context to a scalar potential value.
 * Higher potential = "better" state (guides exploration toward goal states).
 */
export type PotentialFunction = (context: PotentialContext) => number;

/**
 * Context object passed to potential functions.
 * Contains observable state information for computing potential.
 */
export interface PotentialContext {
  /** Agent's current token balance */
  tokens: number;
  /** Agent's staked token balance */
  stakedTokens: number;
  /** Agent's reputation score */
  reputation: number;
  /** Treasury current funds */
  treasuryFunds: number;
  /** Treasury target reserve */
  treasuryTarget: number;
  /** Current token price */
  tokenPrice: number;
  /** Number of DAO members */
  memberCount: number;
  /** Number of open proposals */
  openProposalCount: number;
  /** Agent's participation rate (votes cast / proposals available) */
  participationRate: number;
  /** Current simulation step */
  step: number;
}

/**
 * Pre-built potential functions for different agent categories.
 * Each returns a scalar potential value (higher = better state).
 */
export const PotentialFunctions = {
  /**
   * Treasury health potential: rewards agents for maintaining healthy treasury reserves.
   * Peaks at target reserve, decays away from it.
   */
  treasuryHealth: (ctx: PotentialContext): number => {
    if (ctx.treasuryTarget <= 0) return 0;
    const ratio = ctx.treasuryFunds / ctx.treasuryTarget;
    // Bell curve centered at ratio=1.0 (target), max potential = 10
    return 10 * Math.exp(-Math.pow(ratio - 1.0, 2) * 2);
  },

  /**
   * Reputation potential: rewards agents for building reputation.
   * Logarithmic scaling to avoid favoring already-high-reputation agents too much.
   */
  reputation: (ctx: PotentialContext): number => {
    return Math.log(1 + ctx.reputation) * 2;
  },

  /**
   * Portfolio value potential: rewards total portfolio value (tokens + staked).
   * Logarithmic scaling for stability.
   */
  portfolioValue: (ctx: PotentialContext): number => {
    const total = ctx.tokens + ctx.stakedTokens;
    return Math.log(1 + total) * 2;
  },

  /**
   * Participation potential: rewards active governance participation.
   * Linear scaling, max potential = 5.
   */
  participation: (ctx: PotentialContext): number => {
    return ctx.participationRate * 5;
  },

  /**
   * Token price potential: rewards agents when token price is stable/growing.
   * Logarithmic scaling with floor at 0.
   */
  tokenPrice: (ctx: PotentialContext): number => {
    return Math.max(0, Math.log(1 + ctx.tokenPrice) * 3);
  },

  /**
   * Balanced portfolio potential: rewards diversification between liquid and staked.
   * Peaks at 50/50 split.
   */
  balancedPortfolio: (ctx: PotentialContext): number => {
    const total = ctx.tokens + ctx.stakedTokens;
    if (total <= 0) return 0;
    const stakedRatio = ctx.stakedTokens / total;
    // Peaks at 0.5 (balanced), potential = 5
    return 5 * (1 - Math.pow(2 * stakedRatio - 1, 2));
  },
} as const;

/**
 * RewardShaper computes potential-based shaping reward.
 *
 * F(s, s') = gamma * Phi(s') - Phi(s)
 *
 * This shaping function is provably policy-invariant (Ng et al., 1999):
 * the optimal policy under the shaped reward is identical to the optimal
 * policy under the original reward.
 *
 * Usage:
 * ```
 * const shaper = new RewardShaper(0.95, [PotentialFunctions.treasuryHealth]);
 * // At each step:
 * const shapingReward = shaper.computeShapingReward(prevContext, currentContext);
 * const totalReward = originalReward + shapingReward;
 * ```
 */
export class RewardShaper {
  private potentials: PotentialFunction[];
  private discountFactor: number;
  private weights: number[];
  private lastContext: PotentialContext | null = null;

  /**
   * @param discountFactor - Discount factor (gamma), must match agent's gamma
   * @param potentials - Array of potential functions to combine
   * @param weights - Optional weights for each potential (default: equal weight 1.0)
   */
  constructor(
    discountFactor: number,
    potentials: PotentialFunction[],
    weights?: number[]
  ) {
    this.discountFactor = discountFactor;
    this.potentials = potentials;
    this.weights = weights || potentials.map(() => 1.0);
  }

  /**
   * Compute combined potential for a context
   */
  private computePotential(ctx: PotentialContext): number {
    let total = 0;
    for (let i = 0; i < this.potentials.length; i++) {
      total += this.weights[i] * this.potentials[i](ctx);
    }
    return total;
  }

  /**
   * Compute shaping reward: F(s, s') = gamma * Phi(s') - Phi(s)
   *
   * @param prevContext - State context before action
   * @param currentContext - State context after action
   * @returns Shaping reward (can be positive or negative)
   */
  computeShapingReward(prevContext: PotentialContext, currentContext: PotentialContext): number {
    const prevPotential = this.computePotential(prevContext);
    const currentPotential = this.computePotential(currentContext);
    return this.discountFactor * currentPotential - prevPotential;
  }

  /**
   * Convenience method: store context and compute shaping on next call.
   * Returns 0 on first call (no previous context to compare against).
   *
   * @param currentContext - Current state context
   * @returns Shaping reward
   */
  step(currentContext: PotentialContext): number {
    if (this.lastContext === null) {
      this.lastContext = currentContext;
      return 0;
    }

    const reward = this.computeShapingReward(this.lastContext, currentContext);
    this.lastContext = currentContext;
    return reward;
  }

  /**
   * Reset stored context (call at episode boundary)
   */
  reset(): void {
    this.lastContext = null;
  }
}

/**
 * Pre-configured reward shapers for common agent categories
 */
export function createGovernanceShaper(discountFactor: number): RewardShaper {
  return new RewardShaper(discountFactor, [
    PotentialFunctions.treasuryHealth,
    PotentialFunctions.participation,
    PotentialFunctions.reputation,
  ], [1.0, 0.8, 0.5]);
}

export function createFinancialShaper(discountFactor: number): RewardShaper {
  return new RewardShaper(discountFactor, [
    PotentialFunctions.portfolioValue,
    PotentialFunctions.tokenPrice,
    PotentialFunctions.balancedPortfolio,
  ], [1.0, 0.6, 0.4]);
}

export function createCommunityShaper(discountFactor: number): RewardShaper {
  return new RewardShaper(discountFactor, [
    PotentialFunctions.reputation,
    PotentialFunctions.participation,
    PotentialFunctions.treasuryHealth,
  ], [1.0, 0.7, 0.3]);
}
