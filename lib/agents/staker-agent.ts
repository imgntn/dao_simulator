/**
 * Staker Agent - Upgraded with Q-learning
 *
 * Represents stakers in DAOs with dual governance like Lido.
 * Can signal veto on proposals, participate in rage quit, and influence timelock duration.
 * Uses Q-learning to optimize staking and veto decisions.
 */

import { DAOMember } from './base';
import type { Proposal } from '../data-structures/proposal';
import type { MultiStageProposal } from '../data-structures/multi-stage-proposal';
import type { DAOModel } from '../engine/model';
import { random, randomChoice } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

type StakingAction = 'stake_more' | 'unstake_some' | 'restake_rewards' | 'claim_rewards' | 'signal_veto' | 'hold';

export interface VetoSignal {
  proposalId: string;
  amount: number;
  timestamp: number;
  reason: string;
}

export class StakerAgent extends DAOMember {
  static readonly ACTIONS: readonly StakingAction[] = [
    'stake_more', 'unstake_some', 'restake_rewards', 'claim_rewards', 'signal_veto', 'hold'
  ];

  // Learning infrastructure
  learning: LearningMixin;

  // Staker-specific properties
  stakeType: 'liquid' | 'locked' = 'liquid';
  stakeDurationSteps: number = 0;
  yieldExpectation: number;

  // Veto behavior
  vetoSensitivity: number;
  rageQuitThreshold: number;
  protocolLoyalty: number;

  // Tracking
  vetoSignals: VetoSignal[] = [];
  totalVetoSignaled: number = 0;
  hasRageQuit: boolean = false;
  rageQuitAmount: number = 0;

  // Economic tracking
  stakedSince: number;
  rewardsEarned: number = 0;
  pendingRewards: number = 0;

  // Learning tracking
  lastAction: StakingAction | null = null;
  lastState: string | null = null;
  lastStakedTokens: number;

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

    // Set initial staked tokens
    const stakeAmount = Math.min(stakedTokens, this.tokens);
    this.stakedTokens = stakeAmount;
    this.tokens -= stakeAmount;
    this.stakedSince = model.currentStep;
    this.lastStakedTokens = this.stakedTokens;

    // Behavioral traits
    this.yieldExpectation = 0.03 + random() * 0.07;
    this.vetoSensitivity = 0.3 + random() * 0.5;
    this.rageQuitThreshold = 0.5 + random() * 0.4;
    this.protocolLoyalty = 0.4 + random() * 0.5;

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
   * Get state representation for staking decisions
   */
  private getStakingState(): string {
    if (!this.model.dao) return 'adequate|low|normal';

    const stakingRate = this.model.dao.stakingInterestRate || 0;
    const rateState = stakingRate < this.yieldExpectation * 0.5 ? 'poor' :
                      stakingRate < this.yieldExpectation ? 'low' :
                      stakingRate < this.yieldExpectation * 1.5 ? 'good' : 'excellent';

    // Calculate stake ratio
    const totalAssets = this.tokens + this.stakedTokens;
    const stakeRatio = totalAssets > 0 ? this.stakedTokens / totalAssets : 0;
    const stakeState = stakeRatio < 0.2 ? 'minimal' :
                       stakeRatio < 0.5 ? 'partial' :
                       stakeRatio < 0.8 ? 'majority' : 'full';

    // Check for harmful proposals
    const harmfulProposals = this.model.dao.proposals.filter(p => {
      if (p.status !== 'open') return false;
      const harm = this.assessProposalHarm(p);
      return harm > 0.5;
    });
    const threatLevel = harmfulProposals.length > 0 ? 'threat' : 'safe';

    return StateDiscretizer.combineState(rateState, stakeState, threatLevel);
  }

  /**
   * Choose staking action using Q-learning
   */
  private chooseStakingAction(): StakingAction {
    const state = this.getStakingState();

    if (!settings.learning_enabled) {
      return this.heuristicStakingAction();
    }

    return this.learning.selectAction(
      state,
      [...StakerAgent.ACTIONS]
    ) as StakingAction;
  }

  /**
   * Heuristic-based staking action (fallback)
   */
  private heuristicStakingAction(): StakingAction {
    if (!this.model.dao) return 'hold';

    const stakingRate = this.model.dao.stakingInterestRate || 0;

    // Check for threats first
    const hasThreats = this.model.dao.proposals.some(p => {
      if (p.status !== 'open') return false;
      const multiStage = p as unknown as MultiStageProposal;
      if (multiStage.currentStage !== 'veto_window' && multiStage.currentStage !== 'timelock') {
        return false;
      }
      return this.assessProposalHarm(p) > this.vetoSensitivity;
    });

    if (hasThreats && this.stakedTokens > 0) {
      return 'signal_veto';
    }

    // Check pending rewards
    if (this.pendingRewards > this.tokens * 0.1) {
      return random() < 0.5 ? 'restake_rewards' : 'claim_rewards';
    }

    // Yield-based decisions
    if (stakingRate > this.yieldExpectation && this.tokens > 0) {
      return 'stake_more';
    } else if (stakingRate < this.yieldExpectation * 0.5 && this.stakedTokens > 0) {
      return 'unstake_some';
    }

    return 'hold';
  }

  /**
   * Execute staking action and return reward
   */
  private executeStakingAction(action: StakingAction): number {
    let reward = 0;

    switch (action) {
      case 'stake_more':
        if (this.tokens > 0) {
          const toStake = this.tokens * (0.1 + random() * 0.2);
          if (this.stakeMoreTokens(toStake)) {
            reward = 0.5;
          }
        }
        break;

      case 'unstake_some':
        if (this.stakedTokens > 0) {
          const toUnstake = this.stakedTokens * (0.1 + random() * 0.1);
          this.unstakeTokens(toUnstake);
          reward = 0.1;
        }
        break;

      case 'restake_rewards':
        if (this.pendingRewards > 0) {
          const restakeAmount = this.pendingRewards;
          this.pendingRewards = 0;
          this.stakeTokens(restakeAmount);
          reward = 0.3 + restakeAmount * 0.01;
        }
        break;

      case 'claim_rewards':
        if (this.pendingRewards > 0) {
          this.tokens += this.pendingRewards;
          this.rewardsEarned += this.pendingRewards;
          reward = 0.2 + this.pendingRewards * 0.01;
          this.pendingRewards = 0;
        }
        break;

      case 'signal_veto':
        reward = this.executeVetoAction();
        break;

      case 'hold':
        // Passive reward from staking
        const passiveReward = this.stakedTokens * (this.model.dao?.stakingInterestRate || 0) * 0.01;
        this.pendingRewards += passiveReward;
        reward = passiveReward * 0.1;
        break;
    }

    return reward;
  }

  /**
   * Execute veto signaling action
   */
  private executeVetoAction(): number {
    if (!this.model.dao) return 0;

    let reward = 0;

    for (const proposal of this.model.dao.proposals) {
      const multiStage = proposal as unknown as MultiStageProposal;

      if (multiStage.currentStage !== 'veto_window' && multiStage.currentStage !== 'timelock') {
        continue;
      }

      if (this.vetoSignals.find(v => v.proposalId === proposal.uniqueId)) {
        continue;
      }

      const harmLevel = this.assessProposalHarm(proposal);
      if (harmLevel > this.vetoSensitivity) {
        this.signalVeto(proposal, harmLevel);
        reward += 5 * harmLevel; // More reward for catching more harmful proposals
      }
    }

    return reward;
  }

  /**
   * Update Q-values based on staking performance
   */
  private updateLearning(): void {
    if (!settings.learning_enabled || !this.lastAction || !this.lastState) return;

    // Calculate reward from staking changes
    const stakeDelta = this.stakedTokens - this.lastStakedTokens;
    const stakingRate = this.model.dao?.stakingInterestRate || 0;

    // Reward for growing stake in good conditions
    let reward = 0;
    if (stakeDelta > 0 && stakingRate > this.yieldExpectation) {
      reward = 0.5 * (stakeDelta / Math.max(100, this.lastStakedTokens));
    } else if (stakeDelta < 0 && stakingRate < this.yieldExpectation * 0.5) {
      reward = 0.3; // Good decision to unstake in poor conditions
    }

    // Reward for accumulated rewards
    reward += this.pendingRewards * 0.01;

    // Penalty for being exposed during threats
    if (this.isSignalingVeto()) {
      reward -= 0.2; // Cost of veto activity
    }

    reward = Math.max(-10, Math.min(10, reward));

    const currentState = this.getStakingState();

    this.learning.update(
      this.lastState,
      this.lastAction,
      reward,
      currentState,
      [...StakerAgent.ACTIONS]
    );
  }

  step(): void {
    super.step();

    if (!this.model.dao) return;

    // Update learning from previous step
    this.updateLearning();

    // Track state before action
    this.lastStakedTokens = this.stakedTokens;
    this.lastState = this.getStakingState();

    // Choose and execute action
    const action = this.chooseStakingAction();
    this.executeStakingAction(action);
    this.lastAction = action;

    // Monitor for veto opportunities (always, even if action wasn't veto)
    if (random() < this.vetoSensitivity * 0.15) {
      this.monitorForVeto();
    }

    // Occasionally vote on governance
    if (random() < (this.model.dao?.votingActivity ?? 0.05)) {
      this.voteOnRandomProposal();
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

      if (multiStage.currentStage !== 'veto_window' && multiStage.currentStage !== 'timelock') {
        continue;
      }

      if (this.vetoSignals.find(v => v.proposalId === proposal.uniqueId)) {
        continue;
      }

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

    const harmfulKeywords = [
      'slash', 'reduce', 'cut', 'withdraw', 'emergency',
      'pause', 'freeze', 'confiscate', 'redistribute'
    ];

    for (const keyword of harmfulKeywords) {
      if (titleLower.includes(keyword)) {
        harmLevel += 0.2;
      }
    }

    if (proposal.fundingGoal > 0 && this.model.dao) {
      const treasuryBalance = this.model.dao.treasury.getTokenBalance(this.model.dao.tokenSymbol);
      const treasuryRatio = proposal.fundingGoal / Math.max(treasuryBalance, 1);
      if (treasuryRatio > 0.3) {
        harmLevel += 0.3;
      }
    }

    harmLevel = harmLevel * (1 - this.protocolLoyalty * 0.3);
    harmLevel += (random() - 0.5) * 0.2;

    return Math.max(0, Math.min(1, harmLevel));
  }

  /**
   * Signal veto on a proposal
   */
  signalVeto(proposal: Proposal, harmLevel: number): void {
    if (this.stakedTokens <= 0) return;

    const signalPercent = harmLevel * (0.3 + random() * 0.3);
    const signalAmount = this.stakedTokens * signalPercent;

    const multiStage = proposal as unknown as MultiStageProposal;

    if (multiStage.signalVeto) {
      multiStage.signalVeto(this.uniqueId, signalAmount);
    }

    const signal: VetoSignal = {
      proposalId: proposal.uniqueId,
      amount: signalAmount,
      timestamp: this.model.currentStep,
      reason: `Harm assessment: ${(harmLevel * 100).toFixed(0)}%`,
    };
    this.vetoSignals.push(signal);
    this.totalVetoSignaled += signalAmount;

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
   * Execute rage quit
   */
  rageQuit(proposal: Proposal, reason: string): boolean {
    if (this.hasRageQuit || this.stakedTokens <= 0) return false;

    const harmLevel = this.assessProposalHarm(proposal);
    if (harmLevel < this.rageQuitThreshold) {
      return false;
    }

    const withdrawAmount = this.stakedTokens;
    this.unstakeTokens(withdrawAmount);

    this.hasRageQuit = true;
    this.rageQuitAmount = withdrawAmount;

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
   * Withdraw veto signal
   */
  withdrawVetoSignal(proposalId: string): boolean {
    const signalIndex = this.vetoSignals.findIndex(v => v.proposalId === proposalId);
    if (signalIndex === -1) return false;

    const signal = this.vetoSignals[signalIndex];
    this.totalVetoSignaled -= signal.amount;
    this.vetoSignals.splice(signalIndex, 1);

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

  getVotingPower(): number {
    return this.stakedTokens;
  }

  isSignalingVeto(): boolean {
    if (!this.model.dao) return false;

    return this.vetoSignals.some(signal => {
      const proposal = this.model.dao?.proposals.find(p => p.uniqueId === signal.proposalId);
      if (!proposal) return false;

      const multiStage = proposal as unknown as MultiStageProposal;
      return multiStage.currentStage === 'veto_window' || multiStage.currentStage === 'timelock';
    });
  }

  getStakeDuration(): number {
    return this.model.currentStep - this.stakedSince;
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
   * Get staker and learning statistics
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
    qTableSize: number;
    explorationRate: number;
    totalReward: number;
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
      qTableSize: this.learning.getQTableSize(),
      explorationRate: this.learning.getExplorationRate(),
      totalReward: this.learning.getTotalReward(),
    };
  }
}
