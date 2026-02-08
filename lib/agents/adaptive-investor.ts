// Adaptive Investor Agent - learns which proposal types yield better returns
// Refactored to use LearningMixin for standardized Q-learning

import { Investor } from './investor';
import type { DAOModel } from '../engine/model';
import type { Proposal } from '../data-structures/proposal';
import { random, randomChoice } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

export class AdaptiveInvestor extends Investor {
  // Learning infrastructure
  learning: LearningMixin;

  // Investment tracking
  lastPrice: number | null = null;
  investmentTypes: Map<string, string> = new Map();
  totalReturns: number = 0;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy?: string,
    investmentBudget: number = 1000,
    learningRate?: number,
    epsilon?: number
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

    // Create learning config from parameters or settings
    const config: Partial<LearningConfig> = {
      learningRate: learningRate ?? settings.adaptive_learning_rate,
      discountFactor: 0.9, // Investors care about long-term returns
      explorationRate: epsilon ?? settings.adaptive_epsilon,
      explorationDecay: settings.learning_exploration_decay,
      minExploration: settings.learning_min_exploration,
      qBounds: [-100, 100],
    };

    this.learning = new LearningMixin(config);
  }

  /**
   * Get the current market state for learning
   */
  private getMarketState(): string {
    if (!this.model.dao) return 'normal|low|adequate';

    const price = this.model.dao.treasury.getTokenPrice('DAO_TOKEN');
    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
    const participationRate = openProposals.length > 0
      ? openProposals.reduce((sum, p) => sum + (p.votesFor + p.votesAgainst), 0) /
        (openProposals.length * Math.max(1, this.model.dao.members.length))
      : 0;

    return StateDiscretizer.combineState(
      StateDiscretizer.discretizePrice(price, 1.0),
      StateDiscretizer.discretizeParticipation(participationRate),
      StateDiscretizer.discretizeTreasury(this.model.dao.treasury.funds)
    );
  }

  /**
   * Get available proposal types as actions
   */
  private getAvailableProposalTypes(): string[] {
    if (!this.model.dao) return ['default'];

    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
    const types = new Set<string>();

    for (const proposal of openProposals) {
      types.add(this.getProposalType(proposal));
    }

    // Always include default as fallback
    if (types.size === 0) {
      types.add('default');
    }

    return Array.from(types);
  }

  /**
   * Choose a proposal using learned preferences
   */
  chooseProposal(): Proposal | null {
    if (!this.model.dao) return null;

    const openProposals = this.model.dao.proposals.filter((p: Proposal) => p.status === 'open');
    if (openProposals.length === 0) {
      return null;
    }

    // Check if learning is enabled
    if (!settings.learning_enabled) {
      return randomChoice(openProposals);
    }

    // Get current state
    const state = this.getMarketState();
    const availableTypes = this.getAvailableProposalTypes();

    // Select proposal type using learning
    const selectedType = this.learning.selectAction(state, availableTypes);

    // Find proposals matching selected type
    const matchingProposals = openProposals.filter(
      p => this.getProposalType(p) === selectedType
    );

    if (matchingProposals.length > 0) {
      return randomChoice(matchingProposals);
    }

    // Fallback to random if no matches
    return randomChoice(openProposals);
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
    const maxInvestment = Math.min(this.tokens, this.investmentBudget * 0.2);
    const amount = random() * maxInvestment;

    if (amount <= 0) return;

    proposal.receiveInvestment(this.uniqueId, amount);
    this.investmentBudget -= amount;
    this.tokens -= amount;
    if (this.model.dao) {
      this.model.dao.treasury.deposit('DAO_TOKEN', amount, this.model.currentStep);
    }

    // Track investment with type information
    const proposalType = this.getProposalType(proposal);
    this.investments.set(proposal.uniqueId, amount);
    this.investmentTypes.set(proposal.uniqueId, proposalType);

    this.markActive();

    // Emit event
    if (this.model.eventBus) {
      this.model.eventBus.publish('investment_made', {
        step: this.model.currentStep,
        agentId: this.uniqueId,
        proposalId: proposal.uniqueId,
        amount,
        type: proposalType,
        qValue: this.learning.getQValue(this.getMarketState(), proposalType),
      });
    }
  }

  /**
   * Update Q-values based on token price changes
   */
  updateQValues(): void {
    if (!this.model.dao || !settings.learning_enabled) return;

    const price = this.model.dao.treasury.getTokenPrice('DAO_TOKEN');

    if (this.lastPrice === null) {
      this.lastPrice = price;
      return;
    }

    const delta = price - this.lastPrice;
    this.lastPrice = price;

    // Get current state for updates
    const state = this.getMarketState();
    const availableTypes = this.getAvailableProposalTypes();

    // Create a copy of entries to iterate safely while deleting
    const investmentEntries = Array.from(this.investments.entries());

    // Update Q-values for each investment
    for (const [proposalId, amount] of investmentEntries) {
      const proposalType = this.investmentTypes.get(proposalId) || 'default';

      // Scale reward by investment size but cap it
      const rawReward = delta * Math.sqrt(amount); // sqrt to reduce impact of large investments
      const reward = Math.max(-10, Math.min(10, rawReward));

      // Update Q-value for this proposal type
      // Note: Using same state for simplicity (stateless per type)
      this.learning.update(
        state,
        proposalType,
        reward,
        state, // Next state (simplified - same market conditions)
        availableTypes
      );

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
   * Now delegated to learning mixin's prune method
   */
  cleanupQTable(): void {
    // Prune states with small Q-values
    this.learning.prune(0.1);
  }

  step(): void {
    this.updateQValues();

    // Periodic Q-table cleanup (every 100 steps)
    if (this.model.currentStep > 0 && this.model.currentStep % 100 === 0) {
      this.cleanupQTable();
    }

    super.step();
  }

  /**
   * Signal end of episode
   */
  endEpisode(): void {
    this.learning.endEpisode();
  }

  /**
   * Export learning state for checkpoints
   */
  exportLearningState(): LearningState {
    return this.learning.exportLearningState();
  }

  /**
   * Import learning state from checkpoint
   */
  importLearningState(state: LearningState): void {
    this.learning.importLearningState(state);
  }

  /**
   * Get learning statistics
   */
  getLearningStats(): {
    qTableSize: number;
    stateCount: number;
    episodeCount: number;
    totalReward: number;
    explorationRate: number;
    investmentCount: number;
    avgInvestment: number;
    budgetRatio: number;
    totalReturns: number;
    activeInvestments: number;
  } {
    const parentStats = super.getLearningStats();
    return {
      ...parentStats,
      totalReturns: this.totalReturns,
      activeInvestments: this.investments.size,
    };
  }

  // Legacy compatibility getters
  get epsilon(): number {
    return this.learning.getExplorationRate();
  }

  get learningRate(): number {
    return this.learning.getConfig().learningRate;
  }

  // Legacy qTable getter for checkpoint compatibility
  get qTable(): Map<string, number> {
    // Convert new format to legacy format for backward compatibility
    const legacyTable = new Map<string, number>();
    const exportedState = this.learning.exportLearningState();

    for (const [state, actions] of Object.entries(exportedState.qTable)) {
      for (const [action, value] of Object.entries(actions)) {
        legacyTable.set(`${state},${action}`, value);
      }
    }

    return legacyTable;
  }
}
