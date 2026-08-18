import type { RunResult } from './experiment-config';
import { canonicalJson, sha256 } from './campaign-manifest';

export interface PlannedRunIdentity {
  runId: string;
  conditionId: string;
  replicateIndex: number;
  seed: number;
}

export function campaignRunConditionId(result: RunResult): string {
  return result.conditionId ?? campaignConditionId(result.sweepValue, result.config);
}

export function assertRunMatchesPlan(
  result: RunResult,
  planned: PlannedRunIdentity,
): void {
  if (result.runId !== planned.runId) {
    throw new Error(`Run identifier differs from plan: ${result.runId}`);
  }
  if (campaignRunConditionId(result) !== planned.conditionId) {
    throw new Error(`Run condition differs from plan: ${result.runId}`);
  }
  if (result.runIndex !== planned.replicateIndex) {
    throw new Error(`Run replicate differs from plan: ${result.runId}`);
  }
  if (result.seed !== planned.seed) {
    throw new Error(`Run seed differs from plan: ${result.runId}`);
  }
}

export function campaignConditionId(
  sweepValue: RunResult['sweepValue'],
  config: unknown,
): string {
  return `condition-${sha256(canonicalJson({
    sweepValue,
    config: conditionConfigProjection(config),
  })).slice(0, 16)}`;
}

function conditionConfigProjection(config: unknown): unknown {
  if (!config || typeof config !== 'object') return config;
  const projected = structuredClone(config) as Record<string, unknown>;
  for (const runSpecificField of [
    'seed',
    'rngStreamId',
    'csvFilename',
    'eventLogFilename',
    'reportFile',
  ]) {
    delete projected[runSpecificField];
  }
  return projected;
}
