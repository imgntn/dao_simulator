/**
 * Flash Loan Attacker Agent - Borrows Tokens for Same-Step Voting
 * Upgraded with Q-learning to learn optimal attack strategies
 */

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Proposal } from '../data-structures/proposal';
import { random, randomChoice, randomBool } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

// =============================================================================
// TYPES
// =============================================================================

export type FlashLoanStrategy =
  | 'vote_manipulation'
  | 'price_manipulation'
  | 'governance_takeover';

type AttackerAction = 'attack_aggressive' | 'attack_moderate' | 'attack_conservative' | 'probe' | 'wait' | 'hold';

export interface FlashLoan {
  loanId: string;
  borrower: string;
  lender: string;
  amount: number;
  fee: number;
  borrowedStep: number;
  repaidStep: number | null;
  purpose: FlashLoanStrategy;
  successful: boolean;
}

export interface FlashLoanConfig {
  maxBorrowAmount: number;
  loanFeePercent: number;
  minProfitThreshold: number;
  preferredStrategy: FlashLoanStrategy;
  cooldownSteps: number;
  riskTolerance: number;
}

export interface FlashLoanStats {
  totalLoans: number;
  successfulLoans: number;
  failedLoans: number;
  totalBorrowed: number;
  totalFeesPaid: number;
  totalProfit: number;
  lastAttackStep: number | null;
}

// =============================================================================
// FLASH LOAN ATTACKER AGENT
// =============================================================================

export class FlashLoanAttacker extends DAOMember {
  static readonly ACTIONS: readonly AttackerAction[] = [
    'attack_aggressive', 'attack_moderate', 'attack_conservative', 'probe', 'wait', 'hold'
  ];

  // Learning infrastructure
  learning: LearningMixin;

  activeLoan: FlashLoan | null = null;
  loanHistory: FlashLoan[] = [];
  attackConfig: FlashLoanConfig;
  totalProfit: number = 0;
  lastAttackStep: number | null = null;
  private loanCounter: number = 0;
  private borrowedFromTreasury: number = 0;

  // Learning tracking
  lastAction: AttackerAction | null = null;
  lastState: string | null = null;
  lastTokens: number;
  attackOutcomes: Array<{ successful: boolean; profit: number }> = [];

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 30,
    location: string = 'node_0',
    config?: Partial<FlashLoanConfig>
  ) {
    super(uniqueId, model, tokens, reputation, location);
    this.lastTokens = tokens;

    this.attackConfig = {
      maxBorrowAmount: 100000,
      loanFeePercent: 0.001,
      minProfitThreshold: 100,
      preferredStrategy: 'vote_manipulation',
      cooldownSteps: 10,
      riskTolerance: 0.5,
      ...config,
    };

    // Initialize learning
    const learningConfig: Partial<LearningConfig> = {
      learningRate: settings.learning_global_learning_rate,
      discountFactor: settings.learning_discount_factor,
      explorationRate: settings.learning_exploration_rate,
      explorationDecay: settings.learning_exploration_decay,
      minExploration: settings.learning_min_exploration,
      qBounds: [-50, 50],
    };

    this.learning = new LearningMixin(learningConfig);
  }

  /**
   * Get state representation for attack decisions
   */
  private getAttackState(): string {
    if (!this.model.dao) return 'none|low|cold';

    // Opportunity state
    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
    const vulnerableProposals = openProposals.filter(p => {
      const margin = Math.abs(p.votesFor - p.votesAgainst);
      return margin < this.getAvailableLiquidity() * 0.5;
    });
    const opportunityState = vulnerableProposals.length === 0 ? 'none' :
                             vulnerableProposals.length < 2 ? 'few' :
                             vulnerableProposals.length < 4 ? 'moderate' : 'many';

    // Liquidity state
    const liquidity = this.getAvailableLiquidity();
    const liquidityState = liquidity < 1000 ? 'low' :
                           liquidity < 10000 ? 'moderate' :
                           liquidity < 100000 ? 'high' : 'abundant';

    // Cooldown state
    const stepsSinceAttack = this.lastAttackStep !== null
      ? this.model.currentStep - this.lastAttackStep
      : 999;
    const cooldownState = stepsSinceAttack < this.attackConfig.cooldownSteps ? 'cooling' :
                          stepsSinceAttack < this.attackConfig.cooldownSteps * 2 ? 'warm' : 'ready';

    return StateDiscretizer.combineState(opportunityState, liquidityState, cooldownState);
  }

  /**
   * Choose attack action using Q-learning
   */
  private chooseAttackAction(): AttackerAction {
    const state = this.getAttackState();

    if (!settings.learning_enabled) {
      return this.heuristicAttackAction();
    }

    return this.learning.selectAction(
      state,
      [...FlashLoanAttacker.ACTIONS]
    ) as AttackerAction;
  }

  /**
   * Heuristic-based attack action (fallback)
   */
  private heuristicAttackAction(): AttackerAction {
    if (!this.model.dao) return 'hold';

    // Check cooldown
    if (this.lastAttackStep !== null) {
      const stepsSinceAttack = this.model.currentStep - this.lastAttackStep;
      if (stepsSinceAttack < this.attackConfig.cooldownSteps) {
        return 'wait';
      }
    }

    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
    if (openProposals.length === 0) return 'hold';

    // Look for vulnerable proposals
    for (const proposal of openProposals) {
      const opportunity = this.evaluateOpportunity(proposal);
      if (opportunity.isProfitable) {
        if (opportunity.expectedProfit > this.attackConfig.minProfitThreshold * 2) {
          return 'attack_aggressive';
        }
        return 'attack_moderate';
      }
    }

    return random() < 0.1 ? 'probe' : 'hold';
  }

  /**
   * Execute attack action and return reward
   */
  private executeAttackAction(action: AttackerAction): number {
    if (!this.model.dao) return 0;

    let reward = 0;

    switch (action) {
      case 'attack_aggressive': {
        reward = this.executeAttack(1.0);
        break;
      }
      case 'attack_moderate': {
        reward = this.executeAttack(0.5);
        break;
      }
      case 'attack_conservative': {
        reward = this.executeAttack(0.25);
        break;
      }
      case 'probe': {
        // Scan for opportunities without attacking
        this.scanForOpportunities();
        reward = 0.1;
        break;
      }
      case 'wait':
        return 0;
      case 'hold':
        return 0;
    }

    return reward;
  }

  /**
   * Execute an attack with given aggressiveness
   */
  private executeAttack(aggressiveness: number): number {
    if (!this.model.dao) return -0.5;

    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
    if (openProposals.length === 0) return -0.1;

    for (const proposal of openProposals) {
      const opportunity = this.evaluateOpportunity(proposal);
      if (opportunity.isProfitable) {
        const borrowAmount = opportunity.borrowAmount * aggressiveness;
        this.initiateFlashLoan(proposal, borrowAmount, opportunity.targetVote);

        if (this.loanHistory.length > 0) {
          const lastLoan = this.loanHistory[this.loanHistory.length - 1];
          if (lastLoan.successful) {
            this.attackOutcomes.push({ successful: true, profit: lastLoan.amount * 0.01 - lastLoan.fee });
            return 5 * aggressiveness;
          } else {
            this.attackOutcomes.push({ successful: false, profit: -lastLoan.fee });
            return -2;
          }
        }
        break;
      }
    }

    return -0.5;
  }

  /**
   * Update Q-values based on attack outcomes
   */
  private updateLearning(): void {
    if (!settings.learning_enabled || !this.lastAction || !this.lastState) return;

    // Calculate reward from token change and attack outcomes
    const tokenChange = this.tokens - this.lastTokens;

    let reward = tokenChange / Math.max(50, this.lastTokens) * 10;

    // Bonus for successful attacks
    if (this.attackOutcomes.length > 0) {
      const lastOutcome = this.attackOutcomes[this.attackOutcomes.length - 1];
      if (lastOutcome.successful) {
        reward += 5;
      } else {
        reward -= 2;
      }
    }
    if (this.attackOutcomes.length > 20) {
      this.attackOutcomes.splice(0, this.attackOutcomes.length - 20);
    }

    reward = Math.max(-10, Math.min(10, reward));

    const currentState = this.getAttackState();

    this.learning.update(
      this.lastState,
      this.lastAction,
      reward,
      currentState,
      [...FlashLoanAttacker.ACTIONS]
    );
  }

  step(): void {
    if (!this.model.dao) return;

    // Update learning from previous step
    this.updateLearning();

    // Track state before action
    this.lastTokens = this.tokens;
    this.lastState = this.getAttackState();

    // Check if we have an active loan to repay
    if (this.activeLoan) {
      this.executeLoanStep();
      return;
    }

    // Choose and execute action
    const action = this.chooseAttackAction();
    this.executeAttackAction(action);
    this.lastAction = action;
  }

  private scanForOpportunities(): void {
    if (!this.model.dao) return;

    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
    for (const proposal of openProposals) {
      const opportunity = this.evaluateOpportunity(proposal);
      if (opportunity.isProfitable && random() < this.attackConfig.riskTolerance) {
        this.initiateFlashLoan(proposal, opportunity.borrowAmount, opportunity.targetVote);
        break;
      }
    }
  }

  private getAvailableLiquidity(): number {
    if (!this.model.dao) return 0;
    const token = this.model.dao.tokenSymbol;
    return this.model.dao.treasury.getTokenBalance(token);
  }

  private evaluateOpportunity(proposal: Proposal): {
    isProfitable: boolean;
    borrowAmount: number;
    targetVote: boolean;
    expectedProfit: number;
  } {
    const currentFor = proposal.votesFor;
    const currentAgainst = proposal.votesAgainst;
    const margin = Math.abs(currentFor - currentAgainst);
    const availableLiquidity = this.getAvailableLiquidity();

    const borrowNeeded = margin * 1.5;
    const borrowAmount = Math.min(
      borrowNeeded,
      this.attackConfig.maxBorrowAmount,
      availableLiquidity
    );

    const fee = borrowAmount * this.attackConfig.loanFeePercent;
    const canFlip = borrowAmount > margin;
    const potentialValue = proposal.fundingGoal * 0.01;
    const expectedProfit = canFlip ? potentialValue - fee : -fee;
    const targetVote = currentFor > currentAgainst ? false : true;

    return {
      isProfitable: expectedProfit > this.attackConfig.minProfitThreshold && canFlip,
      borrowAmount,
      targetVote,
      expectedProfit,
    };
  }

  private initiateFlashLoan(
    proposal: Proposal,
    borrowAmount: number,
    targetVote: boolean
  ): void {
    if (this.activeLoan) return;
    if (!this.model.dao) return;

    this.loanCounter++;
    const loanId = `flashloan_${this.uniqueId}_${this.loanCounter}`;
    const fee = borrowAmount * this.attackConfig.loanFeePercent;

    if (fee > this.tokens) return;

    const token = this.model.dao.tokenSymbol;
    const availableLiquidity = this.model.dao.treasury.getTokenBalance(token);

    if (borrowAmount > availableLiquidity) {
      if (this.model.eventBus) {
        this.model.eventBus.publish('flashloan_insufficient_liquidity', {
          step: this.model.currentStep,
          borrower: this.uniqueId,
          requested: borrowAmount,
          available: availableLiquidity,
        });
      }
      return;
    }

    this.activeLoan = {
      loanId,
      borrower: this.uniqueId,
      lender: 'treasury',
      amount: borrowAmount,
      fee,
      borrowedStep: this.model.currentStep,
      repaidStep: null,
      purpose: this.attackConfig.preferredStrategy,
      successful: false,
    };

    proposal.isMalicious = true;

    this.model.dao.treasury.withdraw(token, borrowAmount, this.model.currentStep);
    this.borrowedFromTreasury = borrowAmount;

    const originalTokens = this.tokens;
    this.tokens += borrowAmount;

    if (this.model.eventBus) {
      this.model.eventBus.publish('flashloan_borrowed', {
        step: this.model.currentStep,
        loanId,
        borrower: this.uniqueId,
        amount: borrowAmount,
        fee,
        proposalId: proposal.uniqueId,
        strategy: this.attackConfig.preferredStrategy,
      });
    }

    switch (this.attackConfig.preferredStrategy) {
      case 'vote_manipulation':
        this.executeVoteManipulation(proposal, targetVote, borrowAmount);
        break;
      case 'price_manipulation':
        this.executePriceManipulation(borrowAmount);
        break;
      case 'governance_takeover':
        this.executeGovernanceTakeover(proposal, borrowAmount);
        break;
    }

    this.repayLoan(originalTokens);
  }

  private executeVoteManipulation(
    proposal: Proposal,
    targetVote: boolean,
    borrowedAmount: number
  ): void {
    proposal.addVote(this.uniqueId, targetVote, this.tokens);
    this.votes.set(proposal.uniqueId, { vote: targetVote, weight: this.tokens });
    this.markActive();

    if (this.model.eventBus) {
      this.model.eventBus.publish('flashloan_vote_cast', {
        step: this.model.currentStep,
        loanId: this.activeLoan?.loanId,
        borrower: this.uniqueId,
        proposalId: proposal.uniqueId,
        vote: targetVote,
        voteWeight: this.tokens,
        borrowedAmount,
      });
    }

    const newLeading = proposal.votesFor > proposal.votesAgainst ? true : false;
    if (newLeading === targetVote) {
      if (this.activeLoan) {
        this.activeLoan.successful = true;
      }
    }
  }

  private executePriceManipulation(borrowedAmount: number): void {
    if (!this.model.dao) return;

    const treasury = this.model.dao.treasury;
    const token = this.model.dao.tokenSymbol;

    treasury.deposit(token, borrowedAmount, this.model.currentStep);
    treasury.withdraw(token, borrowedAmount, this.model.currentStep);

    if (this.activeLoan) {
      this.activeLoan.successful = false;
    }

    if (this.model.eventBus) {
      this.model.eventBus.publish('flashloan_price_manipulation_failed', {
        step: this.model.currentStep,
        loanId: this.activeLoan?.loanId,
        borrower: this.uniqueId,
        amount: borrowedAmount,
        token,
      });
    }
  }

  private executeGovernanceTakeover(proposal: Proposal, borrowedAmount: number): void {
    if (!this.model.dao) return;

    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
    let votedCount = 0;

    for (const p of openProposals) {
      if (!this.votes.has(p.uniqueId)) {
        const weight = this.tokens / openProposals.length;
        p.addVote(this.uniqueId, true, weight);
        this.votes.set(p.uniqueId, { vote: true, weight });
        if (this.model.eventBus) {
          this.model.eventBus.publish('flashloan_vote_cast', {
            step: this.model.currentStep,
            loanId: this.activeLoan?.loanId,
            borrower: this.uniqueId,
            proposalId: p.uniqueId,
            vote: true,
            voteWeight: weight,
            borrowedAmount,
          });
        }
        votedCount++;
      }
    }

    if (this.activeLoan) {
      this.activeLoan.successful = votedCount > 0;
    }

    if (this.model.eventBus) {
      this.model.eventBus.publish('flashloan_governance_takeover', {
        step: this.model.currentStep,
        loanId: this.activeLoan?.loanId,
        borrower: this.uniqueId,
        proposalsVoted: votedCount,
        totalWeight: this.tokens,
      });
    }

    this.markActive();
  }

  private repayLoan(originalTokens: number): void {
    if (!this.activeLoan) return;
    if (!this.model.dao) return;

    const token = this.model.dao.tokenSymbol;
    if (this.borrowedFromTreasury > 0) {
      this.model.dao.treasury.deposit(token, this.borrowedFromTreasury, this.model.currentStep);
    }

    this.tokens = originalTokens;
    this.borrowedFromTreasury = 0;
    this.tokens -= this.activeLoan.fee;
    this.activeLoan.repaidStep = this.model.currentStep;

    if (this.model.eventBus) {
      this.model.eventBus.publish('flashloan_repaid', {
        step: this.model.currentStep,
        loanId: this.activeLoan.loanId,
        borrower: this.uniqueId,
        amount: this.activeLoan.amount,
        fee: this.activeLoan.fee,
      });
    }

    if (this.activeLoan.successful) {
      const profit = this.activeLoan.amount * 0.01 - this.activeLoan.fee;
      this.totalProfit += profit;

      if (this.model.eventBus) {
        this.model.eventBus.publish('flashloan_attack_succeeded', {
          step: this.model.currentStep,
          loanId: this.activeLoan.loanId,
          borrower: this.uniqueId,
          strategy: this.activeLoan.purpose,
          profit,
        });
      }
    } else {
      if (this.model.eventBus) {
        this.model.eventBus.publish('flashloan_attack_failed', {
          step: this.model.currentStep,
          loanId: this.activeLoan.loanId,
          borrower: this.uniqueId,
          strategy: this.activeLoan.purpose,
          reason: 'Voting power snapshot prevented manipulation',
        });
      }
    }

    this.loanHistory.push(this.activeLoan);
    this.lastAttackStep = this.model.currentStep;
    this.activeLoan = null;
  }

  private executeLoanStep(): void {
    if (this.activeLoan && !this.activeLoan.repaidStep) {
      this.repayLoan(this.tokens - this.activeLoan.amount);
    }
  }

  getAttackStats(): FlashLoanStats {
    const successfulLoans = this.loanHistory.filter(l => l.successful).length;
    const failedLoans = this.loanHistory.filter(l => !l.successful).length;
    const totalBorrowed = this.loanHistory.reduce((sum, l) => sum + l.amount, 0);
    const totalFees = this.loanHistory.reduce((sum, l) => sum + l.fee, 0);

    return {
      totalLoans: this.loanHistory.length,
      successfulLoans,
      failedLoans,
      totalBorrowed,
      totalFeesPaid: totalFees,
      totalProfit: this.totalProfit,
      lastAttackStep: this.lastAttackStep,
    };
  }

  getRecentLoan(): FlashLoan | null {
    return this.loanHistory[this.loanHistory.length - 1] || null;
  }

  toDict(): unknown {
    return {
      uniqueId: this.uniqueId,
      tokens: this.tokens,
      reputation: this.reputation,
      attackConfig: this.attackConfig,
      loanHistory: this.loanHistory,
      loanCounter: this.loanCounter,
      totalProfit: this.totalProfit,
      lastAttackStep: this.lastAttackStep,
      borrowedFromTreasury: this.borrowedFromTreasury,
    };
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
    attackSuccessRate: number;
    totalProfit: number;
  } {
    const successRate = this.attackOutcomes.length > 0
      ? this.attackOutcomes.filter(o => o.successful).length / this.attackOutcomes.length
      : 0;

    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      attackSuccessRate: successRate,
      totalProfit: this.totalProfit,
    };
  }
}

export function createAggressiveFlashLoanAttacker(
  uniqueId: string,
  model: DAOModel
): FlashLoanAttacker {
  return new FlashLoanAttacker(uniqueId, model, 500, 20, 'node_0', {
    maxBorrowAmount: 500000,
    loanFeePercent: 0.001,
    minProfitThreshold: 50,
    preferredStrategy: 'vote_manipulation',
    cooldownSteps: 5,
    riskTolerance: 0.8,
  });
}

export function createConservativeFlashLoanAttacker(
  uniqueId: string,
  model: DAOModel
): FlashLoanAttacker {
  return new FlashLoanAttacker(uniqueId, model, 1000, 40, 'node_0', {
    maxBorrowAmount: 50000,
    loanFeePercent: 0.001,
    minProfitThreshold: 500,
    preferredStrategy: 'vote_manipulation',
    cooldownSteps: 20,
    riskTolerance: 0.3,
  });
}
