// Delegator Agent - delegates support to proposals

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Proposal } from '../data-structures/proposal';

export class Delegator extends DAOMember {
  delegationBudget: number;
  delegations: Map<string, number> = new Map(); // proposalId -> amount

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number,
    reputation: number,
    location: string,
    votingStrategy?: string,
    delegationBudget: number = 100
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
    this.delegationBudget = delegationBudget;
  }

  step(): void {
    const proposal = this.chooseProposalToDelegateTo();
    if (proposal && this.delegationBudget > 0) {
      const amount = Math.random() * this.delegationBudget;
      this.delegateSupportToProposal(proposal, amount);
    }

    this.voteOnRandomProposal();

    if (Math.random() < (this.model.dao?.commentProbability || 0.5)) {
      this.leaveCommentOnRandomProposal();
    }
  }

  delegateSupportToProposal(proposal: Proposal, tokenAmount: number): void {
    if (this.delegationBudget >= tokenAmount && this.tokens >= tokenAmount) {
      this.delegationBudget -= tokenAmount;
      this.tokens -= tokenAmount;
      proposal.receiveDelegatedSupport(this.uniqueId, tokenAmount);
      this.delegations.set(proposal.uniqueId, tokenAmount);
      this.reputation += tokenAmount / 100;
      this.markActive();
    }
  }

  chooseProposalToDelegateTo(): Proposal | null {
    if (!this.model.dao) return null;

    const openProposals = this.model.dao.proposals.filter(p => !p.closed);
    if (openProposals.length === 0) return null;

    return openProposals[Math.floor(Math.random() * openProposals.length)];
  }
}
