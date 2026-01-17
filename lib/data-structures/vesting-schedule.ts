/**
 * Vesting Schedules - Token Vesting with Cliff and Release Schedules
 *
 * Implements token vesting for team members, investors, and contributors.
 * Supports linear, stepped, and milestone-based vesting with configurable cliffs.
 */

import type { EventBus } from '../utils/event-bus';

// =============================================================================
// TYPES
// =============================================================================

export type VestingType =
  | 'linear'       // Continuous linear vesting
  | 'stepped'      // Release in discrete chunks (monthly, quarterly)
  | 'milestone';   // Release on milestone completion

export interface VestingMilestone {
  id: string;
  description: string;
  releasePercent: number;   // Percentage of total to release (0-100)
  completed: boolean;
  completedStep: number | null;
}

export interface VestingBeneficiary {
  address: string;
  allocationPercent: number;  // Percentage of schedule allocation (0-100)
  claimed: number;
  lastClaimStep: number | null;
}

export interface VestingSchedule {
  scheduleId: string;
  grantor: string;
  token: string;
  totalAmount: number;
  beneficiaries: VestingBeneficiary[];
  vestingType: VestingType;
  startStep: number;
  endStep: number;
  cliffSteps: number;           // Steps before first release
  cliffPercent: number;         // Percentage released at cliff (0-100)
  stepIntervalSteps: number;    // For stepped: interval between releases
  milestones: VestingMilestone[];  // For milestone-based
  revoked: boolean;
  revokedStep: number | null;
  metadata: Record<string, unknown>;
}

export interface VestingConfig {
  minVestingDuration: number;   // Minimum vesting period
  maxVestingDuration: number;   // Maximum vesting period
  minCliffDuration: number;     // Minimum cliff period
  maxCliffPercent: number;      // Maximum cliff release percent
  allowRevoke: boolean;         // Allow grantor to revoke
  revokeReturnsUnvested: boolean;  // Return unvested to grantor on revoke
}

export interface VestingStats {
  totalSchedules: number;
  activeSchedules: number;
  revokedSchedules: number;
  completedSchedules: number;
  totalAllocated: number;
  totalClaimed: number;
  totalUnclaimed: number;
}

// =============================================================================
// VESTING CONTROLLER
// =============================================================================

export class VestingController {
  private schedules: Map<string, VestingSchedule> = new Map();
  private grantorSchedules: Map<string, Set<string>> = new Map();       // grantor -> scheduleIds
  private beneficiarySchedules: Map<string, Set<string>> = new Map();   // beneficiary -> scheduleIds
  private eventBus: EventBus | null = null;
  private scheduleCounter: number = 0;

  config: VestingConfig;

  constructor(config?: Partial<VestingConfig>) {
    this.config = {
      minVestingDuration: 168,       // 1 week minimum
      maxVestingDuration: 35040 * 4, // 4 years max
      minCliffDuration: 0,           // No minimum cliff
      maxCliffPercent: 25,           // Max 25% at cliff
      allowRevoke: true,
      revokeReturnsUnvested: true,
      ...config,
    };
  }

  /**
   * Set event bus for publishing events
   */
  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Create a new vesting schedule
   */
  createSchedule(params: {
    grantor: string;
    token: string;
    totalAmount: number;
    beneficiaries: Array<{ address: string; allocationPercent: number }>;
    vestingType: VestingType;
    durationSteps: number;
    cliffSteps?: number;
    cliffPercent?: number;
    stepIntervalSteps?: number;
    milestones?: Array<{ id: string; description: string; releasePercent: number }>;
    metadata?: Record<string, unknown>;
  }, currentStep: number): VestingSchedule | null {
    // Validate duration
    if (params.durationSteps < this.config.minVestingDuration) {
      return null;
    }
    if (params.durationSteps > this.config.maxVestingDuration) {
      return null;
    }

    // Validate beneficiaries
    const totalAllocation = params.beneficiaries.reduce((sum, b) => sum + b.allocationPercent, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      return null;  // Must sum to 100%
    }

    // Validate cliff
    const cliffSteps = params.cliffSteps || 0;
    const cliffPercent = params.cliffPercent || 0;
    if (cliffPercent > this.config.maxCliffPercent) {
      return null;
    }
    if (cliffSteps < this.config.minCliffDuration) {
      return null;
    }

    // Validate milestones for milestone-based vesting
    if (params.vestingType === 'milestone') {
      if (!params.milestones || params.milestones.length === 0) {
        return null;
      }
      const milestoneTotal = params.milestones.reduce((sum, m) => sum + m.releasePercent, 0);
      if (Math.abs(milestoneTotal - 100) > 0.01) {
        return null;  // Milestones must sum to 100%
      }
    }

    // Generate schedule ID
    this.scheduleCounter++;
    const scheduleId = `vesting_${this.scheduleCounter}`;

    // Create beneficiary records
    const beneficiaryRecords: VestingBeneficiary[] = params.beneficiaries.map(b => ({
      address: b.address,
      allocationPercent: b.allocationPercent,
      claimed: 0,
      lastClaimStep: null,
    }));

    // Create milestone records
    const milestoneRecords: VestingMilestone[] = (params.milestones || []).map(m => ({
      id: m.id,
      description: m.description,
      releasePercent: m.releasePercent,
      completed: false,
      completedStep: null,
    }));

    const schedule: VestingSchedule = {
      scheduleId,
      grantor: params.grantor,
      token: params.token,
      totalAmount: params.totalAmount,
      beneficiaries: beneficiaryRecords,
      vestingType: params.vestingType,
      startStep: currentStep,
      endStep: currentStep + params.durationSteps,
      cliffSteps,
      cliffPercent,
      stepIntervalSteps: params.stepIntervalSteps || Math.floor(params.durationSteps / 12),
      milestones: milestoneRecords,
      revoked: false,
      revokedStep: null,
      metadata: params.metadata || {},
    };

    // Store schedule
    this.schedules.set(scheduleId, schedule);

    // Update grantor index
    if (!this.grantorSchedules.has(params.grantor)) {
      this.grantorSchedules.set(params.grantor, new Set());
    }
    this.grantorSchedules.get(params.grantor)!.add(scheduleId);

    // Update beneficiary indices
    for (const b of params.beneficiaries) {
      if (!this.beneficiarySchedules.has(b.address)) {
        this.beneficiarySchedules.set(b.address, new Set());
      }
      this.beneficiarySchedules.get(b.address)!.add(scheduleId);
    }

    this.emit('vesting_created', {
      step: currentStep,
      scheduleId,
      grantor: params.grantor,
      token: params.token,
      totalAmount: params.totalAmount,
      beneficiaryCount: params.beneficiaries.length,
      vestingType: params.vestingType,
      durationSteps: params.durationSteps,
      cliffSteps,
    });

    return schedule;
  }

  /**
   * Calculate vested amount for a schedule at current step
   */
  getVestedAmount(scheduleId: string, currentStep: number): number {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule || schedule.revoked) {
      return 0;
    }

    const elapsed = currentStep - schedule.startStep;
    if (elapsed < 0) {
      return 0;
    }

    // Check cliff
    if (elapsed < schedule.cliffSteps) {
      return 0;
    }

    const totalDuration = schedule.endStep - schedule.startStep;
    let vestedPercent: number;

    switch (schedule.vestingType) {
      case 'linear':
        // Cliff release + linear vesting
        if (currentStep >= schedule.endStep) {
          vestedPercent = 100;
        } else if (elapsed === schedule.cliffSteps) {
          vestedPercent = schedule.cliffPercent;
        } else {
          // Cliff + linear for remaining
          const postCliffElapsed = elapsed - schedule.cliffSteps;
          const postCliffDuration = totalDuration - schedule.cliffSteps;
          const linearPercent = (100 - schedule.cliffPercent) * (postCliffElapsed / postCliffDuration);
          vestedPercent = schedule.cliffPercent + linearPercent;
        }
        break;

      case 'stepped':
        // Cliff + stepped releases
        if (currentStep >= schedule.endStep) {
          vestedPercent = 100;
        } else {
          const postCliffElapsed = elapsed - schedule.cliffSteps;
          const postCliffDuration = totalDuration - schedule.cliffSteps;
          const completedSteps = Math.floor(postCliffElapsed / schedule.stepIntervalSteps);
          const totalSteps = Math.ceil(postCliffDuration / schedule.stepIntervalSteps);
          const steppedPercent = ((100 - schedule.cliffPercent) * completedSteps) / totalSteps;
          vestedPercent = schedule.cliffPercent + steppedPercent;
        }
        break;

      case 'milestone':
        // Sum completed milestones
        vestedPercent = schedule.milestones
          .filter(m => m.completed)
          .reduce((sum, m) => sum + m.releasePercent, 0);
        break;

      default:
        vestedPercent = 0;
    }

    return (schedule.totalAmount * Math.min(vestedPercent, 100)) / 100;
  }

  /**
   * Calculate claimable amount for a beneficiary
   */
  getClaimableAmount(
    scheduleId: string,
    beneficiaryAddress: string,
    currentStep: number
  ): number {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule || schedule.revoked) {
      return 0;
    }

    const beneficiary = schedule.beneficiaries.find(b => b.address === beneficiaryAddress);
    if (!beneficiary) {
      return 0;
    }

    const totalVested = this.getVestedAmount(scheduleId, currentStep);
    const beneficiaryVested = (totalVested * beneficiary.allocationPercent) / 100;

    return Math.max(0, beneficiaryVested - beneficiary.claimed);
  }

  /**
   * Claim vested tokens
   */
  claim(
    scheduleId: string,
    beneficiaryAddress: string,
    currentStep: number
  ): number {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule || schedule.revoked) {
      return 0;
    }

    const beneficiary = schedule.beneficiaries.find(b => b.address === beneficiaryAddress);
    if (!beneficiary) {
      return 0;
    }

    const claimable = this.getClaimableAmount(scheduleId, beneficiaryAddress, currentStep);
    if (claimable <= 0) {
      return 0;
    }

    beneficiary.claimed += claimable;
    beneficiary.lastClaimStep = currentStep;

    // Check if cliff was just reached
    const elapsed = currentStep - schedule.startStep;
    const isCliffReached = elapsed >= schedule.cliffSteps && elapsed < schedule.cliffSteps + 1;

    if (isCliffReached) {
      this.emit('vesting_cliff_reached', {
        step: currentStep,
        scheduleId,
        beneficiary: beneficiaryAddress,
        cliffAmount: claimable,
      });
    }

    this.emit('vesting_claimed', {
      step: currentStep,
      scheduleId,
      beneficiary: beneficiaryAddress,
      amount: claimable,
      totalClaimed: beneficiary.claimed,
    });

    return claimable;
  }

  /**
   * Complete a milestone (for milestone-based vesting)
   */
  completeMilestone(
    scheduleId: string,
    milestoneId: string,
    currentStep: number
  ): boolean {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule || schedule.revoked || schedule.vestingType !== 'milestone') {
      return false;
    }

    const milestone = schedule.milestones.find(m => m.id === milestoneId);
    if (!milestone || milestone.completed) {
      return false;
    }

    milestone.completed = true;
    milestone.completedStep = currentStep;

    this.emit('vesting_milestone_completed', {
      step: currentStep,
      scheduleId,
      milestoneId,
      releasePercent: milestone.releasePercent,
    });

    return true;
  }

  /**
   * Revoke a vesting schedule
   */
  revoke(
    scheduleId: string,
    revoker: string,
    currentStep: number
  ): { unclaimedReturned: number } | null {
    if (!this.config.allowRevoke) {
      return null;
    }

    const schedule = this.schedules.get(scheduleId);
    if (!schedule || schedule.revoked) {
      return null;
    }

    // Only grantor can revoke
    if (revoker !== schedule.grantor) {
      return null;
    }

    schedule.revoked = true;
    schedule.revokedStep = currentStep;

    // Calculate unclaimed
    let totalClaimed = 0;
    for (const b of schedule.beneficiaries) {
      totalClaimed += b.claimed;
    }

    const unclaimedReturned = this.config.revokeReturnsUnvested
      ? schedule.totalAmount - totalClaimed
      : 0;

    this.emit('vesting_revoked', {
      step: currentStep,
      scheduleId,
      grantor: schedule.grantor,
      unclaimedReturned,
    });

    return { unclaimedReturned };
  }

  /**
   * Process schedules for current step
   */
  processSchedules(currentStep: number): void {
    for (const schedule of this.schedules.values()) {
      if (schedule.revoked) continue;

      // Check if schedule just completed
      if (currentStep === schedule.endStep) {
        const totalClaimed = schedule.beneficiaries.reduce((sum, b) => sum + b.claimed, 0);
        const unclaimed = schedule.totalAmount - totalClaimed;

        this.emit('vesting_completed', {
          step: currentStep,
          scheduleId: schedule.scheduleId,
          grantor: schedule.grantor,
          totalAmount: schedule.totalAmount,
          totalClaimed,
          unclaimed,
        });
      }
    }
  }

  /**
   * Get schedule by ID
   */
  getSchedule(scheduleId: string): VestingSchedule | undefined {
    return this.schedules.get(scheduleId);
  }

  /**
   * Get all schedules for a grantor
   */
  getGrantorSchedules(grantor: string): VestingSchedule[] {
    const ids = this.grantorSchedules.get(grantor);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.schedules.get(id))
      .filter((s): s is VestingSchedule => s !== undefined);
  }

  /**
   * Get all schedules for a beneficiary
   */
  getBeneficiarySchedules(beneficiary: string): VestingSchedule[] {
    const ids = this.beneficiarySchedules.get(beneficiary);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.schedules.get(id))
      .filter((s): s is VestingSchedule => s !== undefined);
  }

  /**
   * Get statistics
   */
  getStats(): VestingStats {
    let activeSchedules = 0;
    let revokedSchedules = 0;
    let completedSchedules = 0;
    let totalAllocated = 0;
    let totalClaimed = 0;

    for (const schedule of this.schedules.values()) {
      totalAllocated += schedule.totalAmount;

      const claimed = schedule.beneficiaries.reduce((sum, b) => sum + b.claimed, 0);
      totalClaimed += claimed;

      if (schedule.revoked) {
        revokedSchedules++;
      } else if (claimed >= schedule.totalAmount) {
        completedSchedules++;
      } else {
        activeSchedules++;
      }
    }

    return {
      totalSchedules: this.schedules.size,
      activeSchedules,
      revokedSchedules,
      completedSchedules,
      totalAllocated,
      totalClaimed,
      totalUnclaimed: totalAllocated - totalClaimed,
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
      scheduleCounter: this.scheduleCounter,
      schedules: Array.from(this.schedules.entries()),
      grantorSchedules: Array.from(this.grantorSchedules.entries()).map(([g, ids]) => [
        g,
        Array.from(ids),
      ]),
      beneficiarySchedules: Array.from(this.beneficiarySchedules.entries()).map(([b, ids]) => [
        b,
        Array.from(ids),
      ]),
    };
  }

  /**
   * Restore from serialized data
   */
  static fromDict(data: any): VestingController {
    const controller = new VestingController(data.config);
    controller.scheduleCounter = data.scheduleCounter || 0;

    if (data.schedules) {
      for (const [id, schedule] of data.schedules) {
        controller.schedules.set(id, schedule);
      }
    }

    if (data.grantorSchedules) {
      for (const [grantor, ids] of data.grantorSchedules) {
        controller.grantorSchedules.set(grantor, new Set(ids));
      }
    }

    if (data.beneficiarySchedules) {
      for (const [beneficiary, ids] of data.beneficiarySchedules) {
        controller.beneficiarySchedules.set(beneficiary, new Set(ids));
      }
    }

    return controller;
  }
}

/**
 * Factory function to create vesting controller with standard startup defaults
 */
export function createStartupVestingController(): VestingController {
  return new VestingController({
    minVestingDuration: 8760,     // 1 year minimum
    maxVestingDuration: 35040,    // 4 years max
    minCliffDuration: 2190,       // 3 month minimum cliff
    maxCliffPercent: 10,          // Max 10% at cliff
    allowRevoke: true,
    revokeReturnsUnvested: true,
  });
}

/**
 * Factory function to create vesting controller for DAO contributor grants
 */
export function createDAOGrantVestingController(): VestingController {
  return new VestingController({
    minVestingDuration: 720,      // 1 month minimum
    maxVestingDuration: 17520,    // 2 years max
    minCliffDuration: 0,          // No cliff required
    maxCliffPercent: 25,          // Up to 25% at cliff
    allowRevoke: true,
    revokeReturnsUnvested: true,
  });
}
