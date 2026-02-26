/**
 * Experiment Configuration Types
 *
 * These types define the structure for research experiments that can be run
 * via CLI. Experiments can use baseline configs or inline simulation settings,
 * and define parameter sweeps, metrics to capture, and output settings.
 */

import type { DAOSimulationConfig } from '../engine/simulation';
import type { DAOCityConfig, DAOConfig, InterDAOProposalType, CityAttackConfig } from '../types/dao-city';
import type { SimulationSettings } from '../config/settings';
import type { PopulationOverride } from './population';

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

  // Execution mode
  mode?: 'single' | 'city';

  // Base DAO configuration
  baseConfig: BaseConfigSpec;

  // Base City configuration (multi-DAO)
  baseCityConfig?: CityBaseConfig;

  // City scenarios (multi-DAO)
  scenarios?: CityScenarioConfig[];

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
  // Option 1: Use a baseline name (compound, lido, etc.)
  template?: string;

  // Option 2: Provide inline config
  inline?: DAOSimulationConfig;

  // Option 3: Load from a JSON file
  file?: string;

  // Overrides to apply on top of template/inline/file
  overrides?: BaseConfigOverrides;

  // Population overrides (preferred)
  population?: PopulationOverride;

  // Simulation-specific overrides (steps, etc.)
  simulationOverrides?: SimulationOverrides;
}

// =============================================================================
// MULTI-DAO (CITY) CONFIGURATION
// =============================================================================

export interface CityBaseConfig extends Partial<DAOCityConfig> {
  interDAOProposalConfig?: {
    votingPeriod?: number;
    requiredApprovalRatio?: number;
    quorumThreshold?: number;
    approvalThreshold?: number;
    proposalTypes?: InterDAOProposalType[];
  };
  interDAOProposalRate?: number;
  memberTransferRate?: number;
  tokenSwapRate?: number;
  memberTransferEnabled?: boolean;
  bridgesEnabled?: boolean;
}

export interface CityScenarioConfig {
  name: string;
  description?: string;
  daos: CityDAOConfig[];
  overrides?: Partial<CityBaseConfig>;
  interDAOProposalRate?: number;
  interDAOProposalConfig?: CityBaseConfig['interDAOProposalConfig'];
  marketConfig?: Record<string, unknown>;
  attackConfig?: CityAttackConfig;
  interDAODefense?: Record<string, unknown>;
}

export interface CityDAOConfig extends DAOConfig {
  quorumPercent?: number;
  initialTokenPrice?: number;
  simulationParams?: Partial<SimulationSettings>;
  features?: Record<string, unknown>;
  tokenDistribution?: Record<string, unknown>;
}

export interface BaseConfigOverrides extends Partial<DAOSimulationConfig> {
}

/**
 * Simulation-level overrides not part of the base config
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
 * Configuration for sweeping parameter(s) across values
 * Supports single-parameter sweeps or multi-parameter grid searches
 */
export interface SweepConfig {
  // === Single Parameter Sweep (original) ===
  // Path to the parameter (dot notation, e.g., "governance_config.quorumPercentage")
  parameter?: string;

  // Option 1: Explicit values
  values?: (number | string | boolean)[];

  // Option 2: Range (for numeric parameters)
  range?: RangeSpec;

  // === Multi-Parameter Grid Search (new) ===
  // Array of parameters to sweep together (creates Cartesian product)
  grid?: GridParameter[];

  // Sweep type: 'grid' (Cartesian product, default) or 'zip' (parallel iteration)
  type?: 'grid' | 'zip';
}

/**
 * A single parameter in a multi-parameter grid search
 */
export interface GridParameter {
  // Path to the parameter (dot notation)
  parameter: string;

  // Label for this parameter in results (optional, defaults to parameter path)
  label?: string;

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

  // Per-run timeout used by the batch runner (milliseconds)
  runTimeoutMs?: number;

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
 * Organized by category for academic research validity
 */
export type BuiltinMetricType =
  // === Basic Outcome Metrics ===
  | 'proposal_pass_rate'
  | 'average_turnout'
  | 'final_treasury'
  | 'final_token_price'
  | 'final_member_count'
  | 'final_gini'
  | 'final_reputation_gini'
  | 'total_proposals'
  | 'total_projects'
  | 'average_token_balance'

  // === Governance Efficiency Metrics ===
  | 'quorum_reach_rate'           // % of proposals that met quorum threshold
  | 'avg_margin_of_victory'       // Average (votesFor - votesAgainst) / totalVotes
  | 'avg_time_to_decision'        // Average steps from creation to resolution
  | 'proposal_abandonment_rate'   // % of proposals that expired without resolution
  | 'proposal_rejection_rate'     // % of resolved proposals that were rejected
  | 'governance_overhead'         // Total votes cast / proposals resolved (effort per decision)

  // === Participation Quality Metrics ===
  | 'unique_voter_count'          // Number of distinct members who voted at least once
  | 'voter_participation_rate'    // unique_voters / total_members
  | 'voter_concentration_gini'    // Gini coefficient of voting activity distribution
  | 'delegate_concentration'      // % of total votes controlled by top 10% of voters
  | 'avg_votes_per_proposal'      // Average number of unique voters per proposal
  | 'voter_retention_rate'        // % of voters who voted in both first and last half
  | 'voting_power_utilization'    // % of total voting power actually used

  // === Economic Health Metrics ===
  | 'treasury_volatility'         // Coefficient of variation of treasury over time
  | 'treasury_growth_rate'        // (final - initial) / initial treasury
  | 'emergency_topup_total'       // Total tokens created via emergency treasury topups
  | 'staking_participation'       // stakedTokens / totalTokens
  | 'token_concentration_gini'    // Gini of token holdings (same as final_gini but explicit)
  | 'avg_member_wealth'           // Average tokens per member
  | 'wealth_mobility'             // How much token rankings changed over simulation

  // === Attack Resistance Metrics ===
  | 'whale_influence'             // % of total votes from top 10% token holders
  | 'whale_proposal_rate'         // % of proposals created by top 10% holders
  | 'governance_capture_risk'     // Concentration of proposal creation (Gini)
  | 'vote_buying_vulnerability'   // Avg tokens needed to flip a close vote
  | 'single_entity_control'       // Max % of votes any single member could cast
  | 'collusion_threshold'         // Min % of members needed to control majority

  // === Temporal Dynamics Metrics ===
  | 'participation_trend'         // Slope of participation over time (+ = increasing)
  | 'treasury_trend'              // Slope of treasury over time
  | 'member_growth_rate'          // (final - initial) / initial members
  | 'proposal_rate'               // Proposals per 100 steps
  | 'governance_activity_index'   // Composite: proposals * participation * resolution

  // === Multi-DAO / Market Metrics ===
  | 'token_price_change'
  | 'token_price_volatility'
  | 'price_governance_correlation'
  | 'final_market_rank'
  | 'market_cap'
  | 'trading_volume'
  | 'net_member_flow'
  | 'total_market_cap'
  | 'market_concentration'
  | 'price_dispersion'
  | 'total_ecosystem_members'
  | 'ecosystem_member_gini'
  | 'dao_dominance_index'

  // === Inter-DAO / Ecosystem Governance ===
  | 'inter_dao_proposal_count'
  | 'inter_dao_proposal_success_rate'
  | 'collaboration_proposal_rate'
  | 'treaty_proposal_rate'
  | 'resource_sharing_rate'
  | 'joint_venture_rate'
  | 'inter_dao_voting_participation'
  | 'cross_dao_approval_alignment'
  | 'total_shared_budget'
  | 'resource_flow_volume'
  | 'ecosystem_treasury_total'

  // === Attack / Security Metrics ===
  | 'attack_attempts'
  | 'successful_attacks'
  | 'attack_success_rate'
  | 'attack_detection_rate'
  | 'attack_mitigation_rate'
  | 'treasury_loss'
  | 'malicious_proposal_pass_rate'
  | 'veto_actions'
  | 'cross_dao_alerts'
  | 'coordinated_defense_actions'
  | 'ecosystem_survival_rate'
  | 'ecosystem_recovery_time'

  // === Transfer / Contagion Metrics ===
  | 'participation_convergence'
  | 'governance_quality_variance'
  | 'transferred_member_impact'
  | 'transfer_count'
  | 'transfer_origin_distribution'
  | 'transfer_request_count'
  | 'transfer_completion_rate'

  // === LLM Agent Metrics ===
  | 'llm_vote_consistency'        // % of LLM votes matching rule-based prediction
  | 'llm_cache_hit_rate'          // Cache hits / total requests
  | 'llm_avg_latency_ms';        // Average LLM response time

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

  // Optional scope for multi-DAO experiments
  scope?: 'per_dao' | 'ecosystem';
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
  config: DAOSimulationConfig | DAOCityConfig;
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

  // Statistical significance analysis (across sweep values)
  statisticalSignificance?: StatisticalSignificance;

  // Reproducibility manifest
  manifest: ReproducibilityManifest;
}

/**
 * Confidence interval for a metric
 */
export interface ConfidenceIntervalResult {
  lower: number;
  upper: number;
  level: number;
}

/**
 * Full statistical analysis for a single metric
 */
export interface MetricStatistics {
  name: string;
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  values: number[];

  // Extended statistics for academic rigor
  standardError: number;
  ci95: ConfidenceIntervalResult;
  ci99: ConfidenceIntervalResult;
  bootstrapCi95?: ConfidenceIntervalResult;
  bootstrapCi99?: ConfidenceIntervalResult;
  coefficientOfVariation: number;  // std/mean - measure of consistency
  skewness: number;  // distribution symmetry
  iqr?: number;      // robust spread (75th - 25th percentile)
}

/**
 * Effect size comparison between sweep values
 */
export interface EffectSizeResult {
  cohensD: number;
  interpretation: 'negligible' | 'small' | 'medium' | 'large' | 'very_large';
}

/**
 * Statistical comparison between two groups (sweep values)
 */
export interface SweepComparison {
  sweepValue1: number | string | boolean;
  sweepValue2: number | string | boolean;
  metricName: string;
  tStatistic: number;
  degreesOfFreedom: number;
  pValue: number;
  correctedPValue?: number;
  correctionMethod?: string;
  significant: boolean;
  effectSize: EffectSizeResult;
}

/**
 * Power analysis for the experiment
 */
export interface PowerAnalysisResult {
  currentRunsPerConfig: number;
  recommendedRuns: number;
  currentPower: number;
  minimumEffectDetectable: number;
  explanation: string;
}

/**
 * Summary statistics for a single sweep value (or entire experiment if no sweep)
 */
export interface MetricsSummary {
  sweepValue?: number | string | boolean;
  runCount: number;
  metrics: MetricStatistics[];

  // Power analysis for this configuration
  powerAnalysis?: PowerAnalysisResult;
}

/**
 * Complete statistical analysis across all sweep values
 */
export interface StatisticalSignificance {
  // Pairwise comparisons between sweep values
  pairwiseComparisons: SweepComparison[];

  // ANOVA results (if 3+ sweep values)
  anova?: {
    metricName: string;
    fStatistic: number;
    dfBetween: number;
    dfWithin: number;
    pValue: number;
    significant: boolean;
    // Effect sizes
    etaSquared?: number;
    omegaSquared?: number;
    effectSizeInterpretation?: string;
    // Non-parametric alternative (for non-normal data)
    kruskalWallis?: {
      hStatistic: number;
      pValue: number;
      significant: boolean;
    };
    nonNormalWarning?: boolean;
  }[];

  // Overall power analysis
  overallPowerAnalysis: PowerAnalysisResult;

  // Recommendations
  recommendations: string[];
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
