// Adaptive Investor Agent - learns which proposal types yield better returns
// Port from agents/adaptive_investor.py

import { Investor } from './investor';
import type { DAOModel } from '../engine/model';
import type { Proposal } from '../data-structures/proposal';

export class AdaptiveInvestor extends Investor {
  learningRate: number;
  epsilon: number;
  qTable: Map<string, number> = new Map();
  lastPrice: number | null = null;
  investmentTypes: Map<string, string> = new Map();

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy: any = null,
    investmentBudget: number = 1000,
    learningRate: number = 0.1,
    epsilon: number = 0.1
  ) {
    super(
      uniqueId,
      model,
      tokens,
      reputation,
      location,
      votingStrategy,
      investmentBudget
    );
    this.learningRate = learningRate;
    this.epsilon = epsilon;
  }

  /**
   * Choose a proposal using epsilon-greedy strategy
   */
  chooseProposal(): Proposal | null {
    const openProposals = this.model.dao.proposals.filter((p: Proposal) => !p.closed);
    if (openProposals.length === 0) {
      return null;
    }

    // Epsilon-greedy: explore vs exploit
    if (Math.random() < this.epsilon) {
      // Explore: random proposal
      return openProposals[Math.floor(Math.random() * openProposals.length)];
    }

    // Exploit: choose proposal type with highest Q-value
    return openProposals.reduce((best: Proposal, proposal: Proposal) => {
      const proposalType = (proposal as any).type || 'default';
      const proposalQValue = this.qTable.get(proposalType) || 0;
      const bestType = (best as any).type || 'default';
      const bestQValue = this.qTable.get(bestType) || 0;

      return proposalQValue > bestQValue ? proposal : best;
    });
  }

  /**
   * Invest in a proposal chosen by the adaptive strategy
   */
  investInRandomProposal(): void {
    const proposal = this.chooseProposal();
    if (!proposal || this.investmentBudget <= 0) {
      return;
    }

    const amount = Math.random() * this.investmentBudget;
    proposal.receiveInvestment(this.uniqueId, amount);
    this.investmentBudget -= amount;

    // Track investment with type information
    const proposalType = (proposal as any).type || 'default';
    this.investments.set(proposal.uniqueId, amount);
    this.investmentTypes.set(proposal.uniqueId, proposalType);

    this.reputation += amount / 100;
    this.markActive();

    // Emit event
    if (this.model.eventBus) {
      this.model.eventBus.publish('investment_made', {
        step: this.model.currentStep,
        agentId: this.uniqueId,
        proposalId: proposal.uniqueId,
        amount,
        type: proposalType,
      });
    }
  }

  /**
   * Update Q-values based on token price changes
   */
  updateQValues(): void {
    const price = this.model.dao.treasury.getTokenPrice('DAO_TOKEN');

    if (this.lastPrice === null) {
      this.lastPrice = price;
      return;
    }

    const delta = price - this.lastPrice;
    this.lastPrice = price;

    // Update Q-values for each investment
    for (const [proposalId, amount] of this.investments.entries()) {
      const proposalType = this.investmentTypes.get(proposalId) || 'default';
      const reward = delta * amount;
      const oldQValue = this.qTable.get(proposalType) || 0;

      // Q-learning update: Q(s,a) = Q(s,a) + α * (reward - Q(s,a))
      this.qTable.set(
        proposalType,
        oldQValue + this.learningRate * (reward - oldQValue)
      );

      // Remove closed proposals from investments
      const proposal = this.model.dao.proposals.find(
        (p: Proposal) => p.uniqueId === proposalId
      );
      if (proposal && proposal.status !== 'open') {
        this.investments.delete(proposalId);
        this.investmentTypes.delete(proposalId);
      }
    }
  }

  step(): void {
    this.updateQValues();
    super.step();
  }
}
