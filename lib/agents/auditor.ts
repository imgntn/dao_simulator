// Auditor Agent - flags suspicious proposals and creates disputes
// Upgraded with Q-learning to learn optimal auditing strategies

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { VotingStrategy } from '../utils/voting-strategies';
import { Dispute } from '../data-structures/dispute';
import { random } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

type AuditAction = 'flag_high_risk' | 'flag_suspicious' | 'investigate' | 'approve' | 'hold' | 'escalate';

interface AuditRecord {
  proposalId: string;
  action: AuditAction;
  flagged: boolean;
  outcome: 'correct' | 'false_positive' | 'missed' | 'pending';
}

export class Auditor extends DAOMember {
  static readonly ACTIONS: readonly AuditAction[] = [
    'flag_high_risk', 'flag_suspicious', 'investigate', 'approve', 'hold', 'escalate'
  ];

  // Learning infrastructure
  learning: LearningMixin;

  // Audit tracking
  auditRecords: Map<string, AuditRecord> = new Map();
  flaggedProposals: Set<string> = new Set();
  disputesCreated: number = 0;

  // Learning tracking
  lastAction: AuditAction | null = null;
  lastState: string | null = null;
  lastReputation: number;
  auditHistory: Array<{ correct: boolean; action: AuditAction }> = [];

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy?: string | VotingStrategy | null
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy ?? undefined);
    this.lastReputation = reputation;

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
   * Get state representation for audit decisions
   */
  private getAuditState(): string {
    if (!this.model.dao) return 'none|low|few';

    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');

    // Risk level state - based on high-value proposals
    const highValueCount = openProposals.filter(p => (p.fundingGoal || 0) > 1000).length;
    const riskState = highValueCount === 0 ? 'low' :
                      highValueCount < 3 ? 'moderate' :
                      highValueCount < 5 ? 'high' : 'critical';

    // Suspicion level state
    const suspiciousCount = openProposals.filter(p =>
      p.description.toLowerCase().includes('suspicious') ||
      p.description.toLowerCase().includes('urgent') ||
      (p.fundingGoal || 0) > 5000
    ).length;
    const suspicionState = suspiciousCount === 0 ? 'clear' :
                           suspiciousCount < 2 ? 'low' :
                           suspiciousCount < 4 ? 'moderate' : 'high';

    // Workload state
    const pendingAudits = openProposals.length - this.flaggedProposals.size;
    const workloadState = pendingAudits === 0 ? 'none' :
                          pendingAudits < 3 ? 'light' :
                          pendingAudits < 6 ? 'normal' : 'heavy';

    return StateDiscretizer.combineState(riskState, suspicionState, workloadState);
  }

  /**
   * Choose audit action using Q-learning
   */
  private chooseAuditAction(): AuditAction {
    const state = this.getAuditState();

    if (!settings.learning_enabled) {
      return this.heuristicAuditAction();
    }

    return this.learning.selectAction(
      state,
      [...Auditor.ACTIONS]
    ) as AuditAction;
  }

  /**
   * Heuristic-based audit action (fallback)
   */
  private heuristicAuditAction(): AuditAction {
    if (!this.model.dao) return 'hold';

    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
    if (openProposals.length === 0) return 'hold';

    // Check for high-risk proposals first
    const highRisk = openProposals.filter(p =>
      (p.fundingGoal || 0) > 5000 && !this.flaggedProposals.has(p.uniqueId)
    );
    if (highRisk.length > 0) {
      return 'flag_high_risk';
    }

    // Check for suspicious proposals
    const suspicious = openProposals.filter(p =>
      p.description.toLowerCase().includes('suspicious') && !this.flaggedProposals.has(p.uniqueId)
    );
    if (suspicious.length > 0) {
      return 'flag_suspicious';
    }

    // Investigate if we have pending unflagged proposals
    const unflagged = openProposals.filter(p => !this.flaggedProposals.has(p.uniqueId));
    if (unflagged.length > 0) {
      return 'investigate';
    }

    return 'hold';
  }

  /**
   * Execute audit action and return reward
   */
  private executeAuditAction(action: AuditAction): number {
    if (!this.model.dao) return 0;

    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
    if (openProposals.length === 0 && action !== 'hold') return -0.1;

    let reward = 0;

    switch (action) {
      case 'flag_high_risk': {
        // Find and flag high-risk proposals
        const highRisk = openProposals.filter(p =>
          (p.fundingGoal || 0) > 1000 && !this.flaggedProposals.has(p.uniqueId)
        );
        if (highRisk.length > 0) {
          for (const proposal of highRisk.slice(0, 2)) {
            this.flagProposal(proposal);
            reward += 0.5;
          }
        } else {
          reward = -0.2; // No high-risk to flag
        }
        break;
      }
      case 'flag_suspicious': {
        // Find and flag suspicious proposals
        const suspicious = openProposals.filter(p =>
          (p.description.toLowerCase().includes('suspicious') ||
           p.description.toLowerCase().includes('urgent')) &&
          !this.flaggedProposals.has(p.uniqueId)
        );
        if (suspicious.length > 0) {
          for (const proposal of suspicious.slice(0, 2)) {
            this.flagProposal(proposal);
            reward += 0.3;
          }
        } else {
          reward = -0.1;
        }
        break;
      }
      case 'investigate': {
        // Review proposals and decide
        const unflagged = openProposals.filter(p => !this.flaggedProposals.has(p.uniqueId));
        if (unflagged.length > 0) {
          for (const proposal of unflagged.slice(0, 2)) {
            const shouldFlag = this.assessProposal(proposal);
            if (shouldFlag) {
              this.flagProposal(proposal);
              reward += 0.3;
            } else {
              // Record as approved
              this.auditRecords.set(proposal.uniqueId, {
                proposalId: proposal.uniqueId,
                action: 'approve',
                flagged: false,
                outcome: 'pending',
              });
              reward += 0.1;
            }
          }
        }
        break;
      }
      case 'approve': {
        // Approve unflagged proposals
        const unflagged = openProposals.filter(p => !this.flaggedProposals.has(p.uniqueId));
        if (unflagged.length > 0) {
          for (const proposal of unflagged.slice(0, 3)) {
            this.auditRecords.set(proposal.uniqueId, {
              proposalId: proposal.uniqueId,
              action: 'approve',
              flagged: false,
              outcome: 'pending',
            });
          }
          reward = 0.1;
        }
        break;
      }
      case 'escalate': {
        // Escalate flagged proposals to disputes
        const flagged = openProposals.filter(p => this.flaggedProposals.has(p.uniqueId));
        if (flagged.length > 0) {
          const proposal = flagged[0];
          if (proposal.creator) {
            const dispute = new Dispute(
              this.model.dao,
              [proposal.creator],
              `Escalated audit for ${proposal.title}`,
              2, // Higher severity
              proposal.project || null,
              proposal.creator
            );
            this.model.dao.addDispute(dispute);
            this.disputesCreated++;
            reward = 0.5;

            if (this.model.eventBus) {
              this.model.eventBus.publish('audit_escalated', {
                step: this.model.currentStep,
                auditor: this.uniqueId,
                proposalId: proposal.uniqueId,
                disputeId: dispute.uniqueId,
              });
            }
          }
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
   * Assess if a proposal should be flagged
   */
  private assessProposal(proposal: { fundingGoal?: number; description: string }): boolean {
    const highValue = (proposal.fundingGoal || 0) > 1000;
    const suspicious = proposal.description.toLowerCase().includes('suspicious');
    return highValue || suspicious;
  }

  /**
   * Flag a proposal as suspicious
   */
  private flagProposal(proposal: { uniqueId: string; title: string; creator?: string; project?: string | null }): void {
    if (!this.model.dao || this.flaggedProposals.has(proposal.uniqueId)) return;

    this.flaggedProposals.add(proposal.uniqueId);

    this.auditRecords.set(proposal.uniqueId, {
      proposalId: proposal.uniqueId,
      action: this.lastAction || 'investigate',
      flagged: true,
      outcome: 'pending',
    });

    if (proposal.creator) {
      const dispute = new Dispute(
        this.model.dao,
        [proposal.creator],
        `Audit flag for ${proposal.title}`,
        1,
        proposal.project || null,
        proposal.creator
      );
      this.model.dao.addDispute(dispute);
      this.disputesCreated++;

      if (this.model.eventBus) {
        this.model.eventBus.publish('dispute_created', {
          step: this.model.currentStep,
          disputeId: dispute.uniqueId,
          agentId: this.uniqueId,
          proposalId: proposal.uniqueId,
          reason: 'audit_flag',
        });
      }
    }
  }

  /**
   * Update Q-values based on audit outcomes
   */
  private updateLearning(): void {
    if (!settings.learning_enabled || !this.lastAction || !this.lastState) return;
    if (!this.model.dao) return;

    // Check outcomes of previous audits
    let reward = 0;
    const closedProposals = this.model.dao.proposals.filter(
      p => p.status !== 'open' && this.auditRecords.has(p.uniqueId)
    );

    for (const proposal of closedProposals) {
      const record = this.auditRecords.get(proposal.uniqueId);
      if (!record || record.outcome !== 'pending') continue;

      const passed = proposal.status === 'approved' || proposal.status === 'completed';

      if (record.flagged) {
        if (!passed) {
          // Correctly flagged a bad proposal
          record.outcome = 'correct';
          reward += 5;
          this.auditHistory.push({ correct: true, action: record.action });
        } else {
          // False positive - flagged a good proposal
          record.outcome = 'false_positive';
          reward -= 2;
          this.auditHistory.push({ correct: false, action: record.action });
        }
      } else {
        if (passed) {
          // Correctly approved a good proposal
          record.outcome = 'correct';
          reward += 1;
          this.auditHistory.push({ correct: true, action: record.action });
        } else {
          // Missed a bad proposal
          record.outcome = 'missed';
          reward -= 5;
          this.auditHistory.push({ correct: false, action: record.action });
        }
      }
    }

    // Include reputation change as reward signal
    const reputationChange = this.reputation - this.lastReputation;
    reward += reputationChange * 0.1;
    reward = Math.max(-10, Math.min(10, reward));

    const currentState = this.getAuditState();

    this.learning.update(
      this.lastState,
      this.lastAction,
      reward,
      currentState,
      [...Auditor.ACTIONS]
    );
  }

  /**
   * Legacy method for compatibility
   */
  reviewProposals(): void {
    if (!this.model.dao) return;

    const proposals = [...this.model.dao.proposals];
    for (const proposal of proposals) {
      if (proposal.status !== 'open') continue;

      const isSuspicious =
        (proposal.fundingGoal || 0) > 1000 ||
        proposal.description.toLowerCase().includes('suspicious');

      if (isSuspicious && proposal.creator && !this.flaggedProposals.has(proposal.uniqueId)) {
        this.flagProposal(proposal);
      }
    }
  }

  step(): void {
    if (!this.model.dao) return;

    // Update learning from previous step
    this.updateLearning();

    // Track state before action
    this.lastReputation = this.reputation;
    this.lastState = this.getAuditState();

    // Choose and execute action
    const action = this.chooseAuditAction();
    this.executeAuditAction(action);
    this.lastAction = action;

    // Participate in governance
    this.voteOnRandomProposal();

    if (random() < (this.model.dao.commentProbability || 0.1)) {
      this.leaveCommentOnRandomProposal();
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
    flaggedCount: number;
    disputesCreated: number;
    auditAccuracy: number;
  } {
    const correctAudits = this.auditHistory.filter(a => a.correct).length;
    const auditAccuracy = this.auditHistory.length > 0 ? correctAudits / this.auditHistory.length : 0;

    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      flaggedCount: this.flaggedProposals.size,
      disputesCreated: this.disputesCreated,
      auditAccuracy,
    };
  }
}
