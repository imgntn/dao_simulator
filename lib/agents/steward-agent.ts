/**
 * Steward Agent
 *
 * Represents stewards in DAOs like Gitcoin and ENS.
 * Responsible for reviewing proposals, managing grants, and community oversight.
 * Often serves in workstreams or sub-DAOs.
 * Upgraded with Q-learning for optimal proposal review and grant management strategies.
 */

import { DAOMember } from './base';
import type { Proposal } from '../data-structures/proposal';
import type { DAOModel } from '../engine/model';
import { random, randomChoice, randomInt } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

type StewardAction = 'review_diligently' | 'review_quickly' | 'engage_community' | 'gate_proposal' | 'approve_grant' | 'hold';

export type WorkstreamType =
  | 'public_goods'
  | 'ecosystem'
  | 'metagovernance'
  | 'treasury'
  | 'community'
  | 'technical';

export interface GrantReview {
  proposalId: string;
  recommendation: 'approve' | 'reject' | 'revise';
  reviewNotes: string;
  timestamp: number;
}

export class StewardAgent extends DAOMember {
  static readonly ACTIONS: readonly StewardAction[] = [
    'review_diligently', 'review_quickly', 'engage_community', 'gate_proposal', 'approve_grant', 'hold'
  ];

  // Learning infrastructure
  learning: LearningMixin;

  // Steward-specific properties
  workstream: WorkstreamType;
  stewardTerm: { start: number; end: number };
  stewardLevel: 'junior' | 'senior' | 'lead' = 'junior';

  // Capabilities
  proposalGatingPower: boolean = true;  // Can gate proposals
  grantReviewAuthority: boolean = true;  // Can review grants
  budgetAuthority: number = 0;  // Amount they can approve without full vote

  // Behavioral traits
  reviewDiligence: number;  // How thoroughly they review (0-1)
  communityEngagement: number;  // How active in community (0-1)
  fiscalConservatism: number;  // How careful with treasury (0-1)

  // Tracking
  proposalsGated: number = 0;
  proposalsReviewed: number = 0;
  grantsApproved: number = 0;
  grantsRejected: number = 0;
  grantReviews: GrantReview[] = [];
  private pendingStewardDecision: boolean | null = null;

  // Learning tracking
  lastAction: StewardAction | null = null;
  lastState: string | null = null;
  diligentReviews: number = 0;
  quickReviews: number = 0;
  communityEngagements: number = 0;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number,
    reputation: number,
    location: string,
    workstream: WorkstreamType = 'community',
    daoId?: string
  ) {
    super(uniqueId, model, tokens, reputation, location, 'quorum', daoId);

    this.workstream = workstream;

    // Set term (typically 6 months = ~4320 steps at 24 steps/day)
    const termLength = 4320 + randomInt(-720, 720);  // 5-7 months
    this.stewardTerm = {
      start: model.currentStep,
      end: model.currentStep + termLength,
    };

    // Behavioral traits
    this.reviewDiligence = 0.6 + random() * 0.4;  // 0.6-1.0
    this.communityEngagement = 0.5 + random() * 0.5;  // 0.5-1.0
    this.fiscalConservatism = 0.3 + random() * 0.5;  // 0.3-0.8

    // Set initial budget authority based on workstream
    this.setBudgetAuthorityForWorkstream();

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
   * Override vote decision to use steward-specific assessment when available.
   */
  override decideVote(topic: Proposal | string): 'yes' | 'no' {
    if (this.pendingStewardDecision !== null) {
      return this.pendingStewardDecision ? 'yes' : 'no';
    }
    return super.decideVote(topic);
  }

  /**
   * Set budget authority based on workstream
   */
  private setBudgetAuthorityForWorkstream(): void {
    const budgetByWorkstream: Record<WorkstreamType, number> = {
      treasury: 50000,
      ecosystem: 25000,
      public_goods: 20000,
      metagovernance: 15000,
      technical: 10000,
      community: 5000,
    };
    this.budgetAuthority = budgetByWorkstream[this.workstream] || 5000;
  }

  /**
   * Get state representation for steward decisions
   */
  private getStewardState(): string {
    if (!this.model.dao) return 'none|fresh|low';

    // Proposal backlog state
    const pendingProposals = this.model.dao.proposals.filter(p => p.status === 'open').length;
    const backlogState = pendingProposals === 0 ? 'none' :
                         pendingProposals < 5 ? 'light' :
                         pendingProposals < 10 ? 'moderate' : 'heavy';

    // Term state
    const termProgress = (this.model.currentStep - this.stewardTerm.start) /
                         Math.max(1, this.stewardTerm.end - this.stewardTerm.start);
    const termState = termProgress < 0.3 ? 'fresh' :
                      termProgress < 0.7 ? 'mid_term' :
                      termProgress < 1.0 ? 'late_term' : 'expired';

    // Workload state (reviews done)
    const reviewRate = this.proposalsReviewed / Math.max(1, this.model.currentStep / 20);
    const workloadState = reviewRate < 0.5 ? 'low' :
                          reviewRate < 1.0 ? 'moderate' :
                          reviewRate < 2.0 ? 'high' : 'overloaded';

    return StateDiscretizer.combineState(backlogState, termState, workloadState);
  }

  /**
   * Choose steward action using Q-learning
   */
  private chooseStewardAction(): StewardAction {
    const state = this.getStewardState();

    if (!settings.learning_enabled) {
      return this.heuristicStewardAction();
    }

    return this.learning.selectAction(
      state,
      [...StewardAgent.ACTIONS]
    ) as StewardAction;
  }

  /**
   * Heuristic-based steward action (fallback)
   */
  private heuristicStewardAction(): StewardAction {
    if (!this.model.dao) return 'hold';

    // Term expired -> minimal activity
    if (this.isTermExpired()) return 'hold';

    const pendingProposals = this.model.dao.proposals.filter(p => p.status === 'open');

    // Heavy backlog -> quick reviews
    if (pendingProposals.length > 10) {
      return 'review_quickly';
    }

    // High community engagement -> engage
    if (this.communityEngagement > 0.8 && random() < 0.3) {
      return 'engage_community';
    }

    // Diligent steward -> thorough review
    if (this.reviewDiligence > 0.8) {
      return 'review_diligently';
    }

    return random() < 0.5 ? 'review_diligently' : 'engage_community';
  }

  /**
   * Execute steward action and return reward
   */
  private executeStewardAction(action: StewardAction): number {
    if (!this.model.dao) return 0;

    let reward = 0;
    const openProposals = this.model.dao.proposals.filter(
      p => p.status === 'open' &&
           !this.grantReviews.find(r => r.proposalId === p.uniqueId)
    );

    switch (action) {
      case 'review_diligently': {
        if (openProposals.length > 0) {
          const proposal = randomChoice(openProposals);
          this.reviewProposal(proposal);
          this.diligentReviews++;
          reward = 0.5;
        }
        break;
      }
      case 'review_quickly': {
        // Review multiple proposals quickly
        const toReview = Math.min(3, openProposals.length);
        for (let i = 0; i < toReview; i++) {
          this.reviewProposal(openProposals[i]);
          this.quickReviews++;
        }
        reward = 0.3 * toReview;
        break;
      }
      case 'engage_community':
        this.engageWithCommunity();
        this.communityEngagements++;
        reward = 0.3;
        break;
      case 'gate_proposal': {
        if (openProposals.length > 0 && this.proposalGatingPower) {
          const proposal = openProposals.find(p => {
            const assessment = this.assessProposal(p);
            return assessment.recommendation === 'reject';
          });
          if (proposal) {
            this.gateProposal(proposal, 'Does not meet workstream criteria');
            reward = 0.4;
          }
        }
        break;
      }
      case 'approve_grant': {
        const withinBudget = openProposals.filter(p => p.fundingGoal <= this.budgetAuthority);
        if (withinBudget.length > 0) {
          const proposal = randomChoice(withinBudget);
          this.reviewProposal(proposal);
          reward = 0.45;
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
   * Update Q-values based on steward outcomes
   */
  private updateLearning(): void {
    if (!settings.learning_enabled || !this.lastAction || !this.lastState) return;

    // Calculate reward from review effectiveness
    const reviewEfficiency = this.proposalsReviewed / Math.max(1, this.model.currentStep / 10);
    const approvalRate = this.grantsApproved / Math.max(1, this.proposalsReviewed);
    const gatingRate = this.proposalsGated / Math.max(1, this.proposalsReviewed);

    let reward = reviewEfficiency + approvalRate * 0.5 - gatingRate * 0.3;
    reward = Math.max(-10, Math.min(10, reward));

    const currentState = this.getStewardState();

    this.learning.update(
      this.lastState,
      this.lastAction,
      reward,
      currentState,
      [...StewardAgent.ACTIONS]
    );
  }

  step(): void {
    super.step();

    if (!this.model.dao) return;

    // Update learning from previous step
    this.updateLearning();

    // Track state before action
    this.lastState = this.getStewardState();

    // Check if term has expired
    if (this.isTermExpired()) {
      // Reduced activity after term expires
      if (random() < 0.05) {
        this.voteOnRandomProposal();
      }
      return;
    }

    // Choose and execute action using Q-learning
    if (random() < 0.2) {
      const action = this.chooseStewardAction();
      this.executeStewardAction(action);
      this.lastAction = action;
    }

    // Vote on proposals relevant to workstream (as secondary behavior)
    if (random() < 0.1) {
      this.voteOnRelevantProposals();
    }
  }

  /**
   * Check if steward term has expired
   */
  isTermExpired(): boolean {
    return this.model.currentStep >= this.stewardTerm.end;
  }

  /**
   * Review pending proposals for gating
   */
  private reviewPendingProposals(): void {
    if (!this.model.dao) return;

    const proposals = this.model.dao.proposals.filter(
      p => p.status === 'open' &&
           !this.grantReviews.find(r => r.proposalId === p.uniqueId)
    );

    for (const proposal of proposals) {
      // Only review proposals in relevant workstream or under budget authority
      if (this.isRelevantToWorkstream(proposal) || proposal.fundingGoal <= this.budgetAuthority) {
        this.reviewProposal(proposal);
      }
    }
  }

  /**
   * Check if proposal is relevant to this steward's workstream
   */
  private isRelevantToWorkstream(proposal: Proposal): boolean {
    const titleLower = proposal.title.toLowerCase();

    const workstreamKeywords: Record<WorkstreamType, string[]> = {
      public_goods: ['public', 'commons', 'open source', 'retroactive', 'grant'],
      ecosystem: ['ecosystem', 'integration', 'partnership', 'growth'],
      metagovernance: ['governance', 'voting', 'delegation', 'constitution'],
      treasury: ['treasury', 'budget', 'funding', 'allocation', 'spending'],
      community: ['community', 'education', 'outreach', 'event', 'contributor'],
      technical: ['technical', 'protocol', 'upgrade', 'security', 'audit'],
    };

    const keywords = workstreamKeywords[this.workstream] || [];
    return keywords.some(kw => titleLower.includes(kw));
  }

  /**
   * Review a specific proposal
   */
  reviewProposal(proposal: Proposal): GrantReview {
    this.proposalsReviewed++;

    const assessment = this.assessProposal(proposal);
    const review: GrantReview = {
      proposalId: proposal.uniqueId,
      recommendation: assessment.recommendation,
      reviewNotes: assessment.notes,
      timestamp: this.model.currentStep,
    };

    this.grantReviews.push(review);

    // Track approvals/rejections
    if (assessment.recommendation === 'approve') {
      this.grantsApproved++;
    } else if (assessment.recommendation === 'reject') {
      this.grantsRejected++;
    }

    // Emit review event
    if (this.model.eventBus) {
      this.model.eventBus.publish('steward_review', {
        step: this.model.currentStep,
        stewardId: this.uniqueId,
        workstream: this.workstream,
        proposalId: proposal.uniqueId,
        recommendation: assessment.recommendation,
      });
    }

    return review;
  }

  /**
   * Assess a proposal and provide recommendation
   */
  private assessProposal(proposal: Proposal): {
    recommendation: 'approve' | 'reject' | 'revise';
    notes: string;
  } {
    let score = 0.5;
    const notes: string[] = [];

    // Factor 1: Budget appropriateness
    if (proposal.fundingGoal > 0 && this.model.dao) {
      const treasuryBalance = this.model.dao.treasury.getTokenBalance(this.model.dao.tokenSymbol);
      const treasuryRatio = proposal.fundingGoal / Math.max(treasuryBalance, 1);

      if (treasuryRatio > 0.1) {
        score -= this.fiscalConservatism * 0.3;
        notes.push('High treasury impact');
      }

      // Within steward's direct authority?
      if (proposal.fundingGoal <= this.budgetAuthority) {
        score += 0.15;
        notes.push('Within budget authority');
      }
    }

    // Factor 2: Workstream alignment
    if (this.isRelevantToWorkstream(proposal)) {
      score += 0.2;
      notes.push(`Aligned with ${this.workstream} workstream`);
    }

    // Factor 3: Community support signals
    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    if (totalVotes > 3) {
      const supportRatio = proposal.votesFor / totalVotes;
      score += (supportRatio - 0.5) * 0.2;
      if (supportRatio > 0.7) {
        notes.push('Strong community support');
      }
    }

    // Factor 4: Proposal quality heuristics
    if (proposal.title.length > 20) {
      score += 0.05;
    }

    // Factor 5: Diligence-based random assessment
    score += (random() - 0.5) * (1 - this.reviewDiligence) * 0.3;

    // Determine recommendation
    let recommendation: 'approve' | 'reject' | 'revise';
    if (score >= 0.65) {
      recommendation = 'approve';
    } else if (score <= 0.35) {
      recommendation = 'reject';
    } else {
      recommendation = 'revise';
    }

    return {
      recommendation,
      notes: notes.join('; ') || 'Standard review',
    };
  }

  /**
   * Gate a proposal (block from advancing)
   */
  gateProposal(proposal: Proposal, reason: string): boolean {
    if (!this.proposalGatingPower) return false;

    this.proposalsGated++;

    if (this.model.eventBus) {
      this.model.eventBus.publish('proposal_gated', {
        step: this.model.currentStep,
        stewardId: this.uniqueId,
        proposalId: proposal.uniqueId,
        reason,
      });
    }

    return true;
  }

  /**
   * Engage with community (comments, discussions)
   */
  private engageWithCommunity(): void {
    // Leave comments on proposals in workstream
    if (!this.model.dao) return;

    const relevantProposals = this.model.dao.proposals.filter(
      p => p.status === 'open' &&
           this.isRelevantToWorkstream(p) &&
           !this.comments.has(p.uniqueId)
    );

    if (relevantProposals.length > 0) {
      const proposal = randomChoice(relevantProposals);
      const sentiment = random() < 0.6 ? 'constructive' : 'neutral';
      this.leaveComment(proposal, sentiment);
    }
  }

  /**
   * Vote on proposals relevant to this steward
   */
  private voteOnRelevantProposals(): void {
    if (!this.model.dao) return;

    // Respect votingActivity parameter
    const votingActivity = this.model.dao.votingActivity ?? 0.3;
    if (random() >= votingActivity) {
      return;  // Steward decides not to vote this step
    }

    const proposals = this.model.dao.proposals.filter(
      p => p.status === 'open' && !this.votes.has(p.uniqueId)
    );

    for (const proposal of proposals) {
      // More likely to vote on relevant proposals
      const relevant = this.isRelevantToWorkstream(proposal);
      if (relevant || random() < 0.2) {
        this.voteAsSteward(proposal);
        break;  // One vote per step
      }
    }
  }

  /**
   * Vote on a proposal as a steward through the base class pipeline.
   */
  private voteAsSteward(proposal: Proposal): void {
    // Store assessment for decideVote override
    const review = this.grantReviews.find(r => r.proposalId === proposal.uniqueId);
    if (review) {
      this.pendingStewardDecision = review.recommendation === 'approve';
    } else {
      const assessment = this.assessProposal(proposal);
      this.pendingStewardDecision = assessment.recommendation === 'approve';
    }

    // Vote through base class pipeline (delegation, power policy, fatigue)
    this.voteOnProposal(proposal);
    this.pendingStewardDecision = null;
  }

  /**
   * Promote steward level
   */
  promote(): void {
    if (this.stewardLevel === 'junior') {
      this.stewardLevel = 'senior';
      this.budgetAuthority *= 2;
    } else if (this.stewardLevel === 'senior') {
      this.stewardLevel = 'lead';
      this.budgetAuthority *= 2;
    }
  }

  /**
   * Get steward statistics
   */
  getStewardStats(): {
    workstream: WorkstreamType;
    level: string;
    termRemaining: number;
    proposalsReviewed: number;
    grantsApproved: number;
    grantsRejected: number;
    proposalsGated: number;
    budgetAuthority: number;
  } {
    return {
      workstream: this.workstream,
      level: this.stewardLevel,
      termRemaining: Math.max(0, this.stewardTerm.end - this.model.currentStep),
      proposalsReviewed: this.proposalsReviewed,
      grantsApproved: this.grantsApproved,
      grantsRejected: this.grantsRejected,
      proposalsGated: this.proposalsGated,
      budgetAuthority: this.budgetAuthority,
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
    proposalsReviewed: number;
    grantsApproved: number;
    diligentReviews: number;
    quickReviews: number;
    communityEngagements: number;
  } {
    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      proposalsReviewed: this.proposalsReviewed,
      grantsApproved: this.grantsApproved,
      diligentReviews: this.diligentReviews,
      quickReviews: this.quickReviews,
      communityEngagements: this.communityEngagements,
    };
  }
}
