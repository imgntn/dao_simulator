// Passive Member Agent - only votes
// Upgraded with Q-learning to learn optimal voting strategies

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import { random } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

type PassiveAction = 'vote_active' | 'vote_selective' | 'abstain' | 'hold';

export class PassiveMember extends DAOMember {
  static readonly ACTIONS: readonly PassiveAction[] = [
    'vote_active', 'vote_selective', 'abstain', 'hold'
  ];

  // Learning infrastructure
  learning: LearningMixin;

  // Learning tracking
  lastAction: PassiveAction | null = null;
  lastState: string | null = null;
  votesAligned: number = 0;
  totalVotesCast: number = 0;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy?: string
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);

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
   * Get state representation for voting decisions
   */
  private getVotingState(): string {
    if (!this.model.dao) return 'none|low|neutral';

    // Proposal availability state
    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
    const proposalState = openProposals.length === 0 ? 'none' :
                          openProposals.length < 3 ? 'few' :
                          openProposals.length < 6 ? 'normal' : 'many';

    // Participation state
    const totalMembers = Math.max(1, this.model.dao.members.length);
    const avgParticipation = openProposals.length > 0
      ? openProposals.reduce((sum, p) => {
          const totalVotes = p.votesFor + p.votesAgainst;
          return sum + totalVotes / totalMembers;
        }, 0) / openProposals.length
      : 0;
    const participationState = StateDiscretizer.discretizeParticipation(avgParticipation);

    // Alignment state
    const alignmentRate = this.totalVotesCast > 0
      ? this.votesAligned / this.totalVotesCast
      : 0.5;
    const alignmentState = alignmentRate < 0.3 ? 'poor' :
                           alignmentRate < 0.5 ? 'neutral' :
                           alignmentRate < 0.7 ? 'good' : 'excellent';

    return StateDiscretizer.combineState(proposalState, participationState, alignmentState);
  }

  /**
   * Choose voting action using Q-learning
   */
  private chooseVotingAction(): PassiveAction {
    const state = this.getVotingState();

    if (!settings.learning_enabled) {
      return 'vote_active'; // Default behavior
    }

    return this.learning.selectAction(
      state,
      [...PassiveMember.ACTIONS]
    ) as PassiveAction;
  }

  /**
   * Execute voting action and return reward
   */
  private executeVotingAction(action: PassiveAction): number {
    if (!this.model.dao) return 0;

    let reward = 0;

    switch (action) {
      case 'vote_active': {
        // Vote on all open proposals
        const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
        for (const proposal of openProposals) {
          if (!this.votes.has(proposal.uniqueId)) {
            this.voteOnRandomProposal();
            this.totalVotesCast++;
            reward += 0.1;
          }
        }
        break;
      }
      case 'vote_selective': {
        // Only vote on high-participation proposals
        const openProposals = this.model.dao.proposals.filter(p => {
          const totalVotes = p.votesFor + p.votesAgainst;
          return p.status === 'open' && totalVotes > 5;
        });
        if (openProposals.length > 0) {
          this.voteOnRandomProposal();
          this.totalVotesCast++;
          reward = 0.2;
        }
        break;
      }
      case 'abstain':
        reward = 0;
        break;
      case 'hold':
        return 0;
    }

    return reward;
  }

  /**
   * Update Q-values based on voting outcomes
   */
  private updateLearning(): void {
    if (!this.model.dao || !settings.learning_enabled || !this.lastAction || !this.lastState) return;

    // Check if votes aligned with outcomes
    const closedProposals = this.model.dao.proposals.filter(
      p => p.status !== 'open' && this.votes.has(p.uniqueId)
    );

    let alignmentReward = 0;
    for (const proposal of closedProposals.slice(-5)) {
      const vote = this.votes.get(proposal.uniqueId);
      if (vote) {
        const passed = proposal.status === 'approved' || proposal.status === 'completed';
        const aligned = (passed && vote.vote) || (!passed && !vote.vote);
        if (aligned) {
          this.votesAligned++;
          alignmentReward += 1;
        }
      }
    }

    let reward = alignmentReward;
    reward = Math.max(-10, Math.min(10, reward));

    const currentState = this.getVotingState();

    this.learning.update(
      this.lastState,
      this.lastAction,
      reward,
      currentState,
      [...PassiveMember.ACTIONS]
    );
  }

  step(): void {
    // Update learning from previous step
    this.updateLearning();

    // Track state before action
    this.lastState = this.getVotingState();

    // Choose and execute action
    const action = this.chooseVotingAction();
    this.executeVotingAction(action);
    this.lastAction = action;
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
    totalVotesCast: number;
    alignmentRate: number;
  } {
    const alignmentRate = this.totalVotesCast > 0
      ? this.votesAligned / this.totalVotesCast
      : 0;

    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      totalVotesCast: this.totalVotesCast,
      alignmentRate,
    };
  }
}
