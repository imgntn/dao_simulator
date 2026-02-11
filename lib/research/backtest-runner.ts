/**
 * Backtest Runner
 *
 * Runs simulations against historical data to verify that calibrated
 * digital twins reproduce real DAO dynamics within statistical bounds.
 */

import { DAOSimulation, type DAOSimulationConfig } from '../engine/simulation';
import { CalibrationLoader } from '../digital-twins/calibration-loader';
import type { CalibrationProfile } from '../digital-twins/calibration-loader';
import {
  compareToHistorical,
  extractSimulationMetrics,
  type AccuracyReport,
} from './accuracy-metrics';

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
}

// =============================================================================
// BACKTEST RUNNER
// =============================================================================

export class BacktestRunner {
  /**
   * Run a backtest: N episodes of simulation compared to historical data.
   */
  async runBacktest(config: BacktestConfig): Promise<BacktestResult> {
    const profile = CalibrationLoader.load(config.daoId);
    if (!profile) {
      throw new Error(`No calibration profile found for DAO: ${config.daoId}`);
    }

    const reports: AccuracyReport[] = [];

    for (let episode = 0; episode < config.episodes; episode++) {
      const simConfig: DAOSimulationConfig = {
        seed: config.seed !== undefined ? config.seed + episode : undefined,
        calibration_dao_id: config.daoId,
        oracle_type: config.oracleType ?? 'calibrated_gbm',
        forum_enabled: config.forumEnabled ?? true,
        forum_influence_weight: 0.3,
        learning_enabled: false,  // Disable Q-learning for calibration validation
      };

      // Apply calibrated settings
      const calibratedSettings = CalibrationLoader.toSettings(profile);
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
      const report = compareToHistorical(metrics, profile);
      report.period = {
        start: `episode_${episode}`,
        end: `step_${config.stepsPerEpisode}`,
      };
      reports.push(report);
    }

    // Compute averages
    const averageReport = this.averageReports(reports, profile.dao_id);
    const scores = reports.map(r => r.overall_score);

    return {
      daoId: config.daoId,
      episodes: config.episodes,
      stepsPerEpisode: config.stepsPerEpisode,
      reports,
      averageReport,
      bestScore: Math.max(...scores),
      worstScore: Math.min(...scores),
      stdDevScore: this.stdDev(scores),
    };
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

  private stdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
    return Math.sqrt(variance);
  }
}
