// Black Swan Event Generator
// Generates exogenous shock schedules with Poisson arrivals and power-law severity

import {
  type BlackSwanEvent,
  type BlackSwanCategory,
  type BlackSwanEffects,
  ALL_BLACK_SWAN_CATEGORIES,
  CATEGORY_PROFILES,
  CATEGORY_DURATION,
  CATEGORY_NAMES,
} from '../data-structures/black-swan';
import { random } from './random';

interface ScheduledEventInput {
  step: number;
  category: string;
  severity: number;
}

interface BlackSwanSettings {
  black_swan_frequency: number;
  black_swan_severity_scale: number;
  black_swan_categories: string[];
  black_swan_scheduled_events?: ScheduledEventInput[];
}

/**
 * Sample from a power-law distribution (many mild events, few catastrophic).
 * Uses inverse CDF: severity = U^(1/alpha) where alpha > 1 concentrates near 0.
 * Alpha=3 gives ~87% of events below 0.5 severity.
 */
function samplePowerLawSeverity(alpha: number = 3): number {
  const u = random();
  return Math.pow(u, 1 / alpha);
}

/**
 * Sample an integer uniformly in [min, max] (inclusive).
 */
function sampleIntRange(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

/**
 * Pick a random element from an array.
 */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

/**
 * Scale a base effects profile by severity and global scale.
 * Returns a new effects object with all values scaled proportionally.
 */
function scaleEffects(
  base: BlackSwanEffects,
  severity: number,
  scale: number
): BlackSwanEffects {
  const result: BlackSwanEffects = {};
  const s = severity * scale;

  if (base.priceShock !== undefined) result.priceShock = base.priceShock * s;
  if (base.treasuryDrain !== undefined) result.treasuryDrain = Math.min(1, base.treasuryDrain * s);
  if (base.beliefShift !== undefined) result.beliefShift = Math.max(-1, base.beliefShift * s);
  if (base.fatigueSpike !== undefined) result.fatigueSpike = Math.min(1, base.fatigueSpike * s);
  if (base.optimismDamage !== undefined) result.optimismDamage = Math.min(1, base.optimismDamage * s);
  if (base.participationDrop !== undefined) result.participationDrop = Math.min(1, base.participationDrop * s);
  if (base.forumSentimentShock !== undefined) result.forumSentimentShock = Math.max(-1, base.forumSentimentShock * s);
  if (base.memberExitFraction !== undefined) result.memberExitFraction = Math.min(1, base.memberExitFraction * s);

  return result;
}

/**
 * Generate a black swan event schedule using Poisson process arrivals.
 *
 * @param totalSteps - Total simulation steps
 * @param settings - Black swan configuration
 * @returns Array of scheduled black swan events
 */
export function generateBlackSwanSchedule(
  totalSteps: number,
  settings: BlackSwanSettings
): BlackSwanEvent[] {
  const events: BlackSwanEvent[] = [];

  // Process deterministic scheduled events first
  if (settings.black_swan_scheduled_events) {
    for (const scheduled of settings.black_swan_scheduled_events) {
      const category = scheduled.category as BlackSwanCategory;
      if (!ALL_BLACK_SWAN_CATEGORIES.includes(category)) continue;

      const severity = Math.max(0, Math.min(1, scheduled.severity));
      const baseProfile = CATEGORY_PROFILES[category];
      const [durMin, durMax] = CATEGORY_DURATION[category];
      const duration = sampleIntRange(durMin, durMax);
      const names = CATEGORY_NAMES[category];

      events.push({
        id: `bs_sched_${events.length}`,
        category,
        name: pickRandom(names),
        step: scheduled.step,
        severity,
        duration,
        effects: scaleEffects(baseProfile, severity, settings.black_swan_severity_scale),
      });
    }
  }

  // Generate random events via Poisson process
  // Expected events per 720 steps = black_swan_frequency
  // Rate per step = frequency / 720
  const normalizedRate = settings.black_swan_frequency / 720;

  // Filter to allowed categories
  const allowedCategories = settings.black_swan_categories
    .filter(c => ALL_BLACK_SWAN_CATEGORIES.includes(c as BlackSwanCategory)) as BlackSwanCategory[];

  if (allowedCategories.length === 0 || normalizedRate <= 0) {
    return events;
  }

  // Walk through steps, sampling Poisson arrivals
  for (let step = 0; step < totalSteps; step++) {
    if (random() < normalizedRate) {
      const category = pickRandom(allowedCategories);
      const severity = samplePowerLawSeverity();
      const baseProfile = CATEGORY_PROFILES[category];
      const [durMin, durMax] = CATEGORY_DURATION[category];
      const duration = sampleIntRange(durMin, durMax);
      const names = CATEGORY_NAMES[category];

      events.push({
        id: `bs_rand_${events.length}`,
        category,
        name: pickRandom(names),
        step,
        severity,
        duration,
        effects: scaleEffects(baseProfile, severity, settings.black_swan_severity_scale),
      });
    }
  }

  // Sort by step
  events.sort((a, b) => a.step - b.step);

  return events;
}
