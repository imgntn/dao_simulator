/**
 * Developer Advisory Board (dAB) Member Agent
 * Upgraded with Q-learning to optimize review strategies
 *
 * Represents members of Optimism's Developer Advisory Board.
 * Reviews protocol upgrades, provides technical assessments,
 * and advises on upgrade safety.
 */

import { DAOMember } from './base';
import type { Proposal } from '../data-structures/proposal';
import type { MultiStageProposal } from '../data-structures/multi-stage-proposal';
import type { DAOModel } from '../engine/model';
import { random, randomChoice } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

export interface UpgradeReview {
  proposalId: string;
  recommendation: 'approve' | 'reject' | 'needs_changes';
  technicalScore: number;  // 0-1
  securityScore: number;   // 0-1
  notes: string[];
  timestamp: number;
}

type DABAction = 'review_urgent' | 'review_security' | 'review_standard' | 'deep_analysis' | 'advise' | 'hold';

export class DABMember extends DAOMember {
  static readonly ACTIONS: readonly DABAction[] = [
    'review_urgent', 'review_security', 'review_standard', 'deep_analysis', 'advise', 'hold'
  ];

  // Learning infrastructure
  learning: LearningMixin;

  // DAB-specific properties
  technicalExpertise: number;      // 0-1 expertise level
  securityFocus: number;           // How much they prioritize security
  conservatism: number;            // How cautious about changes

  // Review tracking
  upgradesReviewed: number = 0;
  upgradesApproved: number = 0;
  upgradesRejected: number = 0;
  reviews: UpgradeReview[] = [];

  // Term
  termStartStep: number;
  termEndStep: number | null = null;
  isActive: boolean = true;

  // Learning tracking
  lastAction: DABAction | null = null;
  lastState: string | null = null;
  reviewOutcomes: Array<{ correct: boolean }> = [];

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number,
    reputation: number,
    location: string,
    daoId?: string
  ) {
    super(uniqueId, model, tokens, reputation, location, 'supermajority', daoId);

    // DAB members have high technical expertise
    this.technicalExpertise = 0.7 + random() * 0.3;  // 0.7-1.0
    this.securityFocus = 0.6 + random() * 0.4;       // 0.6-1.0
    this.conservatism = 0.4 + random() * 0.4;        // 0.4-0.8

    this.termStartStep = model.currentStep;

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
   * Get state representation for review decisions
   */
  private getReviewState(): string {
    if (!this.model.dao) return 'none|low|adequate';

    // Pending reviews state
    const pendingUpgrades = this.model.dao.proposals.filter(
      p => p.status === 'open' &&
           this.isUpgradeProposal(p) &&
           !this.reviews.find(r => r.proposalId === p.uniqueId)
    );
    const queueState = pendingUpgrades.length === 0 ? 'none' :
                       pendingUpgrades.length < 3 ? 'few' :
                       pendingUpgrades.length < 6 ? 'normal' : 'backlog';

    // Urgency state
    const urgentCount = pendingUpgrades.filter(p =>
      p.title.toLowerCase().includes('emergency') ||
      p.title.toLowerCase().includes('critical')
    ).length;
    const urgencyState = urgentCount > 0 ? 'urgent' : 'routine';

    // Accuracy state
    const recentReviews = this.reviewOutcomes.slice(-10);
    const accuracy = recentReviews.length > 0
      ? recentReviews.filter(r => r.correct).length / recentReviews.length
      : 0.5;
    const accuracyState = accuracy < 0.4 ? 'poor' :
                          accuracy < 0.6 ? 'moderate' :
                          accuracy < 0.8 ? 'good' : 'excellent';

    return StateDiscretizer.combineState(queueState, urgencyState, accuracyState);
  }

  /**
   * Choose review action using Q-learning
   */
  private chooseReviewAction(): DABAction {
    const state = this.getReviewState();

    if (!settings.learning_enabled) {
      return this.heuristicReviewAction();
    }

    return this.learning.selectAction(
      state,
      [...DABMember.ACTIONS]
    ) as DABAction;
  }

  /**
   * Heuristic-based review action (fallback)
   */
  private heuristicReviewAction(): DABAction {
    if (!this.model.dao) return 'hold';

    const pendingUpgrades = this.model.dao.proposals.filter(
      p => p.status === 'open' && this.isUpgradeProposal(p)
    );

    if (pendingUpgrades.length === 0) return 'hold';

    // Check for urgent proposals
    const urgent = pendingUpgrades.filter(p =>
      p.title.toLowerCase().includes('emergency') ||
      p.title.toLowerCase().includes('critical')
    );
    if (urgent.length > 0) {
      return 'review_urgent';
    }

    // Check for security proposals
    const security = pendingUpgrades.filter(p =>
      p.title.toLowerCase().includes('security') ||
      p.title.toLowerCase().includes('vulnerability')
    );
    if (security.length > 0 && this.securityFocus > 0.7) {
      return 'review_security';
    }

    // Deep analysis occasionally
    if (random() < this.technicalExpertise * 0.1) {
      return 'deep_analysis';
    }

    return 'review_standard';
  }

  /**
   * Execute review action and return reward
   */
  private executeReviewAction(action: DABAction): number {
    if (!this.model.dao) return 0;

    let reward = 0;

    switch (action) {
      case 'review_urgent': {
        const urgent = this.model.dao.proposals.filter(p =>
          p.status === 'open' &&
          this.isUpgradeProposal(p) &&
          (p.title.toLowerCase().includes('emergency') ||
           p.title.toLowerCase().includes('critical'))
        );
        if (urgent.length > 0) {
          this.reviewProposal(urgent[0]);
          reward = 1.0; // High reward for handling urgent
        }
        break;
      }
      case 'review_security': {
        const security = this.model.dao.proposals.filter(p =>
          p.status === 'open' &&
          this.isUpgradeProposal(p) &&
          (p.title.toLowerCase().includes('security') ||
           p.title.toLowerCase().includes('vulnerability'))
        );
        if (security.length > 0) {
          this.reviewProposal(security[0]);
          reward = 0.8;
        }
        break;
      }
      case 'review_standard': {
        const pending = this.model.dao.proposals.filter(
          p => p.status === 'open' &&
               this.isUpgradeProposal(p) &&
               !this.reviews.find(r => r.proposalId === p.uniqueId)
        );
        if (pending.length > 0) {
          this.reviewProposal(randomChoice(pending));
          reward = 0.4;
        }
        break;
      }
      case 'deep_analysis': {
        const pending = this.model.dao.proposals.filter(
          p => p.status === 'open' && this.isUpgradeProposal(p)
        );
        if (pending.length > 0) {
          // Review multiple proposals thoroughly
          for (const proposal of pending.slice(0, 2)) {
            this.reviewProposal(proposal);
          }
          reward = 0.6;
        }
        break;
      }
      case 'advise':
        this.participateInDiscussion();
        reward = 0.2;
        break;
      case 'hold':
        return 0;
    }

    return reward;
  }

  /**
   * Update Q-values based on review outcomes
   */
  private updateLearning(): void {
    if (!settings.learning_enabled || !this.lastAction || !this.lastState) return;
    if (!this.model.dao) return;

    // Check closed proposals for review accuracy
    for (const review of this.reviews) {
      const proposal = this.model.dao.proposals.find(p => p.uniqueId === review.proposalId);
      if (!proposal || proposal.status === 'open') continue;

      const passed = proposal.status === 'approved' || proposal.status === 'completed';
      const recommended = review.recommendation === 'approve';
      const correct = (passed && recommended) || (!passed && !recommended);

      this.reviewOutcomes.push({ correct });
    }

    // Limit history
    if (this.reviewOutcomes.length > 50) {
      this.reviewOutcomes.splice(0, this.reviewOutcomes.length - 50);
    }

    // Calculate reward
    const recentAccuracy = this.reviewOutcomes.slice(-5);
    const accuracy = recentAccuracy.length > 0
      ? recentAccuracy.filter(r => r.correct).length / recentAccuracy.length
      : 0.5;

    let reward = (accuracy - 0.5) * 10;
    reward = Math.max(-10, Math.min(10, reward));

    const currentState = this.getReviewState();

    this.learning.update(
      this.lastState,
      this.lastAction,
      reward,
      currentState,
      [...DABMember.ACTIONS]
    );
  }

  step(): void {
    super.step();

    if (!this.model.dao || !this.isActive) return;

    // Update learning from previous step
    this.updateLearning();

    // Track state before action
    this.lastState = this.getReviewState();

    // Choose and execute action
    if (random() < this.technicalExpertise * 0.2) {
      const action = this.chooseReviewAction();
      this.executeReviewAction(action);
      this.lastAction = action;
    }

    // Occasionally participate in discussions
    if (random() < 0.1) {
      this.participateInDiscussion();
    }
  }

  /**
   * Review upgrade proposals
   */
  private reviewUpgradeProposals(): void {
    if (!this.model.dao) return;

    const proposals = this.model.dao.proposals.filter(
      p => p.status === 'open' &&
           this.isUpgradeProposal(p) &&
           !this.reviews.find(r => r.proposalId === p.uniqueId)
    );

    for (const proposal of proposals) {
      this.reviewProposal(proposal);
    }
  }

  /**
   * Check if proposal is an upgrade
   */
  private isUpgradeProposal(proposal: Proposal): boolean {
    const titleLower = proposal.title.toLowerCase();
    const upgradeKeywords = [
      'upgrade', 'protocol', 'contract', 'implementation',
      'migration', 'patch', 'security', 'fix'
    ];
    return upgradeKeywords.some(kw => titleLower.includes(kw));
  }

  /**
   * Review a specific proposal
   */
  reviewProposal(proposal: Proposal): UpgradeReview {
    this.upgradesReviewed++;

    const { technicalScore, securityScore, notes } = this.assessProposal(proposal);
    const overallScore = (technicalScore + securityScore) / 2;

    let recommendation: 'approve' | 'reject' | 'needs_changes';
    if (overallScore >= 0.7) {
      recommendation = 'approve';
      this.upgradesApproved++;
    } else if (overallScore <= 0.3) {
      recommendation = 'reject';
      this.upgradesRejected++;
    } else {
      recommendation = 'needs_changes';
    }

    const review: UpgradeReview = {
      proposalId: proposal.uniqueId,
      recommendation,
      technicalScore,
      securityScore,
      notes,
      timestamp: this.model.currentStep,
    };

    this.reviews.push(review);

    // Emit review event
    if (this.model.eventBus) {
      this.model.eventBus.publish('dab_review_completed', {
        step: this.model.currentStep,
        dabMemberId: this.uniqueId,
        proposalId: proposal.uniqueId,
        recommendation,
        technicalScore,
        securityScore,
      });
    }

    return review;
  }

  /**
   * Assess proposal technical and security aspects
   */
  private assessProposal(proposal: Proposal): {
    technicalScore: number;
    securityScore: number;
    notes: string[];
  } {
    const notes: string[] = [];
    let technicalScore = 0.5;
    let securityScore = 0.5;

    const titleLower = proposal.title.toLowerCase();

    // Technical assessment
    if (titleLower.includes('test') || titleLower.includes('audit')) {
      technicalScore += 0.2;
      notes.push('Has testing/audit mentioned');
    }

    if (titleLower.includes('emergency') || titleLower.includes('critical')) {
      technicalScore -= 0.1 * this.conservatism;
      notes.push('Emergency change - requires extra scrutiny');
    }

    // Security assessment
    if (titleLower.includes('security')) {
      securityScore += 0.15;
      notes.push('Security-focused upgrade');
    }

    if (titleLower.includes('vulnerability') || titleLower.includes('exploit')) {
      securityScore += 0.2;
      notes.push('Addresses known vulnerability');
    }

    // Funding impact
    if (proposal.fundingGoal > 0 && this.model.dao) {
      const treasuryBalance = this.model.dao.treasury.getTokenBalance(this.model.dao.tokenSymbol);
      if (proposal.fundingGoal > treasuryBalance * 0.2) {
        technicalScore -= 0.1;
        notes.push('High funding impact');
      }
    }

    // Random variance based on expertise
    technicalScore += (random() - 0.5) * (1 - this.technicalExpertise) * 0.3;
    securityScore += (random() - 0.5) * (1 - this.securityFocus) * 0.3;

    return {
      technicalScore: Math.max(0, Math.min(1, technicalScore)),
      securityScore: Math.max(0, Math.min(1, securityScore)),
      notes,
    };
  }

  /**
   * Participate in governance discussions
   */
  private participateInDiscussion(): void {
    if (!this.model.dao) return;

    const upgradeProposals = this.model.dao.proposals.filter(
      p => p.status === 'open' &&
           this.isUpgradeProposal(p) &&
           !this.comments.has(p.uniqueId)
    );

    if (upgradeProposals.length > 0) {
      const proposal = randomChoice(upgradeProposals);
      const review = this.reviews.find(r => r.proposalId === proposal.uniqueId);

      let sentiment: 'positive' | 'negative' | 'neutral' | 'constructive';
      if (review) {
        sentiment = review.recommendation === 'approve' ? 'positive' :
                    review.recommendation === 'reject' ? 'negative' : 'constructive';
      } else {
        sentiment = 'constructive';
      }

      this.leaveComment(proposal, sentiment);
    }
  }

  /**
   * Get review for a proposal
   */
  getReview(proposalId: string): UpgradeReview | undefined {
    return this.reviews.find(r => r.proposalId === proposalId);
  }

  /**
   * Get DAB member statistics
   */
  getDABStats(): {
    technicalExpertise: number;
    securityFocus: number;
    upgradesReviewed: number;
    upgradesApproved: number;
    upgradesRejected: number;
    approvalRate: number;
    isActive: boolean;
  } {
    return {
      technicalExpertise: this.technicalExpertise,
      securityFocus: this.securityFocus,
      upgradesReviewed: this.upgradesReviewed,
      upgradesApproved: this.upgradesApproved,
      upgradesRejected: this.upgradesRejected,
      approvalRate: this.upgradesReviewed > 0
        ? this.upgradesApproved / this.upgradesReviewed
        : 0,
      isActive: this.isActive,
    };
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
    upgradesReviewed: number;
    reviewAccuracy: number;
  } {
    const accuracy = this.reviewOutcomes.length > 0
      ? this.reviewOutcomes.filter(r => r.correct).length / this.reviewOutcomes.length
      : 0;

    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      upgradesReviewed: this.upgradesReviewed,
      reviewAccuracy: accuracy,
    };
  }
}
