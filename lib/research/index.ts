/**
 * Research Module
 *
 * Provides experiment configuration, execution, and export functionality
 * for running governance research studies via CLI.
 */

// Types
export type {
  ExperimentConfig,
  BaseConfigSpec,
  SimulationOverrides,
  SweepConfig,
  RangeSpec,
  ExecutionConfig,
  BuiltinMetricType,
  MetricConfig,
  OutputConfig,
  OutputFormat,
  RunResult,
  TimelineEntry,
  ExperimentSummary,
  MetricsSummary,
  ReproducibilityManifest,
} from './experiment-config';

// Defaults
export {
  DEFAULT_EXECUTION_CONFIG,
  DEFAULT_OUTPUT_CONFIG,
  DEFAULT_METRICS,
} from './experiment-config';

// Runner
export {
  ExperimentRunner,
  runExperiment,
  runSingleSimulation,
  type RunProgress,
  type ProgressCallback,
} from './experiment-runner';

// Exporter
export {
  ResultsExporter,
  exportResults,
  resultToJson,
  summaryToJson,
  type ExportResult,
} from './results-exporter';

// Batch Runner
export {
  BatchRunner,
  runBatch,
  DEFAULT_BATCH_CONFIG,
  type BatchConfig,
  type BatchProgress,
  type BatchProgressCallback,
  type BatchCheckpoint,
  type BatchResult,
} from './batch-runner';
