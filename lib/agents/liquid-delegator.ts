// Liquid Delegator Agent - delegates voting power to a representative
// Upgraded with Q-learning to optimize representative selection
//
// This implements LIQUID DEMOCRACY: members can delegate their vote to a
// representative who votes on their behalf. This is different from TOKEN
// DELEGATION in the base class:
//
// - LiquidDelegator: "Alice votes for me" (representative field)
//   * No tokens move
//   * Vote authority transfers
//   * Can be changed at any time (liquid)
//
// - Token Delegation: "Alice controls my tokens" (delegations Map)
//   * Tokens are locked/transferred
//   * Voting power increases for delegate
//   * Requires explicit undelegation to recover

import { Delegator } from './delegator';
import type { DAOModel } from '../engine/model';
import type { Proposal } from '../data-structures/proposal';
import { DAOMember } from './base';
import { random, randomChoice } from '../utils/random';
import { DelegationResolver } from '../delegation/delegation-resolver';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

type LiquidAction = 'delegate_high_rep' | 'delegate_active' | 'delegate_aligned' | 'switch_rep' | 'self_vote' | 'hold';

export class LiquidDelegator extends Delegator {
  static readonly LIQUID_ACTIONS: readonly LiquidAction[] = [
    'delegate_high_rep', 'delegate_active', 'delegate_aligned', 'switch_rep', 'self_vote', 'hold'
  ];

  // Learning infrastructure (separate from parent's learning)
  liquidLearning: LearningMixin;

  // Delegation tracking
  delegationHistory: Array<{ step: number; representative: string }> = [];
  lastDelegationStep: number = -Infinity;
  representativeVoteHistory: Map<string, { correct: number; total: number }> = new Map();

  // Learning tracking
  lastLiquidAction: LiquidAction | null = null;
  lastLiquidState: string | null = null;
  lastRepReputation: number = 0;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy?: string,
    delegationBudget: number = 100
  ) {
    super(
      uniqueId,
      model,
      tokens,
      reputation,
      location,
      votingStrategy,
      delegationBudget
    );

    // Initialize liquid delegation learning (separate from parent's delegation learning)
    const config: Partial<LearningConfig> = {
      learningRate: settings.learning_global_learning_rate,
      discountFactor: settings.learning_discount_factor,
      explorationRate: settings.learning_exploration_rate,
      explorationDecay: settings.learning_exploration_decay,
      minExploration: settings.learning_min_exploration,
      qBounds: [-50, 50],
    };

    this.liquidLearning = new LearningMixin(config);
  }

  /**
   * Get state representation for liquid delegation decisions
   */
  private getLiquidState(): string {
    if (!this.model.dao) return 'none|low|low';

    // Representative state
    let repState = 'none';
    if (this.representative) {
      const avgRep = this.model.dao.members.reduce((sum, m) => sum + m.reputation, 0) /
                     Math.max(1, this.model.dao.members.length);
      repState = this.representative.reputation > avgRep * 1.5 ? 'excellent' :
                 this.representative.reputation > avgRep ? 'good' :
                 this.representative.reputation > avgRep * 0.5 ? 'average' : 'poor';
    }

    // Vote activity state
    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
    const activityState = openProposals.length === 0 ? 'none' :
                          openProposals.length < 3 ? 'low' :
                          openProposals.length < 6 ? 'medium' : 'high';

    // Alignment state (how well representative voted)
    let alignmentState = 'unknown';
    if (this.representative) {
      const history = this.representativeVoteHistory.get(this.representative.uniqueId);
      if (history && history.total > 0) {
        const accuracy = history.correct / history.total;
        alignmentState = accuracy > 0.8 ? 'aligned' :
                        accuracy > 0.5 ? 'mixed' : 'misaligned';
      }
    }

    return StateDiscretizer.combineState(repState, activityState, alignmentState);
  }

  /**
   * Choose liquid delegation action using Q-learning
   */
  private chooseLiquidAction(): LiquidAction {
    const state = this.getLiquidState();

    if (!settings.learning_enabled) {
      return this.heuristicLiquidAction();
    }

    return this.liquidLearning.selectAction(
      state,
      [...LiquidDelegator.LIQUID_ACTIONS]
    ) as LiquidAction;
  }

  /**
   * Heuristic-based liquid action (fallback)
   */
  private heuristicLiquidAction(): LiquidAction {
    if (!this.model.dao) return 'hold';

    // No representative - find one
    if (!this.representative) {
      return random() < 0.5 ? 'delegate_high_rep' : 'delegate_active';
    }

    // Check if representative is underperforming
    const avgReputation = this.model.dao.members.reduce((sum, m) => sum + m.reputation, 0) /
                          this.model.dao.members.length;

    if (this.representative.reputation < avgReputation * 0.5) {
      return 'switch_rep';
    }

    // Check alignment
    const history = this.representativeVoteHistory.get(this.representative.uniqueId);
    if (history && history.total > 3 && history.correct / history.total < 0.4) {
      return 'switch_rep';
    }

    // Sometimes vote directly on important proposals
    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
    if (openProposals.length > 0 && random() < 0.1) {
      return 'self_vote';
    }

    return 'hold';
  }

  /**
   * Execute liquid delegation action
   */
  private executeLiquidAction(action: LiquidAction): number {
    let reward = 0;

    switch (action) {
      case 'delegate_high_rep':
        reward = this.delegateToHighestReputation();
        break;

      case 'delegate_active':
        reward = this.delegateToMostActive();
        break;

      case 'delegate_aligned':
        reward = this.delegateToMostAligned();
        break;

      case 'switch_rep':
        reward = this.switchRepresentative();
        break;

      case 'self_vote':
        this.voteOnRandomProposal();
        reward = 0.3;
        break;

      case 'hold':
        // Keep current delegation
        if (this.representative) {
          reward = 0.1;
        }
        break;
    }

    return reward;
  }

  /**
   * Delegate to highest reputation member
   */
  private delegateToHighestReputation(): number {
    if (!this.model.dao) return -0.1;

    const candidates = this.model.dao.members.filter(m => m !== this);
    if (candidates.length === 0) return -0.1;

    // Sort by reputation
    candidates.sort((a, b) => b.reputation - a.reputation);
    const chosen = candidates[0];

    if (DelegationResolver.wouldCreateCycle(this, chosen)) {
      return -0.2;
    }

    this.delegateToMember(chosen);
    return 0.5;
  }

  /**
   * Delegate to most active voter
   */
  private delegateToMostActive(): number {
    if (!this.model.dao) return -0.1;

    const candidates = this.model.dao.members.filter(m => m !== this);
    if (candidates.length === 0) return -0.1;

    // Sort by vote count
    candidates.sort((a, b) => b.totalVotesCast - a.totalVotesCast);
    const chosen = candidates[0];

    if (DelegationResolver.wouldCreateCycle(this, chosen)) {
      return -0.2;
    }

    this.delegateToMember(chosen);
    return 0.4;
  }

  /**
   * Delegate to member with best historical alignment
   */
  private delegateToMostAligned(): number {
    if (!this.model.dao) return -0.1;

    let bestCandidate: DAOMember | null = null;
    let bestAccuracy = 0;

    for (const member of this.model.dao.members) {
      if (member === this) continue;

      const history = this.representativeVoteHistory.get(member.uniqueId);
      if (history && history.total > 2) {
        const accuracy = history.correct / history.total;
        if (accuracy > bestAccuracy) {
          bestAccuracy = accuracy;
          bestCandidate = member;
        }
      }
    }

    if (!bestCandidate) {
      // Fall back to reputation-based
      return this.delegateToHighestReputation();
    }

    if (DelegationResolver.wouldCreateCycle(this, bestCandidate)) {
      return -0.2;
    }

    this.delegateToMember(bestCandidate);
    return 0.6;
  }

  /**
   * Switch to a new representative
   */
  private switchRepresentative(): number {
    if (!this.model.dao) return -0.1;

    // Clear current representative
    if (this.representative) {
      this.setRepresentative(null);
    }

    // Choose new representative (avoid previous one)
    const previousRep = this.representative;
    const candidates = this.model.dao.members.filter(
      m => m !== this && m !== previousRep
    );

    if (candidates.length === 0) return -0.1;

    // Weighted by reputation
    const totalRep = candidates.reduce((sum, m) => sum + m.reputation, 0);
    if (totalRep <= 0) {
      const chosen = randomChoice(candidates);
      if (!DelegationResolver.wouldCreateCycle(this, chosen)) {
        this.delegateToMember(chosen);
        return 0.3;
      }
      return -0.1;
    }

    let r = random() * totalRep;
    for (const candidate of candidates) {
      r -= candidate.reputation;
      if (r <= 0) {
        if (!DelegationResolver.wouldCreateCycle(this, candidate)) {
          this.delegateToMember(candidate);
          return 0.4;
        }
        break;
      }
    }

    return -0.1;
  }

  /**
   * Update Q-values based on delegation outcomes
   */
  private updateLiquidLearning(): void {
    if (!settings.learning_enabled || !this.lastLiquidAction || !this.lastLiquidState) return;

    let reward = 0;

    // Reward based on representative's performance
    if (this.representative) {
      const repChange = this.representative.reputation - this.lastRepReputation;
      reward += repChange * 0.1;

      // Check if representative voted well on closed proposals
      const history = this.representativeVoteHistory.get(this.representative.uniqueId);
      if (history && history.total > 0) {
        const accuracy = history.correct / history.total;
        reward += (accuracy - 0.5) * 5; // Reward for good accuracy, penalty for bad
      }
    }

    reward = Math.max(-10, Math.min(10, reward));

    const currentState = this.getLiquidState();

    this.liquidLearning.update(
      this.lastLiquidState,
      this.lastLiquidAction,
      reward,
      currentState,
      [...LiquidDelegator.LIQUID_ACTIONS]
    );
  }

  /**
   * Track representative's vote outcomes
   */
  private trackRepresentativeVotes(): void {
    if (!this.model.dao || !this.representative) return;

    // Check recently closed proposals
    const closedProposals = this.model.dao.proposals.filter(
      p => p.status === 'approved' || p.status === 'rejected'
    );

    for (const proposal of closedProposals) {
      // Check if representative voted on this proposal
      const repVote = proposal.votes?.get(this.representative.uniqueId);
      if (!repVote) continue;

      // Did they vote correctly (with the outcome)?
      const passed = proposal.status === 'approved';
      const votedYes = repVote.vote === true;
      const votedCorrectly = (passed && votedYes) || (!passed && !votedYes);

      // Update history
      let history = this.representativeVoteHistory.get(this.representative.uniqueId);
      if (!history) {
        history = { correct: 0, total: 0 };
        this.representativeVoteHistory.set(this.representative.uniqueId, history);
      }

      history.total++;
      if (votedCorrectly) {
        history.correct++;
      }
    }
  }

  /**
   * Choose a representative to delegate voting power to
   */
  chooseRepresentative(): DAOMember | null {
    if (!this.model.dao) return null;

    const candidates = this.model.dao.members.filter((m) => m !== this);
    if (candidates.length === 0) {
      return null;
    }

    const totalRep = candidates.reduce((sum, m) => sum + m.reputation, 0);
    if (totalRep <= 0) {
      return randomChoice(candidates);
    }

    let r = random() * totalRep;
    for (const candidate of candidates) {
      r -= candidate.reputation;
      if (r <= 0) {
        return candidate;
      }
    }

    return candidates[candidates.length - 1];
  }

  /**
   * Delegate voting power to a specific member
   */
  delegateToMember(member: DAOMember): void {
    if (DelegationResolver.wouldCreateCycle(this, member)) return;

    this.setRepresentative(member);

    this.delegationHistory.push({
      step: this.model.currentStep,
      representative: member.uniqueId,
    });
    this.lastDelegationStep = this.model.currentStep;

    if (this.model.eventBus) {
      this.model.eventBus.publish('delegation_changed', {
        step: this.model.currentStep,
        delegator: this.uniqueId,
        representative: member.uniqueId,
      });
    }
  }

  /**
   * Receive a vote cast by the representative on our behalf
   */
  receiveRepresentativeVote(
    proposal: Proposal,
    voteBool: boolean,
    weight: number = 1
  ): void {
    if (this.model.eventBus) {
      this.model.eventBus.publish('representative_voted', {
        step: this.model.currentStep,
        delegator: this.uniqueId,
        representative: this.representative?.uniqueId,
        proposal: proposal.title,
        vote: voteBool,
      });
    }
    this.markActive();
  }

  /**
   * Consider switching representatives based on performance
   */
  evaluateRepresentative(): void {
    if (!this.representative || !this.model.dao) return;
    const lockSteps = this.model.dao.delegationLockSteps || 0;
    if (this.model.currentStep - this.lastDelegationStep < lockSteps) {
      return;
    }

    const avgReputation =
      this.model.dao.members.reduce((sum, m) => sum + m.reputation, 0) /
      this.model.dao.members.length;

    if (this.representative.reputation < avgReputation * 0.5) {
      if (random() < 0.3) {
        const newRep = this.chooseRepresentative();
        if (newRep && newRep !== this.representative) {
          this.delegateToMember(newRep);
        }
      }
    }
  }

  step(): void {
    // Update liquid learning from previous step
    this.updateLiquidLearning();

    // Track state before action
    this.lastLiquidState = this.getLiquidState();
    this.lastRepReputation = this.representative?.reputation || 0;

    // Track representative vote outcomes
    this.trackRepresentativeVotes();

    // Choose and execute liquid delegation action
    const action = this.chooseLiquidAction();
    this.executeLiquidAction(action);
    this.lastLiquidAction = action;

    // Occasionally leave comments
    if (random() < (this.model.dao?.commentProbability || 0.1)) {
      this.leaveCommentOnRandomProposal();
    }
  }

  /**
   * Signal end of episode
   */
  endEpisode(): void {
    super.endEpisode();
    this.liquidLearning.endEpisode();
  }

  /**
   * Export learning state for checkpoints
   */
  exportLearningState(): LearningState {
    // Combine parent and liquid learning states
    const parentState = super.exportLearningState();
    const liquidState = this.liquidLearning.exportLearningState();

    return {
      ...parentState,
      qTable: {
        ...parentState.qTable,
        ...Object.fromEntries(
          Object.entries(liquidState.qTable).map(([k, v]) => [`liquid_${k}`, v])
        ),
      },
    };
  }

  /**
   * Import learning state from checkpoint
   */
  importLearningState(state: LearningState): void {
    // Separate parent and liquid states
    const parentTable: { [key: string]: { [action: string]: number } } = {};
    const liquidTable: { [key: string]: { [action: string]: number } } = {};

    for (const [key, actions] of Object.entries(state.qTable)) {
      if (key.startsWith('liquid_')) {
        liquidTable[key.slice(7)] = actions;
      } else {
        parentTable[key] = actions;
      }
    }

    super.importLearningState({ ...state, qTable: parentTable });
    this.liquidLearning.importLearningState({ ...state, qTable: liquidTable });
  }

  /**
   * Get liquid delegator statistics
   */
  getLiquidDelegatorStats(): {
    hasRepresentative: boolean;
    representativeReputation: number;
    delegationCount: number;
    voteHistorySize: number;
    qTableSize: number;
    explorationRate: number;
    totalReward: number;
  } {
    return {
      hasRepresentative: this.representative !== null,
      representativeReputation: this.representative?.reputation || 0,
      delegationCount: this.delegationHistory.length,
      voteHistorySize: this.representativeVoteHistory.size,
      qTableSize: this.liquidLearning.getQTableSize(),
      explorationRate: this.liquidLearning.getExplorationRate(),
      totalReward: this.liquidLearning.getTotalReward(),
    };
  }
}
