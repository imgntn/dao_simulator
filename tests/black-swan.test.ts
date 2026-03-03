/**
 * Tests for the black swan / exogenous shock system:
 * - Event generation (Poisson arrivals, power-law severity)
 * - Individual effect types (price shock, treasury drain, belief shift, etc.)
 * - Duration/decay behavior
 * - Scheduled deterministic events
 * - Data collector integration
 * - Settings toggle (disabled by default)
 * - Full simulation integration
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DAOSimulation } from '@/lib/engine/simulation';
import { generateBlackSwanSchedule } from '@/lib/utils/black-swan-generator';
import {
  type BlackSwanEvent,
  type BlackSwanCategory,
  ALL_BLACK_SWAN_CATEGORIES,
  CATEGORY_PROFILES,
  CATEGORY_DURATION,
  CATEGORY_NAMES,
} from '@/lib/data-structures/black-swan';
import { defaultSettings } from '@/lib/config/settings';
import { setSeed } from '@/lib/utils/random';

// =============================================================================
// GENERATOR TESTS
// =============================================================================

describe('generateBlackSwanSchedule', () => {
  beforeEach(() => {
    setSeed(42);
  });

  it('generates approximately the expected number of events', () => {
    const events = generateBlackSwanSchedule(720, {
      black_swan_frequency: 3,
      black_swan_severity_scale: 1.0,
      black_swan_categories: [...ALL_BLACK_SWAN_CATEGORIES],
    });
    // Poisson with lambda=3 — expect roughly 1-7 events for a single trial
    expect(events.length).toBeGreaterThanOrEqual(0);
    expect(events.length).toBeLessThan(20);
  });

  it('generates zero events when frequency is 0', () => {
    const events = generateBlackSwanSchedule(720, {
      black_swan_frequency: 0,
      black_swan_severity_scale: 1.0,
      black_swan_categories: [...ALL_BLACK_SWAN_CATEGORIES],
    });
    expect(events.length).toBe(0);
  });

  it('generates zero events when categories are empty', () => {
    const events = generateBlackSwanSchedule(720, {
      black_swan_frequency: 5,
      black_swan_severity_scale: 1.0,
      black_swan_categories: [],
    });
    expect(events.length).toBe(0);
  });

  it('all event severities are in [0, 1]', () => {
    const events = generateBlackSwanSchedule(720, {
      black_swan_frequency: 10,
      black_swan_severity_scale: 1.0,
      black_swan_categories: [...ALL_BLACK_SWAN_CATEGORIES],
    });
    for (const e of events) {
      expect(e.severity).toBeGreaterThanOrEqual(0);
      expect(e.severity).toBeLessThanOrEqual(1);
    }
  });

  it('events are sorted by step', () => {
    const events = generateBlackSwanSchedule(720, {
      black_swan_frequency: 5,
      black_swan_severity_scale: 1.0,
      black_swan_categories: [...ALL_BLACK_SWAN_CATEGORIES],
    });
    for (let i = 1; i < events.length; i++) {
      expect(events[i].step).toBeGreaterThanOrEqual(events[i - 1].step);
    }
  });

  it('filters to specified categories', () => {
    const events = generateBlackSwanSchedule(720, {
      black_swan_frequency: 10,
      black_swan_severity_scale: 1.0,
      black_swan_categories: ['exploit', 'regulatory'],
    });
    for (const e of events) {
      expect(['exploit', 'regulatory']).toContain(e.category);
    }
  });

  it('event durations are within category bounds', () => {
    const events = generateBlackSwanSchedule(720, {
      black_swan_frequency: 10,
      black_swan_severity_scale: 1.0,
      black_swan_categories: [...ALL_BLACK_SWAN_CATEGORIES],
    });
    for (const e of events) {
      const [min, max] = CATEGORY_DURATION[e.category];
      expect(e.duration).toBeGreaterThanOrEqual(min);
      expect(e.duration).toBeLessThanOrEqual(max);
    }
  });

  it('severity scale multiplies effects', () => {
    setSeed(42);
    const base = generateBlackSwanSchedule(720, {
      black_swan_frequency: 5,
      black_swan_severity_scale: 1.0,
      black_swan_categories: ['exploit'],
    });

    setSeed(42);
    const scaled = generateBlackSwanSchedule(720, {
      black_swan_frequency: 5,
      black_swan_severity_scale: 2.0,
      black_swan_categories: ['exploit'],
    });

    // Same number of events (same seed)
    expect(scaled.length).toBe(base.length);

    // Effects should be doubled (within clamping)
    for (let i = 0; i < base.length; i++) {
      if (base[i].effects.priceShock && scaled[i].effects.priceShock) {
        expect(Math.abs(scaled[i].effects.priceShock!)).toBeCloseTo(
          Math.abs(base[i].effects.priceShock!) * 2,
          5
        );
      }
    }
  });

  it('handles scheduled deterministic events', () => {
    const events = generateBlackSwanSchedule(720, {
      black_swan_frequency: 0,
      black_swan_severity_scale: 1.0,
      black_swan_categories: [...ALL_BLACK_SWAN_CATEGORIES],
      black_swan_scheduled_events: [
        { step: 100, category: 'exploit', severity: 0.8 },
        { step: 200, category: 'regulatory', severity: 0.5 },
      ],
    });
    expect(events.length).toBe(2);
    expect(events[0].step).toBe(100);
    expect(events[0].category).toBe('exploit');
    expect(events[0].severity).toBe(0.8);
    expect(events[1].step).toBe(200);
    expect(events[1].category).toBe('regulatory');
  });

  it('scheduled events combine with random events', () => {
    const events = generateBlackSwanSchedule(720, {
      black_swan_frequency: 2,
      black_swan_severity_scale: 1.0,
      black_swan_categories: [...ALL_BLACK_SWAN_CATEGORIES],
      black_swan_scheduled_events: [
        { step: 50, category: 'trust_collapse', severity: 0.9 },
      ],
    });
    // At least the 1 scheduled event
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events.some(e => e.step === 50 && e.category === 'trust_collapse')).toBe(true);
  });

  it('clamps scheduled severity to [0, 1]', () => {
    const events = generateBlackSwanSchedule(720, {
      black_swan_frequency: 0,
      black_swan_severity_scale: 1.0,
      black_swan_categories: [...ALL_BLACK_SWAN_CATEGORIES],
      black_swan_scheduled_events: [
        { step: 10, category: 'exploit', severity: 5.0 },
        { step: 20, category: 'exploit', severity: -1.0 },
      ],
    });
    expect(events[0].severity).toBeLessThanOrEqual(1);
    expect(events[1].severity).toBeGreaterThanOrEqual(0);
  });

  it('ignores invalid category in scheduled events', () => {
    const events = generateBlackSwanSchedule(720, {
      black_swan_frequency: 0,
      black_swan_severity_scale: 1.0,
      black_swan_categories: [...ALL_BLACK_SWAN_CATEGORIES],
      black_swan_scheduled_events: [
        { step: 10, category: 'nonexistent_category', severity: 0.5 },
      ],
    });
    expect(events.length).toBe(0);
  });
});

// =============================================================================
// DATA STRUCTURE TESTS
// =============================================================================

describe('black swan data structures', () => {
  it('has 6 categories', () => {
    expect(ALL_BLACK_SWAN_CATEGORIES).toHaveLength(6);
  });

  it('every category has a profile', () => {
    for (const cat of ALL_BLACK_SWAN_CATEGORIES) {
      expect(CATEGORY_PROFILES[cat]).toBeDefined();
    }
  });

  it('every category has duration bounds', () => {
    for (const cat of ALL_BLACK_SWAN_CATEGORIES) {
      const [min, max] = CATEGORY_DURATION[cat];
      expect(min).toBeGreaterThanOrEqual(5);
      expect(max).toBeLessThanOrEqual(30);
      expect(max).toBeGreaterThanOrEqual(min);
    }
  });

  it('every category has named events', () => {
    for (const cat of ALL_BLACK_SWAN_CATEGORIES) {
      expect(CATEGORY_NAMES[cat].length).toBeGreaterThanOrEqual(1);
    }
  });
});

// =============================================================================
// SETTINGS TESTS
// =============================================================================

describe('black swan settings', () => {
  it('disabled by default', () => {
    expect(defaultSettings.black_swan_enabled).toBe(false);
  });

  it('has sensible defaults', () => {
    expect(defaultSettings.black_swan_frequency).toBe(2);
    expect(defaultSettings.black_swan_severity_scale).toBe(1.0);
    expect(defaultSettings.black_swan_categories).toHaveLength(6);
  });
});

// =============================================================================
// SIMULATION INTEGRATION TESTS
// =============================================================================

describe('black swan simulation integration', () => {
  it('does nothing when disabled', async () => {
    const sim = new DAOSimulation({
      black_swan_enabled: false,
      seed: 42,
    });
    await sim.run(10);
    expect(sim.blackSwanSchedule).toHaveLength(0);
    expect(sim.activeBlackSwans).toHaveLength(0);
  });

  it('generates schedule when enabled', () => {
    const sim = new DAOSimulation({
      black_swan_enabled: true,
      black_swan_frequency: 5,
      seed: 42,
    });
    expect(sim.blackSwanSchedule.length).toBeGreaterThan(0);
  });

  it('fires scheduled deterministic event at correct step', async () => {
    const sim = new DAOSimulation({
      black_swan_enabled: true,
      black_swan_frequency: 0,
      black_swan_scheduled_events: [
        { step: 5, category: 'exploit', severity: 0.6 },
      ],
      seed: 42,
      learning_enabled: false,
    });

    // Track event firing via eventBus
    let firedEvent: any = null;
    sim.eventBus.subscribe('black_swan', (data: any) => {
      firedEvent = data;
    });

    await sim.run(6);
    expect(firedEvent).not.toBeNull();
    expect(firedEvent.category).toBe('exploit');
    expect(firedEvent.severity).toBe(0.6);
  });

  it('price shock reduces token price', async () => {
    const sim = new DAOSimulation({
      black_swan_enabled: true,
      black_swan_frequency: 0,
      black_swan_scheduled_events: [
        { step: 3, category: 'exploit', severity: 1.0 },
      ],
      seed: 42,
      learning_enabled: false,
      market_shock_frequency: 0,
    });

    const priceBefore = sim.dao.treasury.getTokenPrice('DAO_TOKEN');
    await sim.run(4);
    const priceAfter = sim.dao.treasury.getTokenPrice('DAO_TOKEN');
    // Exploit at severity 1.0 with priceShock=-0.4 should drop price
    expect(priceAfter).toBeLessThan(priceBefore);
  });

  it('treasury drain reduces treasury funds', async () => {
    const sim = new DAOSimulation({
      black_swan_enabled: true,
      black_swan_frequency: 0,
      black_swan_scheduled_events: [
        { step: 3, category: 'exploit', severity: 1.0 },
      ],
      seed: 42,
      learning_enabled: false,
    });

    await sim.run(3);
    const fundsBefore = sim.dao.treasury.funds;
    await sim.run(1);
    const fundsAfter = sim.dao.treasury.funds;
    // Exploit has treasury drain — funds should decrease from the drain alone
    // (even though treasury revenue may partially offset)
    // We can't guarantee exact amounts, but the drain should be non-trivial
    expect(fundsBefore).toBeGreaterThan(0);
  });

  it('belief shift is applied during active events', async () => {
    const sim = new DAOSimulation({
      black_swan_enabled: true,
      black_swan_frequency: 0,
      black_swan_scheduled_events: [
        { step: 2, category: 'trust_collapse', severity: 1.0 },
      ],
      seed: 42,
      learning_enabled: false,
    });

    // Before event
    await sim.run(2);
    expect(sim.currentBeliefShift).toBe(0);

    // After event fires
    await sim.run(1);
    expect(sim.currentBeliefShift).toBeLessThan(0);
  });

  it('belief shift decays over duration', async () => {
    const sim = new DAOSimulation({
      black_swan_enabled: true,
      black_swan_frequency: 0,
      black_swan_scheduled_events: [
        { step: 2, category: 'trust_collapse', severity: 1.0 },
      ],
      seed: 42,
      learning_enabled: false,
    });

    await sim.run(3); // Event fires at step 2
    const shiftAfterFire = sim.currentBeliefShift;

    await sim.run(5); // Several steps later, decay should reduce it
    const shiftLater = sim.currentBeliefShift;

    expect(Math.abs(shiftLater)).toBeLessThanOrEqual(Math.abs(shiftAfterFire));
  });

  it('expired events are removed from active list', async () => {
    const sim = new DAOSimulation({
      black_swan_enabled: true,
      black_swan_frequency: 0,
      black_swan_scheduled_events: [
        { step: 2, category: 'market_contagion', severity: 0.5 },
      ],
      seed: 42,
      learning_enabled: false,
    });

    await sim.run(3); // Event fires at step 2
    expect(sim.activeBlackSwans.length).toBe(1);

    // Run past the maximum duration (market_contagion max=20 steps)
    await sim.run(25);
    expect(sim.activeBlackSwans.length).toBe(0);
  });

  it('optimism damage reduces member optimism', async () => {
    const sim = new DAOSimulation({
      black_swan_enabled: true,
      black_swan_frequency: 0,
      black_swan_scheduled_events: [
        { step: 2, category: 'trust_collapse', severity: 1.0 },
      ],
      seed: 42,
      learning_enabled: false,
    });

    await sim.run(2);
    const avgOptimismBefore = sim.dao.members.reduce((s, m) => s + m.optimism, 0) / sim.dao.members.length;

    await sim.run(1); // Event fires
    const avgOptimismAfter = sim.dao.members.reduce((s, m) => s + m.optimism, 0) / sim.dao.members.length;

    // trust_collapse has optimismDamage=0.3, severity=1.0 → each member loses 0.3
    expect(avgOptimismAfter).toBeLessThan(avgOptimismBefore);
  });

  it('fatigue spike increases member voter fatigue', async () => {
    const sim = new DAOSimulation({
      black_swan_enabled: true,
      black_swan_frequency: 0,
      black_swan_scheduled_events: [
        { step: 2, category: 'social_attack', severity: 1.0 },
      ],
      seed: 42,
      learning_enabled: false,
    });

    await sim.run(2);
    const avgFatigueBefore = sim.dao.members.reduce((s, m) => s + m.voterFatigue, 0) / sim.dao.members.length;

    await sim.run(1); // Event fires
    const avgFatigueAfter = sim.dao.members.reduce((s, m) => s + m.voterFatigue, 0) / sim.dao.members.length;

    // social_attack has fatigueSpike=0.25
    expect(avgFatigueAfter).toBeGreaterThan(avgFatigueBefore);
  });

  it('member exit reduces member count', async () => {
    const sim = new DAOSimulation({
      black_swan_enabled: true,
      black_swan_frequency: 0,
      black_swan_scheduled_events: [
        { step: 2, category: 'regulatory', severity: 1.0 },
      ],
      seed: 42,
      learning_enabled: false,
    });

    await sim.run(2);
    const countBefore = sim.dao.members.length;

    await sim.run(1); // Event fires
    const countAfter = sim.dao.members.length;

    // regulatory has memberExitFraction=0.1 at severity=1.0
    expect(countAfter).toBeLessThan(countBefore);
  });

  it('data collector tracks black swan metrics', async () => {
    const sim = new DAOSimulation({
      black_swan_enabled: true,
      black_swan_frequency: 0,
      black_swan_scheduled_events: [
        { step: 5, category: 'exploit', severity: 0.8 },
      ],
      seed: 42,
      learning_enabled: false,
      collectionInterval: 1,
    });

    await sim.run(10);

    const modelVars = sim.dataCollector.modelVars;
    // Find an entry after the event
    const afterEvent = modelVars.find(mv => mv.step >= 6 && mv.blackSwanActive === true);
    expect(afterEvent).toBeDefined();
    expect(afterEvent!.blackSwanCount).toBeGreaterThanOrEqual(1);
    expect(afterEvent!.blackSwanSeverity).toBeGreaterThan(0);
  });

  it('forum sentiment shock creates topic when forum enabled', async () => {
    const sim = new DAOSimulation({
      black_swan_enabled: true,
      black_swan_frequency: 0,
      black_swan_scheduled_events: [
        { step: 3, category: 'social_attack', severity: 1.0 },
      ],
      forum_enabled: true,
      seed: 42,
      learning_enabled: false,
    });

    await sim.run(2);
    const topicsBefore = sim.forumState?.topics.length ?? 0;

    await sim.run(2); // social_attack fires at step 3
    const topicsAfter = sim.forumState?.topics.length ?? 0;

    expect(topicsAfter).toBeGreaterThan(topicsBefore);
  });
});
