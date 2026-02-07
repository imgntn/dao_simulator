/**
 * Foundation Agent
 *
 * Represents foundation entities like Arbitrum Foundation and Optimism Foundation.
 * Handles operational roles, grant administration, and governance support.
 * Upgraded with Q-learning for optimal grant administration and governance strategies.
 */

import { DAOMember } from './base';
import type { Proposal } from '../data-structures/proposal';
import type { DAOModel } from '../engine/model';
import { random, randomChoice, randomInt } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

type FoundationActionType = 'approve_large_grant' | 'approve_small_grant' | 'support_governance' | 'publish_update' | 'sponsor_proposal' | 'hold';

export type FoundationType =
  | 'arbitrum'   // Arbitrum Foundation
  | 'optimism'   // Optimism Foundation
  | 'ens'        // ENS Foundation
  | 'generic';   // Generic foundation

export interface GrantProgram {
  id: string;
  name: string;
  budget: number;
  allocated: number;
  grantsMade: number;
}

export interface FoundationAction {
  type: 'grant' | 'operational' | 'governance_support' | 'communication';
  description: string;
  timestamp: number;
  value?: number;
}

export class FoundationAgent extends DAOMember {
  static readonly ACTIONS: readonly FoundationActionType[] = [
    'approve_large_grant', 'approve_small_grant', 'support_governance', 'publish_update', 'sponsor_proposal', 'hold'
  ];

  // Learning infrastructure
  learning: LearningMixin;

  // Foundation properties
  foundationType: FoundationType;
  foundationName: string;

  // Budget and grants
  operationalBudget: number;
  spentBudget: number = 0;
  grantPrograms: Map<string, GrantProgram> = new Map();

  // Behavioral traits
  transparency: number;     // How transparent in communications
  proactiveness: number;    // How proactive in governance
  grantsGenerosity: number; // Tendency to approve grants

  // Tracking
  actionsLog: FoundationAction[] = [];
  grantsApproved: number = 0;
  proposalsSupported: number = 0;
  private sponsoredProposalIds: Set<string> = new Set();

  // Learning tracking
  lastLearningAction: FoundationActionType | null = null;
  lastState: string | null = null;
  largeGrantsApproved: number = 0;
  smallGrantsApproved: number = 0;
  updatesPublished: number = 0;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number,
    reputation: number,
    location: string,
    foundationType: FoundationType = 'generic',
    foundationName?: string,
    daoId?: string
  ) {
    super(uniqueId, model, tokens, reputation, location, 'majority', daoId);

    this.foundationType = foundationType;
    this.foundationName = foundationName || this.getDefaultFoundationName();

    // Budget
    this.operationalBudget = 100000 + randomInt(0, 50000);

    // Behavioral traits
    this.transparency = 0.7 + random() * 0.3;  // 0.7-1.0
    this.proactiveness = 0.5 + random() * 0.4; // 0.5-0.9
    this.grantsGenerosity = 0.4 + random() * 0.3; // 0.4-0.7

    // Initialize grant programs
    this.initializeGrantPrograms();

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
   * Override vote decision: always vote yes on sponsored proposals.
   */
  override decideVote(topic: Proposal | string): 'yes' | 'no' {
    if (typeof topic === 'object' && topic !== null && 'uniqueId' in topic) {
      const proposal = topic as Proposal;
      if (this.sponsoredProposalIds.has(proposal.uniqueId)) {
        return 'yes';
      }
    }
    return super.decideVote(topic);
  }

  /**
   * Get default foundation name based on type
   */
  private getDefaultFoundationName(): string {
    const names: Record<FoundationType, string> = {
      arbitrum: 'Arbitrum Foundation',
      optimism: 'Optimism Foundation',
      ens: 'ENS Foundation',
      generic: 'DAO Foundation',
    };
    return names[this.foundationType];
  }

  /**
   * Initialize grant programs based on foundation type
   */
  private initializeGrantPrograms(): void {
    switch (this.foundationType) {
      case 'arbitrum':
        this.addGrantProgram('ecosystem', 'Ecosystem Development', 500000);
        this.addGrantProgram('research', 'Research Grants', 200000);
        this.addGrantProgram('education', 'Education & Onboarding', 100000);
        break;

      case 'optimism':
        this.addGrantProgram('builders', 'Builder Grants', 400000);
        this.addGrantProgram('growth', 'Growth Experiments', 300000);
        this.addGrantProgram('governance', 'Governance Fund', 200000);
        break;

      case 'ens':
        this.addGrantProgram('integration', 'Integration Grants', 200000);
        this.addGrantProgram('public_goods', 'Public Goods', 150000);
        break;

      default:
        this.addGrantProgram('general', 'General Grants', 300000);
    }
  }

  /**
   * Add a grant program
   */
  addGrantProgram(id: string, name: string, budget: number): void {
    this.grantPrograms.set(id, {
      id,
      name,
      budget,
      allocated: 0,
      grantsMade: 0,
    });
  }

  /**
   * Get state representation for foundation decisions
   */
  private getFoundationState(): string {
    // Budget state
    const remainingBudget = this.getRemainingBudget();
    const totalBudget = this.getTotalBudget();
    const budgetRatio = remainingBudget / Math.max(1, totalBudget);
    const budgetState = budgetRatio < 0.2 ? 'depleted' :
                        budgetRatio < 0.5 ? 'low' :
                        budgetRatio < 0.8 ? 'adequate' : 'flush';

    // Governance activity state
    const openProposals = this.model.dao?.proposals.filter(p => p.status === 'open').length || 0;
    const activityState = openProposals === 0 ? 'quiet' :
                          openProposals < 5 ? 'normal' :
                          openProposals < 10 ? 'active' : 'busy';

    // Grant velocity state
    const grantRate = this.grantsApproved / Math.max(1, this.model.currentStep / 50);
    const velocityState = grantRate < 0.5 ? 'slow' :
                          grantRate < 1.5 ? 'moderate' :
                          grantRate < 3.0 ? 'fast' : 'rapid';

    return StateDiscretizer.combineState(budgetState, activityState, velocityState);
  }

  /**
   * Get total budget across all grant programs
   */
  private getTotalBudget(): number {
    let total = 0;
    for (const program of this.grantPrograms.values()) {
      total += program.budget;
    }
    return total;
  }

  /**
   * Choose foundation action using Q-learning
   */
  private chooseFoundationAction(): FoundationActionType {
    const state = this.getFoundationState();

    if (!settings.learning_enabled) {
      return this.heuristicFoundationAction();
    }

    return this.learning.selectAction(
      state,
      [...FoundationAgent.ACTIONS]
    ) as FoundationActionType;
  }

  /**
   * Heuristic-based foundation action (fallback)
   */
  private heuristicFoundationAction(): FoundationActionType {
    if (!this.model.dao) return 'hold';

    const remainingBudget = this.getRemainingBudget();
    const openProposals = this.model.dao.proposals.filter(
      p => p.status === 'open' && !this.votes.has(p.uniqueId)
    );

    // Low budget -> small grants only
    if (remainingBudget < 10000) {
      return 'approve_small_grant';
    }

    // High activity -> support governance
    if (openProposals.length > 5) {
      return 'support_governance';
    }

    // Transparency drive
    if (this.transparency > 0.8 && random() < 0.3) {
      return 'publish_update';
    }

    // Default to grants
    return random() < 0.5 ? 'approve_large_grant' : 'approve_small_grant';
  }

  /**
   * Execute foundation action and return reward
   */
  private executeFoundationAction(action: FoundationActionType): number {
    if (!this.model.dao) return 0;

    let reward = 0;

    switch (action) {
      case 'approve_large_grant': {
        const programs = Array.from(this.grantPrograms.values())
          .filter(p => p.budget - p.allocated >= 25000);
        if (programs.length > 0) {
          const program = randomChoice(programs);
          const grantSize = Math.min(
            randomInt(25000, 75000),
            program.budget - program.allocated
          );
          program.allocated += grantSize;
          program.grantsMade++;
          this.grantsApproved++;
          this.largeGrantsApproved++;
          reward = 0.6;

          this.actionsLog.push({
            type: 'grant',
            description: `Approved large grant of ${grantSize} from ${program.name}`,
            timestamp: this.model.currentStep,
            value: grantSize,
          });
        }
        break;
      }
      case 'approve_small_grant': {
        const programs = Array.from(this.grantPrograms.values())
          .filter(p => p.budget - p.allocated >= 5000);
        if (programs.length > 0) {
          const program = randomChoice(programs);
          const grantSize = Math.min(
            randomInt(5000, 24999),
            program.budget - program.allocated
          );
          program.allocated += grantSize;
          program.grantsMade++;
          this.grantsApproved++;
          this.smallGrantsApproved++;
          reward = 0.3;

          this.actionsLog.push({
            type: 'grant',
            description: `Approved small grant of ${grantSize} from ${program.name}`,
            timestamp: this.model.currentStep,
            value: grantSize,
          });
        }
        break;
      }
      case 'support_governance':
        this.supportGovernance();
        reward = 0.4;
        break;
      case 'publish_update':
        this.publishUpdate();
        this.updatesPublished++;
        reward = 0.2;
        break;
      case 'sponsor_proposal': {
        const openProposals = this.model.dao.proposals.filter(
          p => p.status === 'open' && !this.sponsoredProposalIds.has(p.uniqueId)
        );
        if (openProposals.length > 0) {
          const proposal = randomChoice(openProposals);
          this.sponsorProposal(proposal);
          reward = 0.5;
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
   * Update Q-values based on foundation outcomes
   */
  private updateLearning(): void {
    if (!settings.learning_enabled || !this.lastLearningAction || !this.lastState) return;

    // Calculate reward from foundation impact
    const grantEfficiency = this.grantsApproved / Math.max(1, this.getTotalAllocated() / 10000);
    const supportReward = this.proposalsSupported * 0.1;
    const transparencyReward = this.updatesPublished * 0.05;

    let reward = grantEfficiency + supportReward + transparencyReward;
    reward = Math.max(-10, Math.min(10, reward));

    const currentState = this.getFoundationState();

    this.learning.update(
      this.lastState,
      this.lastLearningAction,
      reward,
      currentState,
      [...FoundationAgent.ACTIONS]
    );
  }

  step(): void {
    super.step();

    if (!this.model.dao) return;

    // Update learning from previous step
    this.updateLearning();

    // Track state before action
    this.lastState = this.getFoundationState();

    // Choose and execute action using Q-learning
    const actionProbability = this.grantsGenerosity * this.proactiveness;
    if (random() < actionProbability) {
      const action = this.chooseFoundationAction();
      this.executeFoundationAction(action);
      this.lastLearningAction = action;
    }

    // Operational activities (separate from learning actions)
    if (random() < 0.1) {
      this.performOperations();
    }
  }

  /**
   * Process grant applications (simulated)
   */
  private processGrants(): void {
    // Select a random program with remaining budget
    const programs = Array.from(this.grantPrograms.values())
      .filter(p => p.allocated < p.budget);

    if (programs.length === 0) return;

    const program = randomChoice(programs);

    // Simulate grant approval
    const grantSize = Math.min(
      randomInt(5000, 50000),
      program.budget - program.allocated
    );

    program.allocated += grantSize;
    program.grantsMade++;
    this.grantsApproved++;

    const action: FoundationAction = {
      type: 'grant',
      description: `Approved ${grantSize} grant from ${program.name}`,
      timestamp: this.model.currentStep,
      value: grantSize,
    };
    this.actionsLog.push(action);

    if (this.model.eventBus) {
      this.model.eventBus.publish('foundation_grant_approved', {
        step: this.model.currentStep,
        foundation: this.foundationName,
        program: program.name,
        amount: grantSize,
        totalGrantsMade: program.grantsMade,
      });
    }
  }

  /**
   * Support governance activities
   */
  private supportGovernance(): void {
    if (!this.model.dao) return;

    const openProposals = this.model.dao.proposals.filter(
      p => p.status === 'open' && !this.comments.has(p.uniqueId)
    );

    if (openProposals.length === 0) return;

    // Leave constructive comment
    const proposal = randomChoice(openProposals);
    this.leaveComment(proposal, 'constructive');
    this.proposalsSupported++;

    const action: FoundationAction = {
      type: 'governance_support',
      description: `Provided feedback on proposal: ${proposal.title}`,
      timestamp: this.model.currentStep,
    };
    this.actionsLog.push(action);
  }

  /**
   * Publish transparency update
   */
  private publishUpdate(): void {
    const action: FoundationAction = {
      type: 'communication',
      description: 'Published governance update',
      timestamp: this.model.currentStep,
    };
    this.actionsLog.push(action);

    if (this.model.eventBus) {
      this.model.eventBus.publish('foundation_update_published', {
        step: this.model.currentStep,
        foundation: this.foundationName,
        totalGrants: this.grantsApproved,
        budgetRemaining: this.getRemainingBudget(),
      });
    }
  }

  /**
   * Perform operational activities
   */
  private performOperations(): void {
    const operationalCost = randomInt(100, 1000);
    this.spentBudget += operationalCost;

    const action: FoundationAction = {
      type: 'operational',
      description: 'Operational expenses',
      timestamp: this.model.currentStep,
      value: operationalCost,
    };
    this.actionsLog.push(action);
  }

  /**
   * Get remaining budget across all grant programs
   */
  getRemainingBudget(): number {
    let remaining = 0;
    for (const program of this.grantPrograms.values()) {
      remaining += program.budget - program.allocated;
    }
    return remaining;
  }

  /**
   * Get total allocated across all programs
   */
  getTotalAllocated(): number {
    let allocated = 0;
    for (const program of this.grantPrograms.values()) {
      allocated += program.allocated;
    }
    return allocated;
  }

  /**
   * Sponsor a proposal
   */
  sponsorProposal(proposal: Proposal): boolean {
    if (this.votes.has(proposal.uniqueId)) {
      return false;
    }

    // Mark as sponsored so decideVote returns 'yes', then vote through
    // the base class pipeline (delegation resolution, power policy)
    this.sponsoredProposalIds.add(proposal.uniqueId);
    this.voteOnProposal(proposal);

    const action: FoundationAction = {
      type: 'governance_support',
      description: `Sponsored proposal: ${proposal.title}`,
      timestamp: this.model.currentStep,
    };
    this.actionsLog.push(action);

    return true;
  }

  /**
   * Get grant program statistics
   */
  getGrantProgramStats(): Array<{
    id: string;
    name: string;
    budget: number;
    allocated: number;
    remaining: number;
    grantsMade: number;
  }> {
    return Array.from(this.grantPrograms.values()).map(p => ({
      id: p.id,
      name: p.name,
      budget: p.budget,
      allocated: p.allocated,
      remaining: p.budget - p.allocated,
      grantsMade: p.grantsMade,
    }));
  }

  /**
   * Get foundation statistics
   */
  getFoundationStats(): {
    foundationType: FoundationType;
    foundationName: string;
    operationalBudget: number;
    spentBudget: number;
    totalAllocated: number;
    remainingBudget: number;
    grantsApproved: number;
    proposalsSupported: number;
    actionsCount: number;
  } {
    return {
      foundationType: this.foundationType,
      foundationName: this.foundationName,
      operationalBudget: this.operationalBudget,
      spentBudget: this.spentBudget,
      totalAllocated: this.getTotalAllocated(),
      remainingBudget: this.getRemainingBudget(),
      grantsApproved: this.grantsApproved,
      proposalsSupported: this.proposalsSupported,
      actionsCount: this.actionsLog.length,
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
    grantsApproved: number;
    largeGrants: number;
    smallGrants: number;
    updatesPublished: number;
  } {
    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      grantsApproved: this.grantsApproved,
      largeGrants: this.largeGrantsApproved,
      smallGrants: this.smallGrantsApproved,
      updatesPublished: this.updatesPublished,
    };
  }
}
