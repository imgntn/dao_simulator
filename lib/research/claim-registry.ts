import { getMetricDefinition } from './metric-registry';

export const CLAIM_REGISTRY_SCHEMA_VERSION = '1.0.0';

export type ClaimStatus =
  | 'supported-practically-important'
  | 'equivalent-within-declared-margin'
  | 'statistically-detectable-below-practical-threshold'
  | 'inconclusive';

export interface QuantitativeClaim {
  id: string;
  campaignId: string;
  experimentId: string;
  researchQuestionIds: string[];
  classification: string;
  status: ClaimStatus;
  text: string;
  estimand: {
    type: 'paired_mean_difference';
    conditionA: string;
    conditionB: string;
    experimentalUnit: string;
    nPairs: number;
  };
  outcome: {
    metricId: string;
    metricName: string;
    metricDefinitionVersion: string;
  };
  estimate: {
    value: number;
    confidenceInterval: { lower: number; upper: number; level: number };
    rawPValue: number;
    adjustedPValue: number;
    correctionMethod: string;
    effectSizeCohensDz: number | null;
    practicalEquivalenceInterval: { lower: number; upper: number };
  };
  source: {
    analysisArtifact: string;
    analysisSha256: string;
    runIds: string[];
  };
  interpretation: string;
}

export interface ClaimRegistry {
  schemaVersion: string;
  campaignId: string;
  generatedAt: string;
  sourceAnalysis: {
    path: string;
    sha256: string;
    schemaVersion: string;
  };
  claims: QuantitativeClaim[];
}

export function buildClaimRegistry(
  campaignId: string,
  analysis: Record<string, unknown>,
  source: { path: string; sha256: string },
): ClaimRegistry {
  if (analysis.campaignId !== campaignId) {
    throw new Error('Claim registry campaign does not match analysis campaign');
  }
  const experimentMetadata = new Map(
    arrayOfRecords(analysis.experiments).map(experiment => [
      String(experiment.experimentId),
      experiment,
    ])
  );
  const counters = new Map<string, number>();
  const claims = arrayOfRecords(analysis.pairedEffects).map(effect => {
    const experimentId = String(effect.experimentId);
    const experiment = experimentMetadata.get(experimentId);
    if (!experiment) throw new Error(`Missing experiment metadata for ${experimentId}`);
    const researchQuestionIds = Array.isArray(effect.researchQuestionIds)
      ? effect.researchQuestionIds.map(String)
      : [];
    const family = researchQuestionIds.join('-') || 'UNASSIGNED';
    const next = (counters.get(family) ?? 0) + 1;
    counters.set(family, next);
    const metricId = String(effect.outcome);
    const definition = getMetricDefinition(metricId as never);
    const labels = asRecord(effect.conditionLabels) ?? {};
    const conditionA = String(effect.conditionA);
    const conditionB = String(effect.conditionB);
    const labelA = String(labels[conditionA] ?? conditionA);
    const labelB = String(labels[conditionB] ?? conditionB);
    const estimate = finiteNumber(effect.meanDifference, 'meanDifference');
    const interval = finiteInterval(effect.confidenceInterval);
    const status = claimStatus(effect);
    const adjustedPValue = finiteNumber(effect.adjustedPValue, 'adjustedPValue');
    const dz = nullableFiniteNumber(effect.cohensDz);
    const practicalInterval = finiteInterval(effect.practicalEquivalenceInterval, false);
    const runIds = arrayOfRecords(effect.differences)
      .flatMap(difference => [difference.runIdA, difference.runIdB])
      .filter((runId): runId is string => typeof runId === 'string');
    return {
      id: `${experiment.classification === 'confirmatory' ? 'C' : 'E'}-${family}-${String(next).padStart(3, '0')}`,
      campaignId,
      experimentId,
      researchQuestionIds,
      classification: String(experiment.classification),
      status,
      text: `${labelB} minus ${labelA} changed ${definition.construct} by ${formatEstimate(estimate)} (95% CI ${formatEstimate(interval.lower)} to ${formatEstimate(interval.upper)}; multiplicity-adjusted p=${formatP(adjustedPValue)}).`,
      estimand: {
        type: 'paired_mean_difference' as const,
        conditionA: labelA,
        conditionB: labelB,
        experimentalUnit: String(effect.experimentalUnit),
        nPairs: finiteInteger(effect.nPairs, 'nPairs'),
      },
      outcome: {
        metricId,
        metricName: String(effect.outcomeMetricName),
        metricDefinitionVersion: definition.definitionVersion,
      },
      estimate: {
        value: estimate,
        confidenceInterval: interval,
        rawPValue: finiteNumber(effect.pValue, 'pValue'),
        adjustedPValue,
        correctionMethod: String(effect.correctionMethod),
        effectSizeCohensDz: dz,
        practicalEquivalenceInterval: {
          lower: practicalInterval.lower,
          upper: practicalInterval.upper,
        },
      },
      source: {
        analysisArtifact: source.path,
        analysisSha256: source.sha256,
        runIds: [...new Set(runIds)].sort(),
      },
      interpretation: interpretationFor(status),
    };
  });
  return {
    schemaVersion: CLAIM_REGISTRY_SCHEMA_VERSION,
    campaignId,
    generatedAt: String(analysis.generatedAt),
    sourceAnalysis: {
      path: source.path,
      sha256: source.sha256,
      schemaVersion: String(analysis.schemaVersion),
    },
    claims,
  };
}

export function auditClaimRegistry(
  registry: ClaimRegistry,
  options: {
    campaignId: string;
    analysisPath: string;
    analysisSha256: string;
    runIds: ReadonlySet<string>;
  },
): string[] {
  const errors: string[] = [];
  if (registry.schemaVersion !== CLAIM_REGISTRY_SCHEMA_VERSION) {
    errors.push(`Unsupported claim registry schema: ${registry.schemaVersion}`);
  }
  if (registry.campaignId !== options.campaignId) errors.push('Claim campaign ID mismatch');
  if (registry.sourceAnalysis.path !== options.analysisPath) errors.push('Claim analysis path mismatch');
  if (registry.sourceAnalysis.sha256 !== options.analysisSha256) errors.push('Claim analysis hash mismatch');
  const ids = new Set<string>();
  for (const claim of registry.claims) {
    if (ids.has(claim.id)) errors.push(`Duplicate claim ID: ${claim.id}`);
    ids.add(claim.id);
    if (claim.campaignId !== options.campaignId) errors.push(`${claim.id}: campaign mismatch`);
    if (claim.source.analysisSha256 !== options.analysisSha256) {
      errors.push(`${claim.id}: source analysis hash mismatch`);
    }
    for (const runId of claim.source.runIds) {
      if (!options.runIds.has(runId)) errors.push(`${claim.id}: unknown source run ${runId}`);
    }
    try {
      const currentVersion = getMetricDefinition(claim.outcome.metricId as never).definitionVersion;
      if (currentVersion !== claim.outcome.metricDefinitionVersion) {
        errors.push(`${claim.id}: metric definition version is stale`);
      }
    } catch {
      errors.push(`${claim.id}: unknown metric ${claim.outcome.metricId}`);
    }
  }
  return errors;
}

function claimStatus(effect: Record<string, unknown>): ClaimStatus {
  if (effect.practicallyEquivalent === true) return 'equivalent-within-declared-margin';
  if (effect.rejectedAfterCorrection === true && effect.practicallyImportant === true) {
    return 'supported-practically-important';
  }
  if (effect.rejectedAfterCorrection === true) {
    return 'statistically-detectable-below-practical-threshold';
  }
  return 'inconclusive';
}

function interpretationFor(status: ClaimStatus): string {
  switch (status) {
    case 'supported-practically-important':
      return 'The corrected statistical test and the preregistered practical threshold both support a model-conditional difference.';
    case 'equivalent-within-declared-margin':
      return 'The full confidence interval lies within the declared practical-equivalence interval.';
    case 'statistically-detectable-below-practical-threshold':
      return 'The corrected test detects a difference, but the confidence interval does not establish practical importance.';
    case 'inconclusive':
      return 'The campaign does not establish either practical importance or practical equivalence for this contrast.';
  }
}

function finiteNumber(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Claim ${label} must be finite`);
  return parsed;
}

function nullableFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return finiteNumber(value, 'effect size');
}

function finiteInteger(value: unknown, label: string): number {
  const parsed = finiteNumber(value, label);
  if (!Number.isInteger(parsed)) throw new Error(`Claim ${label} must be an integer`);
  return parsed;
}

function finiteInterval(
  value: unknown,
  includeLevel = true,
): { lower: number; upper: number; level: number } {
  const interval = asRecord(value);
  if (!interval) throw new Error('Claim interval is missing');
  return {
    lower: finiteNumber(interval.lower, 'interval lower bound'),
    upper: finiteNumber(interval.upper, 'interval upper bound'),
    level: includeLevel ? finiteNumber(interval.level, 'interval level') : 0.95,
  };
}

function formatEstimate(value: number): string {
  return Math.abs(value) > 0 && Math.abs(value) < 0.001
    ? value.toExponential(2)
    : value.toFixed(3);
}

function formatP(value: number): string {
  return value < 0.001 ? '<0.001' : value.toFixed(3);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function arrayOfRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.map(asRecord).filter((item): item is Record<string, unknown> => item !== null)
    : [];
}
