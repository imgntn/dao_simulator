/**
 * Node Operator Agent
 *
 * Represents validator operators in Lido's node operator set.
 * Subject to DAO oversight, manages validators, and earns fees.
 */

import { DAOMember } from './base';
import type { Proposal } from '../data-structures/proposal';
import type { DAOModel } from '../engine/model';
import { random, randomInt } from '../utils/random';

export interface ValidatorStats {
  active: number;
  pending: number;
  exited: number;
  slashed: number;
}

export interface OperatorPerformance {
  uptime: number;          // 0-1
  attestationRate: number; // 0-1
  proposalRate: number;    // 0-1
  slashings: number;
  lastUpdatedStep: number;
}

export class NodeOperator extends DAOMember {
  // Operator properties
  operatorName: string;
  maxValidators: number;
  currentValidators: ValidatorStats;

  // Performance metrics
  performance: OperatorPerformance;

  // Economic
  operatorFeePercent: number;  // Fee charged (typically 5-10%)
  totalFeesEarned: number = 0;
  stakeBond: number = 0;  // Bond posted for slashing protection

  // Behavioral traits
  reliability: number;     // How reliable the operator is
  expansionWillingness: number;  // Willingness to take on more validators

  // Status
  isApproved: boolean = true;
  isCapped: boolean = false;  // Reached max validators

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number,
    reputation: number,
    location: string,
    operatorName?: string,
    daoId?: string
  ) {
    super(uniqueId, model, tokens, reputation, location, 'majority', daoId);

    this.operatorName = operatorName || `Operator_${uniqueId}`;

    // Initialize validator counts
    const initialValidators = randomInt(10, 100);
    this.maxValidators = initialValidators + randomInt(50, 200);
    this.currentValidators = {
      active: initialValidators,
      pending: randomInt(0, 5),
      exited: 0,
      slashed: 0,
    };

    // Performance
    this.performance = {
      uptime: 0.95 + random() * 0.05,  // 95-100%
      attestationRate: 0.95 + random() * 0.05,
      proposalRate: 0.9 + random() * 0.1,
      slashings: 0,
      lastUpdatedStep: model.currentStep,
    };

    // Economics
    this.operatorFeePercent = 5 + random() * 5;  // 5-10%

    // Behavioral traits
    this.reliability = 0.8 + random() * 0.2;  // 0.8-1.0
    this.expansionWillingness = 0.3 + random() * 0.5;  // 0.3-0.8
  }

  step(): void {
    super.step();

    if (!this.model.dao) return;

    // Update performance metrics
    this.updatePerformance();

    // Process validator operations
    if (random() < 0.1) {
      this.manageValidators();
    }

    // Vote on proposals affecting operators
    if (random() < 0.15) {
      this.voteOnOperatorProposals();
    }

    // Earn fees
    this.earnFees();
  }

  /**
   * Update performance metrics
   */
  private updatePerformance(): void {
    // Small random fluctuations in performance
    this.performance.uptime = Math.min(1, Math.max(0.9,
      this.performance.uptime + (random() - 0.5) * 0.01));
    this.performance.attestationRate = Math.min(1, Math.max(0.9,
      this.performance.attestationRate + (random() - 0.5) * 0.01));
    this.performance.lastUpdatedStep = this.model.currentStep;

    // Rare slashing events
    if (random() < 0.0001 * (1 - this.reliability)) {
      this.handleSlashing();
    }
  }

  /**
   * Manage validator set
   */
  private manageValidators(): void {
    // Activate pending validators
    if (this.currentValidators.pending > 0 && random() < 0.3) {
      const toActivate = Math.min(this.currentValidators.pending, randomInt(1, 3));
      this.currentValidators.pending -= toActivate;
      this.currentValidators.active += toActivate;
    }

    // Request more validators if willing and not capped
    if (!this.isCapped &&
        this.currentValidators.active < this.maxValidators &&
        random() < this.expansionWillingness * 0.1) {
      const toAdd = Math.min(
        randomInt(1, 5),
        this.maxValidators - this.currentValidators.active - this.currentValidators.pending
      );
      if (toAdd > 0) {
        this.currentValidators.pending += toAdd;

        if (this.model.eventBus) {
          this.model.eventBus.publish('node_operator_expansion', {
            step: this.model.currentStep,
            operatorId: this.uniqueId,
            operatorName: this.operatorName,
            validatorsRequested: toAdd,
            currentActive: this.currentValidators.active,
            maxValidators: this.maxValidators,
          });
        }
      }
    }

    // Check if capped
    this.isCapped = (this.currentValidators.active + this.currentValidators.pending) >= this.maxValidators;
  }

  /**
   * Handle a slashing event
   */
  private handleSlashing(): void {
    this.currentValidators.slashed++;
    this.currentValidators.active = Math.max(0, this.currentValidators.active - 1);
    this.performance.slashings++;

    // Reputation hit
    this.reputation = Math.max(0, this.reputation - 10);

    if (this.model.eventBus) {
      this.model.eventBus.publish('node_operator_slashed', {
        step: this.model.currentStep,
        operatorId: this.uniqueId,
        operatorName: this.operatorName,
        totalSlashings: this.performance.slashings,
      });
    }
  }

  /**
   * Vote on proposals affecting node operators
   */
  private voteOnOperatorProposals(): void {
    if (!this.model.dao) return;

    const proposals = this.model.dao.proposals.filter(
      p => p.status === 'open' &&
           !this.votes.has(p.uniqueId) &&
           this.isOperatorRelated(p)
    );

    for (const proposal of proposals) {
      const support = this.assessOperatorProposal(proposal);
      proposal.addVote(this.uniqueId, support, 1);
      this.votes.set(proposal.uniqueId, { vote: support, weight: 1 });
      this.markActive();
      break;  // One vote per step
    }
  }

  /**
   * Check if proposal affects operators
   */
  private isOperatorRelated(proposal: Proposal): boolean {
    const titleLower = proposal.title.toLowerCase();
    const keywords = [
      'node', 'operator', 'validator', 'stake', 'limit',
      'fee', 'slashing', 'exit', 'onboard'
    ];
    return keywords.some(kw => titleLower.includes(kw));
  }

  /**
   * Assess proposal impact on operators
   */
  private assessOperatorProposal(proposal: Proposal): boolean {
    const titleLower = proposal.title.toLowerCase();

    // Support proposals that benefit operators
    if (titleLower.includes('increase') && titleLower.includes('limit')) {
      return true;
    }

    if (titleLower.includes('onboard') || titleLower.includes('add')) {
      // Existing operators may be neutral or against new competition
      return random() < 0.5;
    }

    if (titleLower.includes('slash') || titleLower.includes('penalty')) {
      // Generally against increased penalties
      return random() < 0.3;
    }

    // Default to supporting governance
    return random() < 0.6;
  }

  /**
   * Earn fees based on active validators
   */
  private earnFees(): void {
    // Simplified fee calculation
    const baseReward = this.currentValidators.active * 0.01;  // Per step
    const fee = baseReward * (this.operatorFeePercent / 100);
    this.totalFeesEarned += fee;
    this.tokens += fee;
  }

  /**
   * Request to increase max validators (requires DAO approval)
   */
  requestLimitIncrease(amount: number): boolean {
    if (!this.model.dao) return false;

    // This would typically create a proposal
    if (this.model.eventBus) {
      this.model.eventBus.publish('node_operator_limit_request', {
        step: this.model.currentStep,
        operatorId: this.uniqueId,
        operatorName: this.operatorName,
        currentMax: this.maxValidators,
        requestedIncrease: amount,
      });
    }

    return true;
  }

  /**
   * Exit validators voluntarily
   */
  exitValidators(count: number): boolean {
    if (count > this.currentValidators.active) {
      return false;
    }

    this.currentValidators.active -= count;
    this.currentValidators.exited += count;
    this.isCapped = false;

    if (this.model.eventBus) {
      this.model.eventBus.publish('node_operator_exit', {
        step: this.model.currentStep,
        operatorId: this.uniqueId,
        operatorName: this.operatorName,
        validatorsExited: count,
        remainingActive: this.currentValidators.active,
      });
    }

    return true;
  }

  /**
   * Get overall performance score
   */
  getPerformanceScore(): number {
    const uptimeWeight = 0.4;
    const attestationWeight = 0.4;
    const proposalWeight = 0.2;

    return (
      this.performance.uptime * uptimeWeight +
      this.performance.attestationRate * attestationWeight +
      this.performance.proposalRate * proposalWeight
    );
  }

  /**
   * Get operator statistics
   */
  getOperatorStats(): {
    operatorName: string;
    validators: ValidatorStats;
    maxValidators: number;
    performance: OperatorPerformance;
    performanceScore: number;
    totalFeesEarned: number;
    isApproved: boolean;
    isCapped: boolean;
  } {
    return {
      operatorName: this.operatorName,
      validators: { ...this.currentValidators },
      maxValidators: this.maxValidators,
      performance: { ...this.performance },
      performanceScore: this.getPerformanceScore(),
      totalFeesEarned: this.totalFeesEarned,
      isApproved: this.isApproved,
      isCapped: this.isCapped,
    };
  }
}
