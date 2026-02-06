// Delegator Agent - delegates support to proposals
//
// This implements PROPOSAL FUNDING DELEGATION: members can allocate part of
// their budget to fund proposals they support. This is DIFFERENT from voting:
//
// - Proposal Support (this class): "I fund this proposal" (delegationBudget)
//   * Tokens go toward proposal funding
//   * proposalDelegations tracks how much went to each proposal
//   * This is about CAPITAL, not voting power
//
// - Token Delegation (base class): "Alice controls my voting power"
//   * Tokens affect vote weight
//   * This is about GOVERNANCE, not funding
//
// Use Delegator when modeling venture-style DAOs where members pool capital
// to fund approved proposals (e.g., grants DAOs, investment DAOs).

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Proposal } from '../data-structures/proposal';
import { random, randomChoice } from '../utils/random';

// Delegation configuration
const MIN_DELEGATION_FRACTION = 0.05;  // Minimum 5% of budget per delegation
const MAX_DELEGATION_FRACTION = 0.3;   // Maximum 30% of budget per delegation

export class Delegator extends DAOMember {
  delegationBudget: number;
  maxDelegationBudget: number;
  proposalDelegations: Map<string, number> = new Map(); // proposalId -> amount delegated to that proposal

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy?: string,
    delegationBudget: number = 100
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
    // Validate and sanitize delegation budget
    const sanitizedBudget = Number.isFinite(delegationBudget) && delegationBudget >= 0
      ? delegationBudget
      : 100;
    this.delegationBudget = sanitizedBudget;
    this.maxDelegationBudget = sanitizedBudget;
  }

  step(): void {
    // Replenish budget from tokens earned since last check
    if (this.tokens > this.delegationBudget && this.delegationBudget < this.maxDelegationBudget) {
      const replenish = Math.min(
        this.tokens * 0.1,
        this.maxDelegationBudget - this.delegationBudget
      );
      this.delegationBudget += replenish;
    }

    const proposal = this.chooseProposalToDelegateTo();
    if (proposal && this.delegationBudget > 0 && this.tokens > 0) {
      // Calculate delegation amount as fraction of budget
      const fraction = MIN_DELEGATION_FRACTION + random() * (MAX_DELEGATION_FRACTION - MIN_DELEGATION_FRACTION);
      const amount = Math.min(
        this.delegationBudget * fraction,
        this.tokens  // Can't delegate more than we have
      );

      if (amount > 0) {
        this.delegateSupportToProposal(proposal, amount);
      }
    }

    this.voteOnRandomProposal();

    if (random() < (this.model.dao?.commentProbability || 0.5)) {
      this.leaveCommentOnRandomProposal();
    }
  }

  delegateSupportToProposal(proposal: Proposal, tokenAmount: number): void {
    // Validate we have enough tokens and budget
    const amount = Math.min(tokenAmount, this.tokens, this.delegationBudget);
    if (amount <= 0) return;

    this.delegationBudget -= amount;
    this.tokens -= amount;
    proposal.receiveDelegatedSupport(this.uniqueId, amount);

    const current = this.proposalDelegations.get(proposal.uniqueId) || 0;
    this.proposalDelegations.set(proposal.uniqueId, current + amount);

    // Emit delegation event
    if (this.model.eventBus) {
      this.model.eventBus.publish('proposal_delegated', {
        step: this.model.currentStep,
        delegator: this.uniqueId,
        proposal: proposal.title,
        amount,
      });
    }

    this.markActive();
  }

  chooseProposalToDelegateTo(): Proposal | null {
    if (!this.model.dao) return null;

    const openProposals = this.model.dao.proposals.filter(p => !p.closed && p.status === 'open');
    if (openProposals.length === 0) return null;

    // Prefer proposals with higher current support (bandwagon effect)
    const totalSupport = openProposals.reduce((sum, p) => sum + p.votesFor, 0);
    if (totalSupport <= 0) {
      return randomChoice(openProposals);
    }

    // Weighted random selection by current support
    let r = random() * totalSupport;
    for (const proposal of openProposals) {
      r -= proposal.votesFor;
      if (r <= 0) {
        return proposal;
      }
    }

    return openProposals[openProposals.length - 1];
  }
}
