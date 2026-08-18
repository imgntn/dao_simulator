// Improved seeded random number generator
// Using Mulberry32 algorithm for better distribution and performance
//
// IMPORTANT FOR REPRODUCIBILITY:
// - Always call resetGlobalRandom() before starting a new simulation
// - Use setSeed() with a known seed for deterministic runs
// - Checkpoint/restore the random state for mid-simulation saves

export interface RandomSource {
  next(): number;
  nextInt(min: number, max: number): number;
  nextFloat(min: number, max: number): number;
  nextBool(probability?: number): boolean;
  choice<T>(array: T[]): T;
  shuffle<T>(array: T[]): T[];
  nextGaussian(mean?: number, stdDev?: number): number;
}

export const SEED_DERIVATION_SCHEMA_VERSION = 1;

export function deriveSeed(parentSeed: number, streamId: string): number {
  let hash = (2166136261 ^ (parentSeed >>> 0) ^ SEED_DERIVATION_SCHEMA_VERSION) >>> 0;
  for (let index = 0; index < streamId.length; index++) {
    hash ^= streamId.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash || 1;
}

export class SeededRandom implements RandomSource {
  private state: number;
  private initialSeed: number;

  constructor(seed: number) {
    this.state = seed;
    this.initialSeed = seed;
  }

  /**
   * Reset to initial seed state for reproducibility
   */
  reset(): void {
    this.state = this.initialSeed;
  }

  /**
   * Get current internal state for serialization
   */
  getState(): number {
    return this.state;
  }

  /**
   * Restore internal state from serialized value
   */
  setState(state: number): void {
    this.state = state;
  }

  /**
   * Get the initial seed used to create this generator
   */
  getSeed(): number {
    return this.initialSeed;
  }

  /**
   * Mulberry32 algorithm - fast, high-quality PRNG
   * Returns a random float between 0 and 1
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns random integer between min (inclusive) and max (exclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min) + min);
  }

  /**
   * Returns random float between min and max
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * Returns true with given probability (0 to 1)
   */
  nextBool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Returns random element from array
   */
  choice<T>(array: T[]): T {
    return array[this.nextInt(0, array.length)];
  }

  /**
   * Shuffle array in place using Fisher-Yates algorithm
   */
  shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Returns normal (Gaussian) distributed random number
   * Using Box-Muller transform
   */
  nextGaussian(mean: number = 0, stdDev: number = 1): number {
    const u1 = Math.max(Number.EPSILON, this.next());
    const u2 = this.next();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }
}

export interface RandomStreamState {
  seed: number;
  state: number;
}

export class RandomStreamRegistry {
  private streams = new Map<string, SeededRandom>();

  constructor(
    private readonly parentSeed: number,
    private readonly namespace: string = 'simulation'
  ) {}

  get(streamId: string): SeededRandom {
    const qualifiedId = `${this.namespace}:${streamId}`;
    let stream = this.streams.get(qualifiedId);
    if (!stream) {
      stream = new SeededRandom(deriveSeed(this.parentSeed, qualifiedId));
      this.streams.set(qualifiedId, stream);
    }
    return stream;
  }

  getDerivedSeeds(streamIds: string[]): Record<string, number> {
    return Object.fromEntries(
      [...streamIds].sort().map(id => [
        id,
        deriveSeed(this.parentSeed, `${this.namespace}:${id}`),
      ])
    );
  }

  getState(): Record<string, RandomStreamState> {
    return Object.fromEntries(
      [...this.streams.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, stream]) => [
          id,
          { seed: stream.getSeed(), state: stream.getState() },
        ])
    );
  }

  setState(state: Record<string, RandomStreamState>): void {
    this.streams.clear();
    for (const [id, saved] of Object.entries(state).sort(([a], [b]) => a.localeCompare(b))) {
      const stream = new SeededRandom(saved.seed);
      stream.setState(saved.state);
      this.streams.set(id, stream);
    }
  }
}

/**
 * Global seeded random instance
 */
let globalRandom: SeededRandom | null = null;
let activeRandomSource: RandomSource | null = null;

/**
 * Track the current seed for checkpoint serialization
 */
let currentSeed: number | null = null;

/**
 * Set global random seed
 */
export function setSeed(seed: number): void {
  globalRandom = new SeededRandom(seed);
  activeRandomSource = null;
  currentSeed = seed;
}

/**
 * Reset global random state to a fresh instance with a new seed.
 * CRITICAL: Call this before starting a new simulation to ensure determinism.
 * Without this, state from previous simulations can affect new runs.
 */
export function resetGlobalRandom(seed?: number): void {
  const newSeed = seed ?? Date.now();
  globalRandom = new SeededRandom(newSeed);
  activeRandomSource = null;
  currentSeed = newSeed;
}

/**
 * Clear the global random instance entirely.
 * After calling this, random() will fall back to Math.random().
 */
export function clearGlobalRandom(): void {
  globalRandom = null;
  activeRandomSource = null;
  currentSeed = null;
}

/**
 * Check if a seeded random generator is active
 */
export function isSeeded(): boolean {
  return globalRandom !== null;
}

/**
 * Get the current seed (for checkpoint serialization)
 */
export function getCurrentSeed(): number | null {
  return currentSeed;
}

/**
 * Get the current RNG state (for checkpoint serialization)
 * Returns null if no seeded random is active
 */
export function getRandomState(): { seed: number; state: number } | null {
  if (!globalRandom || currentSeed === null) {
    return null;
  }
  return {
    seed: currentSeed,
    state: globalRandom.getState(),
  };
}

/**
 * Restore RNG state from a checkpoint
 * This ensures simulation continues from exact same random state
 */
export function setRandomState(state: { seed: number; state: number }): void {
  globalRandom = new SeededRandom(state.seed);
  globalRandom.setState(state.state);
  currentSeed = state.seed;
}

export function withRandomSource<T>(source: RandomSource, action: () => T): T {
  const previous = activeRandomSource;
  activeRandomSource = source;
  try {
    const result = action();
    if (result && typeof (result as { then?: unknown }).then === 'function') {
      throw new Error('withRandomSource only supports synchronous actions');
    }
    return result;
  } finally {
    activeRandomSource = previous;
  }
}

/**
 * Get seeded random number (0 to 1)
 * Falls back to Math.random if no seed is set
 */
export function random(): number {
  if (activeRandomSource) return activeRandomSource.next();
  if (globalRandom) return globalRandom.next();
  const strictResearchMode = typeof process !== 'undefined'
    && process.env?.DAO_SIM_RESEARCH_MODE === '1';
  if (strictResearchMode) {
    throw new Error('Unseeded randomness is prohibited in research mode');
  }
  return Math.random();
}

/**
 * Get seeded random integer
 */
export function randomInt(min: number, max: number): number {
  if (activeRandomSource) return activeRandomSource.nextInt(min, max);
  return globalRandom ? globalRandom.nextInt(min, max) : Math.floor(random() * (max - min) + min);
}

/**
 * Get seeded random float
 */
export function randomFloat(min: number, max: number): number {
  if (activeRandomSource) return activeRandomSource.nextFloat(min, max);
  return globalRandom ? globalRandom.nextFloat(min, max) : random() * (max - min) + min;
}

/**
 * Get seeded random boolean
 */
export function randomBool(probability: number = 0.5): boolean {
  if (activeRandomSource) return activeRandomSource.nextBool(probability);
  return globalRandom ? globalRandom.nextBool(probability) : random() < probability;
}

/**
 * Choose random element from array
 */
export function randomChoice<T>(array: T[]): T {
  if (activeRandomSource) return activeRandomSource.choice(array);
  return globalRandom ? globalRandom.choice(array) : array[Math.floor(random() * array.length)];
}

/**
 * Shuffle array
 */
export function randomShuffle<T>(array: T[]): T[] {
  if (activeRandomSource) {
    return activeRandomSource.shuffle(array);
  }
  if (globalRandom) {
    return globalRandom.shuffle(array);
  }

  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Weighted random choice from an array of items with weights
 */
export function weightedRandomChoice<T extends { weight: number }>(items: T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let r = random() * totalWeight;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

/**
 * Get Gaussian distributed random number
 */
export function randomGaussian(mean: number = 0, stdDev: number = 1): number {
  if (activeRandomSource) {
    return activeRandomSource.nextGaussian(mean, stdDev);
  }
  if (globalRandom) {
    return globalRandom.nextGaussian(mean, stdDev);
  }

  const u1 = Math.max(Number.EPSILON, random());
  const u2 = random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z0 * stdDev + mean;
}

/**
 * Generate Pareto-distributed random value (power-law distribution)
 * Used for realistic token distributions matching real DAO wealth concentration
 *
 * @param alpha - Shape parameter (higher = more equal, lower = more concentrated)
 *                Real DAOs typically have alpha ~1.5-2.5
 *                alpha=2.0 gives Gini ~0.67, alpha=1.5 gives Gini ~0.80
 * @param xMin - Minimum value (scale parameter)
 * @returns Random value following Pareto distribution
 */
export function randomPareto(alpha: number = 2.0, xMin: number = 1): number {
  const u = random();
  // Inverse transform sampling: x = xMin / u^(1/alpha)
  return xMin / Math.pow(u, 1 / alpha);
}

/**
 * Generate token amounts following power-law distribution
 * Calibrated to match real DAO token distributions (Gini 0.70-0.90)
 *
 * @param baseTokens - Base token amount for median holder
 * @param alpha - Power-law exponent (default 2.0 for Gini ~0.67)
 * @returns Token amount following realistic distribution
 */
export function randomPowerLawTokens(baseTokens: number = 100, alpha: number = 2.0): number {
  // Generate Pareto-distributed multiplier
  const multiplier = randomPareto(alpha, 1);
  // Cap at reasonable maximum (100x base) to avoid extreme outliers
  const cappedMultiplier = Math.min(multiplier, 100);
  return Math.round(baseTokens * cappedMultiplier);
}
