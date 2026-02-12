// GovernanceWhale Agent
// Upgraded with Q-learning to learn optimal governance influence strategies
//
// Models large token holders who maintain their holdings for governance power.

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import { submitRandomProposal } from '../utils/proposal-utils';
import { random, randomChoice } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

type WhaleAction = 'vote_heavy' | 'vote_strategic' | 'delegate_power' | 'stake_tokens' | 'create_proposal' | 'hold';

export interface GovernanceWhaleConfig {
  voteActivityMultiplier?: number;
  maxVotingProbability?: number;
  delegationProbability?: number;
  delegateFraction?: number;
  delegationConsiderationChance?: number;
  proposalCreationProbability?: number;
  commentMultiplier?: number;
  stakingConsiderationChance?: number;
  stakeFraction?: number;
}

const DEFAULT_CONFIG: Required<GovernanceWhaleConfig> = {
  voteActivityMultiplier: 5.0,
  maxVotingProbability: 0.9,
  delegationProbability: 0.3,
  delegateFraction: 0.3,
  delegationConsiderationChance: 0.01,
  proposalCreationProbability: 0.002,
  commentMultiplier: 1.5,
  stakingConsiderationChance: 0.01,
  stakeFraction: 0.1,
};

export class GovernanceWhale extends DAOMember {
  static readonly ACTIONS: readonly WhaleAction[] = [
    'vote_heavy', 'vote_strategic', 'delegate_power', 'stake_tokens', 'create_proposal', 'hold'
  ];

  // Learning infrastructure
  learning: LearningMixin;

  // Configuration
  private readonly config: Required<GovernanceWhaleConfig>;

  // Track delegation status
  private hasDelegated: boolean = false;

  // Learning tracking
  lastAction: WhaleAction | null = null;
  lastState: string | null = null;
  lastTokens: number;
  lastReputation: number;
  influenceHistory: number[] = [];
  voteOutcomes: Array<{ aligned: boolean }> = [];

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number,
    reputation: number,
    location: string,
    votingStrategy?: string,
    config?: GovernanceWhaleConfig
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.lastTokens = tokens;
    this.lastReputation = reputation;

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
   * Get state representation for governance decisions
   */
  private getGovernanceState(): string {
    if (!this.model.dao) return 'low|few|low';

    // Voting power state
    const totalTokens = this.model.dao.members.reduce((sum, m) => sum + m.tokens, 0);
    const votingPowerRatio = totalTokens > 0 ? this.tokens / totalTokens : 0;
    const powerState = votingPowerRatio < 0.05 ? 'low' :
                       votingPowerRatio < 0.15 ? 'moderate' :
                       votingPowerRatio < 0.3 ? 'high' : 'dominant';

    // Proposal opportunity state
    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
    const opportunityState = openProposals.length === 0 ? 'none' :
                             openProposals.length < 3 ? 'few' :
                             openProposals.length < 6 ? 'normal' : 'many';

    // Staking state
    const totalValue = this.tokens + this.stakedTokens;
    const stakeRatio = totalValue > 0 ? this.stakedTokens / totalValue : 0;
    const stakeState = stakeRatio < 0.2 ? 'low' :
                       stakeRatio < 0.5 ? 'moderate' : 'high';

    const ruleCategory = this.model.dao
      ? StateDiscretizer.discretizeGovernanceRule(this.model.dao.governanceRuleName)
      : 'default';
    return StateDiscretizer.combineState(powerState, opportunityState, stakeState, ruleCategory);
  }

  /**
   * Choose governance action using Q-learning
   */
  private chooseGovernanceAction(): WhaleAction {
    const state = this.getGovernanceState();

    if (!settings.learning_enabled) {
      return this.heuristicGovernanceAction();
    }

    return this.learning.selectAction(
      state,
      [...GovernanceWhale.ACTIONS]
    ) as WhaleAction;
  }

  /**
   * Heuristic-based governance action (fallback)
   */
  private heuristicGovernanceAction(): WhaleAction {
    if (!this.model.dao) return 'hold';

    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');

    // Prioritize voting on important proposals
    const highStakes = openProposals.filter(p => (p.fundingGoal || 0) > 1000);
    if (highStakes.length > 0) {
      return 'vote_heavy';
    }

    // Consider delegation if not done
    if (!this.hasDelegated && random() < this.config.delegationConsiderationChance) {
      return 'delegate_power';
    }

    // Consider staking
    if (this.tokens > 100 && random() < this.config.stakingConsiderationChance) {
      return 'stake_tokens';
    }

    // Create proposals occasionally (suppressed in calibrated mode)
    if (!this.model.dao?.calibratedProposals && random() < this.config.proposalCreationProbability) {
      return 'create_proposal';
    }

    if (openProposals.length > 0) {
      return 'vote_strategic';
    }

    return 'hold';
  }

  /**
   * Execute governance action and return reward
   */
  private executeGovernanceAction(action: WhaleAction): number {
    if (!this.model.dao) return 0;

    let reward = 0;

    switch (action) {
      case 'vote_heavy': {
        // Vote on all open proposals with full weight
        const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
        for (const proposal of openProposals) {
          if (!this.votes.has(proposal.uniqueId)) {
            this.voteOnRandomProposal();
            reward += 0.2;
          }
        }
        break;
      }
      case 'vote_strategic': {
        // Vote on high-value proposals only
        this.voteOnRandomProposal();
        reward = 0.1;
        break;
      }
      case 'delegate_power': {
        if (!this.hasDelegated) {
          this.considerDelegation();
          if (this.hasDelegated) {
            reward = 0.3;
          }
        }
        break;
      }
      case 'stake_tokens': {
        this.considerStaking();
        if (this.stakedTokens > 0) {
          reward = 0.2;
        }
        break;
      }
      case 'create_proposal': {
        if (this.model.dao) {
          submitRandomProposal(this.model.dao, this);
          reward = 0.4;
        }
        break;
      }
      case 'hold':
        return 0;
    }

    this.markActive();
    return reward;
  }

  /**
   * Update Q-values based on performance
   */
  private updateLearning(): void {
    if (!settings.learning_enabled || !this.lastAction || !this.lastState) return;
    if (!this.model.dao) return;

    // Calculate influence from voting outcomes
    let influenceReward = 0;
    const closedProposals = this.model.dao.proposals.filter(
      p => p.status !== 'open' && this.votes.has(p.uniqueId)
    );

    for (const proposal of closedProposals.slice(-5)) {
      const vote = this.votes.get(proposal.uniqueId);
      if (vote) {
        const passed = proposal.status === 'approved' || proposal.status === 'completed';
        const aligned = (passed && vote.vote) || (!passed && !vote.vote);
        if (aligned) {
          influenceReward += 1;
          this.voteOutcomes.push({ aligned: true });
        } else {
          influenceReward -= 0.5;
          this.voteOutcomes.push({ aligned: false });
        }
      }
    }
    if (this.voteOutcomes.length > 20) {
      this.voteOutcomes.splice(0, this.voteOutcomes.length - 20);
    }

    // Include reputation and token changes
    const reputationChange = this.reputation - this.lastReputation;
    const tokenChange = this.tokens - this.lastTokens;

    let reward = influenceReward + reputationChange * 0.1 + tokenChange * 0.01;
    reward = Math.max(-10, Math.min(10, reward));

    const currentState = this.getGovernanceState();

    this.learning.update(
      this.lastState,
      this.lastAction,
      reward,
      currentState,
      [...GovernanceWhale.ACTIONS]
    );
  }

  getEffectiveVotingProbability(): number {
    const baseProb = super.getEffectiveVotingProbability();
    return Math.min(this.config.maxVotingProbability, baseProb * this.config.voteActivityMultiplier);
  }

  step(): void {
    // Update learning from previous step
    this.updateLearning();

    // Track state before action
    this.lastTokens = this.tokens;
    this.lastReputation = this.reputation;
    this.lastState = this.getGovernanceState();

    // Choose and execute action
    const action = this.chooseGovernanceAction();
    this.executeGovernanceAction(action);
    this.lastAction = action;

    // Comment on proposals
    if (random() < (this.model.dao?.commentProbability || 0.3) * this.config.commentMultiplier) {
      this.leaveCommentOnRandomProposal();
    }
  }

  private considerDelegation(): void {
    if (!this.model.dao || this.hasDelegated) return;

    if (random() > this.config.delegationProbability) return;

    const potentialDelegates = this.model.dao.members.filter(m =>
      m.uniqueId !== this.uniqueId &&
      (m.constructor.name === 'GovernanceExpert' ||
       m.constructor.name === 'Delegator' ||
       m.constructor.name === 'LiquidDelegator')
    );

    if (potentialDelegates.length === 0) return;

    const delegate = randomChoice(potentialDelegates);
    const delegateAmount = Math.floor(this.tokens * this.config.delegateFraction);

    if (delegateAmount > 0) {
      this.delegate(delegateAmount, delegate);
      this.hasDelegated = true;
    }
  }

  private considerStaking(): void {
    if (!this.model.dao) return;
    if (random() > this.config.stakingConsiderationChance) return;
    if (this.tokens <= 0) return;

    const stakeAmount = Math.floor(this.tokens * this.config.stakeFraction);
    if (stakeAmount > 0) {
      this.stakeTokens(stakeAmount);
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
    voteAlignmentRate: number;
    hasDelegated: boolean;
  } {
    const alignedVotes = this.voteOutcomes.filter(v => v.aligned).length;
    const alignmentRate = this.voteOutcomes.length > 0 ? alignedVotes / this.voteOutcomes.length : 0;

    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      voteAlignmentRate: alignmentRate,
      hasDelegated: this.hasDelegated,
    };
  }
}
