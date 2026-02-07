// Investor Agent
// Upgraded with Q-learning to learn optimal investment strategies

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import { submitRandomProposal } from '../utils/proposal-utils';
import { random, randomChoice } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

type InvestorAction = 'invest_high' | 'invest_medium' | 'invest_low' | 'hold' | 'reduce_exposure';

export class Investor extends DAOMember {
  static readonly ACTIONS: readonly InvestorAction[] = [
    'invest_high', 'invest_medium', 'invest_low', 'hold', 'reduce_exposure'
  ];

  // Learning infrastructure
  learning: LearningMixin;

  investmentBudget: number;
  investments: Map<string, number> = new Map();
  private readonly initialBudget: number;

  // Learning tracking
  lastAction: InvestorAction | null = null;
  lastState: string | null = null;
  lastTokens: number;
  investmentHistory: number[] = [];
  priceHistory: number[] = [];

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
    this.investmentBudget = Number.isFinite(investmentBudget) && investmentBudget >= 0
      ? investmentBudget
      : 100;
    this.initialBudget = this.investmentBudget;
    this.lastTokens = tokens;

    // Initialize learning
    const config: Partial<LearningConfig> = {
      learningRate: settings.learning_global_learning_rate,
      discountFactor: settings.learning_discount_factor,
      explorationRate: settings.learning_exploration_rate,
      explorationDecay: settings.learning_exploration_decay,
      minExploration: settings.learning_min_exploration,
      qBounds: [-50, 50],
    };

    this.learning = new LearningMixin(config);
  }

  /**
   * Get state representation for investment decisions
   */
  private getInvestmentState(): string {
    if (!this.model.dao) return 'normal|low|adequate';

    const price = this.model.dao.treasury.getTokenPrice('DAO_TOKEN');
    this.priceHistory.push(price);
    if (this.priceHistory.length > 10) {
      this.priceHistory.shift();
    }

    // Budget state
    const budgetRatio = this.investmentBudget / Math.max(1, this.initialBudget);
    const budgetState = budgetRatio < 0.2 ? 'depleted' :
                        budgetRatio < 0.5 ? 'low' :
                        budgetRatio < 0.8 ? 'adequate' : 'flush';

    // Proposal opportunity state
    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
    const opportunityState = openProposals.length === 0 ? 'none' :
                             openProposals.length < 3 ? 'few' :
                             openProposals.length < 7 ? 'normal' : 'many';

    return StateDiscretizer.combineState(
      StateDiscretizer.discretizePrice(price, 1.0),
      budgetState,
      opportunityState
    );
  }

  /**
   * Choose investment action using Q-learning
   */
  private chooseInvestmentAction(): InvestorAction {
    const state = this.getInvestmentState();

    if (!settings.learning_enabled) {
      return this.heuristicInvestmentAction();
    }

    return this.learning.selectAction(
      state,
      [...Investor.ACTIONS]
    ) as InvestorAction;
  }

  /**
   * Heuristic-based investment action (fallback)
   */
  private heuristicInvestmentAction(): InvestorAction {
    if (!this.model.dao) return 'hold';

    const price = this.model.dao.treasury.getTokenPrice('DAO_TOKEN');
    const shock = this.model.dao.currentShock;

    // Buy opportunity (price low or positive shock)
    if (price < 0.9 || shock > 0.1) {
      if (this.investmentBudget > this.initialBudget * 0.5) {
        return 'invest_high';
      }
      if (this.investmentBudget > this.initialBudget * 0.2) {
        return 'invest_medium';
      }
      return 'invest_low';
    }

    // Reduce exposure when price is high
    if (price > 1.3) {
      return 'reduce_exposure';
    }

    return 'hold';
  }

  /**
   * Execute investment action and return reward
   */
  private executeInvestmentAction(action: InvestorAction): number {
    if (!this.model.dao) return 0;

    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
    if (openProposals.length === 0 && action !== 'hold' && action !== 'reduce_exposure') {
      return -0.1;
    }

    let reward = 0;
    let investmentAmount = 0;

    switch (action) {
      case 'invest_high':
        investmentAmount = Math.min(this.investmentBudget * 0.3, this.tokens);
        reward = 0.1;
        break;
      case 'invest_medium':
        investmentAmount = Math.min(this.investmentBudget * 0.15, this.tokens);
        reward = 0.05;
        break;
      case 'invest_low':
        investmentAmount = Math.min(this.investmentBudget * 0.05, this.tokens);
        reward = 0.02;
        break;
      case 'reduce_exposure':
        // Don't invest, adjust budget down
        this.adjustBudgetBasedOnPrice();
        return 0;
      case 'hold':
        return 0;
    }

    if (investmentAmount > 0 && openProposals.length > 0) {
      const proposal = randomChoice(openProposals);
      proposal.receiveInvestment(this.uniqueId, investmentAmount);

      if (this.model.eventBus) {
        this.model.eventBus.publish('proposal_invested', {
          step: this.model.currentStep,
          proposal: proposal.title,
          investor: this.uniqueId,
          amount: investmentAmount,
        });
      }

      this.tokens -= investmentAmount;
      if (this.model.dao) {
        this.model.dao.treasury.deposit('DAO_TOKEN', investmentAmount, this.model.currentStep);
      }
      this.investmentBudget -= investmentAmount;

      this.investmentHistory.push(investmentAmount);
      if (this.investmentHistory.length > 20) {
        this.investmentHistory.shift();
      }

      this.markActive();
    }

    return reward;
  }

  /**
   * Update Q-values based on performance
   */
  private updateLearning(): void {
    if (!settings.learning_enabled || !this.lastAction || !this.lastState) return;

    // Calculate reward from token change and budget preservation
    const tokenChange = this.tokens - this.lastTokens;
    const budgetRatio = this.investmentBudget / Math.max(1, this.initialBudget);

    // Normalize reward
    let reward = tokenChange / 100 + budgetRatio * 0.5;
    reward = Math.max(-10, Math.min(10, reward));

    const currentState = this.getInvestmentState();

    this.learning.update(
      this.lastState,
      this.lastAction,
      reward,
      currentState,
      [...Investor.ACTIONS]
    );
  }

  step(): void {
    // Update learning from previous step
    this.updateLearning();

    // Track state before action
    this.lastTokens = this.tokens;
    this.lastState = this.getInvestmentState();

    // Adjust budget
    this.adjustBudgetBasedOnPrice();

    // Choose and execute action
    const action = this.chooseInvestmentAction();
    this.executeInvestmentAction(action);
    this.lastAction = action;

    // Participate in governance
    this.voteOnRandomProposal();

    if (this.model.dao && random() < 0.001) {
      submitRandomProposal(this.model.dao, this);
    }

    if (random() < (this.model.dao?.commentProbability || 0.5)) {
      this.leaveCommentOnRandomProposal();
    }
  }

  investInRandomProposal(): void {
    if (!this.model.dao) return;

    const openProps = this.model.dao.proposals.filter(p => p.status === 'open');
    if (openProps.length === 0 || this.investmentBudget <= 0) return;

    const proposal = randomChoice(openProps);
    const investmentAmount = Math.min(random() * this.investmentBudget, this.tokens);
    if (investmentAmount <= 0) return;

    proposal.receiveInvestment(this.uniqueId, investmentAmount);

    if (this.model.eventBus) {
      this.model.eventBus.publish('proposal_invested', {
        step: this.model.currentStep,
        proposal: proposal.title,
        investor: this.uniqueId,
        amount: investmentAmount,
      });
    }

    this.tokens -= investmentAmount;
    if (this.model.dao) {
      this.model.dao.treasury.deposit('DAO_TOKEN', investmentAmount, this.model.currentStep);
    }
    this.investmentBudget -= investmentAmount;
    this.markActive();
  }

  adjustBudgetBasedOnPrice(): void {
    if (!this.model.dao) return;

    const price = this.model.dao.treasury.getTokenPrice('DAO_TOKEN');
    const shock = this.model.dao.currentShock;

    if (shock !== 0) {
      const clampedShock = Math.max(-0.5, Math.min(1.0, shock));
      this.investmentBudget *= 1 + clampedShock;
    } else if (price < 1) {
      this.investmentBudget *= 1.1;
    } else {
      this.investmentBudget *= 0.9;
    }

    this.investmentBudget = Math.min(this.investmentBudget, this.initialBudget * 20);

    if (!Number.isFinite(this.investmentBudget) || this.investmentBudget < 0) {
      this.investmentBudget = 0;
    }
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
  } {
    const avgInvestment = this.investmentHistory.length > 0
      ? this.investmentHistory.reduce((a, b) => a + b, 0) / this.investmentHistory.length
      : 0;

    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      investmentCount: this.investments.size,
      avgInvestment,
      budgetRatio: this.investmentBudget / Math.max(1, this.initialBudget),
    };
  }
}
