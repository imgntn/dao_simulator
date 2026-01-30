/**
 * Multi-Stage Proposal
 *
 * Extends the base Proposal class to support multi-stage governance workflows
 * like those used in real DAOs (RFC → Temp Check → On-chain → Timelock → Execute)
 */

import { Proposal } from './proposal';
import type { DAO } from './dao';
import type { Project } from './project';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Proposal stage types matching digital twin schema
 */
export type ProposalStage =
  | 'rfc'           // Forum discussion
  | 'temp_check'    // Off-chain signaling (Snapshot)
  | 'on_chain'      // On-chain voting
  | 'timelock'      // Execution delay
  | 'veto_window'   // Citizens/staker veto period
  | 'execution'     // Ready to execute
  | 'executed'      // Completed
  | 'cancelled'     // Cancelled before execution
  | 'vetoed';       // Blocked by veto

/**
 * Configuration for a single stage
 */
export interface StageConfig {
  stage: ProposalStage;
  durationSteps: number;
  platform?: string;
  passCondition?: string;
  quorumPercent?: number;
  approvalThresholdPercent?: number;
}

/**
 * State of a stage during proposal lifecycle
 */
export interface StageState {
  stage: ProposalStage;
  startStep: number;
  endStep: number;
  passed: boolean | null;  // null = in progress
  reason?: string;
  details?: Record<string, unknown>;
}

/**
 * Governance house types for bicameral systems
 */
export type HouseType = 'token_house' | 'citizens_house' | 'security_council';

/**
 * Vote result for a specific house
 */
export interface HouseVoteResult {
  house: HouseType;
  votesFor: number;
  votesAgainst: number;
  quorumMet: boolean;
  approved: boolean;
  vetoTriggered?: boolean;
}

/**
 * Proposal category (for different quorum thresholds)
 */
export type ProposalCategory = 'constitutional' | 'non_constitutional' | 'standard';

// =============================================================================
// MULTI-STAGE PROPOSAL CLASS
// =============================================================================

/**
 * MultiStageProposal - Extends Proposal with multi-stage governance support
 */
export class MultiStageProposal extends Proposal {
  // Stage configuration and state
  stageConfigs: StageConfig[];
  stageStates: StageState[] = [];
  currentStageIndex: number = 0;

  // Category for different quorum thresholds
  proposalCategory: ProposalCategory = 'standard';

  // Bicameral support (Optimism-style)
  houseVotes: Map<HouseType, HouseVoteResult> = new Map();
  requiresBicameral: boolean = false;

  // Dual governance / veto support (Lido-style)
  vetoSignals: Map<string, number> = new Map();  // stakerId -> signal amount
  totalVetoSignal: number = 0;
  vetoThresholdPercent: number = 1;  // Default 1%
  dynamicTimelockExtension: number = 0;  // Additional steps from veto signaling

  // Timelock tracking
  timelockScheduledStep: number | null = null;
  timelockExecutionStep: number | null = null;

  constructor(
    dao: DAO,
    creator: string,
    title: string,
    description: string,
    fundingGoal: number,
    duration: number,
    topic: string = 'Default Topic',
    project: Project | null = null,
    stageConfigs: StageConfig[] = []
  ) {
    super(dao, creator, title, description, fundingGoal, duration, topic, project);

    // Use provided stage configs or default single-stage
    this.stageConfigs = stageConfigs.length > 0
      ? stageConfigs
      : [{ stage: 'on_chain', durationSteps: duration }];

    // Initialize first stage
    this.initializeFirstStage();
  }

  /**
   * Initialize the first stage when proposal is created
   */
  private initializeFirstStage(): void {
    if (this.stageConfigs.length === 0) return;

    const firstConfig = this.stageConfigs[0];
    const startStep = this.dao.currentStep;

    this.stageStates.push({
      stage: firstConfig.stage,
      startStep,
      endStep: startStep + firstConfig.durationSteps,
      passed: null,
    });
  }

  /**
   * Get the current stage configuration
   */
  get currentStageConfig(): StageConfig | null {
    if (this.currentStageIndex >= this.stageConfigs.length) return null;
    return this.stageConfigs[this.currentStageIndex];
  }

  /**
   * Get the current stage state
   */
  get currentStageState(): StageState | null {
    if (this.currentStageIndex >= this.stageStates.length) return null;
    return this.stageStates[this.currentStageIndex];
  }

  /**
   * Get the current stage type
   */
  get currentStage(): ProposalStage {
    return this.currentStageConfig?.stage || 'executed';
  }

  /**
   * Check if the proposal is in a voting stage
   */
  get isInVotingStage(): boolean {
    const stage = this.currentStage;
    return stage === 'temp_check' || stage === 'on_chain';
  }

  /**
   * Check if the proposal is in a veto window
   */
  get isInVetoWindow(): boolean {
    return this.currentStage === 'veto_window';
  }

  /**
   * Check if the proposal is waiting in timelock
   */
  get isInTimelock(): boolean {
    return this.currentStage === 'timelock';
  }

  /**
   * Check if the proposal has completed all stages
   */
  get isComplete(): boolean {
    return this.status === 'approved' ||
      this.status === 'rejected' ||
      this.status === 'completed' ||
      this.status === 'expired';
  }

  /**
   * Add a vote, recording which house it's for (bicameral support)
   */
  addVoteForHouse(
    memberId: string,
    vote: boolean,
    weight: number = 1,
    house: HouseType = 'token_house'
  ): void {
    // Call parent vote method
    this.addVote(memberId, vote, weight);

    // Track house-specific vote
    const existing = this.houseVotes.get(house) || {
      house,
      votesFor: 0,
      votesAgainst: 0,
      quorumMet: false,
      approved: false,
    };

    if (vote) {
      existing.votesFor += weight;
    } else {
      existing.votesAgainst += weight;
    }

    this.houseVotes.set(house, existing);
  }

  /**
   * Signal veto (for dual governance like Lido)
   */
  signalVeto(stakerId: string, amount: number): void {
    const current = this.vetoSignals.get(stakerId) || 0;
    this.vetoSignals.set(stakerId, current + amount);
    this.totalVetoSignal += amount;

    if (this.dao.eventBus) {
      this.dao.eventBus.publish('veto_signaled', {
        step: this.dao.currentStep,
        proposal: this.uniqueId,
        staker: stakerId,
        amount,
        totalSignal: this.totalVetoSignal,
      });
    }
  }

  /**
   * Check if veto threshold is reached
   */
  isVetoThresholdReached(totalStakeSupply: number): boolean {
    if (totalStakeSupply <= 0) return false;
    const signalPercent = (this.totalVetoSignal / totalStakeSupply) * 100;
    return signalPercent >= this.vetoThresholdPercent;
  }

  /**
   * Calculate dynamic timelock extension based on veto signaling
   */
  calculateDynamicTimelock(
    totalStakeSupply: number,
    minTimelockSteps: number,
    maxTimelockSteps: number
  ): number {
    if (totalStakeSupply <= 0) return minTimelockSteps;

    const signalPercent = (this.totalVetoSignal / totalStakeSupply) * 100;
    // Linear interpolation between min and max based on signal
    const range = maxTimelockSteps - minTimelockSteps;
    const extension = Math.min(range * (signalPercent / this.vetoThresholdPercent), range);

    return Math.round(minTimelockSteps + extension);
  }

  /**
   * Advance to the next stage
   */
  advanceToNextStage(passed: boolean, reason?: string, details?: Record<string, unknown>): boolean {
    // Mark current stage as completed
    if (this.currentStageState) {
      this.currentStageState.passed = passed;
      this.currentStageState.reason = reason;
      if (details) {
        this.currentStageState.details = details;
      }
    }

    // If stage failed, reject the proposal
    if (!passed) {
      this.status = 'rejected';
      this.emitStageChange('rejected', reason);
      return false;
    }

    const previousStage = this.currentStage;

    // Move to next stage
    this.currentStageIndex++;

    // Check if we've completed all stages
    if (this.currentStageIndex >= this.stageConfigs.length) {
      this.status = 'approved';
      this.emitStageChange('executed', 'All stages completed');
      return true;
    }

    // Initialize next stage
    const nextConfig = this.stageConfigs[this.currentStageIndex];
    if (previousStage === 'temp_check' && nextConfig.stage === 'on_chain') {
      this.resetVotingData();
      this.houseVotes.clear();
      this.vetoSignals.clear();
      this.totalVetoSignal = 0;
    }
    const startStep = this.dao.currentStep;

    this.stageStates.push({
      stage: nextConfig.stage,
      startStep,
      endStep: startStep + nextConfig.durationSteps,
      passed: null,
    });
    this.recordActivity(this.dao.currentStep);

    this.emitStageChange(nextConfig.stage);
    return true;
  }

  /**
   * Mark proposal as vetoed
   */
  veto(reason: string = 'Veto threshold reached'): void {
    this.status = 'rejected';
    if (this.currentStageState) {
      this.currentStageState.passed = false;
      this.currentStageState.reason = reason;
    }
    this.emitStageChange('vetoed', reason);
  }

  /**
   * Mark proposal as cancelled
   */
  cancel(reason: string = 'Cancelled by proposer'): void {
    this.status = 'rejected';
    if (this.currentStageState) {
      this.currentStageState.passed = false;
      this.currentStageState.reason = reason;
    }
    this.emitStageChange('cancelled', reason);
  }

  /**
   * Schedule for timelock execution
   */
  scheduleTimelock(delaySteps: number): void {
    this.timelockScheduledStep = this.dao.currentStep;
    this.timelockExecutionStep = this.dao.currentStep + delaySteps;

    if (this.dao.eventBus) {
      this.dao.eventBus.publish('timelock_scheduled', {
        step: this.dao.currentStep,
        proposal: this.uniqueId,
        executionStep: this.timelockExecutionStep,
        delaySteps,
      });
    }
  }

  /**
   * Check if timelock is ready for execution
   */
  isTimelockReady(): boolean {
    if (this.timelockExecutionStep === null) return false;
    return this.dao.currentStep >= this.timelockExecutionStep;
  }

  /**
   * Mark proposal as executed after timelock
   */
  execute(): void {
    this.status = 'completed';
    this.emitStageChange('executed', 'Timelock completed');
  }

  /**
   * Emit stage change event
   */
  private emitStageChange(newStage: ProposalStage | 'rejected', reason?: string): void {
    if (this.dao.eventBus) {
      this.dao.eventBus.publish('proposal_stage_changed', {
        step: this.dao.currentStep,
        proposal: this.uniqueId,
        title: this.title,
        previousStage: this.stageStates.length > 1
          ? this.stageStates[this.stageStates.length - 2]?.stage
          : null,
        newStage,
        reason,
        stageIndex: this.currentStageIndex,
        totalStages: this.stageConfigs.length,
      });
    }
  }

  /**
   * Get progress through stages as a percentage
   */
  get stageProgress(): number {
    if (this.stageConfigs.length === 0) return 100;
    return Math.round((this.currentStageIndex / this.stageConfigs.length) * 100);
  }

  /**
   * Get time remaining in current stage (in steps)
   */
  get stepsRemainingInStage(): number {
    if (!this.currentStageState) return 0;
    return Math.max(0, this.currentStageState.endStep - this.dao.currentStep);
  }

  /**
   * Check if current stage has expired
   */
  get isCurrentStageExpired(): boolean {
    if (!this.currentStageState) return true;
    return this.dao.currentStep >= this.currentStageState.endStep;
  }

  /**
   * Override toDict to include multi-stage data
   */
  toDict(): any {
    const base = super.toDict();
    return {
      ...base,
      isMultiStage: true,
      stageConfigs: this.stageConfigs,
      stageStates: this.stageStates,
      currentStageIndex: this.currentStageIndex,
      currentStage: this.currentStage,
      proposalCategory: this.proposalCategory,
      requiresBicameral: this.requiresBicameral,
      houseVotes: Object.fromEntries(this.houseVotes),
      vetoSignals: Object.fromEntries(this.vetoSignals),
      totalVetoSignal: this.totalVetoSignal,
      timelockScheduledStep: this.timelockScheduledStep,
      timelockExecutionStep: this.timelockExecutionStep,
      stageProgress: this.stageProgress,
    };
  }

  /**
   * Create from serialized data
   */
  static fromDict(data: any, dao: DAO): MultiStageProposal {
    const proposal = new MultiStageProposal(
      dao,
      data.creator || '',
      data.title || '',
      data.description || '',
      data.fundingGoal || 0,
      data.duration || 0,
      data.topic || 'Default Topic',
      null,
      data.stageConfigs || []
    );

    proposal.status = data.status || 'open';
    proposal.votesFor = data.votesFor || 0;
    proposal.votesAgainst = data.votesAgainst || 0;
    proposal.currentFunding = data.currentFunding || 0;
    proposal.creationTime = data.creationTime || 0;
    proposal.votingPeriod = data.votingPeriod || proposal.duration;
    proposal.uniqueId = data.uniqueId || '';
    proposal.type = data.type || 'default';

    // Multi-stage specific
    proposal.stageStates = data.stageStates || [];
    proposal.currentStageIndex = data.currentStageIndex || 0;
    proposal.proposalCategory = data.proposalCategory || 'standard';
    proposal.requiresBicameral = data.requiresBicameral || false;
    proposal.totalVetoSignal = data.totalVetoSignal || 0;
    proposal.timelockScheduledStep = data.timelockScheduledStep || null;
    proposal.timelockExecutionStep = data.timelockExecutionStep || null;

    // Restore maps
    if (data.houseVotes) {
      proposal.houseVotes = new Map(
        Object.entries(data.houseVotes) as [HouseType, HouseVoteResult][]
      );
    }
    if (data.vetoSignals) {
      proposal.vetoSignals = new Map(Object.entries(data.vetoSignals) as [string, number][]);
    }

    return proposal;
  }
}

/**
 * Helper to create a multi-stage proposal from digital twin config
 */
export function createMultiStageProposal(
  dao: DAO,
  creator: string,
  title: string,
  description: string,
  fundingGoal: number,
  stageConfigs: StageConfig[],
  category: ProposalCategory = 'standard',
  requiresBicameral: boolean = false
): MultiStageProposal {
  const totalDuration = stageConfigs.reduce((sum, s) => sum + s.durationSteps, 0);

  const proposal = new MultiStageProposal(
    dao,
    creator,
    title,
    description,
    fundingGoal,
    totalDuration,
    'Multi-Stage Proposal',
    null,
    stageConfigs
  );

  proposal.proposalCategory = category;
  proposal.requiresBicameral = requiresBicameral;

  return proposal;
}
