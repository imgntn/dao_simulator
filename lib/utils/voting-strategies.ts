// Voting Strategy implementations using Template Method pattern

import type { DAOMember } from '../agents/base';
import type { Proposal } from '../data-structures/proposal';
import { random as rng } from './random';

export interface VotingStrategy {
  vote(member: DAOMember, proposal: Proposal): void;
  /**
   * Vote with a specific weight (for delegation-aware voting).
   * Uses the provided effective weight instead of calculating from member's tokens.
   */
  voteWithWeight(member: DAOMember, proposal: Proposal, effectiveWeight: number): void;
}

/**
 * Base Voting Strategy - provides template method for common vote recording logic
 *
 * Subclasses only need to implement:
 * - calculateWeight(member, proposal): number - returns vote weight (0 means don't vote)
 * - calculateWeightWithDelegation(member, proposal, effectiveWeight): number - optional override
 * - preVote(member, proposal, weight): boolean - optional hook for token deduction, etc.
 */
export abstract class BaseVotingStrategy implements VotingStrategy {
  /**
   * Calculate the vote weight for a member on a proposal.
   * Return 0 or less to skip voting.
   */
  protected abstract calculateWeight(member: DAOMember, proposal: Proposal): number;

  /**
   * Calculate weight when voting with delegation-provided effective weight.
   * Override if delegation weight should be handled differently.
   */
  protected calculateWeightWithDelegation(
    member: DAOMember,
    proposal: Proposal,
    effectiveWeight: number
  ): number {
    // Default: use effective weight directly with minimum of 1
    return Math.max(1, effectiveWeight);
  }

  /**
   * Pre-vote hook. Override to add custom logic before vote is recorded.
   * Return false to cancel the vote.
   * @example Token deduction, eligibility checks, etc.
   */
  protected preVote(member: DAOMember, proposal: Proposal, weight: number): boolean {
    return true;
  }

  /**
   * Template method: Vote on a proposal using calculated weight
   */
  vote(member: DAOMember, proposal: Proposal): void {
    const weight = this.calculateWeight(member, proposal);
    if (weight <= 0) return;

    if (!this.preVote(member, proposal, weight)) return;

    this.recordVote(member, proposal, weight);
  }

  /**
   * Template method: Vote with delegation-provided effective weight
   */
  voteWithWeight(member: DAOMember, proposal: Proposal, effectiveWeight: number): void {
    const weight = this.calculateWeightWithDelegation(member, proposal, effectiveWeight);
    if (weight <= 0) return;

    if (!this.preVote(member, proposal, weight)) return;

    this.recordVote(member, proposal, weight);
  }

  /**
   * Common vote recording logic - records vote and publishes event
   */
  protected recordVote(member: DAOMember, proposal: Proposal, weight: number): void {
    const voteDecision = member.decideVote(proposal);
    const voteBool = voteDecision === 'yes';

    member.votes.set(proposal.uniqueId, { vote: voteBool, weight });
    proposal.addVote(member.uniqueId, voteBool, weight);

    // Emit event for visualization
    if (member.model?.eventBus) {
      member.model.eventBus.publish('proposal_voted', {
        step: member.model.currentStep,
        agentId: member.uniqueId,
        proposalId: proposal.uniqueId,
        vote: voteDecision,
        weight,
      });
    }
  }
}

/**
 * Default Voting Strategy - simple one-person-one-vote
 */
export class DefaultVotingStrategy extends BaseVotingStrategy {
  protected calculateWeight(_member: DAOMember, _proposal: Proposal): number {
    return 1;
  }
}

/**
 * Quadratic Voting Strategy - cost increases quadratically
 */
export class QuadraticVotingStrategy extends BaseVotingStrategy {
  private maxCost: number;
  private pendingCosts: Map<string, number> = new Map(); // memberId -> cost

  constructor(maxCost: number = 4) {
    super();
    this.maxCost = maxCost;
  }

  protected calculateWeight(member: DAOMember, _proposal: Proposal): number {
    const available = Math.min(member.tokens, this.maxCost);
    const maxWeight = Math.floor(Math.sqrt(available));
    const weight = Math.max(0, Math.min(maxWeight, 10)); // Cap at 10 votes
    this.pendingCosts.set(member.uniqueId, weight ** 2);
    return weight;
  }

  protected calculateWeightWithDelegation(
    member: DAOMember,
    _proposal: Proposal,
    effectiveWeight: number
  ): number {
    // For quadratic voting with delegation, use sqrt of effective weight
    const available = Math.min(effectiveWeight, this.maxCost);
    const maxWeight = Math.floor(Math.sqrt(available));
    const weight = Math.max(0, Math.min(maxWeight, 10));
    if (member.tokens < weight ** 2) {
      // Can't afford — use what they can afford from own tokens
      const affordableWeight = Math.floor(Math.sqrt(Math.min(member.tokens, this.maxCost)));
      this.pendingCosts.set(member.uniqueId, affordableWeight ** 2);
      return affordableWeight;
    }
    this.pendingCosts.set(member.uniqueId, weight ** 2);
    return weight;
  }

  protected preVote(member: DAOMember, _proposal: Proposal, weight: number): boolean {
    if (weight <= 0) return false;
    // Deduct the cost
    const cost = this.pendingCosts.get(member.uniqueId) || 0;
    if (cost > 0) {
      member.tokens -= cost;
      this.pendingCosts.delete(member.uniqueId);
    }
    return true;
  }
}

/**
 * Reputation Weighted Voting Strategy - vote weight based on reputation
 */
export class ReputationWeightedStrategy extends BaseVotingStrategy {
  private minReputation: number;
  private maxWeight: number;

  constructor(minReputation: number = 10, maxWeight: number = 10) {
    super();
    this.minReputation = minReputation;
    this.maxWeight = maxWeight;
  }

  protected calculateWeight(member: DAOMember, _proposal: Proposal): number {
    if (member.reputation < this.minReputation) {
      return 0; // Not enough reputation to vote
    }
    return Math.min(
      this.maxWeight,
      Math.floor(member.reputation / this.minReputation)
    );
  }

  protected calculateWeightWithDelegation(
    member: DAOMember,
    _proposal: Proposal,
    effectiveWeight: number
  ): number {
    if (member.reputation < this.minReputation) {
      return 0; // Not enough reputation to vote
    }
    // Combine reputation weight with delegated power
    const reputationWeight = Math.min(
      this.maxWeight,
      Math.floor(member.reputation / this.minReputation)
    );
    // Use the higher of reputation-based or delegation-based weight
    return Math.max(reputationWeight, effectiveWeight);
  }
}

/**
 * Token Weighted Voting Strategy - vote weight based on token holdings
 */
export class TokenWeightedStrategy extends BaseVotingStrategy {
  private tokensPerVote: number;
  private maxWeight: number;

  constructor(tokensPerVote: number = 100, maxWeight: number = 100) {
    super();
    this.tokensPerVote = tokensPerVote;
    this.maxWeight = maxWeight;
  }

  protected calculateWeight(member: DAOMember, _proposal: Proposal): number {
    return Math.min(
      this.maxWeight,
      Math.floor(member.tokens / this.tokensPerVote)
    );
  }

  protected calculateWeightWithDelegation(
    _member: DAOMember,
    _proposal: Proposal,
    effectiveWeight: number
  ): number {
    // Use effective weight directly (includes delegated tokens)
    return Math.min(
      this.maxWeight,
      Math.floor(effectiveWeight / this.tokensPerVote)
    );
  }
}

/**
 * Ranked Choice Voting Strategy
 *
 * Instead of a single yes/no vote, agents submit ranked preferences over
 * the proposal's options. The rankings are stored in proposal.ballots
 * for later tabulation by InstantRunoffRule.
 *
 * Weight still applies (token-weighted ranked choice) — each ballot
 * carries the voter's weight for the elimination rounds.
 */
export class RankedChoiceVotingStrategy extends BaseVotingStrategy {
  protected calculateWeight(member: DAOMember, _proposal: Proposal): number {
    return 1; // 1p1v ranked choice
  }

  /**
   * Override recordVote to submit ranked preferences instead of yes/no.
   * Falls back to standard yes/no if proposal has no options.
   */
  protected recordVote(member: DAOMember, proposal: Proposal, weight: number): void {
    if (!proposal.options || proposal.options.length < 2) {
      // No ranked-choice options — fall back to standard binary vote
      super.recordVote(member, proposal, weight);
      return;
    }

    // Generate ranked preferences based on agent belief + noise
    const rankings = this.generateRankings(member, proposal);
    proposal.ballots.set(member.uniqueId, rankings);

    // Record as a standard vote too (first choice = yes, else = no)
    // This ensures compatibility with standard governance rules
    member.votes.set(proposal.uniqueId, { vote: true, weight });
    proposal.addVote(member.uniqueId, true, weight);

    if (member.model?.eventBus) {
      member.model.eventBus.publish('ranked_vote_cast', {
        step: member.model.currentStep,
        agentId: member.uniqueId,
        proposalId: proposal.uniqueId,
        rankings,
        weight,
      });
    }
  }

  /**
   * Generate ranked preferences. Each option gets a score based on
   * the agent's optimism + random noise, then sorted by score descending.
   */
  private generateRankings(member: DAOMember, proposal: Proposal): string[] {
    // Uses rng imported at module level
    const options = proposal.options;

    // Score each option: base belief + per-option noise
    const scored = options.map((opt, idx) => {
      // First option gets a slight boost from optimism (creator's preferred)
      const optimismBoost = idx === 0 ? (member.optimism - 0.5) * 0.3 : 0;
      const noise = (rng() - 0.5) * 0.4;
      return { option: opt, score: 0.5 + optimismBoost + noise };
    });

    // Sort by score descending (most preferred first)
    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.option);
  }
}

/**
 * Futarchy Voting Strategy
 *
 * Agents "vote" by buying YES or NO outcome tokens in a prediction market
 * attached to the proposal. The market price at resolution determines
 * whether the proposal passes.
 *
 * Each agent allocates a fraction of their tokens to YES or NO positions
 * based on their belief about the proposal's impact.
 */
export class FutarchyVotingStrategy extends BaseVotingStrategy {
  protected calculateWeight(member: DAOMember, _proposal: Proposal): number {
    // Weight = tokens available for trading (up to 10% of holdings)
    return Math.max(1, Math.floor(member.tokens * 0.1));
  }

  /**
   * Override recordVote to trade in the prediction market instead.
   * Falls back to standard vote if no market is attached.
   */
  protected recordVote(member: DAOMember, proposal: Proposal, weight: number): void {
    // Uses rng imported at module level

    // Get or create market for this proposal (stored on dao)
    const market = member.model?.dao?.predictionMarkets?.get(proposal.uniqueId);

    if (!market) {
      // No prediction market — fall back to standard binary vote
      super.recordVote(member, proposal, weight);
      return;
    }

    // Agent decides YES or NO based on belief
    const belief = 0.5 + (member.optimism - 0.5) * 0.6 + (rng() - 0.5) * 0.2;
    const side: 'yes' | 'no' = belief > 0.5 ? 'yes' : 'no';

    // Trade amount proportional to conviction strength
    const conviction = Math.abs(belief - 0.5) * 2; // 0-1
    const tradeAmount = Math.max(1, Math.floor(weight * conviction));

    const cost = market.trade(member.uniqueId, side, tradeAmount, member.model?.currentStep ?? 0);

    // Record as standard vote for compatibility
    const voteBool = side === 'yes';
    member.votes.set(proposal.uniqueId, { vote: voteBool, weight: tradeAmount });
    proposal.addVote(member.uniqueId, voteBool, tradeAmount);

    if (member.model?.eventBus) {
      member.model.eventBus.publish('futarchy_trade', {
        step: member.model.currentStep,
        agentId: member.uniqueId,
        proposalId: proposal.uniqueId,
        side,
        amount: tradeAmount,
        cost,
        yesPrice: market.getYesPrice(),
      });
    }
  }
}

// Strategy registry
const strategyRegistry = new Map<string, new (...args: any[]) => VotingStrategy>();

export function registerStrategy(name: string, strategyClass: new (...args: any[]) => VotingStrategy): void {
  strategyRegistry.set(name, strategyClass);
}

export function getStrategy(name: string, ...args: any[]): VotingStrategy | null {
  const StrategyClass = strategyRegistry.get(name);
  if (StrategyClass) {
    return new StrategyClass(...args);
  }
  return null;
}

// Register built-in strategies
registerStrategy('default', DefaultVotingStrategy);
registerStrategy('quadratic', QuadraticVotingStrategy);
registerStrategy('reputation', ReputationWeightedStrategy);
registerStrategy('token', TokenWeightedStrategy);
registerStrategy('ranked-choice', RankedChoiceVotingStrategy);
registerStrategy('futarchy', FutarchyVotingStrategy);
