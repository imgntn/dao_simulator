import {
  analyzePairedEffect,
  correctPValues,
  estimatePairedPilotPower,
  estimatePairedSimulationPower,
  fitFactorialModel,
  type AnalysisObservation,
  type CorrectionMethod,
} from './confirmatory-analysis';
import type {
  ExperimentConfig,
  ResearchDesignMetadata,
  RunResult,
  TimelineEntry,
} from './experiment-config';
import {
  assertRunMatchesPlan,
  campaignConditionId,
  campaignRunConditionId,
} from './condition-identity';
export {
  assertRunMatchesPlan,
  campaignConditionId,
  campaignRunConditionId,
} from './condition-identity';

const ANALYSIS_SCHEMA_VERSION = '1.1.0';
const BOOTSTRAP_SAMPLES = 10_000;

type FactorValue = string | number | boolean;

export interface CampaignExperimentInput {
  config: ExperimentConfig;
  results: RunResult[];
}

export interface NonFiniteReplacement {
  path: string;
  original: 'NaN' | 'Infinity' | '-Infinity';
  replacement: null;
}

export interface CampaignAnalysisArtifact {
  schemaVersion: string;
  campaignId: string;
  generatedAt: string;
  analysisEngine: {
    pairedBootstrapSamples: number;
    pairedExperimentalUnit: 'seed';
    factorialCoding: 'categorical_reference';
    confidenceLevel: number;
  };
  experiments: unknown[];
  pairedEffects: unknown[];
  factorialModels: unknown[];
  hierarchical: unknown[];
  timeSeries: unknown[];
  nonFiniteReplacements: NonFiniteReplacement[];
}

interface Condition {
  id: string;
  artifactConditionId: string;
  label: string;
  factors: Record<string, FactorValue>;
  observations: AnalysisObservation[];
  runs: RunResult[];
}

interface DescriptiveSummary {
  condition: string;
  artifactConditionId: string;
  label: string;
  factors: Record<string, FactorValue>;
  n: number;
  mean: number;
  standardDeviation: number;
  median: number;
  minimum: number;
  maximum: number;
  q1: number;
  q3: number;
  zeroCount: number;
  minimumCount: number;
  maximumCount: number;
  uniqueValueCount: number;
  observations: Array<{ seed: number; value: number; runId?: string }>;
}

export function buildCampaignAnalysis(
  campaignId: string,
  inputs: readonly CampaignExperimentInput[],
): CampaignAnalysisArtifact {
  if (!campaignId.trim()) throw new Error('campaignId is required');
  if (inputs.length === 0) throw new Error('Campaign analysis requires at least one experiment');

  const experiments: unknown[] = [];
  const pairedEffects: unknown[] = [];
  const factorialModels: unknown[] = [];
  const timeSeries: unknown[] = [];
  const completionTimes: string[] = [];

  for (const input of inputs) {
    const research = requireResearchMetadata(input.config);
    if (input.results.length === 0) {
      throw new Error(`Experiment ${input.config.id ?? input.config.name} has no completed runs`);
    }
    completionTimes.push(...input.results.map(result => result.completedAt));
    const metric = input.config.metrics.find(candidate => candidate.builtin === research.primaryOutcome);
    if (!metric) {
      throw new Error(
        `Primary outcome ${research.primaryOutcome} is not captured by ${input.config.id ?? input.config.name}`
      );
    }

    const factorPaths = sweepFactorPaths(input.config);
    const conditionMap = new Map<string, Condition>();
    for (const result of input.results) {
      const value = result.metrics[metric.name];
      if (!Number.isFinite(value)) {
        throw new Error(`Non-finite primary outcome in run ${result.runId}: ${metric.name}`);
      }
      const factors = Object.fromEntries(
        factorPaths.map(parameter => [parameter, readConfigPath(result.config, parameter)])
      ) as Record<string, FactorValue>;
      const id = stableConditionId(factors);
      let condition = conditionMap.get(id);
      if (!condition) {
        condition = {
          id,
          artifactConditionId: campaignRunConditionId(result),
          label: conditionLabel(factors),
          factors,
          observations: [],
          runs: [],
        };
        conditionMap.set(id, condition);
      } else if (condition.artifactConditionId !== campaignRunConditionId(result)) {
        throw new Error(`Condition ${condition.label} maps to inconsistent resolved configurations`);
      }
      condition.observations.push({
        condition: id,
        seed: result.seed,
        value,
        factors: Object.fromEntries(
          Object.entries(factors).map(([key, factorValue]) => [key, String(factorValue)])
        ),
        runId: result.runId,
      });
      condition.runs.push(result);
    }
    const conditions = [...conditionMap.values()];
    validateExperimentalUnits(input.config, conditions);
    const observations = conditions.flatMap(condition => condition.observations);
    const reference = conditions[0];
    const outcomeScaleSoei = outcomeScaleEffectThreshold(
      research,
      reference.observations.map(observation => observation.value)
    );
    const experimentEffects = conditions.slice(1).map(condition => ({
      experimentId: input.config.id,
      researchQuestionIds: research.researchQuestionIds,
      outcome: research.primaryOutcome,
      outcomeMetricName: metric.name,
      conditionLabels: {
        [reference.id]: reference.label,
        [condition.id]: condition.label,
      },
      ...analyzePairedEffect(
        observations,
        reference.id,
        condition.id,
        outcomeScaleSoei,
        BOOTSTRAP_SAMPLES,
      ),
    }));
    const correctedEffects = applyEffectCorrection(
      experimentEffects,
      research.comparisonCorrection,
    );
    pairedEffects.push(...correctedEffects);

    const power = correctedEffects.map(effect => ({
      conditionA: effect.conditionA,
      conditionB: effect.conditionB,
      ...estimatePairedPilotPower(
        effect.differences.map(difference => difference.value),
        outcomeScaleSoei,
      ),
      simulationPower: estimatePairedSimulationPower(
        effect.differences.map(difference => difference.value),
        outcomeScaleSoei,
      ),
    }));
    const experimentTimeSeries = conditions
      .map(condition => aggregateConditionTimeline(input.config.id!, condition))
      .filter((series): series is NonNullable<typeof series> => series !== null);
    timeSeries.push(...experimentTimeSeries);

    let factorialModel: unknown = null;
    if (research.analysisModel === 'factorial_ols') {
      const fitted = fitFactorialModel(observations, research.primaryOutcome);
      const coefficientCorrection = applyCoefficientCorrection(
        fitted.coefficients,
        research.comparisonCorrection,
      );
      factorialModel = {
        experimentId: input.config.id,
        researchQuestionIds: research.researchQuestionIds,
        coding: {
          type: 'categorical_reference',
          referenceLevels: Object.fromEntries(
            Object.keys(reference.factors).map(key => [key, String(reference.factors[key])])
          ),
        },
        ...fitted,
        coefficients: coefficientCorrection,
        responseSurface: conditions.map(condition => {
          const summary = descriptiveSummary(condition);
          const standardError = summary.standardDeviation / Math.sqrt(summary.n);
          return {
            condition: summary.condition,
            artifactConditionId: summary.artifactConditionId,
            label: summary.label,
            factors: summary.factors,
            n: summary.n,
            mean: summary.mean,
            standardError,
            meanConfidenceInterval: {
              lower: summary.mean - 1.96 * standardError,
              upper: summary.mean + 1.96 * standardError,
              level: 0.95,
              method: 'normal_mean',
            },
          };
        }),
      };
      factorialModels.push(factorialModel);
    }

    experiments.push({
      experimentId: input.config.id,
      experimentName: input.config.name,
      classification: research.classification,
      publicationRole: research.publicationRole,
      researchQuestionIds: research.researchQuestionIds,
      hypothesis: research.hypothesis,
      analysisFamily: research.analysisFamily,
      analysisModel: research.analysisModel,
      experimentalUnit: research.experimentalUnit,
      primaryOutcome: {
        id: research.primaryOutcome,
        metricName: metric.name,
      },
      smallestEffectOfInterest: {
        ...research.smallestEffectOfInterest,
        outcomeScaleValue: outcomeScaleSoei,
      },
      runCount: input.results.length,
      replicateCountPerCondition: input.config.execution.runsPerConfig,
      conditionCount: conditions.length,
      referenceCondition: {
        id: reference.id,
        artifactConditionId: reference.artifactConditionId,
        label: reference.label,
        factors: reference.factors,
      },
      conditions: conditions.map(condition => descriptiveSummary(condition)),
      pairedEffects: correctedEffects,
      factorialModel,
      timeSeries: experimentTimeSeries,
      pilotPower: {
        contrasts: power,
        recommendedPairs: power.length > 0
          ? Math.max(...power.map(result =>
            result.simulationPower.requiredPairs ?? result.requiredPairs
          ))
          : input.config.execution.runsPerConfig,
        configuredConfirmatoryPairs: null,
        decisionRule:
          'Use the maximum contrast-specific paired requirement, then retain the larger preregistered count.',
      },
      diagnostics: {
        allPrimaryOutcomesFinite: true,
        pairedSeedsComplete: correctedEffects.every(
          effect => effect.missingInA.length === 0 && effect.missingInB.length === 0
        ),
        zeroVarianceConditions: conditions
          .filter(condition => sampleStandardDeviation(
            condition.observations.map(observation => observation.value)
          ) === 0)
          .map(condition => condition.id),
      },
    });
  }

  const raw = {
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
    campaignId,
    generatedAt: [...completionTimes].sort().at(-1) ?? new Date(0).toISOString(),
    analysisEngine: {
      pairedBootstrapSamples: BOOTSTRAP_SAMPLES,
      pairedExperimentalUnit: 'seed' as const,
      factorialCoding: 'categorical_reference' as const,
      confidenceLevel: 0.95,
    },
    experiments,
    pairedEffects,
    factorialModels,
    hierarchical: [],
    timeSeries,
  };
  const safe = replaceNonFinite(raw);
  return {
    ...(safe.value as Omit<CampaignAnalysisArtifact, 'nonFiniteReplacements'>),
    nonFiniteReplacements: safe.replacements,
  };
}

const TIMELINE_METRICS: Array<keyof Omit<TimelineEntry, 'step'>> = [
  'memberCount',
  'proposalCount',
  'projectCount',
  'tokenPrice',
  'treasuryFunds',
  'gini',
  'reputationGini',
  'participationRate',
];

function aggregateConditionTimeline(experimentId: string, condition: Condition): {
  experimentId: string;
  condition: string;
  artifactConditionId: string;
  label: string;
  factors: Record<string, FactorValue>;
  intervalMethod: string;
  points: unknown[];
  eventAnnotations: Array<{ step: number; type: string; label: string; severity?: number }>;
} | null {
  const runsWithTimeline = condition.runs.filter(run => Array.isArray(run.timeline));
  if (runsWithTimeline.length === 0) return null;
  if (runsWithTimeline.length !== condition.runs.length) {
    throw new Error(`Condition ${condition.label} has partially missing timelines`);
  }
  const byRun = runsWithTimeline.map(run =>
    new Map(run.timeline!.map(entry => [entry.step, entry]))
  );
  const steps = [...new Set(runsWithTimeline.flatMap(run => run.timeline!.map(entry => entry.step)))]
    .sort((left, right) => left - right);
  const points = steps.map(step => {
    const entries = byRun.map(run => run.get(step));
    if (entries.some(entry => entry === undefined)) {
      throw new Error(`Condition ${condition.label} has inconsistent timeline step ${step}`);
    }
    return {
      step,
      metrics: Object.fromEntries(TIMELINE_METRICS.map(metric => {
        const values = entries
          .map(entry => Number(entry![metric]))
          .filter(Number.isFinite)
          .sort((left, right) => left - right);
        if (values.length !== entries.length) {
          throw new Error(`Non-finite ${metric} at timeline step ${step} in ${condition.label}`);
        }
        const average = mean(values);
        const standardError = sampleStandardDeviation(values) / Math.sqrt(values.length);
        return [metric, {
          n: values.length,
          mean: average,
          standardError,
          meanConfidenceInterval: {
            lower: average - 1.96 * standardError,
            upper: average + 1.96 * standardError,
            level: 0.95,
          },
          replicateQuantileBand: {
            lower: quantile(values, 0.025),
            upper: quantile(values, 0.975),
            level: 0.95,
          },
        }];
      })),
    };
  });
  return {
    experimentId,
    condition: condition.id,
    artifactConditionId: condition.artifactConditionId,
    label: condition.label,
    factors: condition.factors,
    intervalMethod:
      'Mean with normal-approximation 95% confidence interval and empirical 2.5–97.5% replicate band.',
    points,
    eventAnnotations: scheduledEventAnnotations(condition.runs[0].config),
  };
}

function scheduledEventAnnotations(
  config: unknown,
): Array<{ step: number; type: string; label: string; severity?: number }> {
  if (!config || typeof config !== 'object') return [];
  const events = (config as Record<string, unknown>).black_swan_scheduled_events;
  if (!Array.isArray(events)) return [];
  return events.flatMap(event => {
    if (!event || typeof event !== 'object') return [];
    const record = event as Record<string, unknown>;
    const step = Number(record.step);
    if (!Number.isFinite(step)) return [];
    const type = String(record.category ?? 'scheduled_event');
    const severity = Number(record.severity);
    return [{
      step,
      type,
      label: `${type.replaceAll('_', ' ')}${
        Number.isFinite(severity) ? ` (severity ${severity})` : ''
      }`,
      severity: Number.isFinite(severity) ? severity : undefined,
    }];
  }).sort((left, right) => left.step - right.step);
}

function requireResearchMetadata(config: ExperimentConfig): ResearchDesignMetadata {
  if (!config.id?.trim()) throw new Error(`Experiment lacks a stable id: ${config.name}`);
  if (!config.research) throw new Error(`Experiment lacks research metadata: ${config.id}`);
  if (!config.sweep) throw new Error(`Campaign analysis requires a sweep: ${config.id}`);
  return config.research;
}

function sweepFactorPaths(config: ExperimentConfig): string[] {
  if (config.sweep?.grid?.length) return config.sweep.grid.map(entry => entry.parameter);
  if (config.sweep?.parameter) return [config.sweep.parameter];
  throw new Error(`Sweep has no factor paths: ${config.id}`);
}

function readConfigPath(config: unknown, parameter: string): FactorValue {
  let current: unknown = config;
  for (const segment of parameter.split('.')) {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      throw new Error(`Resolved run config is missing swept parameter: ${parameter}`);
    }
    current = (current as Record<string, unknown>)[segment];
  }
  if (
    typeof current !== 'string'
    && typeof current !== 'number'
    && typeof current !== 'boolean'
  ) {
    throw new Error(`Swept parameter is not scalar: ${parameter}`);
  }
  return current;
}

function stableConditionId(factors: Record<string, FactorValue>): string {
  return JSON.stringify(
    Object.fromEntries(Object.entries(factors).sort(([left], [right]) => left.localeCompare(right)))
  );
}

function conditionLabel(factors: Record<string, FactorValue>): string {
  return Object.entries(factors)
    .map(([parameter, value]) => `${parameter}=${String(value)}`)
    .join(', ');
}

function validateExperimentalUnits(config: ExperimentConfig, conditions: Condition[]): void {
  if (conditions.length < 2) {
    throw new Error(`Experiment ${config.id} requires at least two conditions`);
  }
  for (const condition of conditions) {
    const seeds = condition.observations.map(observation => observation.seed);
    if (new Set(seeds).size !== seeds.length) {
      throw new Error(`Duplicate seed within condition ${condition.label}`);
    }
    if (seeds.length !== config.execution.runsPerConfig) {
      throw new Error(
        `Condition ${condition.label} has ${seeds.length} runs; expected ${config.execution.runsPerConfig}`
      );
    }
  }
}

function outcomeScaleEffectThreshold(
  research: ResearchDesignMetadata,
  referenceValues: number[],
): number {
  const configured = research.smallestEffectOfInterest.value;
  if (/relative|percent/i.test(research.smallestEffectOfInterest.unit)) {
    const referenceMean = mean(referenceValues);
    const threshold = Math.abs(referenceMean) * configured;
    if (!(threshold > 0)) {
      throw new Error(
        `Relative smallest effect cannot be converted because the reference mean is ${referenceMean}`
      );
    }
    return threshold;
  }
  return configured;
}

function applyEffectCorrection<T extends {
  conditionA: string;
  conditionB: string;
  pValue: number;
}>(
  effects: T[],
  method: ResearchDesignMetadata['comparisonCorrection'],
): Array<T & { adjustedPValue: number; rejectedAfterCorrection: boolean; correctionMethod: string }> {
  const tests = effects.map(effect => ({
    id: `${effect.conditionA}->${effect.conditionB}`,
    pValue: effect.pValue,
  }));
  const corrected = method === 'none'
    ? tests.map(test => ({
      id: test.id,
      rawPValue: test.pValue,
      adjustedPValue: test.pValue,
      rejected: test.pValue <= 0.05,
    }))
    : correctPValues(tests, method as CorrectionMethod);
  return effects.map((effect, index) => ({
    ...effect,
    adjustedPValue: corrected[index].adjustedPValue,
    rejectedAfterCorrection: corrected[index].rejected,
    correctionMethod: method,
  }));
}

function applyCoefficientCorrection<T extends {
  term: string;
  pValue: number;
  robustPValue?: number;
}>(
  coefficients: T[],
  method: ResearchDesignMetadata['comparisonCorrection'],
): Array<T & { adjustedPValue: number; rejectedAfterCorrection: boolean; correctionMethod: string }> {
  const inferential = coefficients.filter(coefficient => coefficient.term !== '(Intercept)');
  const tests = inferential.map(coefficient => ({
    id: coefficient.term,
    pValue: coefficient.robustPValue ?? coefficient.pValue,
  }));
  const corrected = method === 'none'
    ? tests.map(test => ({
      id: test.id,
      rawPValue: test.pValue,
      adjustedPValue: test.pValue,
      rejected: test.pValue <= 0.05,
    }))
    : correctPValues(tests, method as CorrectionMethod);
  const byTerm = new Map(corrected.map(result => [result.id, result]));
  return coefficients.map(coefficient => {
    const correction = byTerm.get(coefficient.term);
    return {
      ...coefficient,
      correctionPValue: coefficient.robustPValue ?? coefficient.pValue,
      adjustedPValue: correction?.adjustedPValue ?? coefficient.pValue,
      rejectedAfterCorrection: correction?.rejected ?? false,
      correctionMethod: method,
    };
  });
}

function descriptiveSummary(condition: Condition): DescriptiveSummary {
  const values = condition.observations.map(observation => observation.value).sort((a, b) => a - b);
  const minimum = values[0];
  const maximum = values.at(-1)!;
  return {
    condition: condition.id,
    artifactConditionId: condition.artifactConditionId,
    label: condition.label,
    factors: condition.factors,
    n: values.length,
    mean: mean(values),
    standardDeviation: sampleStandardDeviation(values),
    median: quantile(values, 0.5),
    minimum,
    maximum,
    q1: quantile(values, 0.25),
    q3: quantile(values, 0.75),
    zeroCount: values.filter(value => value === 0).length,
    minimumCount: values.filter(value => value === minimum).length,
    maximumCount: values.filter(value => value === maximum).length,
    uniqueValueCount: new Set(values).size,
    observations: condition.observations
      .map(observation => ({
        seed: observation.seed,
        value: observation.value,
        runId: observation.runId,
      }))
      .sort((left, right) => left.seed - right.seed),
  };
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleStandardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const average = mean(values);
  return Math.sqrt(
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1)
  );
}

function quantile(sortedValues: number[], probability: number): number {
  const position = (sortedValues.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const fraction = position - lower;
  return sortedValues[lower] * (1 - fraction) + sortedValues[upper] * fraction;
}

function replaceNonFinite(value: unknown): {
  value: unknown;
  replacements: NonFiniteReplacement[];
} {
  const replacements: NonFiniteReplacement[] = [];
  const visit = (current: unknown, path: string): unknown => {
    if (typeof current === 'number' && !Number.isFinite(current)) {
      replacements.push({
        path,
        original: Number.isNaN(current) ? 'NaN' : current > 0 ? 'Infinity' : '-Infinity',
        replacement: null,
      });
      return null;
    }
    if (Array.isArray(current)) {
      return current.map((child, index) => visit(child, `${path}[${index}]`));
    }
    if (current && typeof current === 'object') {
      return Object.fromEntries(
        Object.entries(current as Record<string, unknown>)
          .map(([key, child]) => [key, visit(child, path ? `${path}.${key}` : key)])
      );
    }
    return current;
  };
  return { value: visit(value, ''), replacements };
}
