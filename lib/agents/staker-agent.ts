/**
 * Staker Agent
 *
 * Represents stakers in DAOs with dual governance like Lido.
 * Can signal veto on proposals, participate in rage quit, and influence timelock duration.
 * Protects staker interests against potentially harmful governance decisions.
 */

import { DAOMember } from './base';
import type { Proposal } from '../data-structures/proposal';
import type { MultiStageProposal } from '../data-structures/multi-stage-proposal';
import type { DAOModel } from '../engine/model';
import { random, randomChoice } from '../utils/random';

export interface VetoSignal {
  proposalId: string;
  amount: number;
  timestamp: number;
  reason: string;
}

export class StakerAgent extends DAOMember {
  // Staker-specific properties
  stakeType: 'liquid' | 'locked' = 'liquid';
  stakeDurationSteps: number = 0;  // For locked stakes
  yieldExpectation: number;  // Expected APY (0-0.2)

  // Veto behavior
  vetoSensitivity: number;  // How sensitive to harmful proposals (0-1)
  rageQuitThreshold: number;  // How much harm triggers rage quit (0-1)
  protocolLoyalty: number;  // Loyalty to the protocol (0-1)

  // Tracking
  vetoSignals: VetoSignal[] = [];
  totalVetoSignaled: number = 0;
  hasRageQuit: boolean = false;
  rageQuitAmount: number = 0;

  // Economic tracking
  stakedSince: number;
  rewardsEarned: number = 0;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number,
    reputation: number,
    location: string,
    stakedTokens: number = 0,
    daoId?: string
  ) {
    super(uniqueId, model, tokens, reputation, location, 'majority', daoId);

    // Set initial staked tokens — deduct from available tokens
    const stakeAmount = Math.min(stakedTokens, this.tokens);
    this.stakedTokens = stakeAmount;
    this.tokens -= stakeAmount;
    this.stakedSince = model.currentStep;

    // Behavioral traits
    this.yieldExpectation = 0.03 + random() * 0.07;  // 3-10% expected APY
    this.vetoSensitivity = 0.3 + random() * 0.5;  // 0.3-0.8
    this.rageQuitThreshold = 0.5 + random() * 0.4;  // 0.5-0.9 (high bar for rage quit)
    this.protocolLoyalty = 0.4 + random() * 0.5;  // 0.4-0.9
  }

  step(): void {
    super.step();

    if (!this.model.dao) return;

    // Stakers primarily manage their stake
    if (random() < 0.1) {
      this.manageStake();
    }

    // Monitor proposals for veto opportunities
    if (random() < this.vetoSensitivity * 0.15) {
      this.monitorForVeto();
    }

    // Occasionally vote on governance (use configurable activity)
    if (random() < (this.model.dao?.votingActivity ?? 0.05)) {
      this.voteOnRandomProposal();
    }
  }

  /**
   * Manage staking position
   */
  private manageStake(): void {
    // Stakers optimize their position based on market conditions
    const stakingRate = this.model.dao?.stakingInterestRate || 0;

    if (stakingRate > this.yieldExpectation && this.tokens > 0) {
      // Good yields - stake more
      const toStake = this.tokens * (0.1 + random() * 0.2);
      this.stakeMoreTokens(toStake);
    } else if (stakingRate < this.yieldExpectation * 0.5 && this.stakedTokens > 0) {
      // Poor yields - consider unstaking
      if (random() < 0.3) {
        const toUnstake = this.stakedTokens * (0.1 + random() * 0.1);
        this.unstakeTokens(toUnstake);
      }
    }
  }

  /**
   * Stake additional tokens
   */
  stakeMoreTokens(amount: number): boolean {
    if (amount <= 0 || amount > this.tokens) return false;

    this.stakeTokens(amount);
    return true;
  }

  /**
   * Monitor proposals for veto opportunities
   */
  private monitorForVeto(): void {
    if (!this.model.dao) return;

    for (const proposal of this.model.dao.proposals) {
      const multiStage = proposal as unknown as MultiStageProposal;

      // Only veto in appropriate stages
      if (multiStage.currentStage !== 'veto_window' &&
          multiStage.currentStage !== 'timelock') {
        continue;
      }

      // Already signaled?
      if (this.vetoSignals.find(v => v.proposalId === proposal.uniqueId)) {
        continue;
      }

      // Evaluate for veto
      const harmLevel = this.assessProposalHarm(proposal);
      if (harmLevel > this.vetoSensitivity) {
        this.signalVeto(proposal, harmLevel);
      }
    }
  }

  /**
   * Assess how harmful a proposal might be to stakers (0-1)
   */
  private assessProposalHarm(proposal: Proposal): number {
    let harmLevel = 0;
    const titleLower = proposal.title.toLowerCase();

    // Harmful keywords for stakers
    const harmfulKeywords = [
      'slash', 'reduce', 'cut', 'withdraw', 'emergency',
      'pause', 'freeze', 'confiscate', 'redistribute'
    ];

    for (const keyword of harmfulKeywords) {
      if (titleLower.includes(keyword)) {
        harmLevel += 0.2;
      }
    }

    // Treasury draining
    if (proposal.fundingGoal > 0 && this.model.dao) {
      const treasuryBalance = this.model.dao.treasury.getTokenBalance(this.model.dao.tokenSymbol);
      const treasuryRatio = proposal.fundingGoal / Math.max(treasuryBalance, 1);
      if (treasuryRatio > 0.3) {
        harmLevel += 0.3;
      }
    }

    // Factor in protocol loyalty
    harmLevel = harmLevel * (1 - this.protocolLoyalty * 0.3);

    // Random assessment variance
    harmLevel += (random() - 0.5) * 0.2;

    return Math.max(0, Math.min(1, harmLevel));
  }

  /**
   * Signal veto on a proposal
   */
  signalVeto(proposal: Proposal, harmLevel: number): void {
    if (this.stakedTokens <= 0) return;

    // Signal proportional to perceived harm
    const signalPercent = harmLevel * (0.3 + random() * 0.3);
    const signalAmount = this.stakedTokens * signalPercent;

    const multiStage = proposal as unknown as MultiStageProposal;

    // Record signal on proposal
    if (multiStage.signalVeto) {
      multiStage.signalVeto(this.uniqueId, signalAmount);
    }

    // Track locally
    const signal: VetoSignal = {
      proposalId: proposal.uniqueId,
      amount: signalAmount,
      timestamp: this.model.currentStep,
      reason: `Harm assessment: ${(harmLevel * 100).toFixed(0)}%`,
    };
    this.vetoSignals.push(signal);
    this.totalVetoSignaled += signalAmount;

    // Emit event
    if (this.model.eventBus) {
      this.model.eventBus.publish('staker_veto_signal', {
        step: this.model.currentStep,
        stakerId: this.uniqueId,
        proposalId: proposal.uniqueId,
        signalAmount,
        harmLevel,
      });
    }
  }

  /**
   * Execute rage quit (withdraw all staked tokens in protest)
   */
  rageQuit(proposal: Proposal, reason: string): boolean {
    if (this.hasRageQuit || this.stakedTokens <= 0) return false;

    const harmLevel = this.assessProposalHarm(proposal);
    if (harmLevel < this.rageQuitThreshold) {
      return false;  // Not harmful enough
    }

    // Withdraw all staked tokens
    const withdrawAmount = this.stakedTokens;
    this.unstakeTokens(withdrawAmount);

    this.hasRageQuit = true;
    this.rageQuitAmount = withdrawAmount;

    // Emit rage quit event
    if (this.model.eventBus) {
      this.model.eventBus.publish('staker_rage_quit', {
        step: this.model.currentStep,
        stakerId: this.uniqueId,
        proposalId: proposal.uniqueId,
        amount: withdrawAmount,
        reason,
      });
    }

    return true;
  }

  /**
   * Withdraw veto signal (if proposal is modified)
   */
  withdrawVetoSignal(proposalId: string): boolean {
    const signalIndex = this.vetoSignals.findIndex(v => v.proposalId === proposalId);
    if (signalIndex === -1) return false;

    const signal = this.vetoSignals[signalIndex];
    this.totalVetoSignaled -= signal.amount;
    this.vetoSignals.splice(signalIndex, 1);

    // Emit withdrawal event
    if (this.model.eventBus) {
      this.model.eventBus.publish('staker_veto_withdrawn', {
        step: this.model.currentStep,
        stakerId: this.uniqueId,
        proposalId,
        amount: signal.amount,
      });
    }

    return true;
  }

  /**
   * Calculate voting power (staked tokens)
   */
  getVotingPower(): number {
    return this.stakedTokens;
  }

  /**
   * Check if staker is currently signaling veto on any proposal
   */
  isSignalingVeto(): boolean {
    if (!this.model.dao) return false;

    return this.vetoSignals.some(signal => {
      const proposal = this.model.dao?.proposals.find(p => p.uniqueId === signal.proposalId);
      if (!proposal) return false;

      const multiStage = proposal as unknown as MultiStageProposal;
      return multiStage.currentStage === 'veto_window' || multiStage.currentStage === 'timelock';
    });
  }

  /**
   * Calculate total stake duration
   */
  getStakeDuration(): number {
    return this.model.currentStep - this.stakedSince;
  }

  /**
   * Get staker statistics
   */
  getStakerStats(): {
    stakeType: string;
    stakedAmount: number;
    stakeDuration: number;
    vetoSignals: number;
    totalVetoSignaled: number;
    hasRageQuit: boolean;
    rageQuitAmount: number;
    vetoSensitivity: number;
    protocolLoyalty: number;
  } {
    return {
      stakeType: this.stakeType,
      stakedAmount: this.stakedTokens,
      stakeDuration: this.getStakeDuration(),
      vetoSignals: this.vetoSignals.length,
      totalVetoSignaled: this.totalVetoSignaled,
      hasRageQuit: this.hasRageQuit,
      rageQuitAmount: this.rageQuitAmount,
      vetoSensitivity: this.vetoSensitivity,
      protocolLoyalty: this.protocolLoyalty,
    };
  }
}
