// Voting Strategy implementations using Template Method pattern

import type { DAOMember } from '../agents/base';
import type { Proposal } from '../data-structures/proposal';

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
