/**
 * Easy Track Tests
 *
 * Tests for Lido's Easy Track governance system - objection-based fast-track motions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  EasyTrackController,
  createLidoEasyTrack,
  type EasyTrackMotion,
  type EasyTrackMotionType,
} from '../lib/governance/easy-track';
import { EventBus } from '../lib/utils/event-bus';

describe('EasyTrackController', () => {
  let controller: EasyTrackController;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus(false);
    controller = new EasyTrackController({
      objectionThresholdPercent: 0.5,  // 0.5% of total supply
      objectionPeriodSteps: 72,         // 3 days at 24 steps/day
      maxPendingMotions: 10,
      allowedMotionTypes: [
        'top_up_lego',
        'top_up_referral',
        'top_up_rewards_share',
        'add_reward_program',
        'remove_reward_program',
        'node_operator_limit',
        'token_transfer',
      ],
    });
    controller.setEventBus(eventBus);
    controller.updateTotalVotingPower(1000000);  // 1M total supply
  });

  describe('createMotion', () => {
    it('should create a new motion', () => {
      const motion = controller.createMotion(
        'top_up_lego',
        'creator_1',
        'Top up insurance fund',
        'Description',
        { amount: 10000 },
        1
      );

      expect(motion).toBeDefined();
      expect(motion!.id).toBeDefined();
      expect(motion!.type).toBe('top_up_lego');
      expect(motion!.title).toBe('Top up insurance fund');
      expect(motion!.status).toBe('pending');
      expect(motion!.createdStep).toBe(1);
    });

    it('should emit motion_created event', () => {
      const events: unknown[] = [];
      eventBus.subscribe('easy_track_motion_created', (data) => events.push(data));

      controller.createMotion(
        'add_reward_program',
        'creator_1',
        'Add new reward program',
        'Description',
        { program: 'test' },
        1
      );

      expect(events.length).toBe(1);
    });

    it('should support different motion types', () => {
      const types: EasyTrackMotionType[] = [
        'top_up_lego',
        'add_reward_program',
        'remove_reward_program',
        'node_operator_limit',
        'token_transfer',
      ];

      for (const type of types) {
        const motion = controller.createMotion(
          type,
          'creator_1',
          `Test ${type}`,
          'Description',
          {},
          1
        );
        expect(motion).toBeDefined();
        expect(motion!.type).toBe(type);
      }
    });
  });

  describe('objectToMotion', () => {
    it('should record an objection', () => {
      const motion = controller.createMotion(
        'top_up_lego',
        'creator_1',
        'Top up insurance fund',
        'Description',
        {},
        1
      );

      const result = controller.objectToMotion(motion!.id, 'objector_1', 1000, 2);

      expect(result).toBe(true);
      const updated = controller.getMotion(motion!.id);
      expect(updated!.totalObjectionPower).toBe(1000);
    });

    it('should reject motion when objection threshold reached', () => {
      const motion = controller.createMotion(
        'top_up_lego',
        'creator_1',
        'Top up insurance fund',
        'Description',
        {},
        1
      );

      // Object with enough tokens to reach 0.5% threshold (5000 tokens of 1M)
      controller.objectToMotion(motion!.id, 'objector_1', 5000, 2);

      const updatedMotion = controller.getMotion(motion!.id);
      expect(updatedMotion?.status).toBe('objected');
    });

    it('should emit objection event', () => {
      const events: unknown[] = [];
      eventBus.subscribe('easy_track_objection', (data) => events.push(data));

      const motion = controller.createMotion(
        'top_up_lego',
        'creator_1',
        'Top up insurance fund',
        'Description',
        {},
        1
      );

      controller.objectToMotion(motion!.id, 'objector_1', 1000, 2);

      expect(events.length).toBe(1);
    });

    it('should prevent same objector from objecting twice', () => {
      const motion = controller.createMotion(
        'top_up_lego',
        'creator_1',
        'Top up insurance fund',
        'Description',
        {},
        1
      );

      controller.objectToMotion(motion!.id, 'objector_1', 1000, 2);
      const result = controller.objectToMotion(motion!.id, 'objector_1', 2000, 3);

      expect(result).toBe(false);
    });
  });

  describe('processMotions', () => {
    it('should enact motion after duration with no objections', () => {
      const motion = controller.createMotion(
        'top_up_lego',
        'creator_1',
        'Top up insurance fund',
        'Description',
        {},
        1
      );

      // Process motions after duration (72 steps + 1)
      controller.processMotions(74);

      const updatedMotion = controller.getMotion(motion!.id);
      expect(updatedMotion?.status).toBe('enacted');
    });

    it('should emit enacted event', () => {
      const events: unknown[] = [];
      eventBus.subscribe('easy_track_motion_enacted', (data) => events.push(data));

      controller.createMotion(
        'top_up_lego',
        'creator_1',
        'Top up insurance fund',
        'Description',
        {},
        1
      );

      controller.processMotions(74);

      expect(events.length).toBe(1);
    });

    it('should not enact motion before duration', () => {
      const motion = controller.createMotion(
        'top_up_lego',
        'creator_1',
        'Top up insurance fund',
        'Description',
        {},
        1
      );

      // Process motions before duration ends
      controller.processMotions(50);

      const updatedMotion = controller.getMotion(motion!.id);
      expect(updatedMotion?.status).toBe('pending');
    });
  });

  describe('cancelMotion', () => {
    it('should allow creator to cancel their motion', () => {
      const motion = controller.createMotion(
        'top_up_lego',
        'creator_1',
        'Top up insurance fund',
        'Description',
        {},
        1
      );

      const result = controller.cancelMotion(motion!.id, 'creator_1', 5);

      expect(result).toBe(true);

      const updatedMotion = controller.getMotion(motion!.id);
      expect(updatedMotion?.status).toBe('cancelled');
    });

    it('should not allow non-creator to cancel motion', () => {
      const motion = controller.createMotion(
        'top_up_lego',
        'creator_1',
        'Top up insurance fund',
        'Description',
        {},
        1
      );

      const result = controller.cancelMotion(motion!.id, 'other_user', 5);

      expect(result).toBe(false);

      const updatedMotion = controller.getMotion(motion!.id);
      expect(updatedMotion?.status).toBe('pending');
    });
  });

  describe('getPendingMotions', () => {
    it('should return only pending motions', () => {
      controller.createMotion('top_up_lego', 'creator_1', 'Motion 1', 'Desc', {}, 1);
      controller.createMotion('add_reward_program', 'creator_2', 'Motion 2', 'Desc', {}, 2);
      const motion3 = controller.createMotion('token_transfer', 'creator_3', 'Motion 3', 'Desc', {}, 3);

      // Cancel one motion
      controller.cancelMotion(motion3!.id, 'creator_3', 4);

      const pendingMotions = controller.getPendingMotions();
      expect(pendingMotions.length).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      // Create first motion at step 1 (deadline step 73)
      controller.createMotion('top_up_lego', 'creator_1', 'Motion 1', 'Desc', {}, 1);
      // Create second motion at step 50 (deadline step 122)
      controller.createMotion('add_reward_program', 'creator_2', 'Motion 2', 'Desc', {}, 50);

      // Process at step 74 - first motion enacted, second still pending
      controller.processMotions(74);

      const stats = controller.getStats();

      expect(stats.total).toBe(2);
      expect(stats.pending).toBe(1);
      expect(stats.enacted).toBe(1);
      expect(stats.objected).toBe(0);
    });
  });
});

describe('createLidoEasyTrack', () => {
  it('should create controller with Lido defaults', () => {
    const controller = createLidoEasyTrack();

    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(EasyTrackController);

    // Create a test motion
    const motion = controller.createMotion(
      'top_up_lego',
      'creator_1',
      'Test motion',
      'Description',
      {},
      1
    );

    expect(motion).toBeDefined();
  });
});
