/**
 * Approval Voting Tests
 *
 * Tests for MakerDAO-style continuous approval voting system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ApprovalVotingController,
  createMakerApprovalVoting,
} from '../lib/governance/approval-voting';
import { EventBus } from '../lib/utils/event-bus';

describe('ApprovalVotingController', () => {
  let controller: ApprovalVotingController;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus(false);
    controller = new ApprovalVotingController({
      spellLifetimeSteps: 720,
      minSupportToExecute: 0,
      executionDelaySteps: 0,
      allowMultipleSupport: false,
    });
    controller.setEventBus(eventBus);
    controller.updateTotalVotingPower(1000000);
  });

  describe('createSpell', () => {
    it('should create a new executive spell', () => {
      const spell = controller.createSpell(
        'Increase debt ceiling',
        'Proposal to increase DAI debt ceiling',
        'creator_1',
        { debtCeiling: 500000000 },
        1
      );

      expect(spell).toBeDefined();
      expect(spell.id).toBeDefined();
      expect(spell.title).toBe('Increase debt ceiling');
      expect(spell.status).toBe('pending');
      expect(spell.totalSupport).toBe(0);
    });

    it('should set expiration based on lifetime', () => {
      const spell = controller.createSpell(
        'Test spell',
        'Description',
        'creator_1',
        {},
        10
      );

      expect(spell.expirationStep).toBe(730);  // 10 + 720
    });

    it('should emit spell_created event', () => {
      const events: unknown[] = [];
      eventBus.subscribe('executive_spell_created', (data) => events.push(data));

      controller.createSpell('Test', 'Desc', 'creator_1', {}, 1);

      expect(events.length).toBe(1);
    });
  });

  describe('supportSpell', () => {
    it('should add support to spell', () => {
      const spell = controller.createSpell('Test', 'Desc', 'creator_1', {}, 1);
      const result = controller.supportSpell(spell.id, 'voter_1', 1000, 2);

      expect(result).toBe(true);
      const updated = controller.getSpell(spell.id);
      expect(updated?.totalSupport).toBe(1000);
    });

    it('should accumulate support from same voter', () => {
      const spell = controller.createSpell('Test', 'Desc', 'creator_1', {}, 1);
      controller.supportSpell(spell.id, 'voter_1', 1000, 2);
      controller.supportSpell(spell.id, 'voter_1', 2000, 3);  // Updates to 2000

      const updated = controller.getSpell(spell.id);
      expect(updated?.totalSupport).toBe(2000);  // Replaced, not added
    });

    it('should remove support from other spells when not allowing multiple', () => {
      const spell1 = controller.createSpell('Spell 1', 'Desc', 'creator_1', {}, 1);
      const spell2 = controller.createSpell('Spell 2', 'Desc', 'creator_1', {}, 2);

      controller.supportSpell(spell1.id, 'voter_1', 1000, 3);
      controller.supportSpell(spell2.id, 'voter_1', 1000, 4);

      expect(controller.getSpell(spell1.id)?.totalSupport).toBe(0);
      expect(controller.getSpell(spell2.id)?.totalSupport).toBe(1000);
    });

    it('should reject support for executed spell', () => {
      const spell = controller.createSpell('Test', 'Desc', 'creator_1', {}, 1);
      controller.supportSpell(spell.id, 'voter_1', 1000, 2);
      controller.executeHat(3);

      const result = controller.supportSpell(spell.id, 'voter_2', 500, 4);
      expect(result).toBe(false);
    });

    it('should emit support_changed event', () => {
      const events: unknown[] = [];
      eventBus.subscribe('spell_support_changed', (data) => events.push(data));

      const spell = controller.createSpell('Test', 'Desc', 'creator_1', {}, 1);
      controller.supportSpell(spell.id, 'voter_1', 1000, 2);

      expect(events.length).toBe(1);
    });
  });

  describe('hat management', () => {
    it('should update hat when spell gets most support', () => {
      const spell = controller.createSpell('Test', 'Desc', 'creator_1', {}, 1);
      controller.supportSpell(spell.id, 'voter_1', 1000, 2);

      expect(controller.getCurrentHat()?.id).toBe(spell.id);
      expect(controller.getSpell(spell.id)?.status).toBe('hat');
    });

    it('should change hat when another spell gets more support', () => {
      const spell1 = controller.createSpell('Spell 1', 'Desc', 'creator_1', {}, 1);
      const spell2 = controller.createSpell('Spell 2', 'Desc', 'creator_2', {}, 2);

      // Use controller with allowMultipleSupport: true
      const multiController = new ApprovalVotingController({
        allowMultipleSupport: true,
      });

      const s1 = multiController.createSpell('Spell 1', 'Desc', 'creator_1', {}, 1);
      const s2 = multiController.createSpell('Spell 2', 'Desc', 'creator_2', {}, 2);

      multiController.supportSpell(s1.id, 'voter_1', 1000, 3);
      expect(multiController.getCurrentHat()?.id).toBe(s1.id);

      multiController.supportSpell(s2.id, 'voter_2', 2000, 4);
      expect(multiController.getCurrentHat()?.id).toBe(s2.id);
    });

    it('should emit hat_changed event', () => {
      const events: unknown[] = [];
      eventBus.subscribe('hat_changed', (data) => events.push(data));

      const spell = controller.createSpell('Test', 'Desc', 'creator_1', {}, 1);
      controller.supportSpell(spell.id, 'voter_1', 1000, 2);

      expect(events.length).toBe(1);
    });
  });

  describe('removeSupport', () => {
    it('should remove support from spell', () => {
      const spell = controller.createSpell('Test', 'Desc', 'creator_1', {}, 1);
      controller.supportSpell(spell.id, 'voter_1', 1000, 2);
      const result = controller.removeSupport(spell.id, 'voter_1', 3);

      expect(result).toBe(true);
      expect(controller.getSpell(spell.id)?.totalSupport).toBe(0);
    });

    it('should return false for non-supporter', () => {
      const spell = controller.createSpell('Test', 'Desc', 'creator_1', {}, 1);
      const result = controller.removeSupport(spell.id, 'voter_1', 2);

      expect(result).toBe(false);
    });
  });

  describe('executeHat', () => {
    it('should execute current hat spell', () => {
      const spell = controller.createSpell('Test', 'Desc', 'creator_1', {}, 1);
      controller.supportSpell(spell.id, 'voter_1', 1000, 2);

      const executed = controller.executeHat(3);

      expect(executed).toBeDefined();
      expect(executed?.status).toBe('executed');
      expect(controller.getCurrentHat()).toBeNull();
    });

    it('should return null when no hat', () => {
      const executed = controller.executeHat(1);
      expect(executed).toBeNull();
    });

    it('should respect execution delay', () => {
      const delayController = new ApprovalVotingController({
        executionDelaySteps: 48,
      });

      const spell = delayController.createSpell('Test', 'Desc', 'creator_1', {}, 1);
      delayController.supportSpell(spell.id, 'voter_1', 1000, 2);

      // Try to execute before delay
      expect(delayController.executeHat(10)).toBeNull();

      // Execute after delay (2 + 48 = 50)
      expect(delayController.executeHat(51)?.status).toBe('executed');
    });

    it('should emit spell_executed event', () => {
      const events: unknown[] = [];
      eventBus.subscribe('spell_executed', (data) => events.push(data));

      const spell = controller.createSpell('Test', 'Desc', 'creator_1', {}, 1);
      controller.supportSpell(spell.id, 'voter_1', 1000, 2);
      controller.executeHat(3);

      expect(events.length).toBe(1);
    });
  });

  describe('processSpells', () => {
    it('should expire old spells', () => {
      const spell = controller.createSpell('Test', 'Desc', 'creator_1', {}, 1);

      // Process after expiration (1 + 720 = 721)
      controller.processSpells(722);

      expect(controller.getSpell(spell.id)?.status).toBe('expired');
    });

    it('should emit spell_expired event', () => {
      const events: unknown[] = [];
      eventBus.subscribe('spell_expired', (data) => events.push(data));

      controller.createSpell('Test', 'Desc', 'creator_1', {}, 1);
      controller.processSpells(722);

      expect(events.length).toBe(1);
    });

    it('should clear hat when hat spell expires', () => {
      const spell = controller.createSpell('Test', 'Desc', 'creator_1', {}, 1);
      controller.supportSpell(spell.id, 'voter_1', 1000, 2);
      expect(controller.getCurrentHat()?.id).toBe(spell.id);

      controller.processSpells(722);

      expect(controller.getCurrentHat()).toBeNull();
    });
  });

  describe('cancelSpell', () => {
    it('should allow creator to cancel', () => {
      const spell = controller.createSpell('Test', 'Desc', 'creator_1', {}, 1);
      const result = controller.cancelSpell(spell.id, 'creator_1', 5);

      expect(result).toBe(true);
      expect(controller.getSpell(spell.id)?.status).toBe('cancelled');
    });

    it('should reject non-creator cancellation', () => {
      const spell = controller.createSpell('Test', 'Desc', 'creator_1', {}, 1);
      const result = controller.cancelSpell(spell.id, 'other_user', 5);

      expect(result).toBe(false);
    });

    it('should not allow cancelling executed spell', () => {
      const spell = controller.createSpell('Test', 'Desc', 'creator_1', {}, 1);
      controller.supportSpell(spell.id, 'voter_1', 1000, 2);
      controller.executeHat(3);

      const result = controller.cancelSpell(spell.id, 'creator_1', 5);
      expect(result).toBe(false);
    });
  });

  describe('getActiveSpells', () => {
    it('should return only active spells sorted by support', () => {
      const spell1 = controller.createSpell('Spell 1', 'Desc', 'creator_1', {}, 1);
      const spell2 = controller.createSpell('Spell 2', 'Desc', 'creator_2', {}, 2);
      controller.supportSpell(spell1.id, 'voter_1', 500, 3);
      // spell2 has no support but is still pending

      const active = controller.getActiveSpells();
      expect(active.length).toBe(2);
      expect(active[0].id).toBe(spell1.id);  // Higher support first
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      const spell1 = controller.createSpell('Spell 1', 'Desc', 'creator_1', {}, 1);
      const spell2 = controller.createSpell('Spell 2', 'Desc', 'creator_2', {}, 2);
      controller.supportSpell(spell1.id, 'voter_1', 1000, 3);
      controller.executeHat(4);

      const stats = controller.getStats();

      expect(stats.totalSpells).toBe(2);
      expect(stats.activeSpells).toBe(1);
      expect(stats.executedSpells).toBe(1);
    });
  });
});

describe('createMakerApprovalVoting', () => {
  it('should create controller with Maker defaults', () => {
    const controller = createMakerApprovalVoting();

    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(ApprovalVotingController);

    // Verify instant execution (no delay)
    const spell = controller.createSpell('Test', 'Desc', 'creator_1', {}, 1);
    controller.supportSpell(spell.id, 'voter_1', 1000, 2);
    const executed = controller.executeHat(3);
    expect(executed?.status).toBe('executed');
  });
});
