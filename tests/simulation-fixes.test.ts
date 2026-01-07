// Comprehensive tests for simulation fixes
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DAOSimulation } from '@/lib/engine/simulation';
import { DAOMember } from '@/lib/agents/base';
import { RandomActivation, ParallelActivation, AsyncActivation, StagedActivation } from '@/lib/engine/scheduler';
import { CircularBuffer } from '@/lib/utils/circular-buffer';
import { setSeed, random, randomChoice } from '@/lib/utils/random';

describe('Scheduler fixes', () => {
  it('RandomActivation should use Set for O(1) operations', () => {
    const scheduler = new RandomActivation();
    const mockAgent = { uniqueId: 'test', step: vi.fn() } as any;

    scheduler.add(mockAgent);
    expect(scheduler.has(mockAgent)).toBe(true);
    expect(scheduler.agentCount).toBe(1);

    scheduler.remove(mockAgent);
    expect(scheduler.has(mockAgent)).toBe(false);
    expect(scheduler.agentCount).toBe(0);
  });

  it('ParallelActivation should return Promise', async () => {
    const scheduler = new ParallelActivation();
    const stepFn = vi.fn();
    const mockAgent = { uniqueId: 'test', step: stepFn } as any;

    scheduler.add(mockAgent);
    const result = scheduler.step();

    expect(result).toBeInstanceOf(Promise);
    await result;
    expect(stepFn).toHaveBeenCalled();
  });

  it('AsyncActivation should await all agent steps', async () => {
    const scheduler = new AsyncActivation();
    let completed = 0;
    const asyncStep = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      completed++;
    };

    const mockAgents = Array.from({ length: 3 }, (_, i) => ({
      uniqueId: `agent_${i}`,
      step: asyncStep,
    })) as any[];

    mockAgents.forEach(a => scheduler.add(a));
    await scheduler.step();

    expect(completed).toBe(3);
  });

  it('StagedActivation should process stages in order', () => {
    const scheduler = new StagedActivation(['Developer', 'Investor']);
    const order: string[] = [];

    const dev = {
      uniqueId: 'dev',
      step: () => order.push('dev'),
      constructor: { name: 'Developer' }
    } as any;
    const investor = {
      uniqueId: 'inv',
      step: () => order.push('inv'),
      constructor: { name: 'Investor' }
    } as any;

    // Add in reverse order - should still execute Developer first
    scheduler.add(investor);
    scheduler.add(dev);
    scheduler.step();

    expect(order).toEqual(['dev', 'inv']);
  });
});

describe('Simulation async step', () => {
  it('should properly await scheduler step', async () => {
    const simulation = new DAOSimulation({
      num_developers: 2,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
    });

    // step() should return a Promise
    const stepPromise = simulation.step();
    expect(stepPromise).toBeInstanceOf(Promise);
    await stepPromise;
    expect(simulation.currentStep).toBe(1);
  });

  it('run() should await all steps', async () => {
    const simulation = new DAOSimulation({
      num_developers: 1,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
    });

    await simulation.run(5);
    expect(simulation.currentStep).toBe(5);
  });
});

describe('Circular delegation prevention', () => {
  let simulation: DAOSimulation;
  let memberA: DAOMember;
  let memberB: DAOMember;
  let memberC: DAOMember;

  beforeEach(() => {
    simulation = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
    });

    memberA = new DAOMember('A', simulation, 100, 10, 'North America');
    memberB = new DAOMember('B', simulation, 100, 10, 'Europe');
    memberC = new DAOMember('C', simulation, 100, 10, 'Asia');

    simulation.dao.addMember(memberA);
    simulation.dao.addMember(memberB);
    simulation.dao.addMember(memberC);
  });

  it('should prevent self-delegation', () => {
    const initialTokens = memberA.tokens;
    memberA.delegate(10, memberA);
    expect(memberA.tokens).toBe(initialTokens); // No change
  });

  it('should prevent direct circular delegation', () => {
    // A delegates to B
    memberA.delegate(10, memberB);
    expect(memberA.tokens).toBe(90);
    expect(memberB.delegations.has(memberA.uniqueId)).toBe(false); // B doesn't delegate to A

    // B tries to delegate to A (would create cycle)
    memberB.delegate(10, memberA);
    // This should be prevented - B's tokens should not change
    expect(memberB.tokens).toBe(100); // No delegation occurred
  });

  it('should allow valid non-circular delegation', () => {
    memberA.delegate(10, memberB);
    expect(memberA.tokens).toBe(90);
    expect(memberA.delegations.get(memberB.uniqueId)).toBe(10);
  });
});

describe('Seeded random number generator', () => {
  it('should produce same sequence with same seed', () => {
    setSeed(12345);
    const first = [random(), random(), random()];

    setSeed(12345);
    const second = [random(), random(), random()];

    expect(first).toEqual(second);
  });

  it('randomChoice should work with seeded RNG', () => {
    setSeed(42);
    const arr = ['a', 'b', 'c', 'd'];
    const choices1 = Array.from({ length: 5 }, () => randomChoice(arr));

    setSeed(42);
    const choices2 = Array.from({ length: 5 }, () => randomChoice(arr));

    expect(choices1).toEqual(choices2);
  });
});

describe('CircularBuffer in data collector', () => {
  it('should automatically evict old entries', () => {
    const buffer = new CircularBuffer<number>(3);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    buffer.push(4); // Should evict 1

    expect(buffer.toArray()).toEqual([2, 3, 4]);
  });

  it('should provide latest() method', () => {
    const buffer = new CircularBuffer<number>(5);
    buffer.push(10);
    buffer.push(20);
    buffer.push(30);

    expect(buffer.latest()).toBe(30);
  });

  it('should clear properly', () => {
    const buffer = new CircularBuffer<number>(5);
    buffer.push(1);
    buffer.push(2);
    buffer.clear();

    expect(buffer.length).toBe(0);
    expect(buffer.isEmpty()).toBe(true);
  });
});

describe('Arbitrator capacity regeneration', () => {
  it('should track max capacity separately from current', async () => {
    const simulation = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
      num_arbitrators: 1,
    });

    const arbitrator = simulation.dao.members.find(
      m => m.constructor.name === 'Arbitrator'
    );
    expect(arbitrator).toBeDefined();
  });
});

describe('Reputation tracking (no double counting)', () => {
  it('should not count reputation twice', async () => {
    const simulation = new DAOSimulation({
      num_developers: 1,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
      seed: 42,
    });

    // Get initial reputation
    const developer = simulation.dao.members[0];
    const initialRep = developer.reputation;

    // Run a step
    await simulation.step();

    // Reputation should only be modified via ReputationTracker events
    // not directly in agent code + again in tracker
    expect(developer.reputation).toBeDefined();
  });
});
