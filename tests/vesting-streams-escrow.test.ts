/**
 * Tests for local DAO finance primitives that model long-lived token flows.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import {
  VoteEscrowController,
  createBalancerVoteEscrow,
  createCurveVoteEscrow,
} from '../lib/governance/vote-escrow';
import {
  PaymentStreamController,
  createSablierStreamController,
  createSuperfluidStreamController,
} from '../lib/data-structures/payment-stream';
import {
  VestingController,
  createDAOGrantVestingController,
  createStartupVestingController,
} from '../lib/data-structures/vesting-schedule';
import { EventBus } from '../lib/utils/event-bus';

describe('VoteEscrowController', () => {
  let controller: VoteEscrowController;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus(false);
    controller = new VoteEscrowController({
      maxLockSteps: 100,
      minLockSteps: 10,
      minLockAmount: 5,
      powerMultiplier: 4,
    });
    controller.setEventBus(eventBus);
  });

  it('validates lock amount and duration boundaries', () => {
    expect(controller.createLock('alice', 4, 10, 0)).toBe(0);
    expect(controller.createLock('alice', 100, 9, 0)).toBe(0);

    const power = controller.createLock('alice', 100, 200, 0);

    expect(power).toBe(400);
    expect(controller.getPosition('alice')?.unlockStep).toBe(100);
  });

  it('creates, increases, extends, decays, and withdraws a lock', () => {
    const events: unknown[] = [];
    eventBus.subscribe('*', (event) => events.push(event));

    const initialPower = controller.createLock('alice', 100, 50, 10);
    expect(initialPower).toBe(200);
    expect(controller.totalLocked).toBe(100);
    expect(controller.getVotingPower('alice', 10)).toBe(200);
    expect(controller.createLock('alice', 100, 50, 20)).toBe(0);

    const additionalPower = controller.increaseLock('alice', 50, 20);
    expect(additionalPower).toBe(80);
    expect(controller.totalLocked).toBe(150);

    const extensionPower = controller.extendLock('alice', 100, 20);
    expect(extensionPower).toBe(200);
    expect(controller.getVotingPower('alice', 20)).toBe(480);

    controller.updateDecay(60);
    expect(controller.totalVotingPower).toBe(240);
    expect(controller.getVotingPower('alice', 60)).toBe(240);

    expect(controller.withdraw('alice', 99)).toBe(0);
    controller.updateDecay(100);
    expect(controller.getVotingPower('alice', 100)).toBe(0);
    expect(controller.withdraw('alice', 100)).toBe(150);
    expect(controller.getPosition('alice')).toBeUndefined();
    expect(controller.getStats().positionCount).toBe(0);
    expect(events.map((event) => (event as { event: string }).event)).toEqual(
      expect.arrayContaining([
        'vetoken_locked',
        'vetoken_increased',
        'vetoken_extended',
        'vetoken_decay_updated',
        'vetoken_withdrawn',
      ])
    );
  });

  it('round-trips serialized state and exposes factory defaults', () => {
    controller.createLock('alice', 100, 50, 0);
    controller.createLock('bob', 50, 100, 0);

    const restored = VoteEscrowController.fromDict(controller.toDict());

    expect(restored.getAllPositions()).toHaveLength(2);
    expect(restored.getVotingPower('bob', 0)).toBe(200);
    expect(restored.getStats()).toMatchObject({
      totalLocked: 150,
      positionCount: 2,
      averageLockDuration: 75,
    });
    expect(VoteEscrowController.fromDict({ positions: [['bad-owner', null]] }).getAllPositions()).toHaveLength(0);
    expect(createCurveVoteEscrow().config.powerMultiplier).toBe(4);
    expect(createBalancerVoteEscrow().config.maxLockSteps).toBe(52560);
  });
});

describe('PaymentStreamController', () => {
  let controller: PaymentStreamController;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus(false);
    controller = new PaymentStreamController({
      minStreamDuration: 10,
      maxStreamDuration: 100,
      minStreamAmount: 1,
      cancellationFee: 0.1,
      allowPause: true,
    });
    controller.setEventBus(eventBus);
  });

  it('validates stream creation inputs', () => {
    expect(controller.createStream('alice', 'bob', 'DAO', 0.5, 10, { type: 'linear' }, 0)).toBeNull();
    expect(controller.createStream('alice', 'bob', 'DAO', 10, 9, { type: 'linear' }, 0)).toBeNull();
    expect(controller.createStream('alice', 'alice', 'DAO', 10, 10, { type: 'linear' }, 0)).toBeNull();
    expect(controller.createStream('alice', 'bob', 'DAO', 10, 101, { type: 'linear' }, 0)).toBeNull();
  });

  it('streams, withdraws, completes, and indexes linear payments', () => {
    const events: unknown[] = [];
    eventBus.subscribe('*', (event) => events.push(event));

    const stream = controller.createStream('alice', 'bob', 'DAO', 1000, 100, { type: 'linear' }, 0);
    expect(stream).not.toBeNull();
    const streamId = stream!.streamId;

    expect(controller.getStreamableAmount(streamId, 50)).toBe(500);
    expect(controller.withdraw(streamId, 50)).toBe(500);
    expect(controller.getStreamableAmount(streamId, 75)).toBe(250);
    expect(controller.getSenderStreams('alice')).toHaveLength(1);
    expect(controller.getRecipientStreams('bob')).toHaveLength(1);
    expect(controller.getActiveStreams(75)).toHaveLength(1);

    const completed = controller.processStreams(100);

    expect(completed).toHaveLength(1);
    expect(controller.getStats()).toMatchObject({
      totalStreams: 1,
      completedStreams: 1,
      totalWithdrawn: 1000,
    });
    expect(events.map((event) => (event as { event: string }).event)).toEqual(
      expect.arrayContaining(['stream_created', 'stream_withdrawn', 'stream_completed'])
    );
  });

  it('calculates cliff, stepped, and custom stream schedules', () => {
    const cliff = controller.createStream('alice', 'bob', 'DAO', 1000, 100, {
      type: 'cliff',
      cliffSteps: 20,
    }, 0);
    const stepped = controller.createStream('alice', 'carol', 'DAO', 100, 40, {
      type: 'stepped',
      stepInterval: 10,
    }, 0);
    const custom = controller.createStream('alice', 'dave', 'DAO', 100, 50, {
      type: 'custom',
      customReleases: [
        { step: 10, amount: 25 },
        { step: 20, amount: 40 },
        { step: 30, amount: 50 },
      ],
    }, 0);

    expect(controller.getStreamableAmount(cliff!.streamId, 19)).toBe(0);
    expect(controller.getStreamableAmount(cliff!.streamId, 60)).toBe(500);
    expect(controller.getStreamableAmount(stepped!.streamId, 25)).toBe(50);
    expect(controller.getStreamableAmount(custom!.streamId, 25)).toBe(65);
    expect(controller.getStreamableAmount(custom!.streamId, 35)).toBe(100);
  });

  it('pauses, resumes, cancels, and restores stream state', () => {
    const stream = controller.createStream('alice', 'bob', 'DAO', 1000, 100, { type: 'linear' }, 0);
    const streamId = stream!.streamId;

    expect(controller.pause(streamId, 'bob', 10)).toBe(false);
    expect(controller.pause(streamId, 'alice', 10)).toBe(true);
    expect(controller.getStreamableAmount(streamId, 20)).toBe(0);
    expect(controller.resume(streamId, 'alice', 20)).toBe(true);
    expect(controller.getStream(streamId)?.endStep).toBe(110);

    const cancellation = controller.cancel(streamId, 'alice', 70);

    expect(cancellation?.recipientAmount).toBeCloseTo(636.3636, 4);
    expect(cancellation?.senderAmount).toBeCloseTo(327.2727, 4);
    expect(controller.getStats().cancelledStreams).toBe(1);

    const restored = PaymentStreamController.fromDict(controller.toDict());
    expect(restored.getStream(streamId)?.cancelled).toBe(true);
    expect(restored.getSenderStreams('alice')).toHaveLength(1);
    expect(PaymentStreamController.fromDict({ streams: [['bad-stream', null]] }).getStats().totalStreams).toBe(0);
    expect(createSablierStreamController().config.minStreamAmount).toBe(0.0001);
    expect(createSuperfluidStreamController().config.allowPause).toBe(false);
  });
});

describe('VestingController', () => {
  let controller: VestingController;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus(false);
    controller = new VestingController({
      minVestingDuration: 10,
      maxVestingDuration: 100,
      minCliffDuration: 0,
      maxCliffPercent: 25,
      allowRevoke: true,
      revokeReturnsUnvested: true,
    });
    controller.setEventBus(eventBus);
  });

  it('validates beneficiaries, cliffs, durations, and milestones', () => {
    const base = {
      grantor: 'dao',
      token: 'DAO',
      totalAmount: 1000,
      vestingType: 'linear' as const,
      durationSteps: 100,
    };

    expect(controller.createSchedule({
      ...base,
      beneficiaries: [{ address: 'alice', allocationPercent: 90 }],
    }, 0)).toBeNull();
    expect(controller.createSchedule({
      ...base,
      beneficiaries: [{ address: 'alice', allocationPercent: 100 }],
      cliffPercent: 26,
    }, 0)).toBeNull();
    expect(controller.createSchedule({
      ...base,
      beneficiaries: [{ address: 'alice', allocationPercent: 100 }],
      durationSteps: 9,
    }, 0)).toBeNull();
    expect(controller.createSchedule({
      ...base,
      beneficiaries: [{ address: 'alice', allocationPercent: 100 }],
      vestingType: 'milestone',
    }, 0)).toBeNull();
    expect(controller.createSchedule({
      ...base,
      beneficiaries: [{ address: 'alice', allocationPercent: 100 }],
      vestingType: 'milestone',
      milestones: [{ id: 'm1', description: 'ship', releasePercent: 90 }],
    }, 0)).toBeNull();
  });

  it('vests linearly after a cliff and tracks claims by beneficiary', () => {
    const events: unknown[] = [];
    eventBus.subscribe('*', (event) => events.push(event));
    const schedule = controller.createSchedule({
      grantor: 'dao',
      token: 'DAO',
      totalAmount: 1000,
      beneficiaries: [
        { address: 'alice', allocationPercent: 60 },
        { address: 'bob', allocationPercent: 40 },
      ],
      vestingType: 'linear',
      durationSteps: 100,
      cliffSteps: 20,
      cliffPercent: 10,
      metadata: { grant: 'core-team' },
    }, 10);

    const scheduleId = schedule!.scheduleId;

    expect(controller.getVestedAmount(scheduleId, 29)).toBe(0);
    expect(controller.getVestedAmount(scheduleId, 30)).toBe(100);
    expect(controller.getVestedAmount(scheduleId, 70)).toBe(550);
    expect(controller.getClaimableAmount(scheduleId, 'alice', 70)).toBe(330);
    expect(controller.claim(scheduleId, 'alice', 70)).toBe(330);
    expect(controller.claim(scheduleId, 'alice', 70)).toBe(0);
    expect(controller.getGrantorSchedules('dao')).toHaveLength(1);
    expect(controller.getBeneficiarySchedules('bob')).toHaveLength(1);

    controller.processSchedules(110);
    expect(events.map((event) => (event as { event: string }).event)).toEqual(
      expect.arrayContaining(['vesting_created', 'vesting_claimed', 'vesting_completed'])
    );
  });

  it('supports stepped and milestone vesting formulas', () => {
    const stepped = controller.createSchedule({
      grantor: 'dao',
      token: 'DAO',
      totalAmount: 1000,
      beneficiaries: [{ address: 'alice', allocationPercent: 100 }],
      vestingType: 'stepped',
      durationSteps: 100,
      cliffSteps: 20,
      cliffPercent: 10,
      stepIntervalSteps: 20,
    }, 0);
    const milestone = controller.createSchedule({
      grantor: 'dao',
      token: 'DAO',
      totalAmount: 500,
      beneficiaries: [{ address: 'bob', allocationPercent: 100 }],
      vestingType: 'milestone',
      durationSteps: 50,
      milestones: [
        { id: 'm1', description: 'design', releasePercent: 40 },
        { id: 'm2', description: 'launch', releasePercent: 60 },
      ],
    }, 0);

    expect(controller.getVestedAmount(stepped!.scheduleId, 60)).toBe(550);
    expect(controller.completeMilestone(milestone!.scheduleId, 'm1', 10)).toBe(true);
    expect(controller.getVestedAmount(milestone!.scheduleId, 10)).toBe(200);
    expect(controller.claim(milestone!.scheduleId, 'bob', 10)).toBe(200);
    expect(controller.completeMilestone(milestone!.scheduleId, 'm1', 20)).toBe(false);
  });

  it('revokes schedules, reports stats, restores state, and exposes factory defaults', () => {
    const schedule = controller.createSchedule({
      grantor: 'dao',
      token: 'DAO',
      totalAmount: 1000,
      beneficiaries: [{ address: 'alice', allocationPercent: 100 }],
      vestingType: 'linear',
      durationSteps: 100,
    }, 0);
    const scheduleId = schedule!.scheduleId;

    expect(controller.claim(scheduleId, 'alice', 50)).toBe(500);
    expect(controller.revoke(scheduleId, 'alice', 60)).toBeNull();
    expect(controller.revoke(scheduleId, 'dao', 60)).toEqual({ unclaimedReturned: 500 });
    expect(controller.getStats()).toMatchObject({
      totalSchedules: 1,
      revokedSchedules: 1,
      totalAllocated: 1000,
      totalClaimed: 500,
    });

    const restored = VestingController.fromDict(controller.toDict());

    expect(restored.getSchedule(scheduleId)?.revoked).toBe(true);
    expect(restored.getBeneficiarySchedules('alice')).toHaveLength(1);
    expect(VestingController.fromDict({ schedules: [['bad-schedule', null]] }).getStats().totalSchedules).toBe(0);
    expect(createStartupVestingController().config.minCliffDuration).toBe(2190);
    expect(createDAOGrantVestingController().config.maxCliffPercent).toBe(25);
  });
});
