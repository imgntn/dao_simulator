// Liquid Delegator Agent - delegates voting power to a representative
// Port from agents/liquid_delegator.py

import { Delegator } from './delegator';
import type { DAOModel } from '../engine/model';
import type { Proposal } from '../data-structures/proposal';
import type { DAOMember } from './base';

export class LiquidDelegator extends Delegator {
  representative: DAOMember | null = null;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy: any = null,
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
    const candidates = this.model.dao.members.filter((m) => m !== this);
    if (candidates.length === 0) {
      return null;
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  /**
   * Delegate voting power to a specific member
   */
  delegateToMember(member: DAOMember): void {
    // Remove from previous representative's delegates list
    if (this.representative) {
      const prevRep = this.representative as any;
      if (prevRep.delegates && Array.isArray(prevRep.delegates)) {
        const index = prevRep.delegates.indexOf(this);
        if (index > -1) {
          prevRep.delegates.splice(index, 1);
        }
      }
    }

    // Set new representative
    this.representative = member;

    // Add to new representative's delegates list
    const rep = member as any;
    if (!rep.delegates) {
      rep.delegates = [];
    }
    rep.delegates.push(this);
  }

  /**
   * Receive a vote cast by the representative on our behalf
   */
  receiveRepresentativeVote(
    proposal: Proposal,
    voteBool: boolean,
    weight: number = 1
  ): void {
    proposal.addVote(this.uniqueId, voteBool, weight);
    this.votes.set(proposal.uniqueId, { vote: voteBool, weight });
  }

  step(): void {
    // Choose a representative if we don't have one
    if (!this.representative) {
      const rep = this.chooseRepresentative();
      if (rep) {
        this.delegateToMember(rep);
      }
    }

    // Occasionally leave comments
    if (Math.random() < (this.model.dao.commentProbability || 0.1)) {
      this.leaveCommentOnRandomProposal();
    }
  }
}
