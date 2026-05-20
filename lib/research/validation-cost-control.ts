/**
 * Cost-control helpers for the validation loop.
 *
 *   - getValidationWorkerCount(): caps WorkerPool size when process.env.CI is set.
 *   - adaptiveEpisodeCount(): given a DAO's history in history.jsonl, returns a
 *     suggested episode count (between 5 and 15) — shrinks for stable DAOs,
 *     grows for noisy ones.
 *   - setupValidationLlmCache(): wires LLMResponseCache to a disk-backed file
 *     at results/validation/llm-cache/cache.json, keyed by canonical seed.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LLMResponseCache } from '../llm/response-cache';
import { logger } from '../utils/logger';
import {
  ValidationRunSchema,
  type ValidationRun,
} from './baseline-schema';
import { DAO_SUITE_CONFIG } from './baseline-config';

const MIN_EPISODES = 5;
const MAX_EPISODES = 15;
const STABILITY_HISTORY = 10;
const STABLE_SCORE_THRESHOLD = 0.95;
const STABLE_STDDEV_THRESHOLD = 0.01;
const NOISY_STDDEV_THRESHOLD = 0.04;

/**
 * Recommended worker count for the validation loop.
 * In CI, cap to 2 workers to avoid OOM on shared runners.
 */
export function getValidationWorkerCount(): number {
  if (process.env.CI) return Math.min(2, Math.max(1, os.cpus().length - 1));
  return Math.max(1, os.cpus().length - 1);
}

/**
 * Read the last N runs for a DAO from history.jsonl.
 */
export function readDaoHistory(historyPath: string, daoId: string, limit: number = STABILITY_HISTORY): number[] {
  if (!fs.existsSync(historyPath)) return [];
  const lines = fs.readFileSync(historyPath, 'utf-8').split('\n').filter((s) => s.trim().length > 0);
  const scores: number[] = [];
  for (let i = lines.length - 1; i >= 0 && scores.length < limit; i--) {
    try {
      const parsed = ValidationRunSchema.safeParse(JSON.parse(lines[i]));
      if (!parsed.success) continue;
      const r = parsed.data.perDao[daoId];
      if (r) scores.push(r.score);
    } catch {
      continue;
    }
  }
  return scores;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = values.reduce((a, b) => a + b, 0) / values.length;
  const v = values.reduce((s, x) => s + (x - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(v);
}

/**
 * Suggest an episode count for a DAO based on its recent history.
 *
 *   - Stable (score ≥ 0.95, stdDev ≤ 0.01): drop to MIN_EPISODES.
 *   - Noisy (stdDev ≥ 0.04): raise to MAX_EPISODES.
 *   - Otherwise: keep the configured default.
 */
export function adaptiveEpisodeCount(historyPath: string, daoId: string): number {
  const defaultEpisodes = DAO_SUITE_CONFIG[daoId]?.episodes ?? 10;
  const history = readDaoHistory(historyPath, daoId);
  if (history.length < STABILITY_HISTORY) return defaultEpisodes;

  const mean = history.reduce((a, b) => a + b, 0) / history.length;
  const sd = stdDev(history);

  if (mean >= STABLE_SCORE_THRESHOLD && sd <= STABLE_STDDEV_THRESHOLD) {
    logger.info(`adaptive: ${daoId} stable (mean=${mean.toFixed(3)}, sd=${sd.toFixed(3)}) → ${MIN_EPISODES} episodes`);
    return MIN_EPISODES;
  }
  if (sd >= NOISY_STDDEV_THRESHOLD) {
    logger.info(`adaptive: ${daoId} noisy (sd=${sd.toFixed(3)}) → ${MAX_EPISODES} episodes`);
    return MAX_EPISODES;
  }
  return defaultEpisodes;
}

/**
 * Set up a disk-backed LLMResponseCache for the validation loop.
 * Cache lives under results/validation/llm-cache/. Returns the cache
 * instance and a flush() callback the validator should call when done.
 */
export function setupValidationLlmCache(rootDir: string = process.cwd()): {
  cache: LLMResponseCache;
  flush: () => void;
  path: string;
} {
  const dir = path.join(rootDir, 'results', 'validation', 'llm-cache');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const cachePath = path.join(dir, 'cache.json');

  const cache = new LLMResponseCache();
  if (fs.existsSync(cachePath)) {
    try {
      cache.loadFromDisk(cachePath);
      logger.info(`llm-cache: loaded ${cache.stats.size} entries from ${cachePath}`);
    } catch (err) {
      logger.warn(`llm-cache: load failed (${(err as Error).message}), starting empty`);
    }
  }

  const flush = (): void => {
    try {
      cache.saveToDisk(cachePath);
      logger.info(`llm-cache: persisted ${cache.stats.size} entries (hits=${cache.stats.hits}, misses=${cache.stats.misses})`);
    } catch (err) {
      logger.warn(`llm-cache: save failed (${(err as Error).message})`);
    }
  };

  return { cache, flush, path: cachePath };
}
