/**
 * LLM Response Cache
 *
 * Hash-based caching for LLM responses to enable reproducible experiments.
 * Same agent state + proposal → same cached response.
 * Supports in-memory operation with optional disk persistence.
 */

// Lazy fs loading - LLM cache disk ops are Node.js only.
// Uses Function constructor to hide require() from bundler static analysis.
let _fs: typeof import('fs') | null = null;
function getFs(): typeof import('fs') | null {
  if (_fs) return _fs;
  try {
    if (typeof window === 'undefined') {
      const _req = (globalThis as any).__nodeRequire;
      _fs = _req ? _req('fs') as typeof import('fs') : new Function('return require("fs")')() as typeof import('fs');
    }
  } catch {
    _fs = null;
  }
  return _fs;
}

import { logger } from '../utils/logger';

export interface CacheEntry {
  response: string;
  model: string;
  timestamp: number;
  /** Original key string for collision detection */
  rawKey?: string;
}

export class LLMResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private hits: number = 0;
  private misses: number = 0;

  /**
   * Generate a deterministic cache key from request parameters.
   * Returns [hash, rawKey] tuple for collision detection.
   */
  static makeKey(
    model: string,
    system: string,
    prompt: string,
    seed?: number,
    temperature?: number
  ): string {
    const raw = `${model}|${system}|${prompt}|${seed ?? ''}|${temperature ?? ''}`;
    // Use hash + length suffix to reduce collision probability
    return `${simpleHash(raw)}_${raw.length}`;
  }

  /**
   * Build the raw key string for collision detection
   */
  static makeRawKey(
    model: string,
    system: string,
    prompt: string,
    seed?: number,
    temperature?: number
  ): string {
    return `${model}|${system}|${prompt}|${seed ?? ''}|${temperature ?? ''}`;
  }

  /**
   * Look up a cached response
   */
  get(key: string, rawKey?: string): string | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      // Collision detection: if rawKey stored and doesn't match, treat as miss
      if (rawKey && entry.rawKey && entry.rawKey !== rawKey) {
        this.misses++;
        return undefined;
      }
      this.hits++;
      return entry.response;
    }
    this.misses++;
    return undefined;
  }

  /**
   * Store a response in the cache
   */
  set(key: string, response: string, model: string, rawKey?: string): void {
    this.cache.set(key, {
      response,
      model,
      timestamp: Date.now(),
      rawKey,
    });
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get cache statistics
   */
  get stats(): { hits: number; misses: number; hitRate: number; size: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      size: this.cache.size,
    };
  }

  /**
   * Reset statistics counters
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Save cache to disk as JSON
   */
  saveToDisk(filePath: string): void {
    const data: Record<string, CacheEntry> = {};
    for (const [key, entry] of this.cache) {
      data[key] = entry;
    }

    const fs = getFs();
    if (!fs) {
      logger.warn('LLM cache disk save unavailable (no fs module)');
      return;
    }

    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      logger.debug(`LLM cache saved: ${this.cache.size} entries to ${filePath}`);
    } catch (err) {
      logger.warn(`Failed to save LLM cache: ${err}`);
    }
  }

  /**
   * Load cache from disk
   */
  loadFromDisk(filePath: string): void {
    const fs = getFs();
    if (!fs) {
      logger.warn('LLM cache disk load unavailable (no fs module)');
      return;
    }

    if (!fs.existsSync(filePath)) {
      logger.debug(`LLM cache file not found: ${filePath}`);
      return;
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw) as Record<string, CacheEntry>;

      for (const [key, entry] of Object.entries(data)) {
        this.cache.set(key, entry);
      }

      logger.debug(`LLM cache loaded: ${this.cache.size} entries from ${filePath}`);
    } catch (err) {
      logger.warn(`Failed to load LLM cache: ${err}`);
    }
  }

  /**
   * Export cache as plain object (for archiving)
   */
  export(): Record<string, CacheEntry> {
    const data: Record<string, CacheEntry> = {};
    for (const [key, entry] of this.cache) {
      data[key] = entry;
    }
    return data;
  }

  /**
   * Import cache entries from a plain object
   */
  import(data: Record<string, CacheEntry>): void {
    for (const [key, entry] of Object.entries(data)) {
      this.cache.set(key, entry);
    }
  }
}

/**
 * Simple string hash function (FNV-1a inspired, returns hex string)
 */
function simpleHash(str: string): string {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) | 0; // FNV prime, keep as 32-bit int
  }
  // Convert to unsigned hex
  return (hash >>> 0).toString(16).padStart(8, '0');
}
