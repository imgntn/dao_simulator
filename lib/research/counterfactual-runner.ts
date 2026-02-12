/**
 * Counterfactual Governance Runner
 *
 * Runs "what if DAO X used governance rule Y" experiments by:
 * 1. Loading a DAO's calibration profile
 * 2. Running N episodes with the baseline governance rule (DAO's real rule)
 * 3. Running N episodes for each alternative governance rule
 * 4. Computing structured comparison metrics (deltas, emergent metrics)
 */

import { DAOSimulation, type DAOSimulationConfig } from '../engine/simulation';
import { CalibrationLoader } from '../digital-twins/calibration-loader';
import type { CalibrationProfile } from '../digital-twins/calibration-loader';
import { getGovernanceMapping } from '../digital-twins/governance-mapping';
import {
  compareToHistorical,
  extractSimulationMetrics,
  type AccuracyReport,
} from './accuracy-metrics';
import type { GovernanceRuleConfig } from '../utils/governance-plugins';

// =============================================================================
// TYPES
// =============================================================================

export interface CounterfactualConfig {
  /** Base DAO to model */
  daoId: string;
  /** Override baseline rule (default: DAO's real governance rule) */
  baselineRule?: string;
  /** Baseline rule config override */
  baselineConfig?: GovernanceRuleConfig;
  /** Rules to compare against the baseline */
  alternativeRules: string[];
  /** Number of episodes per configuration */
  episodes: number;
  /** Steps per episode */
  stepsPerEpisode: number;
  /** RNG seed for reproducibility */
  seed?: number;
  /** Oracle type (default: calibrated_gbm) */
  oracleType?: 'random_walk' | 'gbm' | 'calibrated_gbm';
  /** Enable forum simulation (default: true) */
  forumEnabled?: boolean;
}

export interface EmergentMetrics {
  /** Fraction of proposals that passed (approved / (approved + rejected)) */
  passRate: number;
  /** Average steps from proposal creation to final status change */
  avgTimeToDecision: number;
  /** Gini coefficient of vote impact across voters */
  minorityInfluence: number;
  /** Proposals decided (approved + rejected) per 100 steps */
  proposalThroughput: number;
  /** Fraction of proposals that expired without decision */
  expirationRate: number;
}

export interface CounterfactualArm {
  ruleName: string;
  report: AccuracyReport;
  emergentMetrics: EmergentMetrics;
}

export interface CounterfactualResult {
  daoId: string;
  episodes: number;
  stepsPerEpisode: number;
  baseline: CounterfactualArm;
  alternatives: Array<CounterfactualArm & {
    /** Difference from baseline for key metrics */
    delta: Record<string, number>;
  }>;
}

// =============================================================================
// EMERGENT METRICS EXTRACTION
// =============================================================================

/**
 * Extract governance-specific emergent metrics from simulation results.
 */
export function extractEmergentMetrics(
  proposals: Array<{
    status: string;
    creationTime?: number;
    resolutionTime?: number;
    votesFor?: number;
    votesAgainst?: number;
    votes?: Map<string, unknown>;
  }>,
  totalSteps: number,
  memberCount: number
): EmergentMetrics {
  const resolved = proposals.filter(p =>
    p.status === 'approved' || p.status === 'rejected' || p.status === 'expired'
  );

  const decided = resolved.filter(p =>
    p.status === 'approved' || p.status === 'rejected'
  );
  const approved = decided.filter(p => p.status === 'approved');
  const expired = resolved.filter(p => p.status === 'expired');

  // Pass rate: approved / decided (excluding expired)
  const passRate = decided.length > 0 ? approved.length / decided.length : 0.5;

  // Average time to decision
  let totalDecisionTime = 0;
  let decisionCount = 0;
  for (const p of resolved) {
    if (p.creationTime !== undefined && p.resolutionTime !== undefined) {
      totalDecisionTime += p.resolutionTime - p.creationTime;
      decisionCount++;
    }
  }
  const avgTimeToDecision = decisionCount > 0 ? totalDecisionTime / decisionCount : 0;

  // Minority influence: Gini coefficient of vote weights
  // Approximate from vote counts per proposal
  const voteWeights: number[] = [];
  for (const p of decided) {
    const total = (p.votesFor || 0) + (p.votesAgainst || 0);
    if (total > 0 && p.votes) {
      // Each voter's weight (uniform approximation)
      for (const [,] of p.votes) {
        voteWeights.push(1);
      }
    }
  }
  const minorityInfluence = voteWeights.length > 0 ? giniCoefficient(voteWeights) : 0;

  // Proposal throughput: decided per 100 steps
  const proposalThroughput = totalSteps > 0 ? (decided.length / totalSteps) * 100 : 0;

  // Expiration rate
  const expirationRate = resolved.length > 0 ? expired.length / resolved.length : 0;

  return {
    passRate,
    avgTimeToDecision,
    minorityInfluence,
    proposalThroughput,
    expirationRate,
  };
}

function giniCoefficient(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  if (sum === 0) return 0;
  let numerator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i + 1) * sorted[i];
  }
  return Math.max(0, Math.min(1, (2 * numerator) / (n * sum) - (n + 1) / n));
}

// =============================================================================
// COUNTERFACTUAL RUNNER
// =============================================================================

export class CounterfactualRunner {
  /**
   * Run a counterfactual governance experiment.
   *
   * Runs the baseline governance rule and each alternative for N episodes,
   * then computes deltas and emergent metrics.
   */
  async runCounterfactual(config: CounterfactualConfig): Promise<CounterfactualResult> {
    const profile = CalibrationLoader.load(config.daoId);
    if (!profile) {
      throw new Error(`No calibration profile found for DAO: ${config.daoId}`);
    }

    // Determine baseline rule
    const mapping = getGovernanceMapping(config.daoId);
    const baselineRuleName = config.baselineRule || mapping?.ruleName || 'majority';

    // Run baseline
    const baseline = await this.runArm(
      config, profile, baselineRuleName, config.baselineConfig
    );

    // Run alternatives
    const alternatives: CounterfactualResult['alternatives'] = [];
    for (const altRule of config.alternativeRules) {
      if (altRule === baselineRuleName) continue; // skip if same as baseline

      const arm = await this.runArm(config, profile, altRule);

      // Compute deltas from baseline
      const delta: Record<string, number> = {
        passRate: arm.emergentMetrics.passRate - baseline.emergentMetrics.passRate,
        avgTimeToDecision: arm.emergentMetrics.avgTimeToDecision - baseline.emergentMetrics.avgTimeToDecision,
        minorityInfluence: arm.emergentMetrics.minorityInfluence - baseline.emergentMetrics.minorityInfluence,
        proposalThroughput: arm.emergentMetrics.proposalThroughput - baseline.emergentMetrics.proposalThroughput,
        expirationRate: arm.emergentMetrics.expirationRate - baseline.emergentMetrics.expirationRate,
        overallScore: arm.report.overall_score - baseline.report.overall_score,
      };

      alternatives.push({ ...arm, delta });
    }

    return {
      daoId: config.daoId,
      episodes: config.episodes,
      stepsPerEpisode: config.stepsPerEpisode,
      baseline,
      alternatives,
    };
  }

  /**
   * Run a single arm of the experiment (one governance rule, N episodes).
   */
  private async runArm(
    config: CounterfactualConfig,
    profile: CalibrationProfile,
    ruleName: string,
    ruleConfig?: GovernanceRuleConfig
  ): Promise<CounterfactualArm> {
    const reports: AccuracyReport[] = [];
    const allEmergent: EmergentMetrics[] = [];

    for (let episode = 0; episode < config.episodes; episode++) {
      const simConfig: DAOSimulationConfig = {
        seed: config.seed !== undefined ? config.seed + episode : undefined,
        calibration_dao_id: config.daoId,
        oracle_type: config.oracleType ?? 'calibrated_gbm',
        forum_enabled: config.forumEnabled ?? true,
        forum_influence_weight: 0.3,
        learning_enabled: false,
        governance_rule: ruleName,
        calibration_use_real_governance: true,
      };

      if (ruleConfig) {
        simConfig.governance_config = ruleConfig;
      }

      // Apply calibrated settings
      const calibratedSettings = CalibrationLoader.toSettings(profile);
      // Don't let calibrated governance_rule override the explicit rule
      delete calibratedSettings.governance_rule;
      Object.assign(simConfig, calibratedSettings);
      // Restore the explicit rule
      simConfig.governance_rule = ruleName;

      const sim = new DAOSimulation(simConfig);
      await sim.run(config.stepsPerEpisode);

      // Extract accuracy metrics
      const metrics = extractSimulationMetrics(
        sim.dataCollector,
        config.stepsPerEpisode,
        sim.dao.proposals,
        sim.dao.members.length
      );
      const report = compareToHistorical(metrics, profile);
      reports.push(report);

      // Extract emergent metrics
      const emergent = extractEmergentMetrics(
        sim.dao.proposals,
        config.stepsPerEpisode,
        sim.dao.members.length
      );
      allEmergent.push(emergent);
    }

    // Average reports
    const avgReport = this.averageReports(reports, profile.dao_id);
    const avgEmergent = this.averageEmergentMetrics(allEmergent);

    return {
      ruleName,
      report: avgReport,
      emergentMetrics: avgEmergent,
    };
  }

  private averageReports(reports: AccuracyReport[], daoId: string): AccuracyReport {
    const n = reports.length;
    if (n === 0) {
      return {
        dao_id: daoId,
        period: { start: 'none', end: 'none' },
        metrics: {
          proposal_frequency_error: 1,
          pass_rate_error: 1,
          participation_rate_error: 1,
          price_trajectory_rmse: 1,
          voter_concentration_error: 1,
          forum_activity_error: 1,
        },
        overall_score: 0,
        details: {},
      };
    }

    const avgMetrics = {
      proposal_frequency_error: 0,
      pass_rate_error: 0,
      participation_rate_error: 0,
      price_trajectory_rmse: 0,
      voter_concentration_error: 0,
      forum_activity_error: 0,
    };

    let avgScore = 0;
    for (const report of reports) {
      avgMetrics.proposal_frequency_error += report.metrics.proposal_frequency_error;
      avgMetrics.pass_rate_error += report.metrics.pass_rate_error;
      avgMetrics.participation_rate_error += report.metrics.participation_rate_error;
      avgMetrics.price_trajectory_rmse += report.metrics.price_trajectory_rmse;
      avgMetrics.voter_concentration_error += report.metrics.voter_concentration_error;
      avgMetrics.forum_activity_error += report.metrics.forum_activity_error;
      avgScore += report.overall_score;
    }

    return {
      dao_id: daoId,
      period: { start: `avg_${n}_episodes`, end: `avg_${n}_episodes` },
      metrics: {
        proposal_frequency_error: avgMetrics.proposal_frequency_error / n,
        pass_rate_error: avgMetrics.pass_rate_error / n,
        participation_rate_error: avgMetrics.participation_rate_error / n,
        price_trajectory_rmse: avgMetrics.price_trajectory_rmse / n,
        voter_concentration_error: avgMetrics.voter_concentration_error / n,
        forum_activity_error: avgMetrics.forum_activity_error / n,
      },
      overall_score: avgScore / n,
      details: {},
    };
  }

  private averageEmergentMetrics(metrics: EmergentMetrics[]): EmergentMetrics {
    const n = metrics.length;
    if (n === 0) {
      return {
        passRate: 0.5,
        avgTimeToDecision: 0,
        minorityInfluence: 0,
        proposalThroughput: 0,
        expirationRate: 0,
      };
    }

    return {
      passRate: metrics.reduce((s, m) => s + m.passRate, 0) / n,
      avgTimeToDecision: metrics.reduce((s, m) => s + m.avgTimeToDecision, 0) / n,
      minorityInfluence: metrics.reduce((s, m) => s + m.minorityInfluence, 0) / n,
      proposalThroughput: metrics.reduce((s, m) => s + m.proposalThroughput, 0) / n,
      expirationRate: metrics.reduce((s, m) => s + m.expirationRate, 0) / n,
    };
  }
}
