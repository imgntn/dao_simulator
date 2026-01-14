/**
 * Timelock Controller
 *
 * Manages delayed execution of approved proposals.
 * Supports static and dynamic timelocks (for dual governance like Lido).
 */

import type { DAO } from './dao';
import type { MultiStageProposal } from './multi-stage-proposal';

// =============================================================================
// TYPES
// =============================================================================

export type TimelockStatus = 'pending' | 'ready' | 'executed' | 'cancelled' | 'vetoed';

export interface TimelockEntry {
  proposalId: string;
  proposalTitle: string;
  scheduledStep: number;
  executionStep: number;
  status: TimelockStatus;
  delaySteps: number;
  dynamicExtension: number;  // Additional delay from veto signaling
  executionPayload?: unknown;  // Optional data for execution
  createdAt: number;
  executedAt?: number;
  cancelledAt?: number;
}

export interface TimelockConfig {
  minDelaySteps: number;
  maxDelaySteps: number;
  enableDynamicExtension: boolean;
  vetoThresholdPercent?: number;
}

export interface TimelockStats {
  totalScheduled: number;
  pending: number;
  ready: number;
  executed: number;
  cancelled: number;
  vetoed: number;
  averageDelaySteps: number;
}

// =============================================================================
// TIMELOCK CONTROLLER
// =============================================================================

export class TimelockController {
  private entries: Map<string, TimelockEntry> = new Map();
  private config: TimelockConfig;
  private dao: DAO;

  constructor(dao: DAO, config: Partial<TimelockConfig> = {}) {
    this.dao = dao;
    this.config = {
      minDelaySteps: config.minDelaySteps ?? 48,   // Default 2 days
      maxDelaySteps: config.maxDelaySteps ?? 1080, // Default 45 days
      enableDynamicExtension: config.enableDynamicExtension ?? false,
      vetoThresholdPercent: config.vetoThresholdPercent,
    };
  }

  /**
   * Schedule a proposal for delayed execution
   */
  schedule(
    proposal: MultiStageProposal,
    delaySteps?: number,
    payload?: unknown
  ): TimelockEntry {
    const delay = this.clampDelay(delaySteps ?? this.config.minDelaySteps);
    const currentStep = this.dao.currentStep;

    const entry: TimelockEntry = {
      proposalId: proposal.uniqueId,
      proposalTitle: proposal.title,
      scheduledStep: currentStep,
      executionStep: currentStep + delay,
      status: 'pending',
      delaySteps: delay,
      dynamicExtension: 0,
      executionPayload: payload,
      createdAt: currentStep,
    };

    this.entries.set(proposal.uniqueId, entry);

    // Emit event
    if (this.dao.eventBus) {
      this.dao.eventBus.publish('timelock_scheduled', {
        step: currentStep,
        proposalId: proposal.uniqueId,
        proposalTitle: proposal.title,
        executionStep: entry.executionStep,
        delaySteps: delay,
      });
    }

    return entry;
  }

  /**
   * Extend timelock dynamically (for dual governance)
   */
  extendTimelock(proposalId: string, additionalSteps: number): boolean {
    const entry = this.entries.get(proposalId);
    if (!entry || entry.status !== 'pending') {
      return false;
    }

    if (!this.config.enableDynamicExtension) {
      return false;
    }

    // Clamp extension
    const maxExtension = this.config.maxDelaySteps - entry.delaySteps;
    const extension = Math.min(additionalSteps, maxExtension);

    entry.dynamicExtension += extension;
    entry.executionStep += extension;

    // Emit event
    if (this.dao.eventBus) {
      this.dao.eventBus.publish('timelock_extended', {
        step: this.dao.currentStep,
        proposalId,
        additionalSteps: extension,
        newExecutionStep: entry.executionStep,
        totalExtension: entry.dynamicExtension,
      });
    }

    return true;
  }

  /**
   * Calculate dynamic timelock based on veto signal percentage
   * Used by Lido-style dual governance
   */
  calculateDynamicDelay(vetoSignalPercent: number): number {
    if (!this.config.enableDynamicExtension) {
      return this.config.minDelaySteps;
    }

    const threshold = this.config.vetoThresholdPercent || 1;
    const range = this.config.maxDelaySteps - this.config.minDelaySteps;

    // Linear interpolation based on signal
    const factor = Math.min(vetoSignalPercent / threshold, 1);
    const dynamicDelay = this.config.minDelaySteps + Math.round(range * factor);

    return this.clampDelay(dynamicDelay);
  }

  /**
   * Get all entries ready for execution
   */
  getReady(currentStep?: number): TimelockEntry[] {
    const step = currentStep ?? this.dao.currentStep;
    const ready: TimelockEntry[] = [];

    for (const entry of this.entries.values()) {
      if (entry.status === 'pending' && step >= entry.executionStep) {
        entry.status = 'ready';
        ready.push(entry);
      }
    }

    return ready;
  }

  /**
   * Get all pending entries (not yet ready)
   */
  getPending(): TimelockEntry[] {
    return Array.from(this.entries.values()).filter(e => e.status === 'pending');
  }

  /**
   * Get entry by proposal ID
   */
  getEntry(proposalId: string): TimelockEntry | undefined {
    return this.entries.get(proposalId);
  }

  /**
   * Check if a proposal is in timelock
   */
  isInTimelock(proposalId: string): boolean {
    const entry = this.entries.get(proposalId);
    return entry !== undefined && entry.status === 'pending';
  }

  /**
   * Check if a proposal is ready for execution
   */
  isReady(proposalId: string): boolean {
    const entry = this.entries.get(proposalId);
    if (!entry) return false;

    if (entry.status === 'ready') return true;

    // Check if pending and execution step reached
    if (entry.status === 'pending' && this.dao.currentStep >= entry.executionStep) {
      entry.status = 'ready';
      return true;
    }

    return false;
  }

  /**
   * Get remaining steps until execution
   */
  getRemainingSteps(proposalId: string): number {
    const entry = this.entries.get(proposalId);
    if (!entry || entry.status !== 'pending') return 0;

    return Math.max(0, entry.executionStep - this.dao.currentStep);
  }

  /**
   * Mark an entry as executed
   */
  markExecuted(proposalId: string): boolean {
    const entry = this.entries.get(proposalId);
    if (!entry || (entry.status !== 'ready' && entry.status !== 'pending')) {
      return false;
    }

    entry.status = 'executed';
    entry.executedAt = this.dao.currentStep;

    // Emit event
    if (this.dao.eventBus) {
      this.dao.eventBus.publish('timelock_executed', {
        step: this.dao.currentStep,
        proposalId,
        proposalTitle: entry.proposalTitle,
        scheduledStep: entry.scheduledStep,
        actualDelay: this.dao.currentStep - entry.scheduledStep,
      });
    }

    return true;
  }

  /**
   * Cancel a timelocked proposal
   */
  cancel(proposalId: string, reason: string = 'Cancelled'): boolean {
    const entry = this.entries.get(proposalId);
    if (!entry || entry.status !== 'pending') {
      return false;
    }

    entry.status = 'cancelled';
    entry.cancelledAt = this.dao.currentStep;

    // Emit event
    if (this.dao.eventBus) {
      this.dao.eventBus.publish('timelock_cancelled', {
        step: this.dao.currentStep,
        proposalId,
        proposalTitle: entry.proposalTitle,
        reason,
      });
    }

    return true;
  }

  /**
   * Veto a timelocked proposal (from dual governance)
   */
  veto(proposalId: string, reason: string = 'Vetoed by stakers'): boolean {
    const entry = this.entries.get(proposalId);
    if (!entry || (entry.status !== 'pending' && entry.status !== 'ready')) {
      return false;
    }

    entry.status = 'vetoed';
    entry.cancelledAt = this.dao.currentStep;

    // Emit event
    if (this.dao.eventBus) {
      this.dao.eventBus.publish('timelock_vetoed', {
        step: this.dao.currentStep,
        proposalId,
        proposalTitle: entry.proposalTitle,
        reason,
      });
    }

    return true;
  }

  /**
   * Process timelocks - check for ready entries
   * Called each simulation step
   */
  process(): TimelockEntry[] {
    return this.getReady();
  }

  /**
   * Get statistics about timelock usage
   */
  getStats(): TimelockStats {
    const entries = Array.from(this.entries.values());
    const executed = entries.filter(e => e.status === 'executed');

    let totalDelay = 0;
    for (const entry of executed) {
      totalDelay += (entry.executedAt || entry.executionStep) - entry.scheduledStep;
    }

    return {
      totalScheduled: entries.length,
      pending: entries.filter(e => e.status === 'pending').length,
      ready: entries.filter(e => e.status === 'ready').length,
      executed: executed.length,
      cancelled: entries.filter(e => e.status === 'cancelled').length,
      vetoed: entries.filter(e => e.status === 'vetoed').length,
      averageDelaySteps: executed.length > 0 ? totalDelay / executed.length : 0,
    };
  }

  /**
   * Clean up old entries (executed/cancelled older than threshold)
   */
  cleanup(maxAgeSteps: number = 2400): number {  // Default 100 days
    const currentStep = this.dao.currentStep;
    let cleaned = 0;

    for (const [id, entry] of this.entries.entries()) {
      const isOld =
        (entry.status === 'executed' || entry.status === 'cancelled' || entry.status === 'vetoed') &&
        (entry.executedAt || entry.cancelledAt || entry.createdAt) < currentStep - maxAgeSteps;

      if (isOld) {
        this.entries.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Serialize to plain object
   */
  toDict(): {
    entries: Record<string, TimelockEntry>;
    config: TimelockConfig;
  } {
    return {
      entries: Object.fromEntries(this.entries),
      config: this.config,
    };
  }

  /**
   * Restore from serialized data
   */
  static fromDict(
    data: {
      entries?: Record<string, TimelockEntry>;
      config?: Partial<TimelockConfig>;
    },
    dao: DAO
  ): TimelockController {
    const controller = new TimelockController(dao, data.config || {});

    if (data.entries) {
      for (const [id, entry] of Object.entries(data.entries)) {
        controller.entries.set(id, entry);
      }
    }

    return controller;
  }

  /**
   * Clamp delay to configured bounds
   */
  private clampDelay(steps: number): number {
    return Math.max(
      this.config.minDelaySteps,
      Math.min(steps, this.config.maxDelaySteps)
    );
  }

  /**
   * Get all entries
   */
  getAllEntries(): TimelockEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Get configuration
   */
  getConfig(): TimelockConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<TimelockConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
    };
  }
}

/**
 * Factory function to create a timelock controller with common presets
 */
export function createTimelockController(
  dao: DAO,
  preset: 'standard' | 'dual_governance' | 'fast' | 'slow' = 'standard'
): TimelockController {
  const presets: Record<string, Partial<TimelockConfig>> = {
    standard: {
      minDelaySteps: 48,    // 2 days
      maxDelaySteps: 168,   // 7 days
      enableDynamicExtension: false,
    },
    dual_governance: {
      minDelaySteps: 120,   // 5 days
      maxDelaySteps: 1080,  // 45 days
      enableDynamicExtension: true,
      vetoThresholdPercent: 1,
    },
    fast: {
      minDelaySteps: 24,    // 1 day
      maxDelaySteps: 72,    // 3 days
      enableDynamicExtension: false,
    },
    slow: {
      minDelaySteps: 168,   // 7 days
      maxDelaySteps: 720,   // 30 days
      enableDynamicExtension: false,
    },
  };

  return new TimelockController(dao, presets[preset] || presets.standard);
}
