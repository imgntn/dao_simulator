// Adaptive Investor Agent - learns which proposal types yield better returns
// Port from agents/adaptive_investor.py

import { Investor } from './investor';
import type { DAOModel } from '../engine/model';
import type { Proposal } from '../data-structures/proposal';
import { random, randomChoice } from '../utils/random';

// Q-learning configuration
const DEFAULT_LEARNING_RATE = 0.1;
const DEFAULT_EPSILON = 0.1;
const MAX_Q_VALUE = 100;   // Clamp Q-values to prevent explosion
const MIN_Q_VALUE = -100;

export class AdaptiveInvestor extends Investor {
  learningRate: number;
  epsilon: number;
  qTable: Map<string, number> = new Map();
  lastPrice: number | null = null;
  investmentTypes: Map<string, string> = new Map();
  totalReturns: number = 0;  // Track cumulative returns

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy?: string,
    investmentBudget: number = 1000,
    learningRate: number = DEFAULT_LEARNING_RATE,
    epsilon: number = DEFAULT_EPSILON
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
    // Validate and clamp learning parameters to [0,1]
    const sanitizedLearningRate = Number.isFinite(learningRate) ? learningRate : DEFAULT_LEARNING_RATE;
    const sanitizedEpsilon = Number.isFinite(epsilon) ? epsilon : DEFAULT_EPSILON;
    this.learningRate = Math.max(0, Math.min(1, sanitizedLearningRate));
    this.epsilon = Math.max(0, Math.min(1, sanitizedEpsilon));
  }

  /**
   * Choose a proposal using epsilon-greedy strategy
   */
  chooseProposal(): Proposal | null {
    if (!this.model.dao) return null;

    const openProposals = this.model.dao.proposals.filter((p: Proposal) => !p.closed);
    if (openProposals.length === 0) {
      return null;
    }

    // Epsilon-greedy: explore vs exploit
    if (random() < this.epsilon) {
      // Explore: random proposal
      return randomChoice(openProposals);
    }

    // Exploit: choose proposal type with highest Q-value
    return openProposals.reduce((best: Proposal, proposal: Proposal) => {
      const proposalType = this.getProposalType(proposal);
      const proposalQValue = this.qTable.get(proposalType) || 0;
      const bestType = this.getProposalType(best);
      const bestQValue = this.qTable.get(bestType) || 0;

      return proposalQValue > bestQValue ? proposal : best;
    });
  }

  /**
   * Get proposal type safely
   */
  private getProposalType(proposal: Proposal): string {
    return (proposal as { type?: string }).type || 'default';
  }

  /**
   * Invest in a proposal chosen by the adaptive strategy
   */
  investInRandomProposal(): void {
    if (!this.model.dao) return;

    const proposal = this.chooseProposal();
    if (!proposal || this.investmentBudget <= 0) {
      return;
    }

    // Invest a fraction of budget (not the entire budget randomly)
    const maxInvestment = Math.min(this.investmentBudget, this.investmentBudget * 0.2);
    const amount = random() * maxInvestment;

    if (amount <= 0) return;

    proposal.receiveInvestment(this.uniqueId, amount);
    this.investmentBudget -= amount;

    // Track investment with type information
    const proposalType = this.getProposalType(proposal);
    this.investments.set(proposal.uniqueId, amount);
    this.investmentTypes.set(proposal.uniqueId, proposalType);

    // Note: Reputation handled by ReputationTracker via events
    this.markActive();

    // Emit event
    if (this.model.eventBus) {
      this.model.eventBus.publish('investment_made', {
        step: this.model.currentStep,
        agentId: this.uniqueId,
        proposalId: proposal.uniqueId,
        amount,
        type: proposalType,
        qValue: this.qTable.get(proposalType) || 0,
      });
    }
  }

  /**
   * Update Q-values based on token price changes (with bounded updates)
   */
  updateQValues(): void {
    if (!this.model.dao) return;

    const price = this.model.dao.treasury.getTokenPrice('DAO_TOKEN');

    if (this.lastPrice === null) {
      this.lastPrice = price;
      return;
    }

    const delta = price - this.lastPrice;
    this.lastPrice = price;

    // Create a copy of entries to iterate safely while deleting
    const investmentEntries = Array.from(this.investments.entries());

    // Update Q-values for each investment
    for (const [proposalId, amount] of investmentEntries) {
      const proposalType = this.investmentTypes.get(proposalId) || 'default';

      // Scale reward by investment size but cap it
      const rawReward = delta * Math.sqrt(amount); // sqrt to reduce impact of large investments
      const reward = Math.max(-10, Math.min(10, rawReward)); // Clamp reward

      const oldQValue = this.qTable.get(proposalType) || 0;

      // Q-learning update: Q(s,a) = Q(s,a) + α * (reward - Q(s,a))
      let newQValue = oldQValue + this.learningRate * (reward - oldQValue);

      // Clamp Q-values to prevent explosion
      newQValue = Math.max(MIN_Q_VALUE, Math.min(MAX_Q_VALUE, newQValue));

      this.qTable.set(proposalType, newQValue);
      this.totalReturns += delta * amount;

      // Remove closed proposals from investments
      const proposal = this.model.dao.proposals.find(
        (p: Proposal) => p.uniqueId === proposalId
      );
      if (!proposal || proposal.status !== 'open') {
        this.investments.delete(proposalId);
        this.investmentTypes.delete(proposalId);
      }
    }
  }

  /**
   * Clean up stale Q-values for proposal types with no recent activity
   * Should be called periodically (e.g., every 100 steps)
   */
  cleanupQTable(): void {
    // Get all active proposal types
    const activeTypes = new Set<string>();
    for (const proposalType of this.investmentTypes.values()) {
      activeTypes.add(proposalType);
    }

    // Also keep types from currently open proposals
    if (this.model.dao) {
      for (const proposal of this.model.dao.proposals) {
        if (proposal.status === 'open') {
          activeTypes.add(this.getProposalType(proposal));
        }
      }
    }

    // Remove Q-values for types with no activity, unless Q-table is small
    // Keep at least some entries for learning diversity
    const MAX_STALE_ENTRIES = 10;
    const staleEntries: string[] = [];

    for (const proposalType of this.qTable.keys()) {
      if (!activeTypes.has(proposalType)) {
        staleEntries.push(proposalType);
      }
    }

    // Only clean up if we have too many stale entries
    if (staleEntries.length > MAX_STALE_ENTRIES) {
      // Keep the entries with highest absolute Q-values (most learned)
      staleEntries.sort((a, b) => {
        const qA = Math.abs(this.qTable.get(a) || 0);
        const qB = Math.abs(this.qTable.get(b) || 0);
        return qA - qB; // Ascending - remove lowest first
      });

      // Remove excess stale entries
      const toRemove = staleEntries.slice(0, staleEntries.length - MAX_STALE_ENTRIES);
      for (const proposalType of toRemove) {
        this.qTable.delete(proposalType);
      }
    }
  }

  step(): void {
    this.updateQValues();

    // Periodic Q-table cleanup (every 100 steps)
    if (this.model.currentStep > 0 && this.model.currentStep % 100 === 0) {
      this.cleanupQTable();
    }

    super.step();
  }
}
