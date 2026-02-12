// Governance Expert Agent - Specializes in proposal analysis and informed voting
// Upgraded with Q-learning to learn optimal voting strategies over time

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Proposal } from '../data-structures/proposal';
import { random, randomChoice, randomBool } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

// Analysis configuration
const MIN_REPUTATION_FOR_ADVICE = 30;

type VoteAction = 'strong_yes' | 'yes' | 'neutral' | 'no' | 'strong_no';

interface ProposalAnalysis {
  proposalId: string;
  riskScore: number;
  fundingViability: number;
  supportMomentum: number;
  recommendation: VoteAction;
  analyzedAt: number;
}

export class GovernanceExpert extends DAOMember {
  static readonly ACTIONS: readonly VoteAction[] = ['strong_yes', 'yes', 'neutral', 'no', 'strong_no'];

  // Learning infrastructure
  learning: LearningMixin;

  // Analysis state
  analyses: Map<string, ProposalAnalysis> = new Map();
  specialization: string[];
  accuracyRating: number;
  advisorInfluence: number;

  // Learning tracking
  voteOutcomes: Map<string, { vote: VoteAction; proposalId: string; stateAtVote: string }> = new Map();
  lastVoteStep: number = 0;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 75,
    location: string = 'node_0',
    votingStrategy?: string
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);

    // Assign random specializations
    const topics = ['infrastructure', 'treasury', 'governance', 'community', 'technical'];
    this.specialization = [randomChoice(topics), randomChoice(topics)];
    this.accuracyRating = 0.5 + random() * 0.3;
    this.advisorInfluence = 0.5 + random() * 0.5;

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
   * Get state representation for a proposal
   */
  private getProposalState(proposal: Proposal): string {
    if (!this.model.dao) return 'voting|low|adequate';

    const participationRate = this.model.dao.members.length > 0
      ? (proposal.votesFor + proposal.votesAgainst) / this.model.dao.members.length
      : 0;

    return StateDiscretizer.createGovernanceState(
      proposal,
      participationRate,
      this.model.dao.treasury.funds,
      undefined,
      this.model.dao.governanceRuleName
    );
  }

  /**
   * Calculate features for proposal analysis
   */
  private analyzeProposalFeatures(proposal: Proposal): {
    riskScore: number;
    fundingViability: number;
    supportMomentum: number;
    specializationBonus: number;
  } {
    // Calculate risk score
    const fundingRisk = Math.min(1, proposal.fundingGoal / 10000);
    const durationRisk = Math.min(1, (proposal.votingPeriod || 10) / 30);
    const riskScore = fundingRisk * 0.6 + durationRisk * 0.4;

    // Calculate funding viability
    const fundingProgress = proposal.fundingGoal > 0
      ? proposal.currentFunding / proposal.fundingGoal
      : 1;
    const fundingViability = Math.min(1, fundingProgress);

    // Calculate support momentum
    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    const supportMomentum = totalVotes > 0
      ? proposal.votesFor / totalVotes
      : 0.5;

    // Calculate specialization bonus
    let specializationBonus = 0;
    const titleLower = proposal.title.toLowerCase();
    const topicLower = proposal.topic.toLowerCase();

    for (const specialty of this.specialization) {
      const specLower = specialty.toLowerCase();
      if (titleLower.includes(specLower) || topicLower.includes(specLower)) {
        specializationBonus = 0.15;
        break;
      }
    }

    return { riskScore, fundingViability, supportMomentum, specializationBonus };
  }

  /**
   * Choose vote action using Q-learning
   */
  private chooseVoteAction(proposal: Proposal): VoteAction {
    const state = this.getProposalState(proposal);

    if (!settings.learning_enabled) {
      // Fall back to heuristic-based decision
      return this.heuristicVoteAction(proposal);
    }

    // Use learning to select action
    return this.learning.selectAction(
      state,
      [...GovernanceExpert.ACTIONS]
    ) as VoteAction;
  }

  /**
   * Heuristic-based vote action (fallback when learning disabled)
   */
  private heuristicVoteAction(proposal: Proposal): VoteAction {
    const features = this.analyzeProposalFeatures(proposal);

    let score = (1 - features.riskScore) * 0.3 +
                features.fundingViability * 0.3 +
                features.supportMomentum * 0.4 +
                features.specializationBonus;

    score = Math.min(1, score);

    if (score >= 0.8) return 'strong_yes';
    if (score >= 0.6) return 'yes';
    if (score >= 0.4) return 'neutral';
    if (score >= 0.2) return 'no';
    return 'strong_no';
  }

  /**
   * Analyze proposals and store recommendations
   */
  private analyzeProposals(): void {
    if (!this.model.dao) return;

    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');

    for (const proposal of openProposals) {
      // Skip if recently analyzed
      const existing = this.analyses.get(proposal.uniqueId);
      if (existing && this.model.currentStep - existing.analyzedAt < 5) {
        continue;
      }

      const features = this.analyzeProposalFeatures(proposal);
      const recommendation = this.chooseVoteAction(proposal);

      const analysis: ProposalAnalysis = {
        proposalId: proposal.uniqueId,
        riskScore: features.riskScore,
        fundingViability: features.fundingViability,
        supportMomentum: features.supportMomentum,
        recommendation,
        analyzedAt: this.model.currentStep,
      };

      this.analyses.set(proposal.uniqueId, analysis);

      // Track for reward calculation (store state at vote time for proper temporal Q-update)
      this.voteOutcomes.set(proposal.uniqueId, {
        vote: recommendation,
        proposalId: proposal.uniqueId,
        stateAtVote: this.getProposalState(proposal),
      });

      // Emit analysis event
      if (this.model.eventBus) {
        this.model.eventBus.publish('proposal_analyzed', {
          step: this.model.currentStep,
          expert: this.uniqueId,
          proposalId: proposal.uniqueId,
          recommendation: analysis.recommendation,
          riskScore: analysis.riskScore,
        });
      }
    }
  }

  /**
   * Update Q-values based on proposal outcomes
   */
  private updateLearning(): void {
    if (!this.model.dao || !settings.learning_enabled) return;

    const closedProposals = this.model.dao.proposals.filter(
      p => p.status !== 'open' && this.voteOutcomes.has(p.uniqueId)
    );

    for (const proposal of closedProposals) {
      const outcome = this.voteOutcomes.get(proposal.uniqueId);
      if (!outcome) continue;

      // Use state captured at vote time (S_t) and current state as next state (S_{t+1})
      const stateAtVote = outcome.stateAtVote;
      const nextState = this.getProposalState(proposal);
      let reward = 0;

      // Calculate reward based on outcome
      const proposalPassed = proposal.status === 'approved' || proposal.status === 'completed';
      const votedYes = outcome.vote === 'yes' || outcome.vote === 'strong_yes';
      const votedNo = outcome.vote === 'no' || outcome.vote === 'strong_no';

      if (proposalPassed && votedYes) {
        // Correctly voted for passing proposal
        reward = outcome.vote === 'strong_yes' ? 10 : 8;
      } else if (!proposalPassed && votedNo) {
        // Correctly voted against failing proposal
        reward = outcome.vote === 'strong_no' ? 10 : 8;
      } else if (proposalPassed && votedNo) {
        // Incorrectly voted against passing proposal
        reward = -5;
      } else if (!proposalPassed && votedYes) {
        // Incorrectly voted for failing proposal
        reward = -5;
      } else if (outcome.vote === 'neutral') {
        // Neutral vote - small reward for caution
        reward = 1;
      }

      // Vote with majority bonus
      const totalVotes = proposal.votesFor + proposal.votesAgainst;
      if (totalVotes > 0) {
        const majorityVotedYes = proposal.votesFor > proposal.votesAgainst;
        if ((majorityVotedYes && votedYes) || (!majorityVotedYes && votedNo)) {
          reward += 3;
        }
      }

      // Update Q-value with proper temporal states
      this.learning.update(
        stateAtVote,
        outcome.vote,
        reward,
        nextState,
        [...GovernanceExpert.ACTIONS]
      );

      // Remove from tracking
      this.voteOutcomes.delete(proposal.uniqueId);
      this.analyses.delete(proposal.uniqueId);
    }
  }

  /**
   * Override decideVote to use learning-based analysis
   */
  override decideVote(topic: Proposal | string): 'yes' | 'no' {
    if (typeof topic === 'object' && topic !== null && 'uniqueId' in topic) {
      const proposal = topic as Proposal;
      const analysis = this.analyses.get(proposal.uniqueId);

      if (analysis) {
        switch (analysis.recommendation) {
          case 'strong_yes':
          case 'yes':
            return 'yes';
          case 'strong_no':
          case 'no':
            return 'no';
          default:
            // Neutral: use base class heuristics
            break;
        }
      }
    }

    return super.decideVote(topic);
  }

  step(): void {
    if (!this.model.dao) return;

    // Update learning from closed proposals
    this.updateLearning();

    // Analyze proposals (uses Q-learning for recommendations)
    this.analyzeProposals();

    // Vote through base class pipeline
    this.voteOnRandomProposal();

    // Optionally advise other members
    if (this.reputation >= MIN_REPUTATION_FOR_ADVICE && randomBool(0.3)) {
      this.adviseOtherMembers();
    }

    // Leave analytical comments
    if (random() < (this.model.dao?.commentProbability || 0.3)) {
      this.leaveAnalyticalComment();
    }
  }

  /**
   * Advise other members on how to vote
   */
  private adviseOtherMembers(): void {
    if (!this.model.dao) return;

    const analysisEntries = Array.from(this.analyses.entries());
    if (analysisEntries.length === 0) return;

    const [proposalId, analysis] = randomChoice(analysisEntries);
    const proposal = this.model.dao.proposals.find(p => p.uniqueId === proposalId);
    if (!proposal || proposal.status !== 'open') return;

    if (this.model.eventBus) {
      this.model.eventBus.publish('governance_advice', {
        step: this.model.currentStep,
        expert: this.uniqueId,
        proposalId,
        recommendation: analysis.recommendation,
        influence: this.advisorInfluence,
        expertise: this.specialization,
      });
    }
  }

  /**
   * Leave an analytical comment on a proposal
   */
  private leaveAnalyticalComment(): void {
    if (!this.model.dao) return;

    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
    if (openProposals.length === 0) return;

    const proposal = randomChoice(openProposals);
    const analysis = this.analyses.get(proposal.uniqueId);

    let sentiment: string;
    if (analysis) {
      switch (analysis.recommendation) {
        case 'strong_yes':
        case 'yes':
          sentiment = 'positive';
          break;
        case 'strong_no':
        case 'no':
          sentiment = 'negative';
          break;
        default:
          sentiment = 'neutral';
      }
    } else {
      sentiment = randomChoice(['positive', 'negative', 'neutral']);
    }

    this.leaveComment(proposal, sentiment);
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
    analysisCount: number;
    accuracyRating: number;
  } {
    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      analysisCount: this.analyses.size,
      accuracyRating: this.accuracyRating,
    };
  }
}
