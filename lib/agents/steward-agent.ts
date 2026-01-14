/**
 * Steward Agent
 *
 * Represents stewards in DAOs like Gitcoin and ENS.
 * Responsible for reviewing proposals, managing grants, and community oversight.
 * Often serves in workstreams or sub-DAOs.
 */

import { DAOMember } from './base';
import type { Proposal } from '../data-structures/proposal';
import type { DAOModel } from '../engine/model';
import { random, randomChoice, randomInt } from '../utils/random';

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

  step(): void {
    super.step();

    if (!this.model.dao) return;

    // Check if term has expired
    if (this.isTermExpired()) {
      // Reduced activity after term expires
      if (random() < 0.05) {
        this.voteOnRandomProposal();
      }
      return;
    }

    // Active steward duties
    if (random() < this.reviewDiligence * 0.2) {
      this.reviewPendingProposals();
    }

    if (random() < this.communityEngagement * 0.15) {
      this.engageWithCommunity();
    }

    // Vote on proposals relevant to workstream
    if (random() < 0.2) {
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

    const proposals = this.model.dao.proposals.filter(
      p => p.status === 'open' && !this.votes.has(p.uniqueId)
    );

    for (const proposal of proposals) {
      // More likely to vote on relevant proposals
      const relevant = this.isRelevantToWorkstream(proposal);
      if (relevant || random() < 0.2) {
        this.voteAsStEward(proposal);
        break;  // One vote per step
      }
    }
  }

  /**
   * Vote on a proposal as a steward
   */
  private voteAsStEward(proposal: Proposal): void {
    // Check if already reviewed
    const review = this.grantReviews.find(r => r.proposalId === proposal.uniqueId);

    let support: boolean;
    if (review) {
      // Vote based on review
      support = review.recommendation === 'approve';
    } else {
      // Quick assessment
      const assessment = this.assessProposal(proposal);
      support = assessment.recommendation === 'approve';
    }

    // Stewards vote with their token weight
    const weight = Math.min(this.tokens, 1000);  // Cap influence
    proposal.addVote(this.uniqueId, support, weight);
    this.votes.set(proposal.uniqueId, { vote: support, weight });
    this.markActive();
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
}
