/**
 * Bridge Timelock - Arbitrum-style Multi-Layer Execution Delays
 *
 * Implements the multi-step execution path for L2 governance:
 * L2 Timelock → L2→L1 Message Delay → L1 Timelock → Execution
 */

import type { EventBus } from '../utils/event-bus';
import type { MultiStageProposal } from '../data-structures/multi-stage-proposal';

// =============================================================================
// TYPES
// =============================================================================

export type BridgeTimelockStage =
  | 'l2_timelock'      // L2 timelock queue
  | 'l2_to_l1_bridge'  // Cross-chain message delay
  | 'l1_timelock'      // L1 timelock queue
  | 'ready'            // Ready for execution
  | 'executed'         // Executed
  | 'cancelled';       // Cancelled

export interface BridgeTimelockEntry {
  id: string;
  proposalId: string;
  title: string;
  payload: unknown;

  // Stage tracking
  stage: BridgeTimelockStage;
  stageStartStep: number;

  // Timeline
  createdStep: number;
  l2TimelockEndStep: number;
  bridgeEndStep: number;
  l1TimelockEndStep: number;
  executionStep: number | null;

  // Metadata
  isConstitutional: boolean;  // Constitutional proposals may have different delays
  creator: string;
}

export interface BridgeTimelockConfig {
  // Standard delays (in steps)
  l2TimelockSteps: number;     // Default 72 (3 days)
  bridgeDelaySteps: number;    // Default 168 (7 days)
  l1TimelockSteps: number;     // Default 72 (3 days)

  // Constitutional proposal delays (often longer)
  constitutionalL2TimelockSteps: number;
  constitutionalBridgeDelaySteps: number;
  constitutionalL1TimelockSteps: number;

  // Emergency path (Security Council)
  emergencyDelaySteps: number;  // Much shorter for emergencies
}

// =============================================================================
// BRIDGE TIMELOCK CONTROLLER
// =============================================================================

export class BridgeTimelockController {
  private entries: Map<string, BridgeTimelockEntry> = new Map();
  private entryCounter: number = 0;
  private eventBus: EventBus | null = null;

  config: BridgeTimelockConfig;

  constructor(config?: Partial<BridgeTimelockConfig>) {
    this.config = {
      l2TimelockSteps: config?.l2TimelockSteps ?? 72,
      bridgeDelaySteps: config?.bridgeDelaySteps ?? 168,
      l1TimelockSteps: config?.l1TimelockSteps ?? 72,
      constitutionalL2TimelockSteps: config?.constitutionalL2TimelockSteps ?? 72,
      constitutionalBridgeDelaySteps: config?.constitutionalBridgeDelaySteps ?? 168,
      constitutionalL1TimelockSteps: config?.constitutionalL1TimelockSteps ?? 72,
      emergencyDelaySteps: config?.emergencyDelaySteps ?? 24,
    };
  }

  /**
   * Set event bus
   */
  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Queue a proposal for bridge timelock
   */
  queueProposal(
    proposal: MultiStageProposal,
    payload: unknown,
    currentStep: number,
    isEmergency: boolean = false
  ): BridgeTimelockEntry {
    const entryId = `bridge_timelock_${++this.entryCounter}`;
    const isConstitutional = proposal.proposalCategory === 'constitutional';

    // Calculate delays based on proposal type
    let l2Delay: number, bridgeDelay: number, l1Delay: number;

    if (isEmergency) {
      // Emergency path - much shorter
      l2Delay = this.config.emergencyDelaySteps;
      bridgeDelay = 0;  // Skip bridge for emergencies
      l1Delay = 0;
    } else if (isConstitutional) {
      l2Delay = this.config.constitutionalL2TimelockSteps;
      bridgeDelay = this.config.constitutionalBridgeDelaySteps;
      l1Delay = this.config.constitutionalL1TimelockSteps;
    } else {
      l2Delay = this.config.l2TimelockSteps;
      bridgeDelay = this.config.bridgeDelaySteps;
      l1Delay = this.config.l1TimelockSteps;
    }

    const entry: BridgeTimelockEntry = {
      id: entryId,
      proposalId: proposal.uniqueId,
      title: proposal.title,
      payload,
      stage: 'l2_timelock',
      stageStartStep: currentStep,
      createdStep: currentStep,
      l2TimelockEndStep: currentStep + l2Delay,
      bridgeEndStep: currentStep + l2Delay + bridgeDelay,
      l1TimelockEndStep: currentStep + l2Delay + bridgeDelay + l1Delay,
      executionStep: null,
      isConstitutional,
      creator: proposal.creator,
    };

    this.entries.set(entryId, entry);

    this.emit('bridge_timelock_queued', {
      step: currentStep,
      entryId,
      proposalId: proposal.uniqueId,
      title: proposal.title,
      isConstitutional,
      isEmergency,
      totalDelaySteps: l2Delay + bridgeDelay + l1Delay,
      l2TimelockEndStep: entry.l2TimelockEndStep,
      bridgeEndStep: entry.bridgeEndStep,
      l1TimelockEndStep: entry.l1TimelockEndStep,
    });

    return entry;
  }

  /**
   * Process timelock entries - advance stages
   */
  processTimelocks(currentStep: number): BridgeTimelockEntry[] {
    const readyForExecution: BridgeTimelockEntry[] = [];

    for (const entry of this.entries.values()) {
      if (entry.stage === 'executed' || entry.stage === 'cancelled') continue;

      const previousStage = entry.stage;

      // Check stage transitions
      switch (entry.stage) {
        case 'l2_timelock':
          if (currentStep >= entry.l2TimelockEndStep) {
            entry.stage = 'l2_to_l1_bridge';
            entry.stageStartStep = currentStep;
            this.emitStageChange(entry, previousStage, currentStep);
          }
          break;

        case 'l2_to_l1_bridge':
          if (currentStep >= entry.bridgeEndStep) {
            entry.stage = 'l1_timelock';
            entry.stageStartStep = currentStep;
            this.emitStageChange(entry, previousStage, currentStep);
          }
          break;

        case 'l1_timelock':
          if (currentStep >= entry.l1TimelockEndStep) {
            entry.stage = 'ready';
            entry.stageStartStep = currentStep;
            readyForExecution.push(entry);
            this.emitStageChange(entry, previousStage, currentStep);
          }
          break;
      }
    }

    return readyForExecution;
  }

  /**
   * Execute an entry that's ready
   */
  execute(
    entryId: string,
    currentStep: number
  ): boolean {
    const entry = this.entries.get(entryId);
    if (!entry || entry.stage !== 'ready') {
      return false;
    }

    entry.stage = 'executed';
    entry.executionStep = currentStep;

    this.emit('bridge_timelock_executed', {
      step: currentStep,
      entryId,
      proposalId: entry.proposalId,
      title: entry.title,
      totalDelaySteps: currentStep - entry.createdStep,
    });

    return true;
  }

  /**
   * Cancel an entry
   */
  cancel(
    entryId: string,
    reason: string,
    currentStep: number
  ): boolean {
    const entry = this.entries.get(entryId);
    if (!entry || entry.stage === 'executed' || entry.stage === 'cancelled') {
      return false;
    }

    entry.stage = 'cancelled';

    this.emit('bridge_timelock_cancelled', {
      step: currentStep,
      entryId,
      proposalId: entry.proposalId,
      title: entry.title,
      reason,
      stageWhenCancelled: entry.stage,
    });

    return true;
  }

  /**
   * Get entry by ID
   */
  getEntry(entryId: string): BridgeTimelockEntry | undefined {
    return this.entries.get(entryId);
  }

  /**
   * Get entry by proposal ID
   */
  getEntryByProposal(proposalId: string): BridgeTimelockEntry | undefined {
    for (const entry of this.entries.values()) {
      if (entry.proposalId === proposalId) {
        return entry;
      }
    }
    return undefined;
  }

  /**
   * Get all entries in a specific stage
   */
  getEntriesInStage(stage: BridgeTimelockStage): BridgeTimelockEntry[] {
    return Array.from(this.entries.values())
      .filter(e => e.stage === stage);
  }

  /**
   * Get all pending entries (not executed or cancelled)
   */
  getPendingEntries(): BridgeTimelockEntry[] {
    return Array.from(this.entries.values())
      .filter(e => e.stage !== 'executed' && e.stage !== 'cancelled');
  }

  /**
   * Get entries ready for execution
   */
  getReadyEntries(): BridgeTimelockEntry[] {
    return this.getEntriesInStage('ready');
  }

  /**
   * Get total delay for a proposal type
   */
  getTotalDelaySteps(isConstitutional: boolean, isEmergency: boolean = false): number {
    if (isEmergency) {
      return this.config.emergencyDelaySteps;
    }

    if (isConstitutional) {
      return this.config.constitutionalL2TimelockSteps +
             this.config.constitutionalBridgeDelaySteps +
             this.config.constitutionalL1TimelockSteps;
    }

    return this.config.l2TimelockSteps +
           this.config.bridgeDelaySteps +
           this.config.l1TimelockSteps;
  }

  /**
   * Emit stage change event
   */
  private emitStageChange(
    entry: BridgeTimelockEntry,
    previousStage: BridgeTimelockStage,
    currentStep: number
  ): void {
    this.emit('bridge_timelock_stage_changed', {
      step: currentStep,
      entryId: entry.id,
      proposalId: entry.proposalId,
      previousStage,
      newStage: entry.stage,
    });
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    inL2Timelock: number;
    inBridge: number;
    inL1Timelock: number;
    ready: number;
    executed: number;
    cancelled: number;
  } {
    const entries = Array.from(this.entries.values());
    return {
      total: entries.length,
      inL2Timelock: entries.filter(e => e.stage === 'l2_timelock').length,
      inBridge: entries.filter(e => e.stage === 'l2_to_l1_bridge').length,
      inL1Timelock: entries.filter(e => e.stage === 'l1_timelock').length,
      ready: entries.filter(e => e.stage === 'ready').length,
      executed: entries.filter(e => e.stage === 'executed').length,
      cancelled: entries.filter(e => e.stage === 'cancelled').length,
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
      entryCounter: this.entryCounter,
      entries: Array.from(this.entries.entries()),
    };
  }

  /**
   * Restore from serialized data
   */
  static fromDict(data: any): BridgeTimelockController {
    const controller = new BridgeTimelockController(data.config);
    controller.entryCounter = data.entryCounter || 0;

    if (data.entries) {
      for (const [id, entry] of data.entries) {
        controller.entries.set(id, entry);
      }
    }

    return controller;
  }
}

/**
 * Factory function for Arbitrum bridge timelock
 */
export function createArbitrumBridgeTimelock(): BridgeTimelockController {
  return new BridgeTimelockController({
    l2TimelockSteps: 72,         // 3 days
    bridgeDelaySteps: 168,       // 7 days (L2→L1 message delay)
    l1TimelockSteps: 72,         // 3 days

    // Constitutional proposals have same delays in Arbitrum
    constitutionalL2TimelockSteps: 72,
    constitutionalBridgeDelaySteps: 168,
    constitutionalL1TimelockSteps: 72,

    // Emergency - Security Council can bypass
    emergencyDelaySteps: 24,     // 1 day
  });
}
