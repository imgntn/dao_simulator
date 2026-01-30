// Improved seeded random number generator
// Using Mulberry32 algorithm for better distribution and performance
//
// IMPORTANT FOR REPRODUCIBILITY:
// - Always call resetGlobalRandom() before starting a new simulation
// - Use setSeed() with a known seed for deterministic runs
// - Checkpoint/restore the random state for mid-simulation saves

export class SeededRandom {
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
    const u1 = this.next();
    const u2 = this.next();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }
}

/**
 * Global seeded random instance
 */
let globalRandom: SeededRandom | null = null;

/**
 * Track the current seed for checkpoint serialization
 */
let currentSeed: number | null = null;

/**
 * Set global random seed
 */
export function setSeed(seed: number): void {
  globalRandom = new SeededRandom(seed);
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
  currentSeed = newSeed;
}

/**
 * Clear the global random instance entirely.
 * After calling this, random() will fall back to Math.random().
 */
export function clearGlobalRandom(): void {
  globalRandom = null;
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

/**
 * Get seeded random number (0 to 1)
 * Falls back to Math.random if no seed is set
 */
export function random(): number {
  return globalRandom ? globalRandom.next() : Math.random();
}

/**
 * Get seeded random integer
 */
export function randomInt(min: number, max: number): number {
  return globalRandom ? globalRandom.nextInt(min, max) : Math.floor(Math.random() * (max - min) + min);
}

/**
 * Get seeded random float
 */
export function randomFloat(min: number, max: number): number {
  return globalRandom ? globalRandom.nextFloat(min, max) : Math.random() * (max - min) + min;
}

/**
 * Get seeded random boolean
 */
export function randomBool(probability: number = 0.5): boolean {
  return globalRandom ? globalRandom.nextBool(probability) : Math.random() < probability;
}

/**
 * Choose random element from array
 */
export function randomChoice<T>(array: T[]): T {
  return globalRandom ? globalRandom.choice(array) : array[Math.floor(Math.random() * array.length)];
}

/**
 * Shuffle array
 */
export function randomShuffle<T>(array: T[]): T[] {
  if (globalRandom) {
    return globalRandom.shuffle(array);
  }

  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
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
  if (globalRandom) {
    return globalRandom.nextGaussian(mean, stdDev);
  }

  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z0 * stdDev + mean;
}
