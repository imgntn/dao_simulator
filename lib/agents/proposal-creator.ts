// Proposal Creator Agent
// Upgraded with Q-learning to learn optimal proposal creation strategies

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import { createRandomProposal } from '../utils/proposal-utils';
import { random, randomChoice, randomInt, weightedRandomChoice } from '../utils/random';
import type { TopicConfig } from '../data-structures/dao';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

const DEFAULT_TOPIC_CONFIG: TopicConfig[] = [
  { topic: 'Funding', weight: 1, fundingRange: [0.005, 0.05] },
  { topic: 'Governance', weight: 1, fundingRange: [0.0, 0.01] },
  { topic: 'Marketing', weight: 1, fundingRange: [0.005, 0.03] },
  { topic: 'Development', weight: 1, fundingRange: [0.01, 0.05] },
  { topic: 'Community', weight: 1, fundingRange: [0.005, 0.02] },
  { topic: 'Infrastructure', weight: 1, fundingRange: [0.01, 0.05] },
];

type CreatorAction = 'create_funding' | 'create_governance' | 'create_development' | 'create_community' | 'wait' | 'hold';

export class ProposalCreator extends DAOMember {
  static readonly ACTIONS: readonly CreatorAction[] = [
    'create_funding', 'create_governance', 'create_development', 'create_community', 'wait', 'hold'
  ];

  // Learning infrastructure
  learning: LearningMixin;

  // Learning tracking
  lastAction: CreatorAction | null = null;
  lastState: string | null = null;
  proposalsCreated: number = 0;
  proposalOutcomes: Map<string, { topic: string; passed: boolean }> = new Map();
  topicSuccessRates: Map<string, { created: number; passed: number }> = new Map();

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
   * Get state representation for proposal creation decisions
   */
  private getCreationState(): string {
    if (!this.model.dao) return 'none|low|balanced';

    // DAO activity state
    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
    const activityState = openProposals.length === 0 ? 'none' :
                          openProposals.length < 3 ? 'low' :
                          openProposals.length < 6 ? 'normal' : 'busy';

    // Treasury state
    const treasuryBalance = this.model.dao.treasury.getTokenBalance('DAO_TOKEN');
    const treasuryState = treasuryBalance < 1000 ? 'low' :
                          treasuryBalance < 5000 ? 'moderate' :
                          treasuryBalance < 10000 ? 'healthy' : 'flush';

    // Recent success state
    let recentPassed = 0;
    let recentTotal = 0;
    for (const outcome of this.proposalOutcomes.values()) {
      recentTotal++;
      if (outcome.passed) recentPassed++;
    }
    const successRate = recentTotal > 0 ? recentPassed / recentTotal : 0.5;
    const successState = successRate < 0.3 ? 'poor' :
                         successRate < 0.5 ? 'balanced' :
                         successRate < 0.7 ? 'good' : 'excellent';

    return StateDiscretizer.combineState(activityState, treasuryState, successState);
  }

  /**
   * Choose creation action using Q-learning
   */
  private chooseCreationAction(): CreatorAction {
    const state = this.getCreationState();

    // Probability gate: check calibrated creation rate FIRST
    // This prevents Q-learning exploration from creating too many proposals
    // Divide by number of creators so total DAO rate matches calibration
    const baseProbability = (this.model as any).proposalCreationProbability ?? 0.005;
    const numCreators = this.model.dao?.members.filter(m => m.constructor.name === 'ProposalCreator').length || 1;
    const creationProbability = baseProbability / numCreators;
    if (random() > creationProbability) {
      return 'hold';  // Skip this step — no proposal allowed
    }

    // Check open proposal cap even with Q-learning
    if (this.model.dao) {
      const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
      if (openProposals.length >= 5) {
        return 'wait';
      }
    }

    if (!settings.learning_enabled) {
      return this.heuristicCreationAction();
    }

    // Gate passed — Q-learning only selects among creation types (not whether to create)
    const createActions: CreatorAction[] = ['create_funding', 'create_governance', 'create_development', 'create_community'];
    return this.learning.selectAction(state, createActions) as CreatorAction;
  }

  /**
   * Heuristic-based creation action (fallback)
   */
  private heuristicCreationAction(): CreatorAction {
    if (!this.model.dao) return 'hold';

    // Probability gate and open-proposal cap already checked in chooseCreationAction()

    // Choose topic based on past success
    const topics = ['Funding', 'Governance', 'Development', 'Community'];
    let bestTopic = 'Funding';
    let bestRate = 0;

    for (const topic of topics) {
      const stats = this.topicSuccessRates.get(topic);
      if (stats && stats.created > 0) {
        const rate = stats.passed / stats.created;
        if (rate > bestRate) {
          bestRate = rate;
          bestTopic = topic;
        }
      }
    }

    switch (bestTopic) {
      case 'Funding': return 'create_funding';
      case 'Governance': return 'create_governance';
      case 'Development': return 'create_development';
      case 'Community': return 'create_community';
      default: return 'create_funding';
    }
  }

  /**
   * Execute creation action and return reward
   */
  private executeCreationAction(action: CreatorAction): number {
    if (!this.model.dao) return 0;

    let reward = 0;
    let topic: string | null = null;

    switch (action) {
      case 'create_funding':
        topic = 'Funding';
        break;
      case 'create_governance':
        topic = 'Governance';
        break;
      case 'create_development':
        topic = 'Development';
        break;
      case 'create_community':
        topic = 'Community';
        break;
      case 'wait':
        return 0.1; // Small reward for patience
      case 'hold':
        return 0;
    }

    if (topic) {
      const proposal = this.createProposalWithTopic(topic);
      if (proposal) {
        this.proposalsCreated++;
        reward = 0.3;

        // Track for outcome learning
        this.proposalOutcomes.set(proposal.uniqueId, { topic, passed: false });

        // Update topic stats
        const stats = this.topicSuccessRates.get(topic) || { created: 0, passed: 0 };
        stats.created++;
        this.topicSuccessRates.set(topic, stats);
      }
    }

    return reward;
  }

  /**
   * Create a proposal with a specific topic
   */
  private createProposalWithTopic(topic: string): any {
    if (!this.model.dao) return null;

    const topicConfig = this.model.dao.proposalTopicConfig || DEFAULT_TOPIC_CONFIG;
    const selected = topicConfig.find(t => t.topic === topic) || topicConfig[0];

    const titlePrefix = `${topic} Proposal`;
    const fixedDuration = (this.model as any).proposalDurationSteps ?? 0;
    const minDuration = (this.model as any).proposalDurationMinSteps ?? 10;
    const maxDuration = (this.model as any).proposalDurationMaxSteps ?? 30;

    const duration =
      fixedDuration && fixedDuration > 0
        ? fixedDuration
        : randomInt(Math.min(minDuration, maxDuration), Math.max(minDuration, maxDuration));

    const proposal = createRandomProposal(
      this.model.dao,
      this,
      titlePrefix,
      topic,
      null,
      duration,
      selected.fundingRange
    );
    proposal.description = `A proposal about ${topic.toLowerCase()}`;

    this.model.dao.addProposal(proposal);
    this.markActive();

    return proposal;
  }

  /**
   * Update Q-values based on proposal outcomes
   */
  private updateLearning(): void {
    if (!this.model.dao || !settings.learning_enabled) return;

    // Check closed proposals for outcomes
    const closedProposals = this.model.dao.proposals.filter(
      p => p.status !== 'open' && this.proposalOutcomes.has(p.uniqueId)
    );

    for (const proposal of closedProposals) {
      const outcome = this.proposalOutcomes.get(proposal.uniqueId);
      if (!outcome) continue;

      const passed = proposal.status === 'approved' || proposal.status === 'completed';
      outcome.passed = passed;

      // Update topic success rate
      if (passed) {
        const stats = this.topicSuccessRates.get(outcome.topic);
        if (stats) {
          stats.passed++;
        }
      }

      // Calculate reward
      let reward = passed ? 5 : -2;

      // Update Q-value for the action that created this topic
      const actionForTopic = this.getActionForTopic(outcome.topic);
      if (actionForTopic && this.lastState) {
        this.learning.update(
          this.lastState,
          actionForTopic,
          reward,
          this.getCreationState(),
          [...ProposalCreator.ACTIONS]
        );
      }

      // Remove from pending outcomes
      this.proposalOutcomes.delete(proposal.uniqueId);
    }

    // Also do standard update for last action
    if (this.lastAction && this.lastState) {
      const currentState = this.getCreationState();
      this.learning.update(
        this.lastState,
        this.lastAction,
        0, // Neutral reward for step-by-step
        currentState,
        [...ProposalCreator.ACTIONS]
      );
    }
  }

  /**
   * Get action name for a topic
   */
  private getActionForTopic(topic: string): CreatorAction | null {
    switch (topic) {
      case 'Funding': return 'create_funding';
      case 'Governance': return 'create_governance';
      case 'Development': return 'create_development';
      case 'Community': return 'create_community';
      default: return null;
    }
  }

  step(): void {
    // Update learning from proposal outcomes
    this.updateLearning();

    // Track state before action
    this.lastState = this.getCreationState();

    // Choose and execute action
    const action = this.chooseCreationAction();
    this.executeCreationAction(action);
    this.lastAction = action;

    // Standard governance participation
    this.voteOnRandomProposal();

    if (random() < (this.model.dao?.commentProbability || 0.5)) {
      this.leaveCommentOnRandomProposal();
    }
  }

  createRandomProposal(): void {
    if (!this.model.dao) return;

    const topicConfig = this.model.dao.proposalTopicConfig || DEFAULT_TOPIC_CONFIG;
    const selected = weightedRandomChoice(topicConfig);
    const topic = selected.topic;

    const titlePrefix = `${topic} Proposal`;
    const fixedDuration = (this.model as any).proposalDurationSteps ?? 0;
    const minDuration = (this.model as any).proposalDurationMinSteps ?? 10;
    const maxDuration = (this.model as any).proposalDurationMaxSteps ?? 30;

    const duration =
      fixedDuration && fixedDuration > 0
        ? fixedDuration
        : randomInt(Math.min(minDuration, maxDuration), Math.max(minDuration, maxDuration));

    const proposal = createRandomProposal(this.model.dao, this, titlePrefix, topic, null, duration, selected.fundingRange);
    proposal.description = `A proposal about ${topic.toLowerCase()}`;

    this.model.dao.addProposal(proposal);
    this.markActive();
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
    proposalsCreated: number;
    topicSuccessRates: Record<string, number>;
  } {
    const successRates: Record<string, number> = {};
    for (const [topic, stats] of this.topicSuccessRates) {
      successRates[topic] = stats.created > 0 ? stats.passed / stats.created : 0;
    }

    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      proposalsCreated: this.proposalsCreated,
      topicSuccessRates: successRates,
    };
  }
}
