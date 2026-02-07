// Statistical utility functions
// Port from utils/stats.py

import type { DAOMember } from '../agents/base';

/**
 * Calculate Gini coefficient for a list of values
 */
export function gini(values: number[]): number {
  if (!values || values.length === 0) {
    return 0.0;
  }

  // Filter out negative values and sort
  const arr = values.filter((v) => v >= 0).sort((a, b) => a - b);
  const n = arr.length;

  if (n === 0) {
    return 0.0;
  }

  const total = arr.reduce((sum, v) => sum + v, 0);

  if (total === 0) {
    return 0.0;
  }

  // Calculate Gini coefficient
  let cum = 0;
  for (let i = 0; i < n; i++) {
    cum += (i + 1) * arr[i];
  }

  return Math.max(0, Math.min(1, (2.0 * cum) / (n * total) - (n + 1) / n));
}

/**
 * Compute in-degree centrality for members based on delegation
 */
export function inDegreeCentrality(members: DAOMember[]): Map<string, number> {
  const n = members.length;

  if (n <= 1) {
    const result = new Map<string, number>();
    members.forEach((m) => result.set(m.uniqueId, 0.0));
    return result;
  }

  // Count how many members delegate to each member
  const counts = new Map<string, number>();
  members.forEach((m) => counts.set(m.uniqueId, 0));

  for (const member of members) {
    const rep = (member as any).representative;
    if (rep && rep.uniqueId) {
      const current = counts.get(rep.uniqueId) || 0;
      counts.set(rep.uniqueId, current + 1);
    }
  }

  // Normalize by (n - 1)
  const scale = 1.0 / (n - 1);
  const result = new Map<string, number>();

  counts.forEach((count, uid) => {
    result.set(uid, count * scale);
  });

  return result;
}

/**
 * Calculate mean of an array of numbers
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate median of an array of numbers
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

/**
 * Calculate standard deviation of an array of numbers
 */
export function standardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;

  const avg = mean(values);
  const squareDiffs = values.map((v) => (v - avg) ** 2);
  const variance = squareDiffs.reduce((sum, d) => sum + d, 0) / (values.length - 1);

  return Math.sqrt(variance);
}

/**
 * Calculate percentile of an array of numbers
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  if (p < 0 || p > 100) throw new Error('Percentile must be between 0 and 100');

  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower];
  }

  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}
