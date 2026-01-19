/**
 * Security Council Member Agent
 *
 * Represents members of security councils in DAOs like Arbitrum and Optimism.
 * Can vote on emergency proposals, veto dangerous upgrades, and fast-track security fixes.
 */

import { DAOMember } from './base';
import type { Proposal } from '../data-structures/proposal';
import type { MultiStageProposal } from '../data-structures/multi-stage-proposal';
import type { DAOModel } from '../engine/model';
import { random, randomChoice } from '../utils/random';

export class SecurityCouncilMember extends DAOMember {
  // Security council specific properties
  councilRole: 'member' | 'chair' = 'member';
  securityExpertise: number;  // 0-1 score
  vigilanceLevel: number;  // How closely they monitor proposals
  emergencyResponseBias: number;  // Likelihood to approve emergency actions
  vetoThreshold: number;  // Risk level that triggers veto consideration
  termEndStep: number | null = null;  // When their term expires

  // Tracking
  emergencyActionsVoted: number = 0;
  vetoesInitiated: number = 0;
  upgradesReviewed: number = 0;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number,
    reputation: number,
    location: string,
    daoId?: string
  ) {
    super(uniqueId, model, tokens, reputation, location, 'supermajority', daoId);

    // Security council members have high security expertise
    this.securityExpertise = 0.7 + random() * 0.3;  // 0.7-1.0
    this.vigilanceLevel = 0.6 + random() * 0.4;  // 0.6-1.0
    this.emergencyResponseBias = 0.5 + random() * 0.3;  // 0.5-0.8
    this.vetoThreshold = 0.3 + random() * 0.4;  // 0.3-0.7
  }

  step(): void {
    super.step();

    if (!this.model.dao) return;

    // Security council members are vigilant - check proposals frequently
    if (random() < this.vigilanceLevel * 0.3) {
      this.reviewProposals();
    }

    // Occasionally participate in governance discussions
    if (random() < 0.1) {
      this.leaveCommentOnRandomProposal();
    }
  }

  /**
   * Review proposals for security concerns
   */
  private reviewProposals(): void {
    if (!this.model.dao) return;

    // Respect votingActivity parameter
    const votingActivity = this.model.dao.votingActivity ?? 0.3;
    if (random() >= votingActivity) {
      return;  // Security council member decides not to participate this step
    }

    const openProposals = this.model.dao.proposals.filter(
      p => p.status === 'open' && !this.votes.has(p.uniqueId)
    );

    for (const proposal of openProposals) {
      this.upgradesReviewed++;
      this.reviewProposal(proposal);
    }
  }

  /**
   * Review a specific proposal for security concerns
   */
  private reviewProposal(proposal: Proposal): void {
    const riskLevel = this.assessProposalRisk(proposal);

    // If risk is high, consider vetoing or voting against
    if (riskLevel > this.vetoThreshold) {
      if (random() < this.securityExpertise) {
        // Vote against risky proposals
        this.castSecurityVote(proposal, false, `High risk assessment: ${(riskLevel * 100).toFixed(0)}%`);
      }
    } else {
      // Safe enough - vote based on merit
      const support = this.decideVote(proposal) === 'yes';
      this.castSecurityVote(proposal, support);
    }
  }

  /**
   * Assess the risk level of a proposal (0-1)
   */
  private assessProposalRisk(proposal: Proposal): number {
    let risk = 0.1;  // Base risk

    // Higher funding requests = higher risk
    if (proposal.fundingGoal > 0 && this.model.dao) {
      const treasuryBalance = this.model.dao.treasury.getTokenBalance(this.model.dao.tokenSymbol);
      const treasuryRatio = proposal.fundingGoal / Math.max(treasuryBalance, 1);
      risk += treasuryRatio * 0.3;
    }

    // Check for security-related keywords in title/description
    const securityKeywords = ['upgrade', 'emergency', 'security', 'patch', 'vulnerability', 'exploit'];
    const titleLower = proposal.title.toLowerCase();
    const hasSecurityKeyword = securityKeywords.some(kw => titleLower.includes(kw));

    if (hasSecurityKeyword) {
      risk += 0.2;
    }

    // Constitutional proposals are higher stakes
    const multiStage = proposal as unknown as MultiStageProposal;
    if (multiStage.proposalCategory === 'constitutional') {
      risk += 0.2;
    }

    // Factor in expertise - experts better at spotting real vs false positives
    risk = risk * (1 - this.securityExpertise * 0.3);

    return Math.min(1, risk);
  }

  /**
   * Cast a vote as a security council member
   */
  private castSecurityVote(proposal: Proposal, support: boolean, reason?: string): void {
    // Security council votes are weighted (1 vote per member, not token-weighted)
    proposal.addVote(this.uniqueId, support, 1);
    this.votes.set(proposal.uniqueId, { vote: support, weight: 1 });
    this.markActive();

    // Leave a comment explaining the security assessment
    if (reason) {
      this.leaveComment(proposal, support ? 'positive' : 'negative');
    }
  }

  /**
   * Handle emergency proposals
   */
  voteOnEmergencyProposal(proposal: Proposal, isEmergency: boolean): void {
    this.emergencyActionsVoted++;

    if (isEmergency) {
      // Emergency proposals get expedited review
      const risk = this.assessProposalRisk(proposal);
      const trustEmergency = random() < this.emergencyResponseBias;

      // More likely to approve genuine emergencies, but still assess risk
      const support = (risk < 0.7 && trustEmergency) || risk < 0.3;
      this.castSecurityVote(
        proposal,
        support,
        isEmergency ? 'Emergency action review' : undefined
      );
    } else {
      // Non-emergency goes through normal review
      this.reviewProposal(proposal);
    }
  }

  /**
   * Initiate a veto on a dangerous proposal
   */
  initiateVeto(proposal: Proposal, reason: string): boolean {
    if (!this.model.dao) return false;

    const multiStage = proposal as unknown as MultiStageProposal;

    // Only veto proposals in veto-able stages
    if (multiStage.currentStage !== 'veto_window' && multiStage.currentStage !== 'timelock') {
      return false;
    }

    this.vetoesInitiated++;

    // Emit veto initiation event
    if (this.model.eventBus) {
      this.model.eventBus.publish('security_veto_initiated', {
        step: this.model.currentStep,
        councilMember: this.uniqueId,
        proposalId: proposal.uniqueId,
        reason,
      });
    }

    return true;
  }

  /**
   * Set council role (chair has additional powers)
   */
  setCouncilRole(role: 'member' | 'chair'): void {
    this.councilRole = role;
  }

  /**
   * Check if term has expired
   */
  isTermExpired(): boolean {
    if (this.termEndStep === null) return false;
    return this.model.currentStep >= this.termEndStep;
  }

  /**
   * Get council member statistics
   */
  getCouncilStats(): {
    role: string;
    expertise: number;
    vigilance: number;
    emergencyActions: number;
    vetoes: number;
    upgradesReviewed: number;
    termExpired: boolean;
  } {
    return {
      role: this.councilRole,
      expertise: this.securityExpertise,
      vigilance: this.vigilanceLevel,
      emergencyActions: this.emergencyActionsVoted,
      vetoes: this.vetoesInitiated,
      upgradesReviewed: this.upgradesReviewed,
      termExpired: this.isTermExpired(),
    };
  }
}
