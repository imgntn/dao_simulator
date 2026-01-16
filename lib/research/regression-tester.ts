/**
 * Regression Tester
 *
 * Compares current simulation metrics against baseline values
 * to detect unintended behavior changes.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface BaselineMetrics {
  experimentName: string;
  gitCommit?: string;
  createdAt: string;
  config: {
    template: string;
    totalMembers: number;
    stepsPerRun: number;
    seed: number;
  };
  metrics: Record<string, {
    mean: number;
    std: number;
    min: number;
    max: number;
  }>;
}

export interface RegressionResult {
  metricName: string;
  baselineValue: number;
  currentValue: number;
  drift: number;
  driftPercent: number;
  passed: boolean;
}

export interface RegressionReport {
  passed: boolean;
  baselinePath: string;
  baselineCommit?: string;
  threshold: number;
  results: RegressionResult[];
  failedMetrics: string[];
  summary: {
    totalMetrics: number;
    passedMetrics: number;
    failedMetrics: number;
    maxDrift: number;
    maxDriftMetric: string;
  };
}

/**
 * Compare current metrics against a baseline file
 */
export function compareToBaseline(
  currentMetrics: Record<string, number>,
  baselinePath: string,
  threshold: number = 0.05 // 5% default threshold
): RegressionReport {
  // Load baseline
  if (!fs.existsSync(baselinePath)) {
    throw new Error(`Baseline file not found: ${baselinePath}`);
  }

  const baseline: BaselineMetrics = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
  const results: RegressionResult[] = [];
  const failedMetrics: string[] = [];
  let maxDrift = 0;
  let maxDriftMetric = '';

  // Compare each metric
  for (const [metricName, baselineStats] of Object.entries(baseline.metrics)) {
    const currentValue = currentMetrics[metricName];

    if (currentValue === undefined) {
      // Metric not present in current run - skip
      continue;
    }

    const baselineValue = baselineStats.mean;
    const drift = Math.abs(currentValue - baselineValue);

    // Calculate percent drift (handle zero baseline)
    let driftPercent: number;
    if (baselineValue === 0) {
      driftPercent = currentValue === 0 ? 0 : 1; // 100% if baseline is 0 and current is not
    } else {
      driftPercent = drift / Math.abs(baselineValue);
    }

    // Check if within threshold
    const passed = driftPercent <= threshold;

    if (!passed) {
      failedMetrics.push(metricName);
    }

    if (driftPercent > maxDrift) {
      maxDrift = driftPercent;
      maxDriftMetric = metricName;
    }

    results.push({
      metricName,
      baselineValue,
      currentValue,
      drift,
      driftPercent,
      passed,
    });
  }

  return {
    passed: failedMetrics.length === 0,
    baselinePath,
    baselineCommit: baseline.gitCommit,
    threshold,
    results,
    failedMetrics,
    summary: {
      totalMetrics: results.length,
      passedMetrics: results.length - failedMetrics.length,
      failedMetrics: failedMetrics.length,
      maxDrift,
      maxDriftMetric,
    },
  };
}

/**
 * Generate a baseline file from experiment results
 */
export function generateBaseline(
  experimentName: string,
  config: {
    template: string;
    totalMembers: number;
    stepsPerRun: number;
    seed: number;
  },
  metricsData: Array<{ name: string; values: number[] }>,
  gitCommit?: string
): BaselineMetrics {
  const metrics: BaselineMetrics['metrics'] = {};

  for (const { name, values } of metricsData) {
    if (values.length === 0) continue;

    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);

    metrics[name] = {
      mean,
      std,
      min: sorted[0],
      max: sorted[sorted.length - 1],
    };
  }

  return {
    experimentName,
    gitCommit,
    createdAt: new Date().toISOString(),
    config,
    metrics,
  };
}

/**
 * Save baseline to file
 */
export function saveBaseline(baseline: BaselineMetrics, outputPath: string): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(baseline, null, 2));
}

/**
 * Load baseline from file
 */
export function loadBaseline(baselinePath: string): BaselineMetrics {
  if (!fs.existsSync(baselinePath)) {
    throw new Error(`Baseline file not found: ${baselinePath}`);
  }
  return JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
}

/**
 * Format regression report as a string
 */
export function formatRegressionReport(report: RegressionReport): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('REGRESSION TEST REPORT');
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`Baseline: ${report.baselinePath}`);
  if (report.baselineCommit) {
    lines.push(`Baseline commit: ${report.baselineCommit}`);
  }
  lines.push(`Threshold: ${(report.threshold * 100).toFixed(1)}%`);
  lines.push('');

  // Summary
  lines.push('-'.repeat(40));
  lines.push('SUMMARY');
  lines.push('-'.repeat(40));
  lines.push(`Total metrics: ${report.summary.totalMetrics}`);
  lines.push(`Passed: ${report.summary.passedMetrics}`);
  lines.push(`Failed: ${report.summary.failedMetrics}`);
  lines.push(`Max drift: ${(report.summary.maxDrift * 100).toFixed(2)}% (${report.summary.maxDriftMetric})`);
  lines.push('');

  // Detailed results
  lines.push('-'.repeat(40));
  lines.push('DETAILED RESULTS');
  lines.push('-'.repeat(40));

  for (const result of report.results) {
    const status = result.passed ? '✓' : '✗';
    const driftStr = (result.driftPercent * 100).toFixed(2);
    lines.push(
      `${status} ${result.metricName}: ${result.currentValue.toFixed(4)} ` +
      `(baseline: ${result.baselineValue.toFixed(4)}, drift: ${driftStr}%)`
    );
  }

  lines.push('');
  lines.push('='.repeat(60));
  lines.push(report.passed ? '✅ REGRESSION TEST PASSED' : '❌ REGRESSION TEST FAILED');
  lines.push('='.repeat(60));

  return lines.join('\n');
}
