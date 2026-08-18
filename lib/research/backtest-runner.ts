/**
 * Backtest Runner
 *
 * Runs simulations against historical data to verify that calibrated
 * digital twins reproduce real DAO dynamics within statistical bounds.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { DAOSimulationConfig } from '../engine/simulation';
import { CalibrationLoader } from '../digital-twins/calibration-loader';
import type { CalibrationProfile } from '../digital-twins/calibration-loader';
import {
  compareToHistorical,
  extractSimulationMetrics,
  type AccuracyReport,
  type AccuracyMetricId,
} from './accuracy-metrics';
import { assertPublicationCalibrationProfile } from './calibration-profile-validator';

// =============================================================================
// TYPES
// =============================================================================

export interface BacktestConfig {
  daoId: string;
  episodes: number;
  stepsPerEpisode: number;
  seed?: number;
  oracleType?: 'random_walk' | 'gbm' | 'calibrated_gbm';
  forumEnabled?: boolean;
  /** Override governance rule (e.g. for counterfactual experiments) */
  governanceRule?: string;
  /** Override governance rule config */
  governanceConfig?: import('../utils/governance-plugins').GovernanceRuleConfig;
  /** Use real governance rules from governance-mapping.ts */
  useRealGovernance?: boolean;
  /**
   * Publication validation defaults to a chronological train/holdout design.
   * The aggregate mode is retained only for explicitly labelled diagnostics.
   */
  evaluationMode?: 'temporal_holdout' | 'aggregate_diagnostic';
  trainingProfileDir?: string;
  holdoutProfileDir?: string;
  /** Run a seed-paired uncalibrated simulator as a second null model. */
  includeUncalibratedNull?: boolean;
}

export interface ConfidenceInterval {
  mean: number;
  stdDev: number;
  ci95Lower: number;
  ci95Upper: number;
  standardError: number;
  sampleSize?: number;
}

export interface MetricConfidenceIntervals {
  overall_score: ConfidenceInterval;
  proposal_frequency_error: ConfidenceInterval;
  pass_rate_error: ConfidenceInterval;
  participation_rate_error: ConfidenceInterval;
  price_level_error: ConfidenceInterval;
  voter_concentration_error: ConfidenceInterval;
  forum_activity_error: ConfidenceInterval;
}

export interface BacktestResult {
  daoId: string;
  episodes: number;
  stepsPerEpisode: number;
  reports: AccuracyReport[];
  averageReport: AccuracyReport;
  bestScore: number;
  worstScore: number;
  stdDevScore: number;
  confidenceIntervals: MetricConfidenceIntervals;
  evaluation: {
    design: 'temporal_holdout' | 'aggregate_diagnostic';
    trainingPeriod: { start: string | null; end: string | null } | null;
    evaluationPeriod: { start: string | null; end: string | null } | null;
    targetUse: 'held_out' | 'same_profile_diagnostic';
    calibratedScore: number;
    historicalPersistenceScore: number;
    uncalibratedScore: number | null;
    absoluteSkillVsPersistence: number;
    normalizedSkillVsPersistence: number;
    absoluteSkillVsUncalibrated: number | null;
    normalizedSkillVsUncalibrated: number | null;
    skillVsPersistenceCI: ConfidenceInterval;
    skillVsUncalibratedCI: ConfidenceInterval | null;
    historicalPersistenceReport: AccuracyReport;
    uncalibratedAverageReport: AccuracyReport | null;
    sourceChecksums: {
      training: Record<string, { path: string; sha256: string; bytes?: number }> | null;
      evaluation: Record<string, { path: string; sha256: string; bytes?: number }> | null;
    };
  };
}

// =============================================================================
// BACKTEST RUNNER
// =============================================================================

export class BacktestRunner {
  /**
   * Run a backtest: N episodes of simulation compared to historical data.
   */
  async runBacktest(config: BacktestConfig): Promise<BacktestResult> {
    const design = config.evaluationMode ?? 'temporal_holdout';
    const aggregateProfile = CalibrationLoader.load(config.daoId);
    if (!aggregateProfile) {
      throw new Error(`No calibration profile found for DAO: ${config.daoId}`);
    }
    const trainingProfile = design === 'temporal_holdout'
      ? this.loadPartitionProfile(
        config.trainingProfileDir
          ?? path.join(process.cwd(), 'results', 'historical', 'validation', 'train'),
        config.daoId,
        'training'
      )
      : aggregateProfile;
    const evaluationProfile = design === 'temporal_holdout'
      ? this.loadPartitionProfile(
        config.holdoutProfileDir
          ?? path.join(process.cwd(), 'results', 'historical', 'validation', 'holdout'),
        config.daoId,
        'holdout'
      )
      : aggregateProfile;
    if (design === 'temporal_holdout') {
      this.assertChronologicalPartition(trainingProfile, evaluationProfile);
    }

    // Load the heavy simulation engine only after we know the DAO is valid.
    const { DAOSimulation } = await import('../engine/simulation');

    const reports: AccuracyReport[] = [];
    const uncalibratedReports: AccuracyReport[] = [];
    const includeUncalibratedNull = config.includeUncalibratedNull
      ?? design === 'temporal_holdout';

    for (let episode = 0; episode < config.episodes; episode++) {
      const episodeSeed = config.seed !== undefined ? config.seed + episode : undefined;
      const simConfig: DAOSimulationConfig = {
        seed: episodeSeed,
        calibration_dao_id: config.daoId,
        calibration_profile_override: trainingProfile,
        oracle_type: config.oracleType ?? 'calibrated_gbm',
        forum_enabled: config.forumEnabled ?? true,
        forum_influence_weight: 0.3,
        learning_enabled: false,  // Disable Q-learning for calibration validation
      };

      // Pass governance overrides if specified
      if (config.governanceRule) {
        simConfig.governance_rule = config.governanceRule;
      }
      if (config.governanceConfig) {
        simConfig.governance_config = config.governanceConfig;
      }
      if (config.useRealGovernance !== undefined) {
        simConfig.calibration_use_real_governance = config.useRealGovernance;
      }

      // Apply calibrated settings
      const calibratedSettings = CalibrationLoader.toSettings(trainingProfile);
      Object.assign(simConfig, calibratedSettings);

      const sim = new DAOSimulation(simConfig);
      await sim.run(config.stepsPerEpisode);

      // Extract metrics from simulation with actual proposal/voting data
      const metrics = extractSimulationMetrics(
        sim.dataCollector,
        config.stepsPerEpisode,
        sim.dao.proposals,
        sim.dao.members.length
      );

      // Compare to historical
      const report = compareToHistorical(metrics, evaluationProfile);
      report.period = {
        start: `episode_${episode}`,
        end: `step_${config.stepsPerEpisode}`,
      };
      reports.push(report);

      if (includeUncalibratedNull) {
        const nullConfig: DAOSimulationConfig = {
          seed: episodeSeed,
          oracle_type: 'gbm',
          forum_enabled: config.forumEnabled ?? true,
          forum_influence_weight: 0.3,
          learning_enabled: false,
        };
        if (config.governanceRule) nullConfig.governance_rule = config.governanceRule;
        if (config.governanceConfig) nullConfig.governance_config = config.governanceConfig;
        const nullSim = new DAOSimulation(nullConfig);
        await nullSim.run(config.stepsPerEpisode);
        const nullMetrics = extractSimulationMetrics(
          nullSim.dataCollector,
          config.stepsPerEpisode,
          nullSim.dao.proposals,
          nullSim.dao.members.length
        );
        const nullReport = compareToHistorical(nullMetrics, evaluationProfile);
        nullReport.period = report.period;
        uncalibratedReports.push(nullReport);
      }
    }

    // Compute averages
    const averageReport = this.averageReports(reports, evaluationProfile.dao_id);
    const scores = reports.map(r => r.overall_score);

    const confidenceIntervals = this.computeConfidenceIntervals(reports, scores);

    const persistenceReport = compareToHistorical(
      this.profileAsPrediction(trainingProfile),
      evaluationProfile
    );
    persistenceReport.period = {
      start: 'training-profile-persistence',
      end: 'evaluation-profile',
    };
    const uncalibratedAverageReport = uncalibratedReports.length > 0
      ? this.averageReports(uncalibratedReports, evaluationProfile.dao_id)
      : null;
    const calibratedScore = averageReport.overall_score;
    const persistenceScore = persistenceReport.overall_score;
    const uncalibratedScore = uncalibratedAverageReport?.overall_score ?? null;
    const skillVsPersistenceCI = this.computeCI(
      reports.map(report => report.overall_score - persistenceScore)
    );
    const skillVsUncalibratedCI = uncalibratedReports.length === reports.length
      ? this.computeCI(
        reports.map(
          (report, index) => report.overall_score - uncalibratedReports[index].overall_score
        )
      )
      : null;

    return {
      daoId: config.daoId,
      episodes: config.episodes,
      stepsPerEpisode: config.stepsPerEpisode,
      reports,
      averageReport,
      bestScore: Math.max(...scores),
      worstScore: Math.min(...scores),
      stdDevScore: this.stdDev(scores),
      confidenceIntervals,
      evaluation: {
        design,
        trainingPeriod: this.profilePeriod(trainingProfile),
        evaluationPeriod: this.profilePeriod(evaluationProfile),
        targetUse: design === 'temporal_holdout' ? 'held_out' : 'same_profile_diagnostic',
        calibratedScore,
        historicalPersistenceScore: persistenceScore,
        uncalibratedScore,
        absoluteSkillVsPersistence: calibratedScore - persistenceScore,
        normalizedSkillVsPersistence: this.normalizedSkill(calibratedScore, persistenceScore),
        absoluteSkillVsUncalibrated: uncalibratedScore === null
          ? null
          : calibratedScore - uncalibratedScore,
        normalizedSkillVsUncalibrated: uncalibratedScore === null
          ? null
          : this.normalizedSkill(calibratedScore, uncalibratedScore),
        skillVsPersistenceCI,
        skillVsUncalibratedCI,
        historicalPersistenceReport: persistenceReport,
        uncalibratedAverageReport,
        sourceChecksums: {
          training: trainingProfile.calibration_metadata?.source_checksums ?? null,
          evaluation: evaluationProfile.calibration_metadata?.source_checksums ?? null,
        },
      },
    };
  }

  private loadPartitionProfile(
    directory: string,
    daoId: string,
    partitionName: string
  ): CalibrationProfile {
    const filePath = path.join(directory, `${daoId}_profile.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(
        `Missing ${partitionName} calibration profile for ${daoId}: ${filePath}. `
        + 'Regenerate chronological profiles before publication validation.'
      );
    }
    const profile = JSON.parse(fs.readFileSync(filePath, 'utf8')) as CalibrationProfile;
    if (profile.dao_id !== daoId) {
      throw new Error(
        `${partitionName} profile DAO mismatch: expected ${daoId}, received ${profile.dao_id}`
      );
    }
    assertPublicationCalibrationProfile(profile, {
      expectedDaoId: daoId,
      expectedPartition: partitionName === 'training' ? 'train' : 'holdout',
    });
    return profile;
  }

  private assertChronologicalPartition(
    training: CalibrationProfile,
    evaluation: CalibrationProfile
  ): void {
    const trainingPeriod = this.profilePeriod(training);
    const evaluationPeriod = this.profilePeriod(evaluation);
    if (!trainingPeriod?.end || !evaluationPeriod?.start) {
      throw new Error('Temporal holdout profiles must declare non-empty period metadata');
    }
    const trainingEnd = Date.parse(`${trainingPeriod.end}T23:59:59.999Z`);
    const evaluationStart = Date.parse(`${evaluationPeriod.start}T00:00:00.000Z`);
    if (!Number.isFinite(trainingEnd) || !Number.isFinite(evaluationStart)) {
      throw new Error('Temporal holdout profile periods must use YYYY-MM-DD dates');
    }
    if (trainingEnd >= evaluationStart) {
      throw new Error(
        `Training period overlaps evaluation period (${trainingPeriod.end} >= `
        + `${evaluationPeriod.start})`
      );
    }
  }

  private profilePeriod(
    profile: CalibrationProfile
  ): { start: string | null; end: string | null } | null {
    const period = profile.calibration_metadata?.period;
    return period ? { start: period.start, end: period.end } : null;
  }

  private profileAsPrediction(profile: CalibrationProfile) {
    return {
      proposalsPerMonth: profile.proposals.avg_proposals_per_month,
      passRate: profile.proposals.pass_rate,
      participationRate: profile.voting.avg_participation_rate,
      priceHistory: profile.market ? [profile.market.avg_price_usd] : [],
      voterConcentration: profile.voting.voter_concentration,
      forumTopicsPerMonth: profile.forum?.avg_topics_per_month ?? null,
      totalSteps: 0,
    };
  }

  private normalizedSkill(score: number, nullScore: number): number {
    const remainingPossibleGain = 1 - nullScore;
    if (remainingPossibleGain <= Number.EPSILON) {
      return score >= nullScore ? 0 : score - nullScore;
    }
    return (score - nullScore) / remainingPossibleGain;
  }

  /**
   * Run backtests for all available DAOs
   */
  async runAllBacktests(
    episodes: number = 10,
    stepsPerEpisode: number = 720
  ): Promise<Map<string, BacktestResult>> {
    const results = new Map<string, BacktestResult>();
    const availableIds = CalibrationLoader.getAvailableIds();

    for (const daoId of availableIds) {
      try {
        const result = await this.runBacktest({
          daoId,
          episodes,
          stepsPerEpisode,
          seed: 42,
        });
        results.set(daoId, result);
      } catch (error) {
        console.error(`Backtest failed for ${daoId}:`, error);
      }
    }

    return results;
  }

  /**
   * Average multiple accuracy reports into one
   */
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
          price_level_error: 1,
          voter_concentration_error: 1,
          forum_activity_error: 1,
        },
        overall_score: 0,
        details: {},
        available_metrics: [],
      };
    }

    const avgMetrics = {
      proposal_frequency_error: 0,
      pass_rate_error: 0,
      participation_rate_error: 0,
      price_level_error: 0,
      voter_concentration_error: 0,
      forum_activity_error: 0,
    };
    const metricIds = Object.keys(avgMetrics) as AccuracyMetricId[];
    const metricCounts = Object.fromEntries(
      metricIds.map(metric => [metric, 0])
    ) as Record<AccuracyMetricId, number>;

    const detailSums: Record<string, number> = {};
    const detailCounts: Record<string, number> = {};

    let avgScore = 0;

    for (const report of reports) {
      for (const metric of metricIds) {
        if (
          report.available_metrics
          && !report.available_metrics.includes(metric)
        ) {
          continue;
        }
        avgMetrics[metric] += report.metrics[metric];
        metricCounts[metric] += 1;
      }
      avgScore += report.overall_score;

      for (const [key, value] of Object.entries(report.details)) {
        if (typeof value !== 'number' || !isFinite(value)) continue;
        detailSums[key] = (detailSums[key] ?? 0) + value;
        detailCounts[key] = (detailCounts[key] ?? 0) + 1;
      }
    }

    const averagedDetails: Record<string, number> = {};
    for (const key of Object.keys(detailSums)) {
      averagedDetails[key] = detailSums[key] / detailCounts[key];
    }

    return {
      dao_id: daoId,
      period: { start: `avg_${n}_episodes`, end: `avg_${n}_episodes` },
      metrics: Object.fromEntries(metricIds.map(metric => [
        metric,
        metricCounts[metric] > 0
          ? avgMetrics[metric] / metricCounts[metric]
          : 0,
      ])) as AccuracyReport['metrics'],
      overall_score: avgScore / n,
      details: averagedDetails,
      available_metrics: metricIds.filter(metric => metricCounts[metric] > 0),
    };
  }

  private computeConfidenceIntervals(
    reports: AccuracyReport[],
    scores: number[]
  ): MetricConfidenceIntervals {
    return {
      overall_score: this.computeCI(scores),
      proposal_frequency_error: this.metricCI(reports, 'proposal_frequency_error'),
      pass_rate_error: this.metricCI(reports, 'pass_rate_error'),
      participation_rate_error: this.metricCI(reports, 'participation_rate_error'),
      price_level_error: this.metricCI(reports, 'price_level_error'),
      voter_concentration_error: this.metricCI(reports, 'voter_concentration_error'),
      forum_activity_error: this.metricCI(reports, 'forum_activity_error'),
    };
  }

  private metricCI(
    reports: AccuracyReport[],
    metric: AccuracyMetricId
  ): ConfidenceInterval {
    return this.computeCI(
      reports
        .filter(report => (
          !report.available_metrics
          || report.available_metrics.includes(metric)
        ))
        .map(report => report.metrics[metric])
    );
  }

  private computeCI(values: number[]): ConfidenceInterval {
    const n = values.length;
    const mean = n > 0 ? values.reduce((a, b) => a + b, 0) / n : 0;
    const sd = this.stdDev(values);
    const se = n > 0 ? sd / Math.sqrt(n) : 0;
    const criticalValue = this.tCritical95(n);
    return {
      mean,
      stdDev: sd,
      ci95Lower: mean - criticalValue * se,
      ci95Upper: mean + criticalValue * se,
      standardError: se,
      sampleSize: n,
    };
  }

  private tCritical95(sampleSize: number): number {
    if (sampleSize < 2) return 0;
    const degreesOfFreedom = sampleSize - 1;
    const criticalValues = [
      12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262,
      2.228, 2.201, 2.179, 2.160, 2.145, 2.131, 2.120, 2.110, 2.101,
      2.093, 2.086, 2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052,
      2.048, 2.045, 2.042,
    ];
    return degreesOfFreedom <= criticalValues.length
      ? criticalValues[degreesOfFreedom - 1]
      : 1.96;
  }

  private stdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
    return Math.sqrt(variance);
  }
}
