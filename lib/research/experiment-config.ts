/**
 * Experiment Configuration Types
 *
 * These types define the structure for research experiments that can be run
 * via CLI. Experiments can use DAO Designer configs directly or reference
 * templates, and define parameter sweeps, metrics to capture, and output settings.
 */

import type { DAODesignerConfig } from '../dao-designer/types';

// =============================================================================
// EXPERIMENT CONFIGURATION
// =============================================================================

/**
 * Main experiment configuration - what researchers define in YAML/JSON
 */
export interface ExperimentConfig {
  // Metadata
  name: string;
  description?: string;
  version?: string;
  author?: string;
  tags?: string[];

  // Base DAO configuration
  baseConfig: BaseConfigSpec;

  // Parameter sweep (optional - if not provided, runs single experiment)
  sweep?: SweepConfig;

  // Execution settings
  execution: ExecutionConfig;

  // What metrics to capture
  metrics: MetricConfig[];

  // Output settings
  output: OutputConfig;
}

/**
 * How to specify the base DAO configuration
 */
export interface BaseConfigSpec {
  // Option 1: Use a template name (compound, optimism, etc.)
  template?: string;

  // Option 2: Provide inline config
  inline?: DAODesignerConfig;

  // Option 3: Load from a JSON file
  file?: string;

  // Overrides to apply on top of template/inline/file
  overrides?: Partial<DAODesignerConfig>;

  // Simulation-specific overrides (steps, etc.)
  simulationOverrides?: SimulationOverrides;
}

/**
 * Simulation-level overrides not part of DAODesignerConfig
 */
export interface SimulationOverrides {
  stepsToRun?: number;
  checkpointInterval?: number;
  eventLogging?: boolean;
}

// =============================================================================
// PARAMETER SWEEP
// =============================================================================

/**
 * Configuration for sweeping a parameter across values
 */
export interface SweepConfig {
  // Path to the parameter (dot notation, e.g., "quorumConfig.baseQuorumPercent")
  parameter: string;

  // Option 1: Explicit values
  values?: (number | string | boolean)[];

  // Option 2: Range (for numeric parameters)
  range?: RangeSpec;
}

/**
 * Range specification for numeric sweeps
 */
export interface RangeSpec {
  min: number;
  max: number;
  step: number;
}

// =============================================================================
// EXECUTION
// =============================================================================

/**
 * How to execute the experiment
 */
export interface ExecutionConfig {
  // Number of simulation runs per configuration
  runsPerConfig: number;

  // Random seed strategy
  seedStrategy: 'sequential' | 'fixed' | 'random';

  // Base seed (for sequential/fixed strategies)
  baseSeed?: number;

  // Fixed seeds (for 'fixed' strategy with specific seeds)
  fixedSeeds?: number[];

  // Number of simulation steps per run
  stepsPerRun: number;

  // Parallelization (Phase 2)
  workers?: number;

  // Early stopping (Phase 2)
  earlyStop?: {
    enabled: boolean;
    convergenceThreshold?: number;
    minRuns?: number;
  };
}

// =============================================================================
// METRICS
// =============================================================================

/**
 * Types of built-in metrics
 */
export type BuiltinMetricType =
  | 'proposal_pass_rate'
  | 'average_turnout'
  | 'final_treasury'
  | 'final_token_price'
  | 'final_member_count'
  | 'final_gini'
  | 'final_reputation_gini'
  | 'total_proposals'
  | 'total_projects'
  | 'average_token_balance';

/**
 * Configuration for a single metric to capture
 */
export interface MetricConfig {
  // Human-readable name
  name: string;

  // Type of metric
  type: 'builtin' | 'custom';

  // For builtin metrics
  builtin?: BuiltinMetricType;

  // For custom metrics - JavaScript expression evaluated against results
  // The expression has access to: dao, dataCollector, proposals, members
  expression?: string;

  // Optional description
  description?: string;
}

// =============================================================================
// OUTPUT
// =============================================================================

/**
 * Output configuration
 */
export interface OutputConfig {
  // Directory for results (relative to project root)
  directory: string;

  // Output formats
  formats: OutputFormat[];

  // Include full raw data for each run
  includeRawRuns?: boolean;

  // Include step-by-step timeline data
  includeTimeline?: boolean;

  // Generate reproducibility manifest
  includeManifest?: boolean;
}

export type OutputFormat = 'json' | 'csv' | 'parquet';

// =============================================================================
// RESULTS
// =============================================================================

/**
 * Results from a single simulation run
 */
export interface RunResult {
  // Identifiers
  runId: string;
  experimentName: string;
  sweepValue?: number | string | boolean;
  runIndex: number;

  // Configuration used
  config: DAODesignerConfig;
  seed: number;

  // Computed metrics
  metrics: Record<string, number>;

  // Optional raw data
  timeline?: TimelineEntry[];

  // Execution metadata
  startedAt: string;
  completedAt: string;
  durationMs: number;
  stepsCompleted: number;
}

/**
 * Entry in the step-by-step timeline
 */
export interface TimelineEntry {
  step: number;
  memberCount: number;
  proposalCount: number;
  projectCount: number;
  tokenPrice: number;
  treasuryFunds: number;
  gini: number;
  reputationGini: number;
}

/**
 * Summary of an experiment (aggregated across all runs)
 */
export interface ExperimentSummary {
  experimentId: string;
  experimentName: string;

  // Execution summary
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalDurationMs: number;

  // Aggregated metrics (per sweep value if sweep was used)
  metricsSummary: MetricsSummary[];

  // Reproducibility manifest
  manifest: ReproducibilityManifest;
}

/**
 * Summary statistics for a single sweep value (or entire experiment if no sweep)
 */
export interface MetricsSummary {
  sweepValue?: number | string | boolean;
  runCount: number;
  metrics: {
    name: string;
    mean: number;
    median: number;
    std: number;
    min: number;
    max: number;
    values: number[];
  }[];
}

/**
 * Reproducibility manifest for an experiment
 */
export interface ReproducibilityManifest {
  experimentId: string;
  configHash: string;

  software: {
    simulatorVersion: string;
    nodeVersion: string;
    platform: string;
    gitCommit?: string;
    gitBranch?: string;
    gitDirty?: boolean;
  };

  execution: {
    startedAt: string;
    completedAt: string;
    totalRuns: number;
    seeds: number[];
    workerCount: number;
  };

  resultsHash: string;
}

// =============================================================================
// DEFAULTS
// =============================================================================

export const DEFAULT_EXECUTION_CONFIG: ExecutionConfig = {
  runsPerConfig: 10,
  seedStrategy: 'sequential',
  baseSeed: 12345,
  stepsPerRun: 500,
  workers: 1,
};

export const DEFAULT_OUTPUT_CONFIG: OutputConfig = {
  directory: 'results',
  formats: ['json'],
  includeRawRuns: true,
  includeTimeline: false,
  includeManifest: true,
};

export const DEFAULT_METRICS: MetricConfig[] = [
  { name: 'Proposal Pass Rate', type: 'builtin', builtin: 'proposal_pass_rate' },
  { name: 'Final Treasury', type: 'builtin', builtin: 'final_treasury' },
  { name: 'Final Token Price', type: 'builtin', builtin: 'final_token_price' },
  { name: 'Final Gini', type: 'builtin', builtin: 'final_gini' },
];
