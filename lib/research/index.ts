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
  BaseConfigOverrides,
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
  MetricStatistics,
  ConfidenceIntervalResult,
  EffectSizeResult,
  SweepComparison,
  PowerAnalysisResult,
  StatisticalSignificance,
  ReproducibilityManifest,
} from './experiment-config';

export type { ResearchConfig } from './config-resolver';
export type { PopulationSpec, PopulationOverride } from './population';

export { getBaselineConfig, listBaselineIds } from './baselines';

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

// Invariant Checker
export {
  checkInvariants,
  calculateInitialTokenSupply,
  InvariantTracker,
  type InvariantViolation,
  type InvariantCheckResult,
  type InvariantConfig,
} from './invariant-checker';

// Regression Tester
export {
  compareToBaseline,
  generateBaseline,
  saveBaseline,
  loadBaseline,
  formatRegressionReport,
  type BaselineMetrics,
  type RegressionResult as RegressionTestResult,
  type RegressionReport,
} from './regression-tester';

// Statistics Module
export {
  // Basic statistics
  mean,
  median,
  variance,
  standardDeviation,
  standardError,
  percentile,
  interquartileRange,
  // Confidence intervals
  confidenceInterval,
  bootstrapConfidenceInterval,
  // Effect sizes
  cohensD,
  anovaEffectSizes,
  // Hypothesis tests
  independentTTest,
  oneWayAnova,
  kruskalWallis,
  // Post-hoc tests
  tukeyHSD,
  pairwiseTTests,
  // Multiple comparison corrections
  benjaminiHochberg,
  bonferroniCorrection,
  // Regression
  linearRegression,
  // Power analysis
  powerAnalysis,
  detailedPowerAnalysis,
  // Comprehensive analysis
  analyzeDistribution,
  compareGroups,
  // Distribution functions
  normalCDF,
  tDistributionCDF,
  fDistributionCDF,
  regularizedIncompleteBeta,
  // Types
  type ConfidenceInterval,
  type EffectSize,
  type TTestResult,
  type AnovaResult,
  type AnovaEffectSizes,
  type KruskalWallisResult,
  type TukeyHSDResult,
  type RegressionResult,
  type PowerAnalysis,
  type DetailedPowerAnalysis,
  type StatisticalAnalysis,
  type GroupComparison,
} from './statistics';

// Worker Pool (Parallel Execution)
export {
  WorkerPool,
  createWorkerPool,
  getRecommendedWorkerCount,
  type WorkerPoolConfig,
} from './worker-pool';

// Accuracy Metrics (Calibration Validation)
export {
  compareToHistorical,
  extractSimulationMetrics,
  type AccuracyReport,
  type SimulationMetrics,
} from './accuracy-metrics';

// Backtest Runner (Historical Validation)
export {
  BacktestRunner,
  type BacktestConfig,
  type BacktestResult,
} from './backtest-runner';
