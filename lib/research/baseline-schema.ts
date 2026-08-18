/**
 * Schemas for calibration and experiment baselines.
 *
 * The baselines on disk are the ground truth used by ValidationDiffer to detect
 * regressions. These Zod schemas validate every file load — a malformed baseline
 * fails loud (EXIT_INFRA_FAILURE) instead of silently passing the validator.
 */

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Calibration baseline (per-DAO scores)
// -----------------------------------------------------------------------------

export const ConfidenceIntervalSchema = z.object({
  mean: z.number(),
  stdDev: z.number(),
  ci95Lower: z.number(),
  ci95Upper: z.number(),
  standardError: z.number(),
  sampleSize: z.number().int().nonnegative().optional(),
});
export type ConfidenceIntervalShape = z.infer<typeof ConfidenceIntervalSchema>;

export const AccuracyMetricIdSchema = z.enum([
  'proposal_frequency_error',
  'pass_rate_error',
  'participation_rate_error',
  'price_level_error',
  'voter_concentration_error',
  'forum_activity_error',
]);

export const MetricConfidenceIntervalsSchema = z.object({
  overall_score: ConfidenceIntervalSchema,
  proposal_frequency_error: ConfidenceIntervalSchema,
  pass_rate_error: ConfidenceIntervalSchema,
  participation_rate_error: ConfidenceIntervalSchema,
  price_level_error: ConfidenceIntervalSchema,
  voter_concentration_error: ConfidenceIntervalSchema,
  forum_activity_error: ConfidenceIntervalSchema,
});

export const DaoBaselineSchema = z.object({
  daoId: z.string(),
  score: z.number().min(0).max(1),
  passRate: z.number().min(0).max(1).nullable(),
  participation: z.number().min(0).max(1).nullable(),
  proposalFrequency: z.number().min(0).nullable(),
  priceLevelError: z.number().min(0).nullable(),
  voterConcentration: z.number().min(0).max(1).nullable(),
  forumActivity: z.number().min(0).nullable(),
  availableMetrics: z.array(AccuracyMetricIdSchema),
  ci95: MetricConfidenceIntervalsSchema,
});
export type DaoBaseline = z.infer<typeof DaoBaselineSchema>;

export const CalibrationBaselineSchema = z.object({
  version: z.number().int().positive(),
  generatedAt: z.string(),
  gitSha: z.string(),
  configHash: z.string(),
  description: z.string().optional(),
  perDao: z.record(z.string(), DaoBaselineSchema),
});
export type CalibrationBaseline = z.infer<typeof CalibrationBaselineSchema>;

// -----------------------------------------------------------------------------
// Experiment baseline (qualitative findings)
// -----------------------------------------------------------------------------

export const FindingDirectionSchema = z.enum(['positive', 'negative', 'neutral']);

export const ExperimentFindingSchema = z.object({
  description: z.string(),
  direction: FindingDirectionSchema,
  magnitudeRange: z.tuple([z.number(), z.number()]),
  metric: z.string(),
  observedMagnitude: z.number().optional(),
  observedAt: z.string().optional(),
});
export type ExperimentFindingRecord = z.infer<typeof ExperimentFindingSchema>;

export const ExperimentBaselineSchema = z.object({
  version: z.number().int().positive(),
  generatedAt: z.string(),
  gitSha: z.string(),
  configHash: z.string(),
  suite: z.enum(['full', 'llm']).optional(),
  sourceRunId: z.string().optional(),
  description: z.string().optional(),
  findings: z.record(z.string(), ExperimentFindingSchema),
});
export type ExperimentBaseline = z.infer<typeof ExperimentBaselineSchema>;

// -----------------------------------------------------------------------------
// Validation result (history.jsonl line shape)
// -----------------------------------------------------------------------------

export const DaoValidationResultSchema = z.object({
  daoId: z.string(),
  score: z.number(),
  passRate: z.number().nullable(),
  participation: z.number().nullable(),
  proposalFrequency: z.number().nullable(),
  priceLevelError: z.number().nullable(),
  voterConcentration: z.number().nullable(),
  forumActivity: z.number().nullable(),
  availableMetrics: z.array(AccuracyMetricIdSchema),
  ci95Lower: z.number(),
  ci95Upper: z.number(),
  ci95: MetricConfidenceIntervalsSchema,
  episodes: z.number().int().positive(),
  stepsPerEpisode: z.number().int().positive(),
});
export type DaoValidationResult = z.infer<typeof DaoValidationResultSchema>;

export const ExperimentValidationResultSchema = z.object({
  experimentId: z.string(),
  observedMagnitude: z.number(),
  observedDirection: FindingDirectionSchema,
  metric: z.string(),
});
export type ExperimentValidationResult = z.infer<typeof ExperimentValidationResultSchema>;

export const ValidationRunSchema = z.object({
  runId: z.string(),
  startedAt: z.string(),
  finishedAt: z.string(),
  durationMs: z.number().int().nonnegative(),
  suite: z.enum(['fast', 'full', 'llm', 'smoke']),
  gitSha: z.string(),
  configHash: z.string(),
  baselineVersion: z.number().int().positive(),
  perDao: z.record(z.string(), DaoValidationResultSchema),
  perExperiment: z.record(z.string(), ExperimentValidationResultSchema).optional(),
  status: z.enum(['pass', 'regression', 'config-drift', 'infra-failure']),
  regressionCount: z.number().int().nonnegative(),
});
export type ValidationRun = z.infer<typeof ValidationRunSchema>;
