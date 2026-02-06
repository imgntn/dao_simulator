// Liquid Delegator Agent - delegates voting power to a representative
// Port from agents/liquid_delegator.py
//
// This implements LIQUID DEMOCRACY: members can delegate their vote to a
// representative who votes on their behalf. This is different from TOKEN
// DELEGATION in the base class:
//
// - LiquidDelegator: "Alice votes for me" (representative field)
//   * No tokens move
//   * Vote authority transfers
//   * Can be changed at any time (liquid)
//
// - Token Delegation: "Alice controls my tokens" (delegations Map)
//   * Tokens are locked/transferred
//   * Voting power increases for delegate
//   * Requires explicit undelegation to recover
//
// Both can be used together. Use LiquidDelegator when you want vote proxying
// without token transfer (e.g., "I trust this expert to vote on DeFi proposals").

import { Delegator } from './delegator';
import type { DAOModel } from '../engine/model';
import type { Proposal } from '../data-structures/proposal';
import { DAOMember } from './base';
import { random, randomChoice } from '../utils/random';
import { DelegationResolver } from '../delegation/delegation-resolver';

export class LiquidDelegator extends Delegator {
  // representative field is inherited from DAOMember base class
  delegationHistory: Array<{ step: number; representative: string }> = [];
  lastDelegationStep: number = -Infinity;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy?: string,
    delegationBudget: number = 100
  ) {
    super(
      uniqueId,
      model,
      tokens,
      reputation,
      location,
      votingStrategy,
      delegationBudget
    );
  }

  /**
   * Choose a representative to delegate voting power to
   */
  chooseRepresentative(): DAOMember | null {
    if (!this.model.dao) return null;

    const candidates = this.model.dao.members.filter((m) => m !== this);
    if (candidates.length === 0) {
      return null;
    }

    // Prefer higher reputation members
    const totalRep = candidates.reduce((sum, m) => sum + m.reputation, 0);
    if (totalRep <= 0) {
      return randomChoice(candidates);
    }

    // Weighted random selection by reputation
    let r = random() * totalRep;
    for (const candidate of candidates) {
      r -= candidate.reputation;
      if (r <= 0) {
        return candidate;
      }
    }

    return candidates[candidates.length - 1];
  }

  /**
   * Delegate voting power to a specific member
   */
  delegateToMember(member: DAOMember): void {
    // Check for delegation cycles before proceeding
    if (DelegationResolver.wouldCreateCycle(this, member)) return;

    // Use inherited setRepresentative method which handles bidirectional relationship
    this.setRepresentative(member);

    // Track delegation history
    this.delegationHistory.push({
      step: this.model.currentStep,
      representative: member.uniqueId,
    });
    this.lastDelegationStep = this.model.currentStep;

    // Emit delegation event
    if (this.model.eventBus) {
      this.model.eventBus.publish('delegation_changed', {
        step: this.model.currentStep,
        delegator: this.uniqueId,
        representative: member.uniqueId,
      });
    }
  }

  /**
   * Receive a vote cast by the representative on our behalf
   */
  receiveRepresentativeVote(
    proposal: Proposal,
    voteBool: boolean,
    weight: number = 1
  ): void {
    // Representative's vote already includes our delegated power via DelegationResolver.
    // Just track the event, don't add a separate vote.
    if (this.model.eventBus) {
      this.model.eventBus.publish('representative_voted', {
        step: this.model.currentStep,
        delegator: this.uniqueId,
        representative: this.representative?.uniqueId,
        proposal: proposal.title,
        vote: voteBool,
      });
    }
    this.markActive();
  }

  /**
   * Consider switching representatives based on performance
   */
  evaluateRepresentative(): void {
    if (!this.representative || !this.model.dao) return;
    const lockSteps = this.model.dao.delegationLockSteps || 0;
    if (this.model.currentStep - this.lastDelegationStep < lockSteps) {
      return;
    }

    // If representative's reputation dropped significantly, consider switching
    const avgReputation =
      this.model.dao.members.reduce((sum, m) => sum + m.reputation, 0) /
      this.model.dao.members.length;

    if (this.representative.reputation < avgReputation * 0.5) {
      // 30% chance to switch if representative is underperforming
      if (random() < 0.3) {
        const newRep = this.chooseRepresentative();
        if (newRep && newRep !== this.representative) {
          this.delegateToMember(newRep);
        }
      }
    }
  }

  step(): void {
    // Choose a representative if we don't have one
    if (!this.representative) {
      const rep = this.chooseRepresentative();
      if (rep) {
        this.delegateToMember(rep);
      } else {
        // No representative found — vote directly
        this.voteOnRandomProposal();
      }
    } else {
      // Periodically evaluate representative
      this.evaluateRepresentative();
    }

    // Occasionally leave comments
    if (random() < (this.model.dao?.commentProbability || 0.1)) {
      this.leaveCommentOnRandomProposal();
    }
  }
}
