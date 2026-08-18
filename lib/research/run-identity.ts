import type { ExperimentConfig } from './experiment-config';
import { canonicalJson, sha256 } from './campaign-manifest';
import { SEED_DERIVATION_SCHEMA_VERSION } from '../utils/random';

export const RUN_IDENTITY_SCHEMA_VERSION = '2.0.0';

function compactSweepPart(sweepValue: string): string {
  const sanitized = sweepValue.replace(/[^a-zA-Z0-9._=-]+/g, '_');
  if (sanitized.length <= 80) return sanitized;
  return `sweep_${sha256(sanitized).slice(0, 16)}`;
}

/**
 * Build a readable run ID whose suffix binds the resolved experiment identity,
 * condition, replicate, and versioned seed derivation. The SHA-256 suffix
 * prevents collisions between similarly named but scientifically distinct runs.
 */
export function buildStableRunId(
  config: ExperimentConfig,
  sweepValue: number | string | boolean | undefined,
  runIndexWithinSweep: number
): string {
  const experimentId = config.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const sweepPart = sweepValue === undefined
    ? ''
    : `-${compactSweepPart(String(sweepValue).replace(/\./g, '_'))}`;
  const runPart = `run-${String(runIndexWithinSweep + 1).padStart(3, '0')}`;
  const identity = sha256(canonicalJson({
    schemaVersion: RUN_IDENTITY_SCHEMA_VERSION,
    seedDerivationSchemaVersion: SEED_DERIVATION_SCHEMA_VERSION,
    experimentConfigSha256: sha256(canonicalJson(config)),
    sweepValue: sweepValue ?? null,
    replicateIndex: runIndexWithinSweep,
  })).slice(0, 16);
  return `${experimentId}${sweepPart}-${runPart}-id-${identity}`;
}
