/**
 * RetroPGF - Optimism Retroactive Public Goods Funding
 *
 * Manages RetroPGF rounds where Citizens House members allocate
 * funding to projects that have already delivered public goods value.
 */

import type { EventBus } from '../utils/event-bus';

// =============================================================================
// TYPES
// =============================================================================

export type RetroPGFRoundStatus =
  | 'nominations'     // Accepting project nominations
  | 'voting'          // Citizens voting on allocations
  | 'finalization'    // Tallying and finalizing results
  | 'distribution'    // Distributing funds
  | 'completed';      // Round complete

export type ProjectCategory =
  | 'infrastructure'
  | 'tooling'
  | 'education'
  | 'governance'
  | 'community'
  | 'research'
  | 'other';

export interface RetroPGFProject {
  id: string;
  name: string;
  description: string;
  category: ProjectCategory;
  impactStatement: string;
  nominatedBy: string;
  nominatedStep: number;

  // Voting results
  totalAllocated: number;
  voterAllocations: Map<string, number>;  // citizenId -> amount allocated
  voterCount: number;

  // Final distribution
  finalAllocation: number;
  distributed: boolean;
}

export interface RetroPGFRound {
  id: string;
  roundNumber: number;
  title: string;
  description: string;

  // Timing (in steps)
  nominationStartStep: number;
  nominationEndStep: number;
  votingStartStep: number;
  votingEndStep: number;
  distributionStep: number | null;

  // Budget
  totalBudget: number;
  token: string;

  // Projects
  projects: Map<string, RetroPGFProject>;

  // Citizens participation
  eligibleCitizens: Set<string>;
  votedCitizens: Set<string>;
  citizenBudgets: Map<string, number>;  // Each citizen's allocation budget

  // Status
  status: RetroPGFRoundStatus;

  // Metadata
  categories: ProjectCategory[];
  minProjectsToAllocate: number;  // Citizens must allocate to at least N projects
}

export interface CitizenAllocation {
  citizenId: string;
  allocations: Map<string, number>;  // projectId -> amount
  totalAllocated: number;
  submittedStep: number;
}

export interface RetroPGFConfig {
  nominationPeriodSteps: number;   // Default 168 (7 days)
  votingPeriodSteps: number;       // Default 336 (14 days)
  minProjectsToAllocate: number;   // Default 3
  maxProjectsPerCitizen: number;   // Default unlimited (0)
  categories: ProjectCategory[];
}

// =============================================================================
// RETROPGF CONTROLLER
// =============================================================================

export class RetroPGFController {
  private rounds: Map<string, RetroPGFRound> = new Map();
  private roundCounter: number = 0;
  private eventBus: EventBus | null = null;

  config: RetroPGFConfig;

  constructor(config?: Partial<RetroPGFConfig>) {
    this.config = {
      nominationPeriodSteps: config?.nominationPeriodSteps ?? 168,
      votingPeriodSteps: config?.votingPeriodSteps ?? 336,
      minProjectsToAllocate: config?.minProjectsToAllocate ?? 3,
      maxProjectsPerCitizen: config?.maxProjectsPerCitizen ?? 0,
      categories: config?.categories ?? [
        'infrastructure',
        'tooling',
        'education',
        'governance',
        'community',
        'research',
      ],
    };
  }

  /**
   * Set event bus for publishing events
   */
  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Create a new RetroPGF round
   */
  createRound(
    title: string,
    description: string,
    totalBudget: number,
    token: string,
    eligibleCitizens: string[],
    currentStep: number
  ): RetroPGFRound {
    const roundId = `retropgf_${++this.roundCounter}`;

    const nominationEnd = currentStep + this.config.nominationPeriodSteps;
    const votingEnd = nominationEnd + this.config.votingPeriodSteps;

    // Each citizen gets equal budget to allocate
    const perCitizenBudget = totalBudget / Math.max(eligibleCitizens.length, 1);
    const citizenBudgets = new Map<string, number>();
    for (const citizen of eligibleCitizens) {
      citizenBudgets.set(citizen, perCitizenBudget);
    }

    const round: RetroPGFRound = {
      id: roundId,
      roundNumber: this.roundCounter,
      title,
      description,
      nominationStartStep: currentStep,
      nominationEndStep: nominationEnd,
      votingStartStep: nominationEnd,
      votingEndStep: votingEnd,
      distributionStep: null,
      totalBudget,
      token,
      projects: new Map(),
      eligibleCitizens: new Set(eligibleCitizens),
      votedCitizens: new Set(),
      citizenBudgets,
      status: 'nominations',
      categories: this.config.categories,
      minProjectsToAllocate: this.config.minProjectsToAllocate,
    };

    this.rounds.set(roundId, round);

    this.emit('retropgf_round_created', {
      step: currentStep,
      roundId,
      roundNumber: this.roundCounter,
      title,
      totalBudget,
      eligibleCitizens: eligibleCitizens.length,
      nominationEnd,
      votingEnd,
    });

    return round;
  }

  /**
   * Nominate a project
   */
  nominateProject(
    roundId: string,
    nominatorId: string,
    projectName: string,
    projectDescription: string,
    category: ProjectCategory,
    impactStatement: string,
    currentStep: number
  ): RetroPGFProject | null {
    const round = this.rounds.get(roundId);
    if (!round) return null;

    // Must be in nomination period
    if (round.status !== 'nominations') return null;
    if (currentStep > round.nominationEndStep) return null;

    // Must be eligible citizen
    if (!round.eligibleCitizens.has(nominatorId)) return null;

    // Check for duplicate names
    for (const project of round.projects.values()) {
      if (project.name.toLowerCase() === projectName.toLowerCase()) {
        return null;  // Duplicate name
      }
    }

    const projectId = `${roundId}_project_${round.projects.size + 1}`;

    const project: RetroPGFProject = {
      id: projectId,
      name: projectName,
      description: projectDescription,
      category,
      impactStatement,
      nominatedBy: nominatorId,
      nominatedStep: currentStep,
      totalAllocated: 0,
      voterAllocations: new Map(),
      voterCount: 0,
      finalAllocation: 0,
      distributed: false,
    };

    round.projects.set(projectId, project);

    this.emit('retropgf_project_nominated', {
      step: currentStep,
      roundId,
      projectId,
      projectName,
      category,
      nominatedBy: nominatorId,
    });

    return project;
  }

  /**
   * Submit citizen allocation
   */
  submitAllocation(
    roundId: string,
    citizenId: string,
    allocations: Map<string, number>,
    currentStep: number
  ): boolean {
    const round = this.rounds.get(roundId);
    if (!round) return false;

    // Must be in voting period
    if (round.status !== 'voting') return false;
    if (currentStep > round.votingEndStep) return false;

    // Must be eligible citizen
    if (!round.eligibleCitizens.has(citizenId)) return false;

    // Get citizen's budget
    const budget = round.citizenBudgets.get(citizenId) || 0;

    // Validate allocations
    let totalAllocated = 0;
    const projectIds: string[] = [];

    for (const [projectId, amount] of allocations) {
      if (amount <= 0) continue;
      if (!round.projects.has(projectId)) return false;
      totalAllocated += amount;
      projectIds.push(projectId);
    }

    // Check total doesn't exceed budget
    if (totalAllocated > budget * 1.001) {  // Small tolerance for floating point
      return false;
    }

    // Check minimum projects requirement
    if (projectIds.length < round.minProjectsToAllocate &&
        round.projects.size >= round.minProjectsToAllocate) {
      return false;
    }

    // Check max projects if configured
    if (this.config.maxProjectsPerCitizen > 0 &&
        projectIds.length > this.config.maxProjectsPerCitizen) {
      return false;
    }

    // Remove previous allocations if re-voting
    if (round.votedCitizens.has(citizenId)) {
      for (const project of round.projects.values()) {
        const prev = project.voterAllocations.get(citizenId);
        if (prev) {
          project.totalAllocated -= prev;
          project.voterAllocations.delete(citizenId);
          project.voterCount--;
        }
      }
    }

    // Apply new allocations
    for (const [projectId, amount] of allocations) {
      if (amount <= 0) continue;
      const project = round.projects.get(projectId)!;
      project.voterAllocations.set(citizenId, amount);
      project.totalAllocated += amount;
      project.voterCount++;
    }

    round.votedCitizens.add(citizenId);

    this.emit('retropgf_allocation_submitted', {
      step: currentStep,
      roundId,
      citizenId,
      projectCount: projectIds.length,
      totalAllocated,
    });

    return true;
  }

  /**
   * Process round state transitions
   */
  processRound(roundId: string, currentStep: number): void {
    const round = this.rounds.get(roundId);
    if (!round) return;

    // Transition from nominations to voting
    if (round.status === 'nominations' && currentStep >= round.nominationEndStep) {
      round.status = 'voting';
      this.emit('retropgf_voting_started', {
        step: currentStep,
        roundId,
        projectCount: round.projects.size,
        eligibleVoters: round.eligibleCitizens.size,
      });
    }

    // Transition from voting to finalization
    if (round.status === 'voting' && currentStep >= round.votingEndStep) {
      round.status = 'finalization';
      this.finalizeRound(round, currentStep);
    }
  }

  /**
   * Finalize round results
   */
  private finalizeRound(round: RetroPGFRound, currentStep: number): void {
    // Calculate final allocations based on votes
    // Simple: each project gets its total allocated amount
    for (const project of round.projects.values()) {
      project.finalAllocation = project.totalAllocated;
    }

    // Sort projects by allocation
    const sortedProjects = Array.from(round.projects.values())
      .sort((a, b) => b.finalAllocation - a.finalAllocation);

    round.status = 'distribution';
    round.distributionStep = currentStep;

    this.emit('retropgf_round_finalized', {
      step: currentStep,
      roundId: round.id,
      totalVoters: round.votedCitizens.size,
      totalProjects: round.projects.size,
      topProjects: sortedProjects.slice(0, 5).map(p => ({
        name: p.name,
        allocation: p.finalAllocation,
        voterCount: p.voterCount,
      })),
    });
  }

  /**
   * Distribute funds to a project
   */
  distributeToProject(
    roundId: string,
    projectId: string,
    currentStep: number
  ): { amount: number; token: string } | null {
    const round = this.rounds.get(roundId);
    if (!round || round.status !== 'distribution') return null;

    const project = round.projects.get(projectId);
    if (!project || project.distributed) return null;

    project.distributed = true;

    // Check if all projects distributed
    const allDistributed = Array.from(round.projects.values())
      .every(p => p.distributed);

    if (allDistributed) {
      round.status = 'completed';
      this.emit('retropgf_round_completed', {
        step: currentStep,
        roundId: round.id,
        roundNumber: round.roundNumber,
      });
    }

    this.emit('retropgf_distribution', {
      step: currentStep,
      roundId,
      projectId,
      projectName: project.name,
      amount: project.finalAllocation,
      token: round.token,
    });

    return {
      amount: project.finalAllocation,
      token: round.token,
    };
  }

  /**
   * Get active round
   */
  getActiveRound(): RetroPGFRound | null {
    for (const round of this.rounds.values()) {
      if (round.status !== 'completed') {
        return round;
      }
    }
    return null;
  }

  /**
   * Get round by ID
   */
  getRound(roundId: string): RetroPGFRound | undefined {
    return this.rounds.get(roundId);
  }

  /**
   * Get all rounds
   */
  getAllRounds(): RetroPGFRound[] {
    return Array.from(this.rounds.values());
  }

  /**
   * Get round results summary
   */
  getRoundResults(roundId: string): {
    projects: Array<{
      id: string;
      name: string;
      category: string;
      allocation: number;
      voterCount: number;
      distributed: boolean;
    }>;
    participationRate: number;
    totalDistributed: number;
  } | null {
    const round = this.rounds.get(roundId);
    if (!round) return null;

    const projects = Array.from(round.projects.values())
      .sort((a, b) => b.finalAllocation - a.finalAllocation)
      .map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        allocation: p.finalAllocation,
        voterCount: p.voterCount,
        distributed: p.distributed,
      }));

    return {
      projects,
      participationRate: round.eligibleCitizens.size > 0
        ? round.votedCitizens.size / round.eligibleCitizens.size
        : 0,
      totalDistributed: Array.from(round.projects.values())
        .filter(p => p.distributed)
        .reduce((sum, p) => sum + p.finalAllocation, 0),
    };
  }

  /**
   * Emit event
   */
  private emit(event: string, data: Record<string, unknown>): void {
    if (this.eventBus) {
      this.eventBus.publish(event, data as { step: number; [key: string]: unknown });
    }
  }

  /**
   * Serialize to plain object
   */
  toDict(): unknown {
    const roundsData = Array.from(this.rounds.entries()).map(([id, round]) => ({
      ...round,
      projects: Array.from(round.projects.entries()).map(([pid, project]) => ({
        ...project,
        voterAllocations: Object.fromEntries(project.voterAllocations),
      })),
      eligibleCitizens: Array.from(round.eligibleCitizens),
      votedCitizens: Array.from(round.votedCitizens),
      citizenBudgets: Object.fromEntries(round.citizenBudgets),
    }));

    return {
      config: this.config,
      roundCounter: this.roundCounter,
      rounds: roundsData,
    };
  }

  /**
   * Restore from serialized data
   */
  static fromDict(data: any): RetroPGFController {
    const controller = new RetroPGFController(data.config);
    controller.roundCounter = data.roundCounter || 0;

    if (data.rounds) {
      for (const roundData of data.rounds) {
        const projects = new Map<string, RetroPGFProject>();
        for (const projectData of roundData.projects || []) {
          projects.set(projectData.id, {
            ...projectData,
            voterAllocations: new Map(Object.entries(projectData.voterAllocations || {})),
          });
        }

        const round: RetroPGFRound = {
          ...roundData,
          projects,
          eligibleCitizens: new Set(roundData.eligibleCitizens || []),
          votedCitizens: new Set(roundData.votedCitizens || []),
          citizenBudgets: new Map(Object.entries(roundData.citizenBudgets || {})),
        };

        controller.rounds.set(round.id, round);
      }
    }

    return controller;
  }
}

/**
 * Factory function to create RetroPGF controller for Optimism
 */
export function createOptimismRetroPGF(): RetroPGFController {
  return new RetroPGFController({
    nominationPeriodSteps: 168,  // 7 days
    votingPeriodSteps: 336,      // 14 days
    minProjectsToAllocate: 3,
    maxProjectsPerCitizen: 0,    // Unlimited
    categories: [
      'infrastructure',
      'tooling',
      'education',
      'governance',
      'community',
      'research',
    ],
  });
}
