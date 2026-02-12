// StateDiscretizer - Utility for converting continuous state values to discrete buckets
// Provides consistent state representations for Q-learning agents

import { type Proposal, isMultiStageProposal } from '../../data-structures/proposal';

/**
 * Price bucket categories
 */
export type PriceBucket = 'crash' | 'low' | 'normal' | 'high' | 'moon';

/**
 * Trend direction categories
 */
export type TrendBucket = 'falling' | 'stable' | 'rising';

/**
 * Participation level categories
 */
export type ParticipationBucket = 'low' | 'medium' | 'high';

/**
 * Treasury health categories
 */
export type TreasuryBucket = 'depleted' | 'low' | 'adequate' | 'flush';

/**
 * Proposal phase categories
 */
export type ProposalPhaseBucket = 'temp_check' | 'formal' | 'voting' | 'executed' | 'expired';

/**
 * Market volatility categories
 */
export type VolatilityBucket = 'calm' | 'normal' | 'volatile' | 'extreme';

/**
 * Risk level categories
 */
export type RiskBucket = 'minimal' | 'low' | 'moderate' | 'high' | 'critical';

/**
 * Balance/allocation categories
 */
export type AllocationBucket = 'none' | 'small' | 'moderate' | 'large' | 'dominant';

/**
 * Activity level categories
 */
export type ActivityBucket = 'inactive' | 'low' | 'moderate' | 'active' | 'hyperactive';

/**
 * StateDiscretizer provides consistent bucketing of continuous values
 * for Q-learning state representations.
 *
 * All methods are static for easy use across different agent types.
 */
export class StateDiscretizer {
  /**
   * Discretize token price relative to a baseline (usually 1.0)
   *
   * Buckets:
   * - crash: < 0.5x baseline (severe drop)
   * - low: 0.5x - 0.9x baseline
   * - normal: 0.9x - 1.1x baseline
   * - high: 1.1x - 1.5x baseline
   * - moon: > 1.5x baseline
   */
  static discretizePrice(price: number, baseline: number = 1.0): PriceBucket {
    if (!Number.isFinite(price) || !Number.isFinite(baseline) || baseline <= 0) {
      return 'normal';
    }

    const ratio = price / baseline;

    if (ratio < 0.5) return 'crash';
    if (ratio < 0.9) return 'low';
    if (ratio <= 1.1) return 'normal';
    if (ratio <= 1.5) return 'high';
    return 'moon';
  }

  /**
   * Discretize price trend based on recent price history
   *
   * @param recentPrices - Array of recent prices (oldest to newest)
   * @param window - Number of recent prices to consider (default: 5)
   * @param threshold - Percentage change threshold for trend detection (default: 0.05)
   */
  static discretizeTrend(
    recentPrices: number[],
    window: number = 5,
    threshold: number = 0.05
  ): TrendBucket {
    if (!recentPrices || recentPrices.length < 2) {
      return 'stable';
    }

    // Take the most recent `window` prices
    const prices = recentPrices.slice(-window);
    if (prices.length < 2) {
      return 'stable';
    }

    const first = prices[0];
    const last = prices[prices.length - 1];

    if (!Number.isFinite(first) || !Number.isFinite(last) || first <= 0) {
      return 'stable';
    }

    const change = (last - first) / first;

    if (change < -threshold) return 'falling';
    if (change > threshold) return 'rising';
    return 'stable';
  }

  /**
   * Discretize voting participation rate
   *
   * Buckets:
   * - low: < 20%
   * - medium: 20% - 50%
   * - high: > 50%
   */
  static discretizeParticipation(rate: number): ParticipationBucket {
    if (!Number.isFinite(rate)) return 'low';

    const clampedRate = Math.max(0, Math.min(1, rate));

    if (clampedRate < 0.2) return 'low';
    if (clampedRate <= 0.5) return 'medium';
    return 'high';
  }

  /**
   * Discretize treasury health based on balance and runway
   *
   * @param balance - Current treasury balance
   * @param runway - Number of steps treasury can sustain operations (optional)
   * @param targetReserve - Target reserve balance (optional)
   */
  static discretizeTreasury(
    balance: number,
    runway?: number,
    targetReserve?: number
  ): TreasuryBucket {
    if (!Number.isFinite(balance)) return 'depleted';

    // If we have a target reserve, use it for comparison
    if (targetReserve !== undefined && Number.isFinite(targetReserve) && targetReserve > 0) {
      const ratio = balance / targetReserve;
      if (ratio < 0.1) return 'depleted';
      if (ratio < 0.5) return 'low';
      if (ratio <= 1.0) return 'adequate';
      return 'flush';
    }

    // If we have runway information
    if (runway !== undefined && Number.isFinite(runway)) {
      if (runway < 10) return 'depleted';
      if (runway < 50) return 'low';
      if (runway <= 200) return 'adequate';
      return 'flush';
    }

    // Fallback: use absolute thresholds
    if (balance < 100) return 'depleted';
    if (balance < 1000) return 'low';
    if (balance <= 10000) return 'adequate';
    return 'flush';
  }

  /**
   * Discretize proposal phase/status
   */
  static discretizeProposalPhase(proposal: Proposal): ProposalPhaseBucket {
    if (!proposal) return 'expired';

    // Check for multi-stage proposal
    if (isMultiStageProposal(proposal)) {
      const stageName = ((proposal as unknown as { currentStageName?: string }).currentStageName ?? '').toLowerCase();
      if (stageName.includes('temp') || stageName.includes('check')) {
        return 'temp_check';
      }
      if (stageName.includes('formal') || stageName.includes('discussion')) {
        return 'formal';
      }
      if (stageName.includes('voting') || stageName.includes('on_chain') || stageName.includes('onchain')) {
        return 'voting';
      }
    }

    // Standard proposal status
    const status = proposal.status?.toLowerCase() || '';

    if (status === 'approved' || status === 'completed' || status === 'executed') {
      return 'executed';
    }
    if (status === 'rejected' || status === 'expired' || status === 'failed') {
      return 'expired';
    }
    if (proposal.closed) {
      return 'expired';
    }

    // Still open - determine phase by voting progress
    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    if (totalVotes === 0) {
      return 'temp_check';
    }
    if (totalVotes < 5) {
      return 'formal';
    }
    return 'voting';
  }

  /**
   * Discretize market volatility based on recent price changes
   */
  static discretizeVolatility(recentPrices: number[]): VolatilityBucket {
    if (!recentPrices || recentPrices.length < 3) {
      return 'normal';
    }

    // Calculate standard deviation of returns
    const returns: number[] = [];
    for (let i = 1; i < recentPrices.length; i++) {
      if (recentPrices[i - 1] > 0) {
        returns.push((recentPrices[i] - recentPrices[i - 1]) / recentPrices[i - 1]);
      }
    }

    if (returns.length === 0) return 'normal';

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev < 0.01) return 'calm';
    if (stdDev < 0.05) return 'normal';
    if (stdDev < 0.15) return 'volatile';
    return 'extreme';
  }

  /**
   * Discretize risk level (generic 0-1 scale)
   */
  static discretizeRisk(riskScore: number): RiskBucket {
    if (!Number.isFinite(riskScore)) return 'moderate';

    const score = Math.max(0, Math.min(1, riskScore));

    if (score < 0.1) return 'minimal';
    if (score < 0.3) return 'low';
    if (score < 0.6) return 'moderate';
    if (score < 0.85) return 'high';
    return 'critical';
  }

  /**
   * Discretize allocation/balance as fraction of total
   */
  static discretizeAllocation(amount: number, total: number): AllocationBucket {
    if (!Number.isFinite(amount) || !Number.isFinite(total) || total <= 0) {
      return 'none';
    }

    const ratio = amount / total;

    if (ratio < 0.01) return 'none';
    if (ratio < 0.1) return 'small';
    if (ratio < 0.3) return 'moderate';
    if (ratio < 0.5) return 'large';
    return 'dominant';
  }

  /**
   * Discretize activity level based on action count
   */
  static discretizeActivity(actionCount: number, window: number = 10): ActivityBucket {
    if (!Number.isFinite(actionCount) || actionCount < 0) return 'inactive';

    const rate = actionCount / Math.max(1, window);

    if (rate < 0.1) return 'inactive';
    if (rate < 0.3) return 'low';
    if (rate < 0.6) return 'moderate';
    if (rate < 1.0) return 'active';
    return 'hyperactive';
  }

  /**
   * Discretize pool depth for AMM trading
   */
  static discretizePoolDepth(reserveA: number, reserveB: number): 'shallow' | 'medium' | 'deep' {
    const depth = (reserveA || 0) + (reserveB || 0);

    if (depth < 100) return 'shallow';
    if (depth < 500) return 'medium';
    return 'deep';
  }

  /**
   * Discretize voting power relative to total
   */
  static discretizeVotingPower(
    power: number,
    totalPower: number
  ): 'negligible' | 'minor' | 'notable' | 'significant' | 'dominant' {
    if (!Number.isFinite(power) || !Number.isFinite(totalPower) || totalPower <= 0) {
      return 'negligible';
    }

    const ratio = power / totalPower;

    if (ratio < 0.01) return 'negligible';
    if (ratio < 0.05) return 'minor';
    if (ratio < 0.15) return 'notable';
    if (ratio < 0.33) return 'significant';
    return 'dominant';
  }

  /**
   * Discretize proposal support (votes for vs against)
   */
  static discretizeSupport(
    votesFor: number,
    votesAgainst: number
  ): 'opposed' | 'contested' | 'leaning' | 'supported' | 'unanimous' {
    const total = votesFor + votesAgainst;
    if (total === 0) return 'contested';

    const supportRatio = votesFor / total;

    if (supportRatio < 0.3) return 'opposed';
    if (supportRatio < 0.45) return 'contested';
    if (supportRatio < 0.65) return 'leaning';
    if (supportRatio < 0.9) return 'supported';
    return 'unanimous';
  }

  /**
   * Combine multiple state dimensions into a single state key
   *
   * @param dimensions - Array of discretized values to combine
   * @param separator - Separator character (default: '|')
   * @returns Combined state string
   */
  static combineState(...dimensions: (string | number | boolean)[]): string {
    return dimensions
      .map(d => {
        if (d === null || d === undefined) return '_';
        return String(d);
      })
      .join('|');
  }

  /**
   * Parse a combined state string back into dimensions
   */
  static parseState(stateKey: string, separator: string = '|'): string[] {
    return stateKey.split(separator);
  }

  /**
   * Create a state key for financial agents
   * Combines price, trend, and portfolio allocation
   */
  static createFinancialState(
    price: number,
    baseline: number,
    recentPrices: number[],
    allocation: number,
    total: number
  ): string {
    return this.combineState(
      this.discretizePrice(price, baseline),
      this.discretizeTrend(recentPrices),
      this.discretizeAllocation(allocation, total)
    );
  }

  /**
   * Create a state key for governance agents
   * Combines proposal phase, participation, treasury health, and governance rule category
   */
  static createGovernanceState(
    proposal: Proposal | null,
    participationRate: number,
    treasuryBalance: number,
    targetReserve?: number,
    governanceRuleName?: string
  ): string {
    const phase = proposal ? this.discretizeProposalPhase(proposal) : 'none';
    const ruleCategory = governanceRuleName
      ? this.discretizeGovernanceRule(governanceRuleName)
      : 'default';
    return this.combineState(
      phase,
      this.discretizeParticipation(participationRate),
      this.discretizeTreasury(treasuryBalance, undefined, targetReserve),
      ruleCategory
    );
  }

  /**
   * Bucket 15 governance rules into ~5 behavioral categories.
   * This keeps the Q-table manageable while still distinguishing
   * meaningfully different governance mechanics.
   */
  static discretizeGovernanceRule(ruleName: string): string {
    const categories: Record<string, string> = {
      majority: 'simple',
      quorum: 'simple',
      supermajority: 'simple',
      tokenquorum: 'weighted',
      reputationquorum: 'weighted',
      quadratic: 'egalitarian',
      conviction: 'egalitarian',
      bicameral: 'multi_body',
      dualgovernance: 'multi_body',
      securitycouncil: 'multi_body',
      categoryquorum: 'category',
      approvalvoting: 'approval',
      timedecay: 'temporal',
      optimistic: 'temporal',
      holographic: 'boosted',
    };
    return categories[ruleName] || 'unknown';
  }

  /**
   * Create a state key for delegation agents
   * Combines voting power, delegate reputation, and alignment
   */
  static createDelegationState(
    votingPower: number,
    totalPower: number,
    delegateReputation: number,
    alignmentScore: number
  ): string {
    return this.combineState(
      this.discretizeVotingPower(votingPower, totalPower),
      this.discretizeRisk(1 - delegateReputation / 100), // High rep = low risk
      this.discretizeRisk(1 - alignmentScore) // High alignment = low risk
    );
  }

  /**
   * Create a state key for trading agents
   * Combines price, depth, and trend
   */
  static createTradingState(
    price: number,
    baseline: number,
    reserveA: number,
    reserveB: number,
    recentPrices: number[]
  ): string {
    return this.combineState(
      this.discretizePrice(price, baseline),
      this.discretizePoolDepth(reserveA, reserveB),
      this.discretizeTrend(recentPrices)
    );
  }
}
