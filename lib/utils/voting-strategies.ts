// Voting Strategy implementations

import type { DAOMember } from '../agents/base';
import type { Proposal } from '../data-structures/proposal';

export interface VotingStrategy {
  vote(member: DAOMember, proposal: Proposal): void;
}

/**
 * Default Voting Strategy - simple one-person-one-vote
 */
export class DefaultVotingStrategy implements VotingStrategy {
  vote(member: DAOMember, proposal: Proposal): void {
    const voteDecision = member.decideVote(proposal);
    const voteBool = voteDecision === 'yes';

    member.votes.set(proposal.uniqueId, { vote: voteBool, weight: 1 });
    proposal.addVote(member.uniqueId, voteBool, 1);

    // Emit event for visualization
    if (member.model?.eventBus) {
      member.model.eventBus.publish('proposal_voted', {
        step: member.model.currentStep,
        agentId: member.uniqueId,
        proposalId: proposal.uniqueId,
        vote: voteDecision,
        weight: 1,
      });
    }
  }
}

/**
 * Quadratic Voting Strategy - cost increases quadratically
 */
export class QuadraticVotingStrategy implements VotingStrategy {
  private maxCost: number;

  constructor(maxCost: number = 4) {
    this.maxCost = maxCost;
  }

  vote(member: DAOMember, proposal: Proposal): void {
    const available = Math.min(member.tokens, this.maxCost);
    const weight = this.quadraticVote(proposal, available);

    if (weight <= 0) {
      return;
    }

    const cost = weight ** 2;
    member.tokens -= cost;

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

  private quadraticVote(proposal: Proposal, available: number): number {
    // Determine how many votes to cast based on available tokens
    // Cost = weight^2, so weight = sqrt(cost)
    const maxWeight = Math.floor(Math.sqrt(available));
    return Math.max(0, Math.min(maxWeight, 10)); // Cap at 10 votes
  }
}

/**
 * Reputation Weighted Voting Strategy - vote weight based on reputation
 */
export class ReputationWeightedStrategy implements VotingStrategy {
  private minReputation: number;
  private maxWeight: number;

  constructor(minReputation: number = 10, maxWeight: number = 10) {
    this.minReputation = minReputation;
    this.maxWeight = maxWeight;
  }

  vote(member: DAOMember, proposal: Proposal): void {
    if (member.reputation < this.minReputation) {
      return; // Not enough reputation to vote
    }

    // Weight scales with reputation
    const weight = Math.min(
      this.maxWeight,
      Math.floor(member.reputation / this.minReputation)
    );

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
 * Token Weighted Voting Strategy - vote weight based on token holdings
 */
export class TokenWeightedStrategy implements VotingStrategy {
  private tokensPerVote: number;
  private maxWeight: number;

  constructor(tokensPerVote: number = 100, maxWeight: number = 100) {
    this.tokensPerVote = tokensPerVote;
    this.maxWeight = maxWeight;
  }

  vote(member: DAOMember, proposal: Proposal): void {
    const weight = Math.min(
      this.maxWeight,
      Math.floor(member.tokens / this.tokensPerVote)
    );

    if (weight <= 0) {
      return;
    }

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
