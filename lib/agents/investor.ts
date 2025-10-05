// Investor Agent

import { DAOMember } from './base';
import type { DAOSimulation } from '../simulation';
import type { Proposal } from '../data-structures/proposal';

export class Investor extends DAOMember {
  investmentBudget: number;
  investments: Map<string, number> = new Map();

  constructor(
    uniqueId: string,
    model: DAOSimulation,
    tokens: number,
    reputation: number,
    location: string,
    votingStrategy?: string,
    investmentBudget: number = 100
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
    this.investmentBudget = investmentBudget;
  }

  step(): void {
    this.adjustBudgetBasedOnPrice();
    this.investInRandomProposal();
    this.voteOnRandomProposal();

    if (Math.random() < (this.model.dao?.commentProbability || 0.5)) {
      this.leaveCommentOnRandomProposal();
    }
  }

  investInRandomProposal(): void {
    if (!this.model.dao) return;

    const openProps = this.model.dao.proposals.filter(p => p.status === 'open');
    if (openProps.length === 0 || this.investmentBudget <= 0) return;

    const proposal = openProps[Math.floor(Math.random() * openProps.length)];
    const investmentAmount = Math.random() * this.investmentBudget;

    proposal.receiveInvestment(this.uniqueId, investmentAmount);

    if (this.model.eventBus) {
      this.model.eventBus.publish('proposal_invested', {
        step: this.model.currentStep,
        proposal: proposal.title,
        investor: this.uniqueId,
        amount: investmentAmount,
      });
    }

    this.investmentBudget -= investmentAmount;
    this.reputation += investmentAmount / 100;
    this.markActive();
  }

  adjustBudgetBasedOnPrice(): void {
    if (!this.model.dao) return;

    const price = this.model.dao.treasury.getTokenPrice('DAO_TOKEN');
    const shock = this.model.dao.currentShock;

    if (shock !== 0) {
      this.investmentBudget *= 1 + shock;
    } else if (price < 1) {
      this.investmentBudget *= 1.1;
    } else {
      this.investmentBudget *= 0.9;
    }

    this.investmentBudget = Math.max(0, this.investmentBudget);
  }
}
