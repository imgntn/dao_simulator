/**
 * Developer Advisory Board (dAB) Member Agent
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

export interface UpgradeReview {
  proposalId: string;
  recommendation: 'approve' | 'reject' | 'needs_changes';
  technicalScore: number;  // 0-1
  securityScore: number;   // 0-1
  notes: string[];
  timestamp: number;
}

export class DABMember extends DAOMember {
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
  }

  step(): void {
    super.step();

    if (!this.model.dao || !this.isActive) return;

    // Review pending upgrade proposals
    if (random() < this.technicalExpertise * 0.2) {
      this.reviewUpgradeProposals();
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
}
