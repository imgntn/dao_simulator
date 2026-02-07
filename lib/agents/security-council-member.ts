/**
 * Security Council Member Agent
 * Upgraded with Q-learning to optimize security review strategies
 *
 * Represents members of security councils in DAOs like Arbitrum and Optimism.
 * Can vote on emergency proposals, veto dangerous upgrades, and fast-track security fixes.
 */

import { DAOMember } from './base';
import type { Proposal } from '../data-structures/proposal';
import type { MultiStageProposal } from '../data-structures/multi-stage-proposal';
import type { DAOModel } from '../engine/model';
import { random, randomChoice } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

type SecurityAction = 'review_high_risk' | 'review_emergency' | 'review_standard' | 'veto_dangerous' | 'fast_track' | 'hold';

export class SecurityCouncilMember extends DAOMember {
  static readonly ACTIONS: readonly SecurityAction[] = [
    'review_high_risk', 'review_emergency', 'review_standard', 'veto_dangerous', 'fast_track', 'hold'
  ];

  // Learning infrastructure
  learning: LearningMixin;

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

  // Learning tracking
  lastAction: SecurityAction | null = null;
  lastState: string | null = null;
  riskAssessments: Array<{ risk: number; outcome: 'correct' | 'false_positive' | 'missed' }> = [];

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
   * Get state representation for security decisions
   */
  private getSecurityState(): string {
    if (!this.model.dao) return 'none|low|good';

    // Threat level state
    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
    const highRiskProposals = openProposals.filter(p => this.assessProposalRisk(p) > 0.5);
    const threatState = highRiskProposals.length === 0 ? 'safe' :
                        highRiskProposals.length < 2 ? 'low' :
                        highRiskProposals.length < 4 ? 'moderate' : 'high';

    // Emergency state
    const emergencyProposals = openProposals.filter(p =>
      p.title.toLowerCase().includes('emergency')
    );
    const emergencyState = emergencyProposals.length > 0 ? 'emergency' : 'routine';

    // Accuracy state
    const recentAssessments = this.riskAssessments.slice(-10);
    const accuracy = recentAssessments.length > 0
      ? recentAssessments.filter(a => a.outcome === 'correct').length / recentAssessments.length
      : 0.5;
    const accuracyState = accuracy < 0.4 ? 'poor' :
                          accuracy < 0.6 ? 'moderate' :
                          accuracy < 0.8 ? 'good' : 'excellent';

    return StateDiscretizer.combineState(threatState, emergencyState, accuracyState);
  }

  /**
   * Choose security action using Q-learning
   */
  private chooseSecurityAction(): SecurityAction {
    const state = this.getSecurityState();

    if (!settings.learning_enabled) {
      return this.heuristicSecurityAction();
    }

    return this.learning.selectAction(
      state,
      [...SecurityCouncilMember.ACTIONS]
    ) as SecurityAction;
  }

  /**
   * Heuristic-based security action (fallback)
   */
  private heuristicSecurityAction(): SecurityAction {
    if (!this.model.dao) return 'hold';

    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');

    // Check for emergencies first
    const emergencies = openProposals.filter(p =>
      p.title.toLowerCase().includes('emergency')
    );
    if (emergencies.length > 0) {
      return 'review_emergency';
    }

    // Check for high-risk proposals
    const highRisk = openProposals.filter(p => this.assessProposalRisk(p) > this.vetoThreshold);
    if (highRisk.length > 0) {
      return highRisk[0].title.toLowerCase().includes('security') ? 'fast_track' : 'review_high_risk';
    }

    // Check for dangerous proposals to veto
    const dangerous = openProposals.filter(p => this.assessProposalRisk(p) > 0.7);
    if (dangerous.length > 0) {
      return 'veto_dangerous';
    }

    if (openProposals.length > 0) {
      return 'review_standard';
    }

    return 'hold';
  }

  /**
   * Execute security action and return reward
   */
  private executeSecurityAction(action: SecurityAction): number {
    if (!this.model.dao) return 0;

    let reward = 0;
    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');

    switch (action) {
      case 'review_high_risk': {
        const highRisk = openProposals.filter(p => this.assessProposalRisk(p) > this.vetoThreshold);
        for (const proposal of highRisk) {
          if (!this.votes.has(proposal.uniqueId)) {
            this.reviewProposal(proposal);
            reward += 0.5;
          }
        }
        break;
      }
      case 'review_emergency': {
        const emergencies = openProposals.filter(p =>
          p.title.toLowerCase().includes('emergency')
        );
        for (const proposal of emergencies) {
          if (!this.votes.has(proposal.uniqueId)) {
            this.voteOnEmergencyProposal(proposal, true);
            reward += 1.0;
          }
        }
        break;
      }
      case 'review_standard': {
        for (const proposal of openProposals) {
          if (!this.votes.has(proposal.uniqueId)) {
            this.reviewProposal(proposal);
            reward += 0.2;
            break; // One at a time
          }
        }
        break;
      }
      case 'veto_dangerous': {
        const dangerous = openProposals.filter(p => this.assessProposalRisk(p) > 0.7);
        if (dangerous.length > 0) {
          this.initiateVeto(dangerous[0], 'High risk assessment');
          reward = 0.8;
        }
        break;
      }
      case 'fast_track': {
        // Fast-track security fixes
        const securityFixes = openProposals.filter(p =>
          p.title.toLowerCase().includes('security') ||
          p.title.toLowerCase().includes('fix')
        );
        if (securityFixes.length > 0) {
          const proposal = securityFixes[0];
          proposal.addVote(this.uniqueId, true, 1);
          this.votes.set(proposal.uniqueId, { vote: true, weight: 1 });
          this.markActive();
          reward = 0.6;
        }
        break;
      }
      case 'hold':
        return 0;
    }

    return reward;
  }

  /**
   * Update Q-values based on security outcomes
   */
  private updateLearning(): void {
    if (!settings.learning_enabled || !this.lastAction || !this.lastState) return;
    if (!this.model.dao) return;

    // Check closed proposals for assessment accuracy
    const closedProposals = this.model.dao.proposals.filter(
      p => p.status !== 'open' && this.votes.has(p.uniqueId)
    );

    for (const proposal of closedProposals.slice(-5)) {
      const vote = this.votes.get(proposal.uniqueId);
      if (!vote) continue;

      const risk = this.assessProposalRisk(proposal);
      const passed = proposal.status === 'approved' || proposal.status === 'completed';
      const votedAgainst = !vote.vote;

      let outcome: 'correct' | 'false_positive' | 'missed';
      if (risk > 0.5 && votedAgainst && !passed) {
        outcome = 'correct'; // Correctly blocked risky proposal
      } else if (risk > 0.5 && !votedAgainst && passed && proposal.status === 'completed') {
        outcome = 'correct'; // Risk was manageable
      } else if (risk > 0.5 && votedAgainst && passed) {
        outcome = 'false_positive'; // Over-cautious
      } else if (risk < 0.3 && !passed) {
        outcome = 'missed'; // Missed a problem
      } else {
        outcome = 'correct';
      }

      this.riskAssessments.push({ risk, outcome });
    }

    // Limit history
    if (this.riskAssessments.length > 50) {
      this.riskAssessments.splice(0, this.riskAssessments.length - 50);
    }

    // Calculate reward
    const recentAssessments = this.riskAssessments.slice(-5);
    const accuracy = recentAssessments.length > 0
      ? recentAssessments.filter(a => a.outcome === 'correct').length / recentAssessments.length
      : 0.5;

    let reward = (accuracy - 0.5) * 10;
    reward = Math.max(-10, Math.min(10, reward));

    const currentState = this.getSecurityState();

    this.learning.update(
      this.lastState,
      this.lastAction,
      reward,
      currentState,
      [...SecurityCouncilMember.ACTIONS]
    );
  }

  step(): void {
    super.step();

    if (!this.model.dao) return;

    // Update learning from previous step
    this.updateLearning();

    // Track state before action
    this.lastState = this.getSecurityState();

    // Security council members are vigilant - check proposals frequently
    if (random() < this.vigilanceLevel * 0.3) {
      const action = this.chooseSecurityAction();
      this.executeSecurityAction(action);
      this.lastAction = action;
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
    vetoesInitiated: number;
    assessmentAccuracy: number;
  } {
    const accuracy = this.riskAssessments.length > 0
      ? this.riskAssessments.filter(a => a.outcome === 'correct').length / this.riskAssessments.length
      : 0;

    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      upgradesReviewed: this.upgradesReviewed,
      vetoesInitiated: this.vetoesInitiated,
      assessmentAccuracy: accuracy,
    };
  }
}
