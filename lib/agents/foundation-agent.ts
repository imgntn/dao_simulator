/**
 * Foundation Agent
 *
 * Represents foundation entities like Arbitrum Foundation and Optimism Foundation.
 * Handles operational roles, grant administration, and governance support.
 */

import { DAOMember } from './base';
import type { Proposal } from '../data-structures/proposal';
import type { DAOModel } from '../engine/model';
import { random, randomChoice, randomInt } from '../utils/random';

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

  step(): void {
    super.step();

    if (!this.model.dao) return;

    // Process grant applications
    if (random() < this.grantsGenerosity * 0.1) {
      this.processGrants();
    }

    // Governance support activities
    if (random() < this.proactiveness * 0.15) {
      this.supportGovernance();
    }

    // Communication and transparency
    if (random() < this.transparency * 0.05) {
      this.publishUpdate();
    }

    // Operational activities
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
}
