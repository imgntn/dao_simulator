// Bounty Hunter Agent - completes bounty proposals for rewards
// Upgraded with Q-learning to learn optimal bounty selection strategies

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import { random, randomChoice } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

// Work configuration
const MIN_WORK_REQUIREMENT = 1;
const MAX_WORK_REQUIREMENT = 5;
const WORK_PER_STEP = 1;

type BountyAction = 'claim_high_reward' | 'claim_quick' | 'claim_low_competition' | 'continue_work' | 'abandon' | 'hold';

interface BountyProgress {
  bountyId: string;
  workRequired: number;
  workDone: number;
  reward: number;
  startedAt: number;
}

export class BountyHunter extends DAOMember {
  static readonly ACTIONS: readonly BountyAction[] = [
    'claim_high_reward', 'claim_quick', 'claim_low_competition', 'continue_work', 'abandon', 'hold'
  ];

  // Learning infrastructure
  learning: LearningMixin;

  activeBounty: BountyProgress | null = null;
  completedBounties: string[] = [];
  workEfficiency: number;

  // Learning tracking
  lastAction: BountyAction | null = null;
  lastState: string | null = null;
  lastTokens: number;
  totalRewardsEarned: number = 0;
  bountyCompletionTimes: number[] = [];

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy?: string
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
    this.workEfficiency = 0.5 + random();
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
   * Get state representation for bounty decisions
   */
  private getBountyState(): string {
    if (!this.model.dao) return 'none|idle|low';

    const bounties = this.getAvailableBounties();

    // Bounty availability state
    const availabilityState = bounties.length === 0 ? 'none' :
                              bounties.length < 3 ? 'few' :
                              bounties.length < 7 ? 'normal' : 'many';

    // Current work state
    let workState = 'idle';
    if (this.activeBounty) {
      const progress = this.activeBounty.workDone / this.activeBounty.workRequired;
      workState = progress < 0.3 ? 'starting' :
                  progress < 0.7 ? 'midway' : 'finishing';
    }

    // Efficiency state based on completion history
    const avgCompletionTime = this.bountyCompletionTimes.length > 0
      ? this.bountyCompletionTimes.reduce((a, b) => a + b, 0) / this.bountyCompletionTimes.length
      : 5;
    const efficiencyState = avgCompletionTime < 3 ? 'fast' :
                            avgCompletionTime < 6 ? 'normal' : 'slow';

    return StateDiscretizer.combineState(availabilityState, workState, efficiencyState);
  }

  /**
   * Get available bounties
   */
  private getAvailableBounties(): Array<{ uniqueId: string; reward?: number }> {
    if (!this.model.dao) return [];

    return this.model.dao.proposals.filter((p) => {
      const bounty = p as {
        proposalType?: string;
        rewardLocked?: boolean;
        completed?: boolean;
        uniqueId: string;
      };
      return (
        bounty.proposalType === 'bounty' &&
        p.status === 'approved' &&
        bounty.rewardLocked &&
        !bounty.completed &&
        !this.completedBounties.includes(p.uniqueId)
      );
    }) as Array<{ uniqueId: string; reward?: number }>;
  }

  /**
   * Choose bounty action using Q-learning
   */
  private chooseBountyAction(): BountyAction {
    const state = this.getBountyState();

    if (!settings.learning_enabled) {
      return this.heuristicBountyAction();
    }

    return this.learning.selectAction(
      state,
      [...BountyHunter.ACTIONS]
    ) as BountyAction;
  }

  /**
   * Heuristic-based bounty action (fallback)
   */
  private heuristicBountyAction(): BountyAction {
    // If already working on a bounty
    if (this.activeBounty) {
      const progress = this.activeBounty.workDone / this.activeBounty.workRequired;
      // Only abandon if barely started and better options exist
      if (progress < 0.2 && this.getAvailableBounties().length > 3) {
        return 'abandon';
      }
      return 'continue_work';
    }

    const bounties = this.getAvailableBounties();
    if (bounties.length === 0) return 'hold';

    // Prefer high reward bounties if efficient
    if (this.workEfficiency > 0.8) {
      return 'claim_high_reward';
    }

    // Otherwise prefer quick bounties
    return 'claim_quick';
  }

  /**
   * Execute bounty action and return reward
   */
  private executeBountyAction(action: BountyAction): number {
    if (!this.model.dao) return 0;

    let reward = 0;

    switch (action) {
      case 'claim_high_reward': {
        if (this.activeBounty) return -0.1; // Already working
        const bounties = this.getAvailableBounties();
        if (bounties.length === 0) return -0.1;

        // Sort by reward descending
        bounties.sort((a, b) => (b.reward || 10) - (a.reward || 10));
        this.startBounty(bounties[0]);
        reward = 0.1;
        break;
      }
      case 'claim_quick': {
        if (this.activeBounty) return -0.1;
        const bounties = this.getAvailableBounties();
        if (bounties.length === 0) return -0.1;

        // Sort by reward ascending (quick = low reward = less work)
        bounties.sort((a, b) => (a.reward || 10) - (b.reward || 10));
        this.startBounty(bounties[0]);
        reward = 0.05;
        break;
      }
      case 'claim_low_competition': {
        if (this.activeBounty) return -0.1;
        const bounties = this.getAvailableBounties();
        if (bounties.length === 0) return -0.1;

        // Just pick a random one (simplified competition check)
        this.startBounty(randomChoice(bounties));
        reward = 0.05;
        break;
      }
      case 'continue_work': {
        if (!this.activeBounty) return -0.1;
        reward = this.continueWork();
        break;
      }
      case 'abandon': {
        if (!this.activeBounty) return 0;
        // Lose time invested
        const progress = this.activeBounty.workDone / this.activeBounty.workRequired;
        reward = -progress * 2; // Penalty proportional to progress
        this.activeBounty = null;
        break;
      }
      case 'hold':
        return 0;
    }

    return reward;
  }

  /**
   * Start working on a bounty
   */
  private startBounty(bounty: { uniqueId: string; reward?: number }): void {
    const reward = bounty.reward || 10;
    const baseWork = MIN_WORK_REQUIREMENT + random() * (MAX_WORK_REQUIREMENT - MIN_WORK_REQUIREMENT);
    const workRequired = Math.ceil(baseWork * Math.log10(reward + 1));

    this.activeBounty = {
      bountyId: bounty.uniqueId,
      workRequired: Math.max(MIN_WORK_REQUIREMENT, workRequired),
      workDone: 0,
      reward,
      startedAt: this.model.currentStep,
    };

    if (this.model.eventBus) {
      this.model.eventBus.publish('bounty_started', {
        step: this.model.currentStep,
        hunter: this.uniqueId,
        bountyId: bounty.uniqueId,
        workRequired: this.activeBounty.workRequired,
      });
    }

    this.markActive();
  }

  /**
   * Continue working on active bounty
   */
  private continueWork(): number {
    if (!this.activeBounty || !this.model.dao) return -0.1;

    const workDone = WORK_PER_STEP * this.workEfficiency;
    this.activeBounty.workDone += workDone;

    if (this.activeBounty.workDone >= this.activeBounty.workRequired) {
      return this.completeBounty();
    }

    this.markActive();
    return 0.1; // Small reward for making progress
  }

  /**
   * Complete the active bounty and claim reward
   */
  private completeBounty(): number {
    if (!this.activeBounty || !this.model.dao) return 0;

    const bounty = this.model.dao.proposals.find(
      p => p.uniqueId === this.activeBounty!.bountyId
    ) as { uniqueId: string; title: string; completed?: boolean; reward?: number } | undefined;

    if (!bounty) {
      this.activeBounty = null;
      return -0.5;
    }

    bounty.completed = true;
    this.completedBounties.push(bounty.uniqueId);

    const reward = this.model.dao.treasury.withdrawLocked(
      'DAO_TOKEN',
      bounty.reward || 0,
      this.model.currentStep
    );

    this.tokens += reward;
    this.totalRewardsEarned += reward;

    // Track completion time
    const completionTime = this.model.currentStep - this.activeBounty.startedAt;
    this.bountyCompletionTimes.push(completionTime);
    if (this.bountyCompletionTimes.length > 20) {
      this.bountyCompletionTimes.shift();
    }

    if (this.model.eventBus) {
      this.model.eventBus.publish('bounty_completed', {
        step: this.model.currentStep,
        proposal: bounty.title,
        hunter: this.uniqueId,
        reward,
        workDone: this.activeBounty.workDone,
      });
    }

    const earnedReward = reward / 10; // Scale to reasonable Q-learning reward
    this.activeBounty = null;
    this.markActive();

    return earnedReward;
  }

  /**
   * Update Q-values based on performance
   */
  private updateLearning(): void {
    if (!settings.learning_enabled || !this.lastAction || !this.lastState) return;

    // Calculate reward from token change
    const tokenChange = this.tokens - this.lastTokens;

    // Normalize reward
    let reward = tokenChange / 10;
    reward = Math.max(-10, Math.min(10, reward));

    const currentState = this.getBountyState();

    this.learning.update(
      this.lastState,
      this.lastAction,
      reward,
      currentState,
      [...BountyHunter.ACTIONS]
    );
  }

  step(): void {
    // Update learning from previous step
    this.updateLearning();

    // Track state before action
    this.lastTokens = this.tokens;
    this.lastState = this.getBountyState();

    // Choose and execute action
    const action = this.chooseBountyAction();
    this.executeBountyAction(action);
    this.lastAction = action;

    // Participate in governance
    this.voteOnRandomProposal();

    if (random() < (this.model.dao?.commentProbability || 0.1)) {
      this.leaveCommentOnRandomProposal();
    }
  }

  /**
   * Legacy method for compatibility
   */
  workOnBounties(): void {
    if (!this.model.dao) return;

    if (this.activeBounty) {
      this.continueWork();
      return;
    }

    const bounties = this.getAvailableBounties();
    if (bounties.length === 0) return;

    this.startBounty(randomChoice(bounties));
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
    bountiesCompleted: number;
    totalRewardsEarned: number;
    avgCompletionTime: number;
  } {
    const avgTime = this.bountyCompletionTimes.length > 0
      ? this.bountyCompletionTimes.reduce((a, b) => a + b, 0) / this.bountyCompletionTimes.length
      : 0;

    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      bountiesCompleted: this.completedBounties.length,
      totalRewardsEarned: this.totalRewardsEarned,
      avgCompletionTime: avgTime,
    };
  }
}
