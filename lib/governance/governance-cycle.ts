/**
 * Governance Cycle - Optimism-style Structured Governance Seasons
 *
 * Implements the structured governance cadence with seasons and cycles.
 * Optimism uses multi-week cycles within seasons for organized governance.
 */

import type { EventBus } from '../utils/event-bus';

// =============================================================================
// TYPES
// =============================================================================

export type CyclePhase =
  | 'proposal_submission'   // New proposals can be submitted
  | 'review'               // Community review and discussion
  | 'voting'               // Voting window
  | 'execution'            // Approved proposals executed
  | 'reflection';          // Post-cycle review

export type SeasonStatus =
  | 'planned'
  | 'active'
  | 'completed';

export interface GovernanceCycle {
  id: string;
  cycleNumber: number;
  seasonId: string;

  // Timing
  startStep: number;
  endStep: number;

  // Phase tracking
  currentPhase: CyclePhase;
  phases: Map<CyclePhase, { start: number; end: number }>;

  // Proposals in this cycle
  proposalIds: Set<string>;
  approvedProposalIds: Set<string>;
  rejectedProposalIds: Set<string>;

  // Stats
  totalVotes: number;
  participationRate: number;
}

export interface GovernanceSeason {
  id: string;
  seasonNumber: number;
  title: string;

  // Timing
  startStep: number;
  endStep: number;

  // Cycles
  cycleIds: string[];
  currentCycleIndex: number;

  status: SeasonStatus;

  // Budget for the season
  totalBudget: number;
  allocatedBudget: number;
  token: string;

  // Focus areas
  focusAreas: string[];
}

export interface GovernanceCycleConfig {
  // Phase durations (in steps)
  proposalSubmissionSteps: number;  // Default 48 (2 days)
  reviewSteps: number;              // Default 72 (3 days)
  votingSteps: number;              // Default 168 (7 days)
  executionSteps: number;           // Default 48 (2 days)
  reflectionSteps: number;          // Default 24 (1 day)

  // Season config
  cyclesPerSeason: number;          // Default 5
  breakBetweenSeasons: number;      // Steps between seasons
}

// =============================================================================
// GOVERNANCE CYCLE CONTROLLER
// =============================================================================

export class GovernanceCycleController {
  private seasons: Map<string, GovernanceSeason> = new Map();
  private cycles: Map<string, GovernanceCycle> = new Map();
  private seasonCounter: number = 0;
  private cycleCounter: number = 0;
  private eventBus: EventBus | null = null;

  config: GovernanceCycleConfig;
  currentSeasonId: string | null = null;
  currentCycleId: string | null = null;

  constructor(config?: Partial<GovernanceCycleConfig>) {
    this.config = {
      proposalSubmissionSteps: config?.proposalSubmissionSteps ?? 48,
      reviewSteps: config?.reviewSteps ?? 72,
      votingSteps: config?.votingSteps ?? 168,
      executionSteps: config?.executionSteps ?? 48,
      reflectionSteps: config?.reflectionSteps ?? 24,
      cyclesPerSeason: config?.cyclesPerSeason ?? 5,
      breakBetweenSeasons: config?.breakBetweenSeasons ?? 168,
    };
  }

  /**
   * Set event bus
   */
  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Start a new governance season
   */
  startSeason(
    title: string,
    totalBudget: number,
    token: string,
    focusAreas: string[],
    currentStep: number
  ): GovernanceSeason {
    const seasonId = `season_${++this.seasonCounter}`;
    const cycleLength = this.getCycleDuration();
    const seasonLength = cycleLength * this.config.cyclesPerSeason;

    const season: GovernanceSeason = {
      id: seasonId,
      seasonNumber: this.seasonCounter,
      title,
      startStep: currentStep,
      endStep: currentStep + seasonLength,
      cycleIds: [],
      currentCycleIndex: -1,
      status: 'active',
      totalBudget,
      allocatedBudget: 0,
      token,
      focusAreas,
    };

    this.seasons.set(seasonId, season);
    this.currentSeasonId = seasonId;

    // Create first cycle
    this.startNextCycle(seasonId, currentStep);

    this.emit('season_started', {
      step: currentStep,
      seasonId,
      seasonNumber: this.seasonCounter,
      title,
      totalBudget,
      focusAreas,
      endStep: season.endStep,
    });

    return season;
  }

  /**
   * Start the next cycle in a season
   */
  private startNextCycle(
    seasonId: string,
    currentStep: number
  ): GovernanceCycle | null {
    const season = this.seasons.get(seasonId);
    if (!season) return null;

    season.currentCycleIndex++;

    if (season.currentCycleIndex >= this.config.cyclesPerSeason) {
      // Season complete
      season.status = 'completed';
      this.currentSeasonId = null;
      this.currentCycleId = null;

      this.emit('season_completed', {
        step: currentStep,
        seasonId,
        seasonNumber: season.seasonNumber,
        allocatedBudget: season.allocatedBudget,
        totalCycles: season.cycleIds.length,
      });

      return null;
    }

    const cycleId = `cycle_${++this.cycleCounter}`;
    const cycleLength = this.getCycleDuration();

    // Calculate phase boundaries
    let phaseStart = currentStep;
    const phases = new Map<CyclePhase, { start: number; end: number }>();

    const phaseOrder: CyclePhase[] = [
      'proposal_submission',
      'review',
      'voting',
      'execution',
      'reflection',
    ];

    const phaseDurations: Record<CyclePhase, number> = {
      proposal_submission: this.config.proposalSubmissionSteps,
      review: this.config.reviewSteps,
      voting: this.config.votingSteps,
      execution: this.config.executionSteps,
      reflection: this.config.reflectionSteps,
    };

    for (const phase of phaseOrder) {
      const duration = phaseDurations[phase];
      phases.set(phase, { start: phaseStart, end: phaseStart + duration });
      phaseStart += duration;
    }

    const cycle: GovernanceCycle = {
      id: cycleId,
      cycleNumber: this.cycleCounter,
      seasonId,
      startStep: currentStep,
      endStep: currentStep + cycleLength,
      currentPhase: 'proposal_submission',
      phases,
      proposalIds: new Set(),
      approvedProposalIds: new Set(),
      rejectedProposalIds: new Set(),
      totalVotes: 0,
      participationRate: 0,
    };

    this.cycles.set(cycleId, cycle);
    season.cycleIds.push(cycleId);
    this.currentCycleId = cycleId;

    this.emit('cycle_started', {
      step: currentStep,
      cycleId,
      cycleNumber: this.cycleCounter,
      seasonId,
      seasonNumber: season.seasonNumber,
      endStep: cycle.endStep,
      phases: Object.fromEntries(phases),
    });

    return cycle;
  }

  /**
   * Process governance cycle - check for phase transitions
   */
  processCycle(currentStep: number): void {
    if (!this.currentCycleId) return;

    const cycle = this.cycles.get(this.currentCycleId);
    if (!cycle) return;

    const season = this.seasons.get(cycle.seasonId);
    if (!season) return;

    // Check if cycle is complete
    if (currentStep >= cycle.endStep) {
      this.startNextCycle(cycle.seasonId, currentStep);
      return;
    }

    // Check for phase transitions
    const previousPhase = cycle.currentPhase;

    for (const [phase, timing] of cycle.phases) {
      if (currentStep >= timing.start && currentStep < timing.end) {
        if (cycle.currentPhase !== phase) {
          cycle.currentPhase = phase;

          this.emit('cycle_phase_changed', {
            step: currentStep,
            cycleId: cycle.id,
            previousPhase,
            newPhase: phase,
            phaseEndStep: timing.end,
          });
        }
        break;
      }
    }
  }

  /**
   * Register a proposal for the current cycle
   */
  registerProposal(proposalId: string, currentStep: number): boolean {
    if (!this.currentCycleId) return false;

    const cycle = this.cycles.get(this.currentCycleId);
    if (!cycle) return false;

    // Can only register during submission phase
    if (cycle.currentPhase !== 'proposal_submission') {
      return false;
    }

    cycle.proposalIds.add(proposalId);

    this.emit('proposal_registered_for_cycle', {
      step: currentStep,
      cycleId: cycle.id,
      proposalId,
    });

    return true;
  }

  /**
   * Mark proposal as approved in current cycle
   */
  markProposalApproved(proposalId: string, currentStep: number): void {
    if (!this.currentCycleId) return;

    const cycle = this.cycles.get(this.currentCycleId);
    if (!cycle) return;

    if (cycle.proposalIds.has(proposalId)) {
      cycle.approvedProposalIds.add(proposalId);
    }
  }

  /**
   * Mark proposal as rejected in current cycle
   */
  markProposalRejected(proposalId: string, currentStep: number): void {
    if (!this.currentCycleId) return;

    const cycle = this.cycles.get(this.currentCycleId);
    if (!cycle) return;

    if (cycle.proposalIds.has(proposalId)) {
      cycle.rejectedProposalIds.add(proposalId);
    }
  }

  /**
   * Update cycle voting stats
   */
  updateVotingStats(votes: number, participationRate: number): void {
    if (!this.currentCycleId) return;

    const cycle = this.cycles.get(this.currentCycleId);
    if (!cycle) return;

    cycle.totalVotes = votes;
    cycle.participationRate = participationRate;
  }

  /**
   * Check if proposals can be submitted
   */
  canSubmitProposal(): boolean {
    if (!this.currentCycleId) return true;  // Allow if no cycle active

    const cycle = this.cycles.get(this.currentCycleId);
    if (!cycle) return true;

    return cycle.currentPhase === 'proposal_submission';
  }

  /**
   * Check if voting is active
   */
  isVotingActive(): boolean {
    if (!this.currentCycleId) return false;

    const cycle = this.cycles.get(this.currentCycleId);
    if (!cycle) return false;

    return cycle.currentPhase === 'voting';
  }

  /**
   * Get cycle duration in steps
   */
  getCycleDuration(): number {
    return this.config.proposalSubmissionSteps +
           this.config.reviewSteps +
           this.config.votingSteps +
           this.config.executionSteps +
           this.config.reflectionSteps;
  }

  /**
   * Get current season
   */
  getCurrentSeason(): GovernanceSeason | null {
    if (!this.currentSeasonId) return null;
    return this.seasons.get(this.currentSeasonId) || null;
  }

  /**
   * Get current cycle
   */
  getCurrentCycle(): GovernanceCycle | null {
    if (!this.currentCycleId) return null;
    return this.cycles.get(this.currentCycleId) || null;
  }

  /**
   * Get season by ID
   */
  getSeason(seasonId: string): GovernanceSeason | undefined {
    return this.seasons.get(seasonId);
  }

  /**
   * Get cycle by ID
   */
  getCycle(cycleId: string): GovernanceCycle | undefined {
    return this.cycles.get(cycleId);
  }

  /**
   * Get all seasons
   */
  getAllSeasons(): GovernanceSeason[] {
    return Array.from(this.seasons.values());
  }

  /**
   * Get cycles for a season
   */
  getCyclesForSeason(seasonId: string): GovernanceCycle[] {
    const season = this.seasons.get(seasonId);
    if (!season) return [];

    return season.cycleIds
      .map(id => this.cycles.get(id))
      .filter((c): c is GovernanceCycle => c !== undefined);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalSeasons: number;
    completedSeasons: number;
    totalCycles: number;
    currentSeason: number | null;
    currentCycle: number | null;
    currentPhase: CyclePhase | null;
  } {
    const currentSeason = this.getCurrentSeason();
    const currentCycle = this.getCurrentCycle();

    return {
      totalSeasons: this.seasons.size,
      completedSeasons: Array.from(this.seasons.values())
        .filter(s => s.status === 'completed').length,
      totalCycles: this.cycles.size,
      currentSeason: currentSeason?.seasonNumber || null,
      currentCycle: currentCycle?.cycleNumber || null,
      currentPhase: currentCycle?.currentPhase || null,
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
    return {
      config: this.config,
      seasonCounter: this.seasonCounter,
      cycleCounter: this.cycleCounter,
      currentSeasonId: this.currentSeasonId,
      currentCycleId: this.currentCycleId,
      seasons: Array.from(this.seasons.entries()).map(([id, season]) => ({
        ...season,
      })),
      cycles: Array.from(this.cycles.entries()).map(([id, cycle]) => ({
        ...cycle,
        phases: Object.fromEntries(cycle.phases),
        proposalIds: Array.from(cycle.proposalIds),
        approvedProposalIds: Array.from(cycle.approvedProposalIds),
        rejectedProposalIds: Array.from(cycle.rejectedProposalIds),
      })),
    };
  }

  /**
   * Restore from serialized data
   */
  static fromDict(data: any): GovernanceCycleController {
    const controller = new GovernanceCycleController(data.config);
    controller.seasonCounter = data.seasonCounter || 0;
    controller.cycleCounter = data.cycleCounter || 0;
    controller.currentSeasonId = data.currentSeasonId;
    controller.currentCycleId = data.currentCycleId;

    if (data.seasons) {
      for (const seasonData of data.seasons) {
        controller.seasons.set(seasonData.id, seasonData);
      }
    }

    if (data.cycles) {
      for (const cycleData of data.cycles) {
        const cycle: GovernanceCycle = {
          ...cycleData,
          phases: new Map(Object.entries(cycleData.phases || {})),
          proposalIds: new Set(cycleData.proposalIds || []),
          approvedProposalIds: new Set(cycleData.approvedProposalIds || []),
          rejectedProposalIds: new Set(cycleData.rejectedProposalIds || []),
        };
        controller.cycles.set(cycle.id, cycle);
      }
    }

    return controller;
  }
}

/**
 * Factory function for Optimism governance cycles
 */
export function createOptimismGovernanceCycles(): GovernanceCycleController {
  return new GovernanceCycleController({
    proposalSubmissionSteps: 48,   // 2 days
    reviewSteps: 72,               // 3 days
    votingSteps: 168,              // 7 days
    executionSteps: 48,            // 2 days
    reflectionSteps: 24,           // 1 day
    cyclesPerSeason: 5,
    breakBetweenSeasons: 168,      // 7 days between seasons
  });
}
