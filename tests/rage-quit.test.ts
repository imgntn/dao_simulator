/**
 * Rage Quit Tests
 *
 * Tests for Lido's dual governance rage quit mechanism.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  RageQuitController,
  createLidoRageQuit,
} from '../lib/governance/rage-quit';
import { EventBus } from '../lib/utils/event-bus';

describe('RageQuitController', () => {
  let controller: RageQuitController;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus(false);
    controller = new RageQuitController({
      vetoSignalThresholdPercent: 1,    // 1% triggers veto signalling
      rageQuitThresholdPercent: 10,     // 10% triggers rage quit
      vetoCooldownSteps: 72,            // 3 days
      escrowDurationSteps: 168,         // 7 days
      recoverySteps: 24,                // 1 day
      minTimelockSteps: 120,
      maxTimelockSteps: 1080,
    });
    controller.setEventBus(eventBus);
    controller.updateTotalStakedSupply(1000000);  // 1M total staked
  });

  describe('signalVeto', () => {
    it('should add veto signal', () => {
      const result = controller.signalVeto('staker_1', 5000, 1, 'Concerned about proposal');

      expect(result).toBe(true);
      expect(controller.totalSignaled).toBe(5000);
    });

    it('should accumulate signals from same staker', () => {
      controller.signalVeto('staker_1', 5000, 1);
      controller.signalVeto('staker_1', 3000, 2);

      expect(controller.totalSignaled).toBe(8000);
    });

    it('should reject zero or negative amount', () => {
      expect(controller.signalVeto('staker_1', 0, 1)).toBe(false);
      expect(controller.signalVeto('staker_1', -100, 1)).toBe(false);
    });

    it('should emit veto_signal_added event', () => {
      const events: unknown[] = [];
      eventBus.subscribe('veto_signal_added', (data) => events.push(data));

      controller.signalVeto('staker_1', 5000, 1);

      expect(events.length).toBe(1);
    });

    it('should transition to veto_signalling when threshold reached', () => {
      // Signal 1% of 1M = 10,000
      controller.signalVeto('staker_1', 10000, 1);

      expect(controller.state).toBe('veto_signalling');
    });
  });

  describe('withdrawSignal', () => {
    it('should withdraw veto signal', () => {
      controller.signalVeto('staker_1', 5000, 1);
      const result = controller.withdrawSignal('staker_1', 3000, 2);

      expect(result).toBe(true);
      expect(controller.totalSignaled).toBe(2000);
    });

    it('should reject withdrawal for non-signaler', () => {
      const result = controller.withdrawSignal('staker_1', 1000, 1);
      expect(result).toBe(false);
    });

    it('should do partial withdrawal when exceeding signaled amount', () => {
      controller.signalVeto('staker_1', 5000, 1);
      // Implementation uses Math.min, so it withdraws whatever is available
      const result = controller.withdrawSignal('staker_1', 10000, 2);
      expect(result).toBe(true);
      // Should have withdrawn all 5000
      expect(controller.totalSignaled).toBe(0);
    });

    it('should remove signal entry when fully withdrawn', () => {
      controller.signalVeto('staker_1', 5000, 1);
      controller.withdrawSignal('staker_1', 5000, 2);

      expect(controller.totalSignaled).toBe(0);
    });
  });

  describe('state transitions', () => {
    it('should start in normal state', () => {
      expect(controller.state).toBe('normal');
    });

    it('should transition normal -> veto_signalling at 1%', () => {
      controller.signalVeto('staker_1', 10000, 1);  // 1%
      expect(controller.state).toBe('veto_signalling');
    });

    it('should transition veto_signalling -> rage_quit_pending at 10%', () => {
      // First get to veto_signalling state
      controller.signalVeto('staker_1', 10000, 1);  // 1%
      expect(controller.state).toBe('veto_signalling');

      // Then signal more to reach 10%
      controller.signalVeto('staker_1', 90000, 2);  // Now at 10%
      expect(controller.state).toBe('rage_quit_pending');
    });

    it('should transition back to normal when signal drops below threshold', () => {
      controller.signalVeto('staker_1', 10000, 1);  // 1%
      expect(controller.state).toBe('veto_signalling');

      controller.withdrawSignal('staker_1', 5000, 2);  // Now 0.5%
      // withdrawSignal calls checkStateTransitions internally

      expect(controller.state).toBe('normal');
    });
  });

  describe('isGovernanceBlocked', () => {
    it('should not block in normal state', () => {
      expect(controller.isGovernanceBlocked()).toBe(false);
    });

    it('should not block in veto_signalling state', () => {
      controller.signalVeto('staker_1', 10000, 1);
      expect(controller.isGovernanceBlocked()).toBe(false);
    });

    it('should block in rage_quit_active state', () => {
      // Force state for testing
      (controller as unknown as { state: string }).state = 'rage_quit_active';
      expect(controller.isGovernanceBlocked()).toBe(true);
    });
  });

  describe('getDynamicTimelockSteps', () => {
    it('should return minimum in normal state', () => {
      const timelock = controller.getDynamicTimelockSteps();
      expect(timelock).toBe(120);  // minTimelockSteps
    });

    it('should increase timelock based on signal percentage', () => {
      controller.signalVeto('staker_1', 50000, 1);  // 5%
      const timelock = controller.getDynamicTimelockSteps();

      // Should be between min and max
      expect(timelock).toBeGreaterThan(120);
      expect(timelock).toBeLessThanOrEqual(1080);
    });
  });

  describe('getSignalPercent', () => {
    it('should calculate correct percentage', () => {
      controller.signalVeto('staker_1', 50000, 1);  // 5%
      expect(controller.getSignalPercent()).toBe(5);
    });

    it('should return 0 when no signals', () => {
      expect(controller.getSignalPercent()).toBe(0);
    });
  });

  describe('escrow', () => {
    it('should create escrow entry during rage quit', () => {
      // First signal 1% to get to veto_signalling
      controller.signalVeto('staker_1', 10000, 1);
      expect(controller.state).toBe('veto_signalling');

      // Then signal more to reach 10% and trigger rage_quit_pending
      controller.signalVeto('staker_1', 90000, 2);
      expect(controller.state).toBe('rage_quit_pending');

      // Now initiate rage quit (moves tokens to escrow)
      const result = controller.initiateRageQuit('staker_1', 10000, 3);

      expect(result).toBe(true);
      expect(controller.totalEscrowed).toBe(10000);
    });

    it('should allow withdrawal after escrow period', () => {
      // First signal 1% to get to veto_signalling
      controller.signalVeto('staker_1', 10000, 1);
      // Then signal more to reach 10% and trigger rage_quit_pending
      controller.signalVeto('staker_1', 90000, 2);
      controller.initiateRageQuit('staker_1', 10000, 3);

      // After escrow duration (3 + 168 = 171)
      const amount = controller.withdrawFromEscrow('staker_1', 172);

      expect(amount).toBe(10000);
      expect(controller.totalEscrowed).toBe(0);
    });

    it('should reject withdrawal before escrow period', () => {
      // First signal 1% to get to veto_signalling
      controller.signalVeto('staker_1', 10000, 1);
      // Then signal more to reach 10% and trigger rage_quit_pending
      controller.signalVeto('staker_1', 90000, 2);
      controller.initiateRageQuit('staker_1', 10000, 3);

      const amount = controller.withdrawFromEscrow('staker_1', 50);

      expect(amount).toBe(0);  // Returns 0 when withdrawal fails
    });
  });

  describe('checkStateTransitions', () => {
    it('should check transitions without error', () => {
      expect(() => controller.checkStateTransitions(1)).not.toThrow();
    });

    it('should emit state_changed event on transition', () => {
      const events: unknown[] = [];
      eventBus.subscribe('rage_quit_state_changed', (data) => events.push(data));

      controller.signalVeto('staker_1', 10000, 1);  // Triggers transition

      expect(events.length).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      controller.signalVeto('staker_1', 5000, 1);
      controller.signalVeto('staker_2', 3000, 2);

      const stats = controller.getStats();

      expect(stats.state).toBe('normal');
      expect(stats.totalSignaled).toBe(8000);
      expect(stats.signalerCount).toBe(2);
      expect(stats.signalPercent).toBe(0.8);
    });
  });
});

describe('createLidoRageQuit', () => {
  it('should create controller with Lido defaults', () => {
    const controller = createLidoRageQuit();

    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(RageQuitController);
  });
});
