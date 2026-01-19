/**
 * Flash Loan Attacker Agent - Borrows Tokens for Same-Step Voting
 *
 * Simulates a flash loan attack where an entity borrows tokens,
 * uses them to vote, and returns them all in the same step.
 * Used for testing governance resilience and attack detection.
 */

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Proposal } from '../data-structures/proposal';
import { random, randomChoice, randomBool } from '../utils/random';

// =============================================================================
// TYPES
// =============================================================================

export type FlashLoanStrategy =
  | 'vote_manipulation'      // Use borrowed tokens to swing votes
  | 'price_manipulation'     // Use borrowed tokens to affect prices
  | 'governance_takeover';   // Attempt complete governance control

export interface FlashLoan {
  loanId: string;
  borrower: string;
  lender: string;           // Pool or protocol providing the loan
  amount: number;
  fee: number;              // Fee paid to lender
  borrowedStep: number;
  repaidStep: number | null;
  purpose: FlashLoanStrategy;
  successful: boolean;
}

export interface FlashLoanConfig {
  maxBorrowAmount: number;        // Maximum tokens to borrow
  loanFeePercent: number;         // Fee percentage (0-1)
  minProfitThreshold: number;     // Minimum expected profit to attempt
  preferredStrategy: FlashLoanStrategy;
  cooldownSteps: number;          // Steps between attacks
  riskTolerance: number;          // 0-1, higher = more aggressive
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
  activeLoan: FlashLoan | null = null;
  loanHistory: FlashLoan[] = [];
  attackConfig: FlashLoanConfig;
  totalProfit: number = 0;
  lastAttackStep: number | null = null;
  private loanCounter: number = 0;

  // Track borrowed tokens for proper accounting
  private borrowedFromTreasury: number = 0;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 30,
    location: string = 'node_0',
    config?: Partial<FlashLoanConfig>
  ) {
    super(uniqueId, model, tokens, reputation, location);

    this.attackConfig = {
      maxBorrowAmount: 100000,
      loanFeePercent: 0.001,      // 0.1% fee
      minProfitThreshold: 100,
      preferredStrategy: 'vote_manipulation',
      cooldownSteps: 10,
      riskTolerance: 0.5,
      ...config,
    };
  }

  /**
   * Main step function
   */
  step(): void {
    if (!this.model.dao) return;

    // Check if we have an active loan to repay
    if (this.activeLoan) {
      this.executeLoanStep();
      return;
    }

    // Check cooldown
    if (this.lastAttackStep !== null) {
      const stepsSinceAttack = this.model.currentStep - this.lastAttackStep;
      if (stepsSinceAttack < this.attackConfig.cooldownSteps) {
        // Normal behavior during cooldown
        if (randomBool(0.1)) {
          this.voteOnRandomProposal();
        }
        return;
      }
    }

    // Look for attack opportunities
    this.scanForOpportunities();
  }

  /**
   * Scan for flash loan attack opportunities
   */
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

  /**
   * Get actual available liquidity from the DAO treasury
   * CRITICAL FIX: Flash loans must be backed by actual liquidity, not hardcoded values
   */
  private getAvailableLiquidity(): number {
    if (!this.model.dao) return 0;
    const token = this.model.dao.tokenSymbol;
    return this.model.dao.treasury.getTokenBalance(token);
  }

  /**
   * Evaluate if a proposal presents a profitable attack opportunity
   * NOTE: With voting power snapshots, flash loan attacks should now fail
   * because votes are counted against snapshot balances, not current balances
   */
  private evaluateOpportunity(proposal: Proposal): {
    isProfitable: boolean;
    borrowAmount: number;
    targetVote: boolean;
    expectedProfit: number;
  } {
    const currentFor = proposal.votesFor;
    const currentAgainst = proposal.votesAgainst;
    const margin = Math.abs(currentFor - currentAgainst);

    // CRITICAL FIX: Use actual treasury liquidity, not hardcoded value
    const availableLiquidity = this.getAvailableLiquidity();

    // Calculate how much we'd need to borrow to flip the vote
    const borrowNeeded = margin * 1.5;
    const borrowAmount = Math.min(
      borrowNeeded,
      this.attackConfig.maxBorrowAmount,
      availableLiquidity
    );

    const fee = borrowAmount * this.attackConfig.loanFeePercent;
    const canFlip = borrowAmount > margin;

    // Simple profit model: if we can flip a vote with funding,
    // assume there's value in the outcome
    const potentialValue = proposal.fundingGoal * 0.01;  // 1% of funding goal
    const expectedProfit = canFlip ? potentialValue - fee : -fee;

    const targetVote = currentFor > currentAgainst ? false : true;

    return {
      isProfitable: expectedProfit > this.attackConfig.minProfitThreshold && canFlip,
      borrowAmount,
      targetVote,
      expectedProfit,
    };
  }

  /**
   * Initiate a flash loan attack
   * CRITICAL FIX: Properly borrow from treasury instead of creating tokens from nothing
   */
  private initiateFlashLoan(
    proposal: Proposal,
    borrowAmount: number,
    targetVote: boolean
  ): void {
    if (this.activeLoan) return;  // Already have active loan
    if (!this.model.dao) return;

    this.loanCounter++;
    const loanId = `flashloan_${this.uniqueId}_${this.loanCounter}`;
    const fee = borrowAmount * this.attackConfig.loanFeePercent;

    // Check if we can pay the fee
    if (fee > this.tokens) {
      return;  // Can't afford the fee
    }

    // CRITICAL FIX: Actually withdraw from treasury
    const token = this.model.dao.tokenSymbol;
    const availableLiquidity = this.model.dao.treasury.getTokenBalance(token);

    if (borrowAmount > availableLiquidity) {
      // Not enough liquidity in treasury
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

    // "Borrow" the tokens from treasury
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

    // CRITICAL FIX: Withdraw from treasury and track properly
    this.model.dao.treasury.withdraw(token, borrowAmount, this.model.currentStep);
    this.borrowedFromTreasury = borrowAmount;

    // Temporarily add borrowed tokens to attacker's balance
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

    // Execute the attack based on strategy
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

    // Repay the loan (same step)
    this.repayLoan(originalTokens);
  }

  /**
   * Execute vote manipulation attack
   */
  private executeVoteManipulation(
    proposal: Proposal,
    targetVote: boolean,
    borrowedAmount: number
  ): void {
    // Vote with the borrowed tokens
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

    // Check if we flipped the vote
    const newLeading = proposal.votesFor > proposal.votesAgainst ? true : false;
    if (newLeading === targetVote) {
      if (this.activeLoan) {
        this.activeLoan.successful = true;
      }
    }
  }

  /**
   * Execute price manipulation attack
   */
  private executePriceManipulation(borrowedAmount: number): void {
    if (!this.model.dao) return;

    // Attempt to manipulate prices via treasury pool
    const treasury = this.model.dao.treasury;
    const token = this.model.dao.tokenSymbol;

    // Large deposit/withdraw to move price
    treasury.deposit(token, borrowedAmount, this.model.currentStep);

    if (this.activeLoan) {
      this.activeLoan.successful = true;  // Price movement always "succeeds"
    }

    // Withdraw back
    treasury.withdraw(token, borrowedAmount, this.model.currentStep);

    if (this.model.eventBus) {
      this.model.eventBus.publish('flashloan_price_manipulation', {
        step: this.model.currentStep,
        loanId: this.activeLoan?.loanId,
        borrower: this.uniqueId,
        amount: borrowedAmount,
        token,
      });
    }
  }

  /**
   * Execute governance takeover attempt
   */
  private executeGovernanceTakeover(proposal: Proposal, borrowedAmount: number): void {
    // Vote on all open proposals
    if (!this.model.dao) return;

    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
    let votedCount = 0;

    for (const p of openProposals) {
      if (!this.votes.has(p.uniqueId)) {
        // Vote yes on all proposals to maximize control
        const weight = this.tokens / openProposals.length;
        p.addVote(this.uniqueId, true, weight);
        this.votes.set(p.uniqueId, { vote: true, weight });
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

  /**
   * Repay the flash loan
   * CRITICAL FIX: Return borrowed tokens to treasury
   */
  private repayLoan(originalTokens: number): void {
    if (!this.activeLoan) return;
    if (!this.model.dao) return;

    // CRITICAL FIX: Return borrowed tokens to treasury
    const token = this.model.dao.tokenSymbol;
    if (this.borrowedFromTreasury > 0) {
      this.model.dao.treasury.deposit(token, this.borrowedFromTreasury, this.model.currentStep);
    }

    // Restore original tokens (remove borrowed amount)
    this.tokens = originalTokens;
    this.borrowedFromTreasury = 0;

    // Pay the fee from our own tokens
    this.tokens -= this.activeLoan.fee;
    this.activeLoan.repaidStep = this.model.currentStep;

    // Track success
    // NOTE: With voting power snapshots, flash loan attacks will now mostly fail
    // because votes are counted against snapshot balances
    if (this.activeLoan.successful) {
      // Assume some profit from successful manipulation
      const profit = this.activeLoan.amount * 0.01 - this.activeLoan.fee;
      this.totalProfit += profit;
      this.tokens += Math.max(0, profit);

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

    // Store in history
    this.loanHistory.push(this.activeLoan);
    this.lastAttackStep = this.model.currentStep;
    this.activeLoan = null;
  }

  /**
   * Execute loan step (if multi-step loan, not typical for flash loans)
   */
  private executeLoanStep(): void {
    // Flash loans are same-step, so this shouldn't normally be called
    // But if we have a hanging loan, repay it
    if (this.activeLoan && !this.activeLoan.repaidStep) {
      this.repayLoan(this.tokens - this.activeLoan.amount);
    }
  }

  /**
   * Get attack statistics
   */
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

  /**
   * Get recent loan
   */
  getRecentLoan(): FlashLoan | null {
    return this.loanHistory[this.loanHistory.length - 1] || null;
  }

  /**
   * Serialize to plain object
   */
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
}

/**
 * Factory function to create aggressive flash loan attacker
 */
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

/**
 * Factory function to create conservative flash loan attacker
 */
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
