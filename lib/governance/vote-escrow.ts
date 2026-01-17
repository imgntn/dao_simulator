/**
 * Vote Escrow (veTokens) - Curve/Balancer-style Time-Weighted Voting
 *
 * Implements vote-escrowed tokens where users lock tokens for a period
 * to receive time-weighted voting power. Longer locks = more voting power.
 * Voting power decays linearly to 0 at unlock time.
 */

import type { EventBus } from '../utils/event-bus';

// =============================================================================
// TYPES
// =============================================================================

export interface VeTokenPosition {
  owner: string;
  amount: number;           // Base amount locked
  lockStep: number;         // Step when tokens were locked
  unlockStep: number;       // Step when tokens can be withdrawn
  votingPower: number;      // Current voting power (decays over time)
  slope: number;            // Rate of voting power decay per step
  bias: number;             // Initial voting power at lock time
}

export interface VoteEscrowConfig {
  maxLockSteps: number;     // Maximum lock duration (e.g., 4 years = ~35040 steps at 1hr/step)
  minLockSteps: number;     // Minimum lock duration
  minLockAmount: number;    // Minimum tokens to lock
  powerMultiplier: number;  // Max voting power multiplier at max lock (e.g., 4x for 4 years)
}

export interface VeTokenStats {
  totalLocked: number;
  totalVotingPower: number;
  positionCount: number;
  averageLockDuration: number;
  averageVotingPower: number;
}

// =============================================================================
// VOTE ESCROW CONTROLLER
// =============================================================================

export class VoteEscrowController {
  private positions: Map<string, VeTokenPosition> = new Map();
  private eventBus: EventBus | null = null;

  config: VoteEscrowConfig;
  totalLocked: number = 0;
  totalVotingPower: number = 0;

  constructor(config?: Partial<VoteEscrowConfig>) {
    this.config = {
      maxLockSteps: 35040,        // ~4 years at 1 step/hour
      minLockSteps: 168,          // ~1 week at 1 step/hour
      minLockAmount: 1,
      powerMultiplier: 4,         // 4x voting power for max lock
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
   * Create a new lock position
   * Returns initial voting power granted
   */
  createLock(
    owner: string,
    amount: number,
    lockDurationSteps: number,
    currentStep: number
  ): number {
    // Validate amount
    if (amount < this.config.minLockAmount) {
      return 0;
    }

    // Validate lock duration
    if (lockDurationSteps < this.config.minLockSteps) {
      return 0;
    }
    if (lockDurationSteps > this.config.maxLockSteps) {
      lockDurationSteps = this.config.maxLockSteps;
    }

    // Check for existing position
    const existing = this.positions.get(owner);
    if (existing && existing.unlockStep > currentStep) {
      // Cannot create new lock while existing lock is active
      // Use increaseLock or extendLock instead
      return 0;
    }

    // Calculate voting power using linear relationship
    // votingPower = amount * (lockDuration / maxLockDuration) * powerMultiplier
    const lockRatio = lockDurationSteps / this.config.maxLockSteps;
    const initialVotingPower = amount * lockRatio * this.config.powerMultiplier;

    // Calculate slope (decay rate per step)
    const slope = initialVotingPower / lockDurationSteps;

    const position: VeTokenPosition = {
      owner,
      amount,
      lockStep: currentStep,
      unlockStep: currentStep + lockDurationSteps,
      votingPower: initialVotingPower,
      slope,
      bias: initialVotingPower,
    };

    this.positions.set(owner, position);
    this.totalLocked += amount;
    this.totalVotingPower += initialVotingPower;

    this.emit('vetoken_locked', {
      step: currentStep,
      owner,
      amount,
      lockDuration: lockDurationSteps,
      unlockStep: position.unlockStep,
      votingPower: initialVotingPower,
    });

    return initialVotingPower;
  }

  /**
   * Increase the amount in an existing lock
   */
  increaseLock(
    owner: string,
    additionalAmount: number,
    currentStep: number
  ): number {
    const position = this.positions.get(owner);
    if (!position || position.unlockStep <= currentStep) {
      return 0;
    }

    if (additionalAmount <= 0) {
      return 0;
    }

    // Calculate remaining lock duration
    const remainingSteps = position.unlockStep - currentStep;

    // Calculate additional voting power
    const lockRatio = remainingSteps / this.config.maxLockSteps;
    const additionalPower = additionalAmount * lockRatio * this.config.powerMultiplier;

    // Update position
    position.amount += additionalAmount;
    position.votingPower += additionalPower;
    position.bias += additionalPower;
    position.slope = position.votingPower / remainingSteps;

    this.totalLocked += additionalAmount;
    this.totalVotingPower += additionalPower;

    this.emit('vetoken_increased', {
      step: currentStep,
      owner,
      additionalAmount,
      newTotal: position.amount,
      newVotingPower: position.votingPower,
    });

    return additionalPower;
  }

  /**
   * Extend the lock duration
   */
  extendLock(
    owner: string,
    newUnlockStep: number,
    currentStep: number
  ): number {
    const position = this.positions.get(owner);
    if (!position) {
      return 0;
    }

    // New unlock must be after current unlock
    if (newUnlockStep <= position.unlockStep) {
      return 0;
    }

    // Validate new lock duration
    const newDuration = newUnlockStep - currentStep;
    if (newDuration > this.config.maxLockSteps) {
      newUnlockStep = currentStep + this.config.maxLockSteps;
    }

    const actualNewDuration = newUnlockStep - currentStep;

    // Calculate new voting power
    const lockRatio = actualNewDuration / this.config.maxLockSteps;
    const newVotingPower = position.amount * lockRatio * this.config.powerMultiplier;

    // Calculate power increase
    const oldPower = position.votingPower;
    const powerIncrease = newVotingPower - oldPower;

    // Update position
    position.unlockStep = newUnlockStep;
    position.votingPower = newVotingPower;
    position.bias = newVotingPower;
    position.slope = newVotingPower / actualNewDuration;

    this.totalVotingPower += powerIncrease;

    this.emit('vetoken_extended', {
      step: currentStep,
      owner,
      newUnlockStep,
      newVotingPower,
      powerIncrease,
    });

    return powerIncrease;
  }

  /**
   * Withdraw tokens after lock expires
   */
  withdraw(owner: string, currentStep: number): number {
    const position = this.positions.get(owner);
    if (!position) {
      return 0;
    }

    // Check if lock has expired
    if (currentStep < position.unlockStep) {
      return 0;
    }

    const amount = position.amount;

    // Remove position
    this.totalLocked -= amount;
    this.totalVotingPower -= position.votingPower;
    this.positions.delete(owner);

    this.emit('vetoken_withdrawn', {
      step: currentStep,
      owner,
      amount,
    });

    return amount;
  }

  /**
   * Update voting power decay for all positions
   * Should be called each step
   */
  updateDecay(currentStep: number): void {
    let totalPowerChange = 0;

    for (const position of this.positions.values()) {
      if (currentStep >= position.unlockStep) {
        // Lock expired, voting power is 0
        totalPowerChange -= position.votingPower;
        position.votingPower = 0;
        continue;
      }

      // Calculate remaining time
      const remainingSteps = position.unlockStep - currentStep;

      // New voting power based on remaining time
      const lockRatio = remainingSteps / this.config.maxLockSteps;
      const newVotingPower = position.amount * lockRatio * this.config.powerMultiplier;

      const powerChange = newVotingPower - position.votingPower;
      totalPowerChange += powerChange;

      position.votingPower = newVotingPower;
      position.slope = newVotingPower / remainingSteps;
    }

    this.totalVotingPower += totalPowerChange;

    // Ensure non-negative
    if (this.totalVotingPower < 0) {
      this.totalVotingPower = 0;
    }

    if (totalPowerChange !== 0) {
      this.emit('vetoken_decay_updated', {
        step: currentStep,
        totalVotingPower: this.totalVotingPower,
        powerChange: totalPowerChange,
      });
    }
  }

  /**
   * Get voting power for an owner at current step
   */
  getVotingPower(owner: string, currentStep: number): number {
    const position = this.positions.get(owner);
    if (!position) {
      return 0;
    }

    if (currentStep >= position.unlockStep) {
      return 0;
    }

    // Calculate current voting power based on remaining time
    const remainingSteps = position.unlockStep - currentStep;
    const lockRatio = remainingSteps / this.config.maxLockSteps;
    return position.amount * lockRatio * this.config.powerMultiplier;
  }

  /**
   * Get position for an owner
   */
  getPosition(owner: string): VeTokenPosition | undefined {
    return this.positions.get(owner);
  }

  /**
   * Get all positions
   */
  getAllPositions(): VeTokenPosition[] {
    return Array.from(this.positions.values());
  }

  /**
   * Check if owner has an active lock
   */
  hasActiveLock(owner: string, currentStep: number): boolean {
    const position = this.positions.get(owner);
    return position !== undefined && position.unlockStep > currentStep;
  }

  /**
   * Get statistics
   */
  getStats(): VeTokenStats {
    const positions = Array.from(this.positions.values());
    const count = positions.length;

    if (count === 0) {
      return {
        totalLocked: 0,
        totalVotingPower: 0,
        positionCount: 0,
        averageLockDuration: 0,
        averageVotingPower: 0,
      };
    }

    const totalDuration = positions.reduce(
      (sum, p) => sum + (p.unlockStep - p.lockStep),
      0
    );

    return {
      totalLocked: this.totalLocked,
      totalVotingPower: this.totalVotingPower,
      positionCount: count,
      averageLockDuration: totalDuration / count,
      averageVotingPower: this.totalVotingPower / count,
    };
  }

  /**
   * Process step - update decay
   */
  processStep(currentStep: number): void {
    this.updateDecay(currentStep);
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
      totalLocked: this.totalLocked,
      totalVotingPower: this.totalVotingPower,
      positions: Array.from(this.positions.entries()),
    };
  }

  /**
   * Restore from serialized data
   */
  static fromDict(data: any): VoteEscrowController {
    const controller = new VoteEscrowController(data.config);
    controller.totalLocked = data.totalLocked || 0;
    controller.totalVotingPower = data.totalVotingPower || 0;

    if (data.positions) {
      for (const [owner, position] of data.positions) {
        controller.positions.set(owner, position);
      }
    }

    return controller;
  }
}

/**
 * Factory function to create vote escrow for Curve-style governance
 */
export function createCurveVoteEscrow(): VoteEscrowController {
  return new VoteEscrowController({
    maxLockSteps: 35040,    // 4 years
    minLockSteps: 168,      // 1 week
    minLockAmount: 1,
    powerMultiplier: 4,     // 4x for 4-year lock
  });
}

/**
 * Factory function to create vote escrow for Balancer-style governance
 */
export function createBalancerVoteEscrow(): VoteEscrowController {
  return new VoteEscrowController({
    maxLockSteps: 52560,    // ~6 years (longer max for Balancer)
    minLockSteps: 336,      // 2 weeks
    minLockAmount: 1,
    powerMultiplier: 1,     // 1:1 at max lock
  });
}
