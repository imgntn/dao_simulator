import type { RunResult } from './experiment-config';

export function assertFiniteMetricRecord(
  metrics: Readonly<Record<string, number>>,
  context: string
): void {
  for (const [name, value] of Object.entries(metrics)) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(
        `${context}: metric "${name}" must be a finite number; received ${String(value)}`
      );
    }
  }
}

export function assertFiniteRunResults(
  results: readonly RunResult[],
  context: string
): void {
  for (const result of results) {
    assertFiniteMetricRecord(result.metrics, `${context}, run ${result.runId}`);
  }
}
