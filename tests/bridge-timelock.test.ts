/**
 * Bridge Timelock Tests
 *
 * Tests for Arbitrum-style multi-layer execution delays.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  BridgeTimelockController,
  createArbitrumBridgeTimelock,
} from '../lib/governance/bridge-timelock';
import { EventBus } from '../lib/utils/event-bus';
import type { MultiStageProposal } from '../lib/data-structures/multi-stage-proposal';

// Mock proposal for testing
function createMockProposal(options: {
  id?: string;
  title?: string;
  creator?: string;
  isConstitutional?: boolean;
}): MultiStageProposal {
  return {
    uniqueId: options.id || 'proposal_1',
    title: options.title || 'Test Proposal',
    creator: options.creator || 'creator_1',
    proposalCategory: options.isConstitutional ? 'constitutional' : 'standard',
    // Other required fields with defaults
    description: 'Test description',
    createdStep: 1,
    currentStageIndex: 0,
    stages: [],
    houseVotes: new Map(),
    vetoSignals: new Map(),
    status: 'active',
  } as unknown as MultiStageProposal;
}

describe('BridgeTimelockController', () => {
  let controller: BridgeTimelockController;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus(false);
    controller = new BridgeTimelockController({
      l2TimelockSteps: 72,      // 3 days
      bridgeDelaySteps: 168,    // 7 days
      l1TimelockSteps: 72,      // 3 days
      constitutionalL2TimelockSteps: 72,
      constitutionalBridgeDelaySteps: 168,
      constitutionalL1TimelockSteps: 72,
      emergencyDelaySteps: 24,  // 1 day
    });
    controller.setEventBus(eventBus);
  });

  describe('queueProposal', () => {
    it('should queue a standard proposal', () => {
      const proposal = createMockProposal({});
      const entry = controller.queueProposal(proposal, { action: 'test' }, 1);

      expect(entry).toBeDefined();
      expect(entry.id).toBeDefined();
      expect(entry.stage).toBe('l2_timelock');
      expect(entry.proposalId).toBe(proposal.uniqueId);
    });

    it('should calculate correct timeline for standard proposal', () => {
      const proposal = createMockProposal({});
      const entry = controller.queueProposal(proposal, {}, 10);

      // L2 timelock: 10 + 72 = 82
      // Bridge: 82 + 168 = 250
      // L1 timelock: 250 + 72 = 322
      expect(entry.l2TimelockEndStep).toBe(82);
      expect(entry.bridgeEndStep).toBe(250);
      expect(entry.l1TimelockEndStep).toBe(322);
    });

    it('should calculate correct timeline for emergency proposal', () => {
      const proposal = createMockProposal({});
      const entry = controller.queueProposal(proposal, {}, 10, true);  // isEmergency

      // Emergency: 10 + 24 = 34 (skips bridge and L1)
      expect(entry.l2TimelockEndStep).toBe(34);
      expect(entry.bridgeEndStep).toBe(34);  // Same as L2 (0 delay)
      expect(entry.l1TimelockEndStep).toBe(34);  // Same as bridge (0 delay)
    });

    it('should emit bridge_timelock_queued event', () => {
      const events: unknown[] = [];
      eventBus.subscribe('bridge_timelock_queued', (data) => events.push(data));

      const proposal = createMockProposal({});
      controller.queueProposal(proposal, {}, 1);

      expect(events.length).toBe(1);
    });
  });

  describe('processTimelocks', () => {
    it('should advance from l2_timelock to l2_to_l1_bridge', () => {
      const proposal = createMockProposal({});
      const entry = controller.queueProposal(proposal, {}, 1);

      // Process after L2 timelock ends (1 + 72 = 73)
      controller.processTimelocks(73);

      const updated = controller.getEntry(entry.id);
      expect(updated?.stage).toBe('l2_to_l1_bridge');
    });

    it('should advance from l2_to_l1_bridge to l1_timelock', () => {
      const proposal = createMockProposal({});
      const entry = controller.queueProposal(proposal, {}, 1);

      // Process after bridge ends (1 + 72 + 168 = 241)
      controller.processTimelocks(73);   // l2 -> bridge
      controller.processTimelocks(241);  // bridge -> l1

      const updated = controller.getEntry(entry.id);
      expect(updated?.stage).toBe('l1_timelock');
    });

    it('should advance to ready after all delays', () => {
      const proposal = createMockProposal({});
      const entry = controller.queueProposal(proposal, {}, 1);

      // Process after all delays (1 + 72 + 168 + 72 = 313)
      controller.processTimelocks(73);   // l2 -> bridge
      controller.processTimelocks(241);  // bridge -> l1
      const ready = controller.processTimelocks(313);  // l1 -> ready

      expect(ready.length).toBe(1);
      expect(ready[0].id).toBe(entry.id);
      expect(controller.getEntry(entry.id)?.stage).toBe('ready');
    });

    it('should emit stage_changed events', () => {
      const events: unknown[] = [];
      eventBus.subscribe('bridge_timelock_stage_changed', (data) => events.push(data));

      const proposal = createMockProposal({});
      controller.queueProposal(proposal, {}, 1);
      controller.processTimelocks(73);

      expect(events.length).toBe(1);
    });
  });

  describe('execute', () => {
    it('should execute ready entry', () => {
      const proposal = createMockProposal({});
      const entry = controller.queueProposal(proposal, {}, 1);

      // Advance to ready
      controller.processTimelocks(73);
      controller.processTimelocks(241);
      controller.processTimelocks(313);

      const result = controller.execute(entry.id, 315);

      expect(result).toBe(true);
      expect(controller.getEntry(entry.id)?.stage).toBe('executed');
    });

    it('should reject execution of non-ready entry', () => {
      const proposal = createMockProposal({});
      const entry = controller.queueProposal(proposal, {}, 1);

      const result = controller.execute(entry.id, 10);

      expect(result).toBe(false);
    });

    it('should emit bridge_timelock_executed event', () => {
      const events: unknown[] = [];
      eventBus.subscribe('bridge_timelock_executed', (data) => events.push(data));

      const proposal = createMockProposal({});
      const entry = controller.queueProposal(proposal, {}, 1);
      controller.processTimelocks(73);
      controller.processTimelocks(241);
      controller.processTimelocks(313);
      controller.execute(entry.id, 315);

      expect(events.length).toBe(1);
    });
  });

  describe('cancel', () => {
    it('should cancel pending entry', () => {
      const proposal = createMockProposal({});
      const entry = controller.queueProposal(proposal, {}, 1);

      const result = controller.cancel(entry.id, 'Security concern', 10);

      expect(result).toBe(true);
      expect(controller.getEntry(entry.id)?.stage).toBe('cancelled');
    });

    it('should reject cancellation of executed entry', () => {
      const proposal = createMockProposal({});
      const entry = controller.queueProposal(proposal, {}, 1);
      controller.processTimelocks(73);
      controller.processTimelocks(241);
      controller.processTimelocks(313);
      controller.execute(entry.id, 315);

      const result = controller.cancel(entry.id, 'Too late', 320);

      expect(result).toBe(false);
    });

    it('should emit bridge_timelock_cancelled event', () => {
      const events: unknown[] = [];
      eventBus.subscribe('bridge_timelock_cancelled', (data) => events.push(data));

      const proposal = createMockProposal({});
      const entry = controller.queueProposal(proposal, {}, 1);
      controller.cancel(entry.id, 'Reason', 10);

      expect(events.length).toBe(1);
    });
  });

  describe('getEntryByProposal', () => {
    it('should find entry by proposal ID', () => {
      const proposal = createMockProposal({ id: 'unique_prop_123' });
      controller.queueProposal(proposal, {}, 1);

      const found = controller.getEntryByProposal('unique_prop_123');

      expect(found).toBeDefined();
      expect(found?.proposalId).toBe('unique_prop_123');
    });

    it('should return undefined for unknown proposal', () => {
      const found = controller.getEntryByProposal('unknown');
      expect(found).toBeUndefined();
    });
  });

  describe('getEntriesInStage', () => {
    it('should filter entries by stage', () => {
      const proposal1 = createMockProposal({ id: 'prop_1' });
      const proposal2 = createMockProposal({ id: 'prop_2' });

      controller.queueProposal(proposal1, {}, 1);
      controller.queueProposal(proposal2, {}, 5);

      // Advance first to bridge
      controller.processTimelocks(73);

      const inL2 = controller.getEntriesInStage('l2_timelock');
      const inBridge = controller.getEntriesInStage('l2_to_l1_bridge');

      expect(inL2.length).toBe(1);
      expect(inBridge.length).toBe(1);
    });
  });

  describe('getPendingEntries', () => {
    it('should return only pending entries', () => {
      const proposal1 = createMockProposal({ id: 'prop_1' });
      const proposal2 = createMockProposal({ id: 'prop_2' });

      const entry1 = controller.queueProposal(proposal1, {}, 1);
      controller.queueProposal(proposal2, {}, 5);
      controller.cancel(entry1.id, 'Cancelled', 10);

      const pending = controller.getPendingEntries();

      expect(pending.length).toBe(1);
    });
  });

  describe('getTotalDelaySteps', () => {
    it('should calculate total delay for standard proposal', () => {
      const total = controller.getTotalDelaySteps(false, false);
      expect(total).toBe(312);  // 72 + 168 + 72
    });

    it('should calculate total delay for constitutional proposal', () => {
      const total = controller.getTotalDelaySteps(true, false);
      expect(total).toBe(312);  // Same as standard in this config
    });

    it('should calculate total delay for emergency', () => {
      const total = controller.getTotalDelaySteps(false, true);
      expect(total).toBe(24);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      const proposal1 = createMockProposal({ id: 'prop_1' });
      const proposal2 = createMockProposal({ id: 'prop_2' });

      controller.queueProposal(proposal1, {}, 1);
      const entry2 = controller.queueProposal(proposal2, {}, 5);
      controller.cancel(entry2.id, 'Cancelled', 10);

      const stats = controller.getStats();

      expect(stats.total).toBe(2);
      expect(stats.inL2Timelock).toBe(1);
      expect(stats.cancelled).toBe(1);
    });
  });
});

describe('createArbitrumBridgeTimelock', () => {
  it('should create controller with Arbitrum defaults', () => {
    const controller = createArbitrumBridgeTimelock();

    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(BridgeTimelockController);

    // Verify total delay is 312 steps (13 days)
    expect(controller.getTotalDelaySteps(false, false)).toBe(312);
  });
});
