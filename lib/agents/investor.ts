// Investor Agent

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import { random, randomChoice } from '../utils/random';

export class Investor extends DAOMember {
  investmentBudget: number;
  investments: Map<string, number> = new Map();

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number,
    reputation: number,
    location: string,
    votingStrategy?: string,
    investmentBudget: number = 100
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
    // Validate and sanitize investment budget
    this.investmentBudget = Number.isFinite(investmentBudget) && investmentBudget >= 0
      ? investmentBudget
      : 100;
  }

  step(): void {
    this.adjustBudgetBasedOnPrice();
    this.investInRandomProposal();
    this.voteOnRandomProposal();

    if (random() < (this.model.dao?.commentProbability || 0.5)) {
      this.leaveCommentOnRandomProposal();
    }
  }

  investInRandomProposal(): void {
    if (!this.model.dao) return;

    const openProps = this.model.dao.proposals.filter(p => p.status === 'open');
    if (openProps.length === 0 || this.investmentBudget <= 0) return;

    const proposal = randomChoice(openProps);
    const investmentAmount = random() * this.investmentBudget;

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
    // Note: Reputation is updated by ReputationTracker via 'proposal_invested' event
    this.markActive();
  }

  adjustBudgetBasedOnPrice(): void {
    if (!this.model.dao) return;

    const price = this.model.dao.treasury.getTokenPrice('DAO_TOKEN');
    const shock = this.model.dao.currentShock;

    if (shock !== 0) {
      // Clamp shock to prevent budget going to zero or negative
      // Max 50% decrease, 100% increase per step
      const clampedShock = Math.max(-0.5, Math.min(1.0, shock));
      this.investmentBudget *= 1 + clampedShock;
    } else if (price < 1) {
      this.investmentBudget *= 1.1;
    } else {
      this.investmentBudget *= 0.9;
    }

    // Ensure budget is always valid and non-negative
    if (!Number.isFinite(this.investmentBudget) || this.investmentBudget < 0) {
      this.investmentBudget = 0;
    }
  }
}
