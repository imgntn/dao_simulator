/**
 * Rage Quit - Lido-style Dual Governance Protection
 *
 * Implements the rage quit mechanism where stakers can collectively
 * block all governance actions until they've had a chance to exit.
 * Part of Lido's dual governance system.
 */

import type { EventBus } from '../utils/event-bus';

// =============================================================================
// TYPES
// =============================================================================

export type RageQuitState =
  | 'normal'              // Normal governance operation
  | 'veto_signalling'     // Stakers signaling concerns
  | 'veto_cooldown'       // After veto signal threshold, cooldown before rage quit
  | 'rage_quit_pending'   // Rage quit triggered, waiting for escrow
  | 'rage_quit_active'    // All governance blocked until escrow complete
  | 'recovery';           // Transitioning back to normal

export interface RageQuitSignal {
  stakerId: string;
  amount: number;        // stETH/wstETH amount signaled
  signalStep: number;
  reason?: string;
}

export interface RageQuitEscrow {
  stakerId: string;
  amount: number;
  escrowStep: number;
  withdrawableStep: number;
  withdrawn: boolean;
}

export interface RageQuitConfig {
  // Thresholds (percent of total staked supply)
  vetoSignalThresholdPercent: number;   // 1% triggers veto signalling
  rageQuitThresholdPercent: number;     // 10% triggers rage quit

  // Timing
  vetoCooldownSteps: number;            // Steps before rage quit after threshold
  escrowDurationSteps: number;          // How long funds are escrowed
  recoverySteps: number;                // Steps to return to normal

  // Dynamic timelock
  minTimelockSteps: number;             // 5 days minimum
  maxTimelockSteps: number;             // 45 days maximum
}

// =============================================================================
// RAGE QUIT CONTROLLER
// =============================================================================

export class RageQuitController {
  private signals: Map<string, RageQuitSignal> = new Map();
  private escrows: Map<string, RageQuitEscrow> = new Map();
  private eventBus: EventBus | null = null;

  config: RageQuitConfig;
  state: RageQuitState = 'normal';
  totalStakedSupply: number = 0;
  totalSignaled: number = 0;
  totalEscrowed: number = 0;

  // State transition tracking
  stateChangedStep: number = 0;
  vetoCooldownStartStep: number | null = null;
  rageQuitTriggeredStep: number | null = null;

  constructor(config?: Partial<RageQuitConfig>) {
    this.config = {
      vetoSignalThresholdPercent: config?.vetoSignalThresholdPercent ?? 1,
      rageQuitThresholdPercent: config?.rageQuitThresholdPercent ?? 10,
      vetoCooldownSteps: config?.vetoCooldownSteps ?? 72,     // 3 days
      escrowDurationSteps: config?.escrowDurationSteps ?? 168, // 7 days
      recoverySteps: config?.recoverySteps ?? 24,              // 1 day
      minTimelockSteps: config?.minTimelockSteps ?? 120,       // 5 days
      maxTimelockSteps: config?.maxTimelockSteps ?? 1080,      // 45 days
    };
  }

  /**
   * Set event bus
   */
  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Update total staked supply (call each step)
   */
  updateTotalStakedSupply(supply: number): void {
    this.totalStakedSupply = supply;
  }

  /**
   * Signal veto (staker expresses concern)
   */
  signalVeto(
    stakerId: string,
    amount: number,
    currentStep: number,
    reason?: string
  ): boolean {
    if (amount <= 0) return false;

    // Add to existing signal or create new
    const existing = this.signals.get(stakerId);
    if (existing) {
      existing.amount += amount;
      existing.signalStep = currentStep;
      if (reason) existing.reason = reason;
    } else {
      this.signals.set(stakerId, {
        stakerId,
        amount,
        signalStep: currentStep,
        reason,
      });
    }

    this.totalSignaled += amount;

    this.emit('veto_signal_added', {
      step: currentStep,
      stakerId,
      amount,
      totalSignaled: this.totalSignaled,
      signalPercent: this.getSignalPercent(),
    });

    // Check state transitions
    this.checkStateTransitions(currentStep);

    return true;
  }

  /**
   * Withdraw veto signal
   */
  withdrawSignal(
    stakerId: string,
    amount: number,
    currentStep: number
  ): boolean {
    const signal = this.signals.get(stakerId);
    if (!signal) return false;

    const withdrawAmount = Math.min(amount, signal.amount);
    signal.amount -= withdrawAmount;
    this.totalSignaled -= withdrawAmount;

    if (signal.amount <= 0) {
      this.signals.delete(stakerId);
    }

    this.emit('veto_signal_withdrawn', {
      step: currentStep,
      stakerId,
      amount: withdrawAmount,
      totalSignaled: this.totalSignaled,
      signalPercent: this.getSignalPercent(),
    });

    // Check if we should return to normal
    this.checkStateTransitions(currentStep);

    return true;
  }

  /**
   * Initiate rage quit (move funds to escrow)
   */
  initiateRageQuit(
    stakerId: string,
    amount: number,
    currentStep: number
  ): boolean {
    // Only during rage_quit_pending or rage_quit_active
    if (this.state !== 'rage_quit_pending' && this.state !== 'rage_quit_active') {
      return false;
    }

    // Remove from signal
    const signal = this.signals.get(stakerId);
    if (signal) {
      const signalAmount = Math.min(amount, signal.amount);
      signal.amount -= signalAmount;
      this.totalSignaled -= signalAmount;
      if (signal.amount <= 0) {
        this.signals.delete(stakerId);
      }
    }

    // Add to escrow
    const existing = this.escrows.get(stakerId);
    if (existing && !existing.withdrawn) {
      existing.amount += amount;
    } else {
      this.escrows.set(stakerId, {
        stakerId,
        amount,
        escrowStep: currentStep,
        withdrawableStep: currentStep + this.config.escrowDurationSteps,
        withdrawn: false,
      });
    }

    this.totalEscrowed += amount;

    this.emit('rage_quit_escrow_added', {
      step: currentStep,
      stakerId,
      amount,
      totalEscrowed: this.totalEscrowed,
      withdrawableStep: currentStep + this.config.escrowDurationSteps,
    });

    return true;
  }

  /**
   * Withdraw from escrow (after duration)
   */
  withdrawFromEscrow(
    stakerId: string,
    currentStep: number
  ): number {
    const escrow = this.escrows.get(stakerId);
    if (!escrow || escrow.withdrawn) return 0;

    if (currentStep < escrow.withdrawableStep) return 0;

    escrow.withdrawn = true;
    this.totalEscrowed -= escrow.amount;

    this.emit('rage_quit_escrow_withdrawn', {
      step: currentStep,
      stakerId,
      amount: escrow.amount,
      remainingEscrowed: this.totalEscrowed,
    });

    // Check if rage quit can end
    this.checkStateTransitions(currentStep);

    return escrow.amount;
  }

  /**
   * Check and perform state transitions
   */
  checkStateTransitions(currentStep: number): void {
    const signalPercent = this.getSignalPercent();
    const previousState = this.state;

    switch (this.state) {
      case 'normal':
        if (signalPercent >= this.config.vetoSignalThresholdPercent) {
          this.state = 'veto_signalling';
          this.stateChangedStep = currentStep;
          this.vetoCooldownStartStep = currentStep;
        }
        break;

      case 'veto_signalling':
        if (signalPercent < this.config.vetoSignalThresholdPercent) {
          // Signal dropped below threshold
          this.state = 'normal';
          this.stateChangedStep = currentStep;
          this.vetoCooldownStartStep = null;
        } else if (signalPercent >= this.config.rageQuitThresholdPercent) {
          // Rage quit threshold reached
          this.state = 'rage_quit_pending';
          this.stateChangedStep = currentStep;
          this.rageQuitTriggeredStep = currentStep;
        } else if (this.vetoCooldownStartStep &&
                   currentStep >= this.vetoCooldownStartStep + this.config.vetoCooldownSteps) {
          // Cooldown complete, stay in veto_signalling but extend timelocks
          // This is handled by getDynamicTimelockSteps
        }
        break;

      case 'rage_quit_pending':
        if (this.totalEscrowed > 0) {
          // Escrow has started
          this.state = 'rage_quit_active';
          this.stateChangedStep = currentStep;
        }
        break;

      case 'rage_quit_active':
        if (this.totalEscrowed === 0) {
          // All escrow withdrawn
          this.state = 'recovery';
          this.stateChangedStep = currentStep;
        }
        break;

      case 'recovery':
        if (currentStep >= this.stateChangedStep + this.config.recoverySteps) {
          this.state = 'normal';
          this.stateChangedStep = currentStep;
          this.vetoCooldownStartStep = null;
          this.rageQuitTriggeredStep = null;
        }
        break;
    }

    if (this.state !== previousState) {
      this.emit('rage_quit_state_changed', {
        step: currentStep,
        previousState,
        newState: this.state,
        signalPercent,
        totalEscrowed: this.totalEscrowed,
      });
    }
  }

  /**
   * Check if governance actions are blocked
   */
  isGovernanceBlocked(): boolean {
    return this.state === 'rage_quit_active';
  }

  /**
   * Check if proposals should have extended timelocks
   */
  shouldExtendTimelock(): boolean {
    return this.state === 'veto_signalling' ||
           this.state === 'veto_cooldown' ||
           this.state === 'rage_quit_pending';
  }

  /**
   * Get dynamic timelock steps based on veto signal level
   */
  getDynamicTimelockSteps(): number {
    if (this.totalStakedSupply <= 0) return this.config.minTimelockSteps;

    const signalPercent = this.getSignalPercent();

    if (signalPercent < this.config.vetoSignalThresholdPercent) {
      return this.config.minTimelockSteps;
    }

    // Linear interpolation between min and max based on signal
    const signalRatio = Math.min(
      signalPercent / this.config.rageQuitThresholdPercent,
      1
    );

    const range = this.config.maxTimelockSteps - this.config.minTimelockSteps;
    return Math.round(this.config.minTimelockSteps + range * signalRatio);
  }

  /**
   * Get signal percent of total staked supply
   */
  getSignalPercent(): number {
    if (this.totalStakedSupply <= 0) return 0;
    return (this.totalSignaled / this.totalStakedSupply) * 100;
  }

  /**
   * Get signal by staker
   */
  getSignal(stakerId: string): RageQuitSignal | undefined {
    return this.signals.get(stakerId);
  }

  /**
   * Get escrow by staker
   */
  getEscrow(stakerId: string): RageQuitEscrow | undefined {
    return this.escrows.get(stakerId);
  }

  /**
   * Get all active signals
   */
  getAllSignals(): RageQuitSignal[] {
    return Array.from(this.signals.values());
  }

  /**
   * Get all escrows
   */
  getAllEscrows(): RageQuitEscrow[] {
    return Array.from(this.escrows.values());
  }

  /**
   * Get statistics
   */
  getStats(): {
    state: RageQuitState;
    signalPercent: number;
    totalSignaled: number;
    totalEscrowed: number;
    signalerCount: number;
    escrowCount: number;
    dynamicTimelockSteps: number;
    governanceBlocked: boolean;
  } {
    return {
      state: this.state,
      signalPercent: this.getSignalPercent(),
      totalSignaled: this.totalSignaled,
      totalEscrowed: this.totalEscrowed,
      signalerCount: this.signals.size,
      escrowCount: this.escrows.size,
      dynamicTimelockSteps: this.getDynamicTimelockSteps(),
      governanceBlocked: this.isGovernanceBlocked(),
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
      state: this.state,
      totalStakedSupply: this.totalStakedSupply,
      totalSignaled: this.totalSignaled,
      totalEscrowed: this.totalEscrowed,
      stateChangedStep: this.stateChangedStep,
      vetoCooldownStartStep: this.vetoCooldownStartStep,
      rageQuitTriggeredStep: this.rageQuitTriggeredStep,
      signals: Array.from(this.signals.entries()),
      escrows: Array.from(this.escrows.entries()),
    };
  }

  /**
   * Restore from serialized data
   */
  static fromDict(data: any): RageQuitController {
    const controller = new RageQuitController(data.config);
    controller.state = data.state || 'normal';
    controller.totalStakedSupply = data.totalStakedSupply || 0;
    controller.totalSignaled = data.totalSignaled || 0;
    controller.totalEscrowed = data.totalEscrowed || 0;
    controller.stateChangedStep = data.stateChangedStep || 0;
    controller.vetoCooldownStartStep = data.vetoCooldownStartStep;
    controller.rageQuitTriggeredStep = data.rageQuitTriggeredStep;

    if (data.signals) {
      for (const [id, signal] of data.signals) {
        controller.signals.set(id, signal);
      }
    }

    if (data.escrows) {
      for (const [id, escrow] of data.escrows) {
        controller.escrows.set(id, escrow);
      }
    }

    return controller;
  }
}

/**
 * Factory function for Lido dual governance
 */
export function createLidoRageQuit(): RageQuitController {
  return new RageQuitController({
    vetoSignalThresholdPercent: 1,
    rageQuitThresholdPercent: 10,
    vetoCooldownSteps: 72,       // 3 days
    escrowDurationSteps: 168,    // 7 days
    recoverySteps: 24,           // 1 day
    minTimelockSteps: 120,       // 5 days
    maxTimelockSteps: 1080,      // 45 days
  });
}
