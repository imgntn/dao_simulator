/**
 * stETH Supply Tracker - Lido Staked ETH Supply Tracking
 *
 * Tracks stETH/wstETH supply for calculating veto thresholds
 * in Lido's dual governance system.
 */

import type { EventBus } from '../utils/event-bus';

// =============================================================================
// TYPES
// =============================================================================

export interface StakerPosition {
  stakerId: string;
  stETHBalance: number;
  wstETHBalance: number;
  unstETHBalance: number;  // Withdrawal NFTs
  lastUpdatedStep: number;
}

export interface SupplySnapshot {
  step: number;
  totalStETH: number;
  totalWstETH: number;
  totalUnstETH: number;
  totalCombined: number;
  stakerCount: number;
}

// =============================================================================
// STETH SUPPLY TRACKER
// =============================================================================

export class StETHSupplyTracker {
  private positions: Map<string, StakerPosition> = new Map();
  private snapshots: SupplySnapshot[] = [];
  private eventBus: EventBus | null = null;

  // Current totals
  totalStETH: number = 0;
  totalWstETH: number = 0;
  totalUnstETH: number = 0;

  // Snapshot interval
  snapshotInterval: number;

  constructor(snapshotInterval: number = 24) {
    this.snapshotInterval = snapshotInterval;
  }

  /**
   * Set event bus
   */
  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Update staker position
   */
  updatePosition(
    stakerId: string,
    stETH: number,
    wstETH: number,
    unstETH: number,
    currentStep: number
  ): void {
    const existing = this.positions.get(stakerId);

    if (existing) {
      // Update totals
      this.totalStETH = this.totalStETH - existing.stETHBalance + stETH;
      this.totalWstETH = this.totalWstETH - existing.wstETHBalance + wstETH;
      this.totalUnstETH = this.totalUnstETH - existing.unstETHBalance + unstETH;

      existing.stETHBalance = stETH;
      existing.wstETHBalance = wstETH;
      existing.unstETHBalance = unstETH;
      existing.lastUpdatedStep = currentStep;
    } else {
      // New position
      this.positions.set(stakerId, {
        stakerId,
        stETHBalance: stETH,
        wstETHBalance: wstETH,
        unstETHBalance: unstETH,
        lastUpdatedStep: currentStep,
      });

      this.totalStETH += stETH;
      this.totalWstETH += wstETH;
      this.totalUnstETH += unstETH;
    }

    this.emit('steth_position_updated', {
      step: currentStep,
      stakerId,
      stETH,
      wstETH,
      unstETH,
      totalCombined: this.getTotalCombined(),
    });
  }

  /**
   * Add stETH to a position
   */
  addStETH(stakerId: string, amount: number, currentStep: number): void {
    const existing = this.positions.get(stakerId);
    if (existing) {
      this.updatePosition(
        stakerId,
        existing.stETHBalance + amount,
        existing.wstETHBalance,
        existing.unstETHBalance,
        currentStep
      );
    } else {
      this.updatePosition(stakerId, amount, 0, 0, currentStep);
    }
  }

  /**
   * Remove stETH from a position
   */
  removeStETH(stakerId: string, amount: number, currentStep: number): boolean {
    const existing = this.positions.get(stakerId);
    if (!existing || existing.stETHBalance < amount) {
      return false;
    }

    this.updatePosition(
      stakerId,
      existing.stETHBalance - amount,
      existing.wstETHBalance,
      existing.unstETHBalance,
      currentStep
    );

    return true;
  }

  /**
   * Convert stETH to wstETH
   */
  wrapStETH(stakerId: string, amount: number, currentStep: number): boolean {
    const existing = this.positions.get(stakerId);
    if (!existing || existing.stETHBalance < amount) {
      return false;
    }

    // Simplified 1:1 conversion (in reality there's an exchange rate)
    this.updatePosition(
      stakerId,
      existing.stETHBalance - amount,
      existing.wstETHBalance + amount,
      existing.unstETHBalance,
      currentStep
    );

    return true;
  }

  /**
   * Convert wstETH to stETH
   */
  unwrapWstETH(stakerId: string, amount: number, currentStep: number): boolean {
    const existing = this.positions.get(stakerId);
    if (!existing || existing.wstETHBalance < amount) {
      return false;
    }

    this.updatePosition(
      stakerId,
      existing.stETHBalance + amount,
      existing.wstETHBalance - amount,
      existing.unstETHBalance,
      currentStep
    );

    return true;
  }

  /**
   * Request withdrawal (stETH -> unstETH)
   */
  requestWithdrawal(stakerId: string, amount: number, currentStep: number): boolean {
    const existing = this.positions.get(stakerId);
    if (!existing || existing.stETHBalance < amount) {
      return false;
    }

    this.updatePosition(
      stakerId,
      existing.stETHBalance - amount,
      existing.wstETHBalance,
      existing.unstETHBalance + amount,
      currentStep
    );

    this.emit('withdrawal_requested', {
      step: currentStep,
      stakerId,
      amount,
    });

    return true;
  }

  /**
   * Claim withdrawal (unstETH -> removed)
   */
  claimWithdrawal(stakerId: string, amount: number, currentStep: number): boolean {
    const existing = this.positions.get(stakerId);
    if (!existing || existing.unstETHBalance < amount) {
      return false;
    }

    this.updatePosition(
      stakerId,
      existing.stETHBalance,
      existing.wstETHBalance,
      existing.unstETHBalance - amount,
      currentStep
    );

    this.emit('withdrawal_claimed', {
      step: currentStep,
      stakerId,
      amount,
    });

    return true;
  }

  /**
   * Get total combined supply (stETH + wstETH + unstETH)
   */
  getTotalCombined(): number {
    return this.totalStETH + this.totalWstETH + this.totalUnstETH;
  }

  /**
   * Get staker position
   */
  getPosition(stakerId: string): StakerPosition | undefined {
    return this.positions.get(stakerId);
  }

  /**
   * Get staker's total balance
   */
  getStakerTotal(stakerId: string): number {
    const position = this.positions.get(stakerId);
    if (!position) return 0;
    return position.stETHBalance + position.wstETHBalance + position.unstETHBalance;
  }

  /**
   * Get all positions
   */
  getAllPositions(): StakerPosition[] {
    return Array.from(this.positions.values());
  }

  /**
   * Take a supply snapshot
   */
  takeSnapshot(currentStep: number): SupplySnapshot {
    const snapshot: SupplySnapshot = {
      step: currentStep,
      totalStETH: this.totalStETH,
      totalWstETH: this.totalWstETH,
      totalUnstETH: this.totalUnstETH,
      totalCombined: this.getTotalCombined(),
      stakerCount: this.positions.size,
    };

    this.snapshots.push(snapshot);

    // Keep only last 100 snapshots
    if (this.snapshots.length > 100) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  /**
   * Process step - take snapshot if needed
   */
  processStep(currentStep: number): void {
    if (currentStep > 0 && currentStep % this.snapshotInterval === 0) {
      this.takeSnapshot(currentStep);
    }
  }

  /**
   * Get latest snapshot
   */
  getLatestSnapshot(): SupplySnapshot | null {
    if (this.snapshots.length === 0) return null;
    return this.snapshots[this.snapshots.length - 1];
  }

  /**
   * Get snapshots
   */
  getSnapshots(limit?: number): SupplySnapshot[] {
    if (limit) {
      return this.snapshots.slice(-limit);
    }
    return [...this.snapshots];
  }

  /**
   * Calculate percentage of total for a staker
   */
  getStakerPercentage(stakerId: string): number {
    const total = this.getTotalCombined();
    if (total <= 0) return 0;
    return (this.getStakerTotal(stakerId) / total) * 100;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalStETH: number;
    totalWstETH: number;
    totalUnstETH: number;
    totalCombined: number;
    stakerCount: number;
    averageBalance: number;
  } {
    const total = this.getTotalCombined();
    const count = this.positions.size;

    return {
      totalStETH: this.totalStETH,
      totalWstETH: this.totalWstETH,
      totalUnstETH: this.totalUnstETH,
      totalCombined: total,
      stakerCount: count,
      averageBalance: count > 0 ? total / count : 0,
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
      snapshotInterval: this.snapshotInterval,
      totalStETH: this.totalStETH,
      totalWstETH: this.totalWstETH,
      totalUnstETH: this.totalUnstETH,
      positions: Array.from(this.positions.entries()),
      snapshots: this.snapshots,
    };
  }

  /**
   * Restore from serialized data
   */
  static fromDict(data: any): StETHSupplyTracker {
    const tracker = new StETHSupplyTracker(data.snapshotInterval || 24);
    tracker.totalStETH = data.totalStETH || 0;
    tracker.totalWstETH = data.totalWstETH || 0;
    tracker.totalUnstETH = data.totalUnstETH || 0;

    if (data.positions) {
      for (const [id, position] of data.positions) {
        tracker.positions.set(id, position);
      }
    }

    if (data.snapshots) {
      tracker.snapshots.push(...data.snapshots);
    }

    return tracker;
  }
}

/**
 * Factory function for Lido stETH tracker
 */
export function createLidoStETHTracker(): StETHSupplyTracker {
  return new StETHSupplyTracker(24);  // Daily snapshots
}
