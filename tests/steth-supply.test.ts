/**
 * stETH Supply Tests
 *
 * Tests for Lido staked ETH supply tracking.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  StETHSupplyTracker,
  createLidoStETHTracker,
} from '../lib/governance/steth-supply';
import { EventBus } from '../lib/utils/event-bus';

describe('StETHSupplyTracker', () => {
  let tracker: StETHSupplyTracker;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus(false);
    tracker = new StETHSupplyTracker(24);  // Daily snapshots
    tracker.setEventBus(eventBus);
  });

  describe('updatePosition', () => {
    it('should create new position', () => {
      tracker.updatePosition('staker_1', 1000, 500, 0, 1);

      const position = tracker.getPosition('staker_1');
      expect(position).toBeDefined();
      expect(position?.stETHBalance).toBe(1000);
      expect(position?.wstETHBalance).toBe(500);
    });

    it('should update existing position', () => {
      tracker.updatePosition('staker_1', 1000, 500, 0, 1);
      tracker.updatePosition('staker_1', 2000, 1000, 0, 2);

      const position = tracker.getPosition('staker_1');
      expect(position?.stETHBalance).toBe(2000);
      expect(position?.wstETHBalance).toBe(1000);
    });

    it('should update totals correctly', () => {
      tracker.updatePosition('staker_1', 1000, 500, 100, 1);
      tracker.updatePosition('staker_2', 2000, 1000, 200, 2);

      expect(tracker.totalStETH).toBe(3000);
      expect(tracker.totalWstETH).toBe(1500);
      expect(tracker.totalUnstETH).toBe(300);
    });

    it('should emit position_updated event', () => {
      const events: unknown[] = [];
      eventBus.subscribe('steth_position_updated', (data) => events.push(data));

      tracker.updatePosition('staker_1', 1000, 0, 0, 1);

      expect(events.length).toBe(1);
    });
  });

  describe('addStETH', () => {
    it('should add to existing position', () => {
      tracker.updatePosition('staker_1', 1000, 0, 0, 1);
      tracker.addStETH('staker_1', 500, 2);

      expect(tracker.getPosition('staker_1')?.stETHBalance).toBe(1500);
    });

    it('should create new position if not exists', () => {
      tracker.addStETH('staker_1', 1000, 1);

      expect(tracker.getPosition('staker_1')?.stETHBalance).toBe(1000);
    });
  });

  describe('removeStETH', () => {
    it('should remove from position', () => {
      tracker.updatePosition('staker_1', 1000, 0, 0, 1);
      const result = tracker.removeStETH('staker_1', 400, 2);

      expect(result).toBe(true);
      expect(tracker.getPosition('staker_1')?.stETHBalance).toBe(600);
    });

    it('should reject if insufficient balance', () => {
      tracker.updatePosition('staker_1', 500, 0, 0, 1);
      const result = tracker.removeStETH('staker_1', 1000, 2);

      expect(result).toBe(false);
      expect(tracker.getPosition('staker_1')?.stETHBalance).toBe(500);
    });

    it('should reject for non-existent position', () => {
      const result = tracker.removeStETH('unknown', 100, 1);
      expect(result).toBe(false);
    });
  });

  describe('wrapStETH', () => {
    it('should convert stETH to wstETH', () => {
      tracker.updatePosition('staker_1', 1000, 0, 0, 1);
      const result = tracker.wrapStETH('staker_1', 400, 2);

      expect(result).toBe(true);
      expect(tracker.getPosition('staker_1')?.stETHBalance).toBe(600);
      expect(tracker.getPosition('staker_1')?.wstETHBalance).toBe(400);
    });

    it('should reject if insufficient stETH', () => {
      tracker.updatePosition('staker_1', 500, 0, 0, 1);
      const result = tracker.wrapStETH('staker_1', 1000, 2);

      expect(result).toBe(false);
    });
  });

  describe('unwrapWstETH', () => {
    it('should convert wstETH to stETH', () => {
      tracker.updatePosition('staker_1', 500, 1000, 0, 1);
      const result = tracker.unwrapWstETH('staker_1', 400, 2);

      expect(result).toBe(true);
      expect(tracker.getPosition('staker_1')?.stETHBalance).toBe(900);
      expect(tracker.getPosition('staker_1')?.wstETHBalance).toBe(600);
    });

    it('should reject if insufficient wstETH', () => {
      tracker.updatePosition('staker_1', 500, 100, 0, 1);
      const result = tracker.unwrapWstETH('staker_1', 500, 2);

      expect(result).toBe(false);
    });
  });

  describe('requestWithdrawal', () => {
    it('should convert stETH to unstETH', () => {
      tracker.updatePosition('staker_1', 1000, 0, 0, 1);
      const result = tracker.requestWithdrawal('staker_1', 400, 2);

      expect(result).toBe(true);
      expect(tracker.getPosition('staker_1')?.stETHBalance).toBe(600);
      expect(tracker.getPosition('staker_1')?.unstETHBalance).toBe(400);
    });

    it('should emit withdrawal_requested event', () => {
      const events: unknown[] = [];
      eventBus.subscribe('withdrawal_requested', (data) => events.push(data));

      tracker.updatePosition('staker_1', 1000, 0, 0, 1);
      tracker.requestWithdrawal('staker_1', 400, 2);

      expect(events.length).toBe(1);
    });

    it('should reject if insufficient stETH', () => {
      tracker.updatePosition('staker_1', 500, 0, 0, 1);
      const result = tracker.requestWithdrawal('staker_1', 1000, 2);

      expect(result).toBe(false);
    });
  });

  describe('claimWithdrawal', () => {
    it('should remove unstETH', () => {
      tracker.updatePosition('staker_1', 500, 0, 1000, 1);
      const result = tracker.claimWithdrawal('staker_1', 600, 2);

      expect(result).toBe(true);
      expect(tracker.getPosition('staker_1')?.unstETHBalance).toBe(400);
      expect(tracker.totalUnstETH).toBe(400);
    });

    it('should emit withdrawal_claimed event', () => {
      const events: unknown[] = [];
      eventBus.subscribe('withdrawal_claimed', (data) => events.push(data));

      tracker.updatePosition('staker_1', 0, 0, 1000, 1);
      tracker.claimWithdrawal('staker_1', 500, 2);

      expect(events.length).toBe(1);
    });

    it('should reject if insufficient unstETH', () => {
      tracker.updatePosition('staker_1', 0, 0, 500, 1);
      const result = tracker.claimWithdrawal('staker_1', 1000, 2);

      expect(result).toBe(false);
    });
  });

  describe('getTotalCombined', () => {
    it('should return sum of all balances', () => {
      tracker.updatePosition('staker_1', 1000, 500, 200, 1);
      tracker.updatePosition('staker_2', 2000, 1000, 300, 2);

      expect(tracker.getTotalCombined()).toBe(5000);  // 3000 + 1500 + 500
    });
  });

  describe('getStakerTotal', () => {
    it('should return staker total balance', () => {
      tracker.updatePosition('staker_1', 1000, 500, 200, 1);

      expect(tracker.getStakerTotal('staker_1')).toBe(1700);
    });

    it('should return 0 for unknown staker', () => {
      expect(tracker.getStakerTotal('unknown')).toBe(0);
    });
  });

  describe('getStakerPercentage', () => {
    it('should calculate correct percentage', () => {
      tracker.updatePosition('staker_1', 1000, 0, 0, 1);
      tracker.updatePosition('staker_2', 4000, 0, 0, 2);

      expect(tracker.getStakerPercentage('staker_1')).toBe(20);  // 1000/5000 = 20%
      expect(tracker.getStakerPercentage('staker_2')).toBe(80);  // 4000/5000 = 80%
    });

    it('should return 0 when no supply', () => {
      expect(tracker.getStakerPercentage('unknown')).toBe(0);
    });
  });

  describe('takeSnapshot', () => {
    it('should create snapshot', () => {
      tracker.updatePosition('staker_1', 1000, 500, 200, 1);
      const snapshot = tracker.takeSnapshot(10);

      expect(snapshot.step).toBe(10);
      expect(snapshot.totalStETH).toBe(1000);
      expect(snapshot.totalWstETH).toBe(500);
      expect(snapshot.totalUnstETH).toBe(200);
      expect(snapshot.stakerCount).toBe(1);
    });

    it('should limit snapshots to 100', () => {
      for (let i = 0; i < 110; i++) {
        tracker.takeSnapshot(i);
      }

      expect(tracker.getSnapshots().length).toBe(100);
    });
  });

  describe('processStep', () => {
    it('should take snapshot at interval', () => {
      tracker.updatePosition('staker_1', 1000, 0, 0, 1);

      tracker.processStep(24);  // Should take snapshot
      tracker.processStep(25);  // No snapshot
      tracker.processStep(48);  // Should take snapshot

      expect(tracker.getSnapshots().length).toBe(2);
    });

    it('should not take snapshot at step 0', () => {
      tracker.processStep(0);
      expect(tracker.getSnapshots().length).toBe(0);
    });
  });

  describe('getLatestSnapshot', () => {
    it('should return latest snapshot', () => {
      tracker.takeSnapshot(10);
      tracker.takeSnapshot(20);

      const latest = tracker.getLatestSnapshot();
      expect(latest?.step).toBe(20);
    });

    it('should return null if no snapshots', () => {
      expect(tracker.getLatestSnapshot()).toBeNull();
    });
  });

  describe('getSnapshots', () => {
    it('should return all snapshots', () => {
      tracker.takeSnapshot(10);
      tracker.takeSnapshot(20);
      tracker.takeSnapshot(30);

      expect(tracker.getSnapshots().length).toBe(3);
    });

    it('should respect limit', () => {
      tracker.takeSnapshot(10);
      tracker.takeSnapshot(20);
      tracker.takeSnapshot(30);

      expect(tracker.getSnapshots(2).length).toBe(2);
    });
  });

  describe('getAllPositions', () => {
    it('should return all positions', () => {
      tracker.updatePosition('staker_1', 1000, 0, 0, 1);
      tracker.updatePosition('staker_2', 2000, 0, 0, 2);

      expect(tracker.getAllPositions().length).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      tracker.updatePosition('staker_1', 1000, 500, 200, 1);
      tracker.updatePosition('staker_2', 2000, 1000, 300, 2);

      const stats = tracker.getStats();

      expect(stats.totalStETH).toBe(3000);
      expect(stats.totalWstETH).toBe(1500);
      expect(stats.totalUnstETH).toBe(500);
      expect(stats.totalCombined).toBe(5000);
      expect(stats.stakerCount).toBe(2);
      expect(stats.averageBalance).toBe(2500);
    });
  });
});

describe('createLidoStETHTracker', () => {
  it('should create tracker with daily snapshots', () => {
    const tracker = createLidoStETHTracker();

    expect(tracker).toBeDefined();
    expect(tracker).toBeInstanceOf(StETHSupplyTracker);
    expect(tracker.snapshotInterval).toBe(24);
  });
});
