/**
 * Easy Track - Lido-style Fast-Track Governance
 *
 * Enables streamlined governance for recurring, limited-scope actions
 * like contributor payments, grants, and routine parameter updates.
 * Actions pass unless objected to within a short window.
 */

import type { DAO } from '../data-structures/dao';
import type { EventBus } from '../utils/event-bus';

// =============================================================================
// TYPES
// =============================================================================

export type EasyTrackMotionType =
  | 'top_up_lego'           // LEGO grants top-up
  | 'top_up_referral'       // Referral program top-up
  | 'top_up_rewards_share'  // Rewards share program
  | 'add_reward_program'    // Add new reward program
  | 'remove_reward_program' // Remove reward program
  | 'node_operator_limit'   // Increase node operator stake limit
  | 'token_transfer'        // Standard token transfer
  | 'custom';               // Custom motion type

export type MotionStatus =
  | 'pending'    // Awaiting objection period
  | 'enacted'    // Passed and executed
  | 'objected'   // Blocked by objections
  | 'cancelled'; // Cancelled by creator

export interface EasyTrackMotion {
  id: string;
  type: EasyTrackMotionType;
  creator: string;
  title: string;
  description: string;
  payload: unknown;

  // Timing
  createdStep: number;
  objectionPeriodSteps: number;
  enactmentStep: number | null;

  // Objection tracking
  objections: Map<string, number>;  // memberId -> voting power
  totalObjectionPower: number;
  objectionThresholdPercent: number;  // Default 0.5%

  status: MotionStatus;
  statusReason?: string;
}

export interface EasyTrackConfig {
  enabled: boolean;
  objectionPeriodSteps: number;        // Default 72 (3 days at 24 steps/day)
  objectionThresholdPercent: number;   // Default 0.5%
  allowedMotionTypes: EasyTrackMotionType[];
  maxPendingMotions: number;           // Limit concurrent motions
}

// =============================================================================
// EASY TRACK CONTROLLER
// =============================================================================

export class EasyTrackController {
  private motions: Map<string, EasyTrackMotion> = new Map();
  private motionCounter: number = 0;
  private eventBus: EventBus | null = null;

  config: EasyTrackConfig;
  totalVotingPower: number = 0;  // Updated externally

  constructor(config?: Partial<EasyTrackConfig>) {
    this.config = {
      enabled: config?.enabled ?? true,
      objectionPeriodSteps: config?.objectionPeriodSteps ?? 72,
      objectionThresholdPercent: config?.objectionThresholdPercent ?? 0.5,
      allowedMotionTypes: config?.allowedMotionTypes ?? [
        'top_up_lego',
        'top_up_referral',
        'top_up_rewards_share',
        'token_transfer',
      ],
      maxPendingMotions: config?.maxPendingMotions ?? 10,
    };
  }

  /**
   * Set event bus for publishing events
   */
  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Update total voting power (call each step)
   */
  updateTotalVotingPower(power: number): void {
    this.totalVotingPower = power;
  }

  /**
   * Create a new Easy Track motion
   */
  createMotion(
    type: EasyTrackMotionType,
    creator: string,
    title: string,
    description: string,
    payload: unknown,
    currentStep: number
  ): EasyTrackMotion | null {
    if (!this.config.enabled) {
      return null;
    }

    // Check if motion type is allowed
    if (!this.config.allowedMotionTypes.includes(type) && type !== 'custom') {
      return null;
    }

    // Check pending motion limit
    const pendingCount = Array.from(this.motions.values())
      .filter(m => m.status === 'pending').length;
    if (pendingCount >= this.config.maxPendingMotions) {
      return null;
    }

    const motionId = `easy_track_${++this.motionCounter}`;

    const motion: EasyTrackMotion = {
      id: motionId,
      type,
      creator,
      title,
      description,
      payload,
      createdStep: currentStep,
      objectionPeriodSteps: this.config.objectionPeriodSteps,
      enactmentStep: null,
      objections: new Map(),
      totalObjectionPower: 0,
      objectionThresholdPercent: this.config.objectionThresholdPercent,
      status: 'pending',
    };

    this.motions.set(motionId, motion);

    this.emit('easy_track_motion_created', {
      step: currentStep,
      motionId,
      type,
      creator,
      title,
      objectionDeadline: currentStep + this.config.objectionPeriodSteps,
    });

    return motion;
  }

  /**
   * Object to a motion
   */
  objectToMotion(
    motionId: string,
    memberId: string,
    votingPower: number,
    currentStep: number
  ): boolean {
    const motion = this.motions.get(motionId);
    if (!motion || motion.status !== 'pending') {
      return false;
    }

    // Check if objection period has passed
    if (currentStep >= motion.createdStep + motion.objectionPeriodSteps) {
      return false;
    }

    // Already objected?
    if (motion.objections.has(memberId)) {
      return false;
    }

    motion.objections.set(memberId, votingPower);
    motion.totalObjectionPower += votingPower;

    this.emit('easy_track_objection', {
      step: currentStep,
      motionId,
      memberId,
      votingPower,
      totalObjectionPower: motion.totalObjectionPower,
    });

    // Check if objection threshold reached
    if (this.isObjectionThresholdReached(motion)) {
      motion.status = 'objected';
      motion.statusReason = 'Objection threshold reached';

      this.emit('easy_track_motion_objected', {
        step: currentStep,
        motionId,
        totalObjectionPower: motion.totalObjectionPower,
        threshold: this.getObjectionThreshold(),
      });
    }

    return true;
  }

  /**
   * Withdraw objection
   */
  withdrawObjection(
    motionId: string,
    memberId: string,
    currentStep: number
  ): boolean {
    const motion = this.motions.get(motionId);
    if (!motion || motion.status !== 'pending') {
      return false;
    }

    const power = motion.objections.get(memberId);
    if (power === undefined) {
      return false;
    }

    motion.objections.delete(memberId);
    motion.totalObjectionPower -= power;

    this.emit('easy_track_objection_withdrawn', {
      step: currentStep,
      motionId,
      memberId,
      votingPower: power,
    });

    return true;
  }

  /**
   * Cancel a motion (creator only)
   */
  cancelMotion(
    motionId: string,
    requesterId: string,
    currentStep: number
  ): boolean {
    const motion = this.motions.get(motionId);
    if (!motion || motion.status !== 'pending') {
      return false;
    }

    if (motion.creator !== requesterId) {
      return false;
    }

    motion.status = 'cancelled';
    motion.statusReason = 'Cancelled by creator';

    this.emit('easy_track_motion_cancelled', {
      step: currentStep,
      motionId,
      creator: requesterId,
    });

    return true;
  }

  /**
   * Process motions - called each step
   * Returns motions ready for enactment
   */
  processMotions(currentStep: number): EasyTrackMotion[] {
    const readyForEnactment: EasyTrackMotion[] = [];

    for (const motion of this.motions.values()) {
      if (motion.status !== 'pending') continue;

      const deadline = motion.createdStep + motion.objectionPeriodSteps;

      if (currentStep >= deadline) {
        // Objection period ended without threshold reached
        if (!this.isObjectionThresholdReached(motion)) {
          motion.status = 'enacted';
          motion.enactmentStep = currentStep;
          readyForEnactment.push(motion);

          this.emit('easy_track_motion_enacted', {
            step: currentStep,
            motionId: motion.id,
            type: motion.type,
            payload: motion.payload,
          });
        }
      }
    }

    return readyForEnactment;
  }

  /**
   * Execute an enacted motion
   */
  executeMotion(motion: EasyTrackMotion, dao: DAO): boolean {
    if (motion.status !== 'enacted') {
      return false;
    }

    // Execute based on motion type
    switch (motion.type) {
      case 'token_transfer': {
        const payload = motion.payload as {
          token: string;
          amount: number;
          recipient: string;
        };
        const withdrawn = dao.treasury.withdraw(
          payload.token,
          payload.amount,
          motion.enactmentStep || 0
        );
        return withdrawn > 0;
      }

      case 'top_up_lego':
      case 'top_up_referral':
      case 'top_up_rewards_share': {
        const payload = motion.payload as {
          token: string;
          amount: number;
          program: string;
        };
        // In a real implementation, this would transfer to specific program
        const withdrawn = dao.treasury.withdraw(
          payload.token,
          payload.amount,
          motion.enactmentStep || 0
        );
        return withdrawn > 0;
      }

      case 'node_operator_limit': {
        // Would update node operator parameters
        return true;
      }

      case 'add_reward_program':
      case 'remove_reward_program': {
        // Would modify reward program registry
        return true;
      }

      default:
        return true;
    }
  }

  /**
   * Check if objection threshold is reached
   */
  private isObjectionThresholdReached(motion: EasyTrackMotion): boolean {
    if (this.totalVotingPower <= 0) return false;
    const percent = (motion.totalObjectionPower / this.totalVotingPower) * 100;
    return percent >= motion.objectionThresholdPercent;
  }

  /**
   * Get absolute objection threshold
   */
  private getObjectionThreshold(): number {
    return (this.config.objectionThresholdPercent / 100) * this.totalVotingPower;
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
   * Get motion by ID
   */
  getMotion(motionId: string): EasyTrackMotion | undefined {
    return this.motions.get(motionId);
  }

  /**
   * Get all motions
   */
  getAllMotions(): EasyTrackMotion[] {
    return Array.from(this.motions.values());
  }

  /**
   * Get pending motions
   */
  getPendingMotions(): EasyTrackMotion[] {
    return Array.from(this.motions.values())
      .filter(m => m.status === 'pending');
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    pending: number;
    enacted: number;
    objected: number;
    cancelled: number;
  } {
    const motions = Array.from(this.motions.values());
    return {
      total: motions.length,
      pending: motions.filter(m => m.status === 'pending').length,
      enacted: motions.filter(m => m.status === 'enacted').length,
      objected: motions.filter(m => m.status === 'objected').length,
      cancelled: motions.filter(m => m.status === 'cancelled').length,
    };
  }

  /**
   * Serialize to plain object
   */
  toDict(): unknown {
    return {
      config: this.config,
      motionCounter: this.motionCounter,
      totalVotingPower: this.totalVotingPower,
      motions: Array.from(this.motions.entries()).map(([id, motion]) => ({
        ...motion,
        objections: Object.fromEntries(motion.objections),
      })),
    };
  }

  /**
   * Restore from serialized data
   */
  static fromDict(data: any): EasyTrackController {
    const controller = new EasyTrackController(data.config);
    controller.motionCounter = data.motionCounter || 0;
    controller.totalVotingPower = data.totalVotingPower || 0;

    if (data.motions) {
      for (const motionData of data.motions) {
        const motion: EasyTrackMotion = {
          ...motionData,
          objections: new Map(Object.entries(motionData.objections || {})),
        };
        controller.motions.set(motion.id, motion);
      }
    }

    return controller;
  }
}

/**
 * Factory function to create Easy Track for Lido
 */
export function createLidoEasyTrack(): EasyTrackController {
  return new EasyTrackController({
    enabled: true,
    objectionPeriodSteps: 72,  // 3 days
    objectionThresholdPercent: 0.5,
    allowedMotionTypes: [
      'top_up_lego',
      'top_up_referral',
      'top_up_rewards_share',
      'add_reward_program',
      'remove_reward_program',
      'node_operator_limit',
      'token_transfer',
    ],
    maxPendingMotions: 20,
  });
}
