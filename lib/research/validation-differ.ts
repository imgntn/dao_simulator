/**
 * ValidationDiffer
 *
 * Compares a ValidationRun against the stored calibration baseline and
 * emits a structured DiffReport. Regression detection has three layers:
 *
 *   1. score_drop      — current score is more than DAO_SUITE_CONFIG[dao].dropThreshold
 *                        below the baseline mean.
 *   2. ci_violation    — current score falls outside the baseline 95% CI
 *                        widened by METRIC_THRESHOLD_MULTIPLIER.
 *   3. metric_regression — per-sub-metric drift (priceRmse, passRate, etc.)
 *                          beyond a metric-specific threshold.
 *
 * Improvements are also tracked — useful both for the report and for the
 * `accept-baseline` flow.
 */

import {
  DAO_SUITE_CONFIG,
  METRIC_THRESHOLD_MULTIPLIER,
} from './baseline-config';
import type {
  CalibrationBaseline,
  DaoBaseline,
  DaoValidationResult,
  ValidationRun,
} from './baseline-schema';

export type RegressionKind = 'score_drop' | 'ci_violation' | 'metric_regression';

export interface DaoDiffEntry {
  daoId: string;
  baselineScore: number;
  currentScore: number;
  delta: number;
  kind?: RegressionKind;
  details?: string;
}

export interface DiffReport {
  baselineVersion: number;
  runId: string;
  regressions: DaoDiffEntry[];
  improvements: DaoDiffEntry[];
  flat: DaoDiffEntry[];
  missingFromBaseline: string[];
  missingFromRun: string[];
}

export class ValidationDiffer {
  diff(run: ValidationRun, baseline: CalibrationBaseline): DiffReport {
    const regressions: DaoDiffEntry[] = [];
    const improvements: DaoDiffEntry[] = [];
    const flat: DaoDiffEntry[] = [];
    const missingFromBaseline: string[] = [];
    const missingFromRun: string[] = [];

    for (const daoId of Object.keys(run.perDao)) {
      const current = run.perDao[daoId];
      const base = baseline.perDao[daoId];
      if (!base) {
        missingFromBaseline.push(daoId);
        continue;
      }

      const regression = this.detectRegression(daoId, current, base);
      if (regression) {
        regressions.push(regression);
        continue;
      }

      const delta = current.score - base.score;
      const entry: DaoDiffEntry = {
        daoId,
        baselineScore: base.score,
        currentScore: current.score,
        delta,
      };

      if (delta > 0.01) {
        improvements.push(entry);
      } else {
        flat.push(entry);
      }
    }

    for (const baselineDaoId of Object.keys(baseline.perDao)) {
      if (!(baselineDaoId in run.perDao)) {
        missingFromRun.push(baselineDaoId);
      }
    }

    return {
      baselineVersion: baseline.version,
      runId: run.runId,
      regressions,
      improvements,
      flat,
      missingFromBaseline,
      missingFromRun,
    };
  }

  private detectRegression(
    daoId: string,
    current: DaoValidationResult,
    base: DaoBaseline,
  ): DaoDiffEntry | null {
    const suiteConfig = DAO_SUITE_CONFIG[daoId];
    const dropThreshold = suiteConfig?.dropThreshold ?? 0.02;
    const delta = current.score - base.score;

    if (delta < -dropThreshold) {
      return {
        daoId,
        baselineScore: base.score,
        currentScore: current.score,
        delta,
        kind: 'score_drop',
        details: `score dropped ${(-delta).toFixed(3)} (threshold ${dropThreshold})`,
      };
    }

    const ci = base.ci95.overall_score;
    const widenedLower = ci.ci95Lower - (ci.ci95Upper - ci.ci95Lower) * (METRIC_THRESHOLD_MULTIPLIER - 1) / 2;
    if (current.score < widenedLower) {
      return {
        daoId,
        baselineScore: base.score,
        currentScore: current.score,
        delta,
        kind: 'ci_violation',
        details: `score ${current.score.toFixed(3)} below widened CI lower ${widenedLower.toFixed(3)}`,
      };
    }

    const metricIssue = this.detectMetricRegression(current, base);
    if (metricIssue) {
      return {
        daoId,
        baselineScore: base.score,
        currentScore: current.score,
        delta,
        kind: 'metric_regression',
        details: metricIssue,
      };
    }

    return null;
  }

  private detectMetricRegression(
    current: DaoValidationResult,
    base: DaoBaseline,
  ): string | null {
    const checks: Array<{ name: string; cur: number; baseline: number; ciWidth: number; relative: boolean }> = [
      { name: 'passRate', cur: current.passRate, baseline: base.passRate, ciWidth: base.ci95.pass_rate_error.ci95Upper - base.ci95.pass_rate_error.ci95Lower, relative: true },
      { name: 'participation', cur: current.participation, baseline: base.participation, ciWidth: base.ci95.participation_rate_error.ci95Upper - base.ci95.participation_rate_error.ci95Lower, relative: true },
      { name: 'priceRmse', cur: current.priceRmse, baseline: base.priceRmse, ciWidth: base.ci95.price_trajectory_rmse.ci95Upper - base.ci95.price_trajectory_rmse.ci95Lower, relative: false },
      { name: 'voterConcentration', cur: current.voterConcentration, baseline: base.voterConcentration, ciWidth: base.ci95.voter_concentration_error.ci95Upper - base.ci95.voter_concentration_error.ci95Lower, relative: true },
    ];

    for (const check of checks) {
      const threshold = Math.max(check.ciWidth * METRIC_THRESHOLD_MULTIPLIER, 0.05);
      const drift = Math.abs(check.cur - check.baseline);
      const isRegression = check.relative
        ? drift > threshold
        : check.cur - check.baseline > threshold;
      if (isRegression) {
        return `${check.name} drift ${drift.toFixed(3)} exceeds threshold ${threshold.toFixed(3)} (baseline ${check.baseline.toFixed(3)} → current ${check.cur.toFixed(3)})`;
      }
    }
    return null;
  }
}
