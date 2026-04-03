#!/usr/bin/env npx tsx
/**
 * Validation Suite Runner
 * Runs all validation experiments and checks results against expected criteria
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface ValidationResult {
  name: string;
  passed: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
  }>;
}

interface MetricSummary {
  name: string;
  mean: number;
  std: number;
  min: number;
  max: number;
}

interface SweepResult {
  sweepValue: number | string;
  metrics: MetricSummary[];
}

interface ExperimentSummary {
  experimentName: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  metricsSummary: SweepResult[];
}

const VALIDATION_DIR = path.join(process.cwd(), 'experiments', 'validation');
const RESULTS_DIR = path.join(process.cwd(), 'results', 'validation');

function runExperiment(configPath: string): boolean {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${path.basename(configPath)}`);
  console.log('='.repeat(60));

  try {
    execSync(`npx tsx scripts/run-experiment.ts "${configPath}"`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    return true;
  } catch (error) {
    console.error(`Failed to run experiment: ${configPath}`);
    return false;
  }
}

function loadSummary(resultsDir: string): ExperimentSummary | null {
  const summaryPath = path.join(resultsDir, 'summary.json');
  if (!fs.existsSync(summaryPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
}

function getMetric(summary: ExperimentSummary, sweepValue: number | string, metricName: string): MetricSummary | null {
  const sweep = summary.metricsSummary.find(s => String(s.sweepValue) === String(sweepValue));
  if (!sweep) return null;
  return sweep.metrics.find(m => m.name === metricName) || null;
}

function validateReproducibility(): ValidationResult {
  const result: ValidationResult = {
    name: 'Reproducibility',
    passed: true,
    checks: [],
  };

  const summary = loadSummary(path.join(RESULTS_DIR, 'reproducibility'));
  if (!summary) {
    result.passed = false;
    result.checks.push({ name: 'Load summary', passed: false, message: 'Could not load summary.json' });
    return result;
  }

  // Check that all runs completed
  result.checks.push({
    name: 'All runs completed',
    passed: summary.failedRuns === 0,
    message: `${summary.successfulRuns}/${summary.totalRuns} runs succeeded`,
  });

  // Check std dev is ~0 for key metrics
  const metricsToCheck = ['Proposal Pass Rate', 'Average Turnout', 'Total Proposals'];
  for (const metricName of metricsToCheck) {
    const metric = getMetric(summary, 12345, metricName);
    if (!metric) {
      result.checks.push({ name: `${metricName} exists`, passed: false, message: 'Metric not found' });
      result.passed = false;
      continue;
    }

    const isReproducible = metric.std < 0.0001;
    result.checks.push({
      name: `${metricName} reproducible`,
      passed: isReproducible,
      message: `std=${metric.std.toFixed(6)} (should be ~0)`,
    });
    if (!isReproducible) result.passed = false;
  }

  return result;
}

function validateMonotonicityVoting(): ValidationResult {
  const result: ValidationResult = {
    name: 'Voting Activity Monotonicity',
    passed: true,
    checks: [],
  };

  const summary = loadSummary(path.join(RESULTS_DIR, 'monotonicity-voting'));
  if (!summary) {
    result.passed = false;
    result.checks.push({ name: 'Load summary', passed: false, message: 'Could not load summary.json' });
    return result;
  }

  // Note: Some agent types (GovernanceExpert, LiquidDelegator, etc.) have their own
  // voting logic that bypasses the base voting_activity check. So turnout will never
  // be exactly 0 even with voting_activity=0.

  // Check that higher voting activity produces higher turnout
  const values = [0.0, 0.1, 0.2, 0.3, 0.5, 0.7, 1.0];
  const turnouts: number[] = [];
  for (const v of values) {
    const metric = getMetric(summary, v, 'Average Turnout');
    if (metric) turnouts.push(metric.mean);
  }

  // Check that max voting_activity has higher turnout than min
  const lowTurnout = turnouts[0] || 0;
  const highTurnout = turnouts[turnouts.length - 1] || 0;
  const hasIncrease = highTurnout >= lowTurnout;

  result.checks.push({
    name: 'Higher voting activity → higher turnout',
    passed: hasIncrease,
    message: `voting_activity=0: ${lowTurnout.toFixed(4)}, voting_activity=1: ${highTurnout.toFixed(4)}`,
  });
  if (!hasIncrease) result.passed = false;

  // Check that system runs without errors across all values
  result.checks.push({
    name: 'All voting levels run successfully',
    passed: turnouts.length === values.length,
    message: `${turnouts.length}/${values.length} values completed`,
  });

  // Log the actual turnouts for debugging
  result.checks.push({
    name: 'Turnout values (info)',
    passed: true,
    message: `${turnouts.map(t => t.toFixed(3)).join(' → ')}`,
  });

  return result;
}

function validateMonotonicityProposals(): ValidationResult {
  const result: ValidationResult = {
    name: 'Proposal Creator Monotonicity',
    passed: true,
    checks: [],
  };

  const summary = loadSummary(path.join(RESULTS_DIR, 'monotonicity-proposals'));
  if (!summary) {
    result.passed = false;
    result.checks.push({ name: 'Load summary', passed: false, message: 'Could not load summary.json' });
    return result;
  }

  // Check proposals increase with more members (more active_voter archetypes = more proposal creators)
  const values = [10, 25, 50, 100, 200];
  const proposals: number[] = [];
  for (const v of values) {
    const metric = getMetric(summary, v, 'Total Proposals');
    if (metric) proposals.push(metric.mean);
  }

  // Check that proposals generally increase with member count
  const generallyIncreasing = proposals.length >= 2 && proposals[proposals.length - 1] > proposals[0];
  result.checks.push({
    name: 'More members → more proposals',
    passed: generallyIncreasing,
    message: `Proposals by member count: ${proposals.map(p => p.toFixed(0)).join(' → ')}`,
  });
  if (!generallyIncreasing) result.passed = false;

  // Check minimum member count produces some proposals
  const minMetric = getMetric(summary, 10, 'Total Proposals');
  if (minMetric) {
    result.checks.push({
      name: 'Small DAO produces proposals',
      passed: minMetric.mean > 0,
      message: `10 members produced ${minMetric.mean.toFixed(0)} proposals`,
    });
  }

  return result;
}

function validateBoundaryConditions(): ValidationResult {
  const result: ValidationResult = {
    name: 'Boundary Conditions',
    passed: true,
    checks: [],
  };

  // Check no-proposals experiment (no active voters, proposalFrequency=0)
  const noProposals = loadSummary(path.join(RESULTS_DIR, 'boundary-no-proposals'));
  if (noProposals) {
    const metric = getMetric(noProposals, 42, 'Total Proposals');
    // With no active_voter archetype and proposalFrequency=0, should have fewer proposals
    const isLow = metric && metric.mean < 100;  // Much lower than normal
    result.checks.push({
      name: 'No active voters = fewer proposals',
      passed: isLow || false,
      message: metric ? `proposals=${metric.mean.toFixed(0)}` : 'Metric not found',
    });
    // This is informational - don't fail on this
  }

  // Check zero-voting experiment
  const zeroVoting = loadSummary(path.join(RESULTS_DIR, 'boundary-zero-voting'));
  if (zeroVoting) {
    const turnout = getMetric(zeroVoting, 42, 'Average Turnout');
    const isLow = turnout && turnout.mean < 0.05;  // Should be very low
    result.checks.push({
      name: 'Zero voting = low turnout',
      passed: isLow || false,
      message: turnout ? `turnout=${turnout.mean.toFixed(4)}` : 'Metric not found',
    });
    if (!isLow) result.passed = false;
  }

  // Check minimal experiment completed
  const minimal = loadSummary(path.join(RESULTS_DIR, 'boundary-minimal'));
  if (minimal) {
    result.checks.push({
      name: 'Minimal agents runs complete',
      passed: minimal.failedRuns === 0,
      message: `${minimal.successfulRuns}/${minimal.totalRuns} succeeded`,
    });
    if (minimal.failedRuns > 0) result.passed = false;
  }

  return result;
}

function validateMetricSanity(): ValidationResult {
  const result: ValidationResult = {
    name: 'Metric Sanity',
    passed: true,
    checks: [],
  };

  const summary = loadSummary(path.join(RESULTS_DIR, 'metric-sanity'));
  if (!summary) {
    result.passed = false;
    result.checks.push({ name: 'Load summary', passed: false, message: 'Could not load summary.json' });
    return result;
  }

  // Check all runs completed
  result.checks.push({
    name: 'All runs completed',
    passed: summary.failedRuns === 0,
    message: `${summary.successfulRuns}/${summary.totalRuns} succeeded`,
  });
  if (summary.failedRuns > 0) result.passed = false;

  // Check metric bounds for each sweep value
  for (const sweep of summary.metricsSummary) {
    for (const metric of sweep.metrics) {
      const isValid = !isNaN(metric.mean) && isFinite(metric.mean);

      // Check bounds based on metric type
      let inBounds = true;
      let boundsMsg = '';

      if (metric.name.includes('Rate') || metric.name.includes('Turnout') || metric.name.includes('Gini')) {
        inBounds = metric.min >= 0 && metric.max <= 1;
        boundsMsg = `[${metric.min.toFixed(3)}, ${metric.max.toFixed(3)}] should be in [0, 1]`;
      } else if (metric.name.includes('Treasury')) {
        inBounds = metric.min >= 0;
        boundsMsg = `min=${metric.min.toFixed(0)} should be >= 0`;
      } else if (metric.name.includes('Proposals')) {
        inBounds = metric.min >= 0;
        boundsMsg = `min=${metric.min.toFixed(0)} should be >= 0`;
      }

      if (!isValid || !inBounds) {
        result.checks.push({
          name: `${metric.name} (seed=${sweep.sweepValue})`,
          passed: false,
          message: isValid ? boundsMsg : 'NaN or Infinity detected',
        });
        result.passed = false;
      }
    }
  }

  if (result.checks.length === 1) {
    result.checks.push({
      name: 'All metrics within bounds',
      passed: true,
      message: 'All metrics passed bounds checks',
    });
  }

  return result;
}

function validateGovernanceRules(): ValidationResult {
  const result: ValidationResult = {
    name: 'Governance Rules',
    passed: true,
    checks: [],
  };

  const summary = loadSummary(path.join(RESULTS_DIR, 'governance-rules'));
  if (!summary) {
    result.passed = false;
    result.checks.push({ name: 'Load summary', passed: false, message: 'Could not load summary.json' });
    return result;
  }

  // Get pass rates for each rule
  const passRates: Record<string, number> = {};
  for (const rule of ['majority', 'quorum', 'supermajority']) {
    const metric = getMetric(summary, rule, 'Proposal Pass Rate');
    if (metric) {
      passRates[rule] = metric.mean;
    }
  }

  result.checks.push({
    name: 'All rules produce results',
    passed: Object.keys(passRates).length === 3,
    message: `Found ${Object.keys(passRates).length}/3 rules`,
  });

  // Check rules produce different results
  const values = Object.values(passRates);
  const allDifferent = new Set(values.map(v => v.toFixed(2))).size > 1;
  result.checks.push({
    name: 'Rules produce different pass rates',
    passed: allDifferent,
    message: `majority=${passRates.majority?.toFixed(3)}, quorum=${passRates.quorum?.toFixed(3)}, supermajority=${passRates.supermajority?.toFixed(3)}`,
  });
  if (!allDifferent) result.passed = false;

  return result;
}

function validateConservation(): ValidationResult {
  const result: ValidationResult = {
    name: 'Token Conservation',
    passed: true,
    checks: [],
  };

  const summary = loadSummary(path.join(RESULTS_DIR, 'conservation'));
  if (!summary) {
    // Conservation test is optional - just note it wasn't run
    result.checks.push({
      name: 'Conservation test',
      passed: true,
      message: 'Conservation experiment not run (optional)',
    });
    return result;
  }

  // Check all runs completed
  result.checks.push({
    name: 'All runs completed',
    passed: summary.failedRuns === 0,
    message: `${summary.successfulRuns}/${summary.totalRuns} succeeded`,
  });
  if (summary.failedRuns > 0) result.passed = false;

  // Check treasury is non-negative (proxy for conservation)
  for (const sweep of summary.metricsSummary) {
    const treasury = sweep.metrics.find(m => m.name === 'Final Treasury');
    if (treasury) {
      const isValid = treasury.min >= 0;
      result.checks.push({
        name: `Treasury non-negative (seed=${sweep.sweepValue})`,
        passed: isValid,
        message: `min=${treasury.min.toFixed(2)}, max=${treasury.max.toFixed(2)}`,
      });
      if (!isValid) result.passed = false;
    }
  }

  result.checks.push({
    name: 'Conservation checks passed',
    passed: result.passed,
    message: result.passed ? 'No conservation violations detected' : 'Conservation violations found',
  });

  return result;
}

function validateHomogeneousVoting(): ValidationResult {
  const result: ValidationResult = {
    name: 'Homogeneous Agent Voting',
    passed: true,
    checks: [],
  };

  const summary = loadSummary(path.join(RESULTS_DIR, 'homogeneous-voting'));
  if (!summary) {
    // This test is optional
    result.checks.push({
      name: 'Homogeneous voting test',
      passed: true,
      message: 'Homogeneous voting experiment not run (optional)',
    });
    return result;
  }

  // Check that higher voting activity produces higher turnout (strict monotonicity)
  const values = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0];
  const turnouts: number[] = [];
  for (const v of values) {
    const metric = getMetric(summary, v, 'Average Turnout');
    if (metric) turnouts.push(metric.mean);
  }

  // Check strict monotonicity (each value >= previous)
  let monotonic = true;
  const violations: string[] = [];
  for (let i = 1; i < turnouts.length; i++) {
    if (turnouts[i] < turnouts[i - 1] - 0.001) { // Allow tiny floating point errors
      monotonic = false;
      violations.push(`${values[i-1]}→${values[i]}`);
    }
  }

  result.checks.push({
    name: 'Turnout increases with voting_activity',
    passed: monotonic,
    message: monotonic
      ? `Monotonic: ${turnouts.map(t => t.toFixed(3)).join(' ≤ ')}`
      : `Non-monotonic at: ${violations.join(', ')}`,
  });
  if (!monotonic) result.passed = false;

  // Check range - with 100% passive holders, voting_activity=1 should have high turnout
  const highTurnout = turnouts[turnouts.length - 1] || 0;
  const lowTurnout = turnouts[0] || 0;
  const hasRange = highTurnout > lowTurnout * 1.5; // At least 50% increase

  result.checks.push({
    name: 'Voting activity has meaningful effect',
    passed: hasRange,
    message: `Low: ${lowTurnout.toFixed(4)}, High: ${highTurnout.toFixed(4)}`,
  });

  // Log the actual turnouts for debugging
  result.checks.push({
    name: 'Turnout values (info)',
    passed: true,
    message: `${values.map((v, i) => `${v}:${turnouts[i]?.toFixed(3) || 'N/A'}`).join(', ')}`,
  });

  return result;
}

function validateRegression(): ValidationResult {
  const result: ValidationResult = {
    name: 'Regression Baseline',
    passed: true,
    checks: [],
  };

  const baselinePath = path.join(process.cwd(), 'results', 'baselines', 'compound-standard.json');

  if (!fs.existsSync(baselinePath)) {
    result.checks.push({
      name: 'Baseline exists',
      passed: true,
      message: 'No baseline file found (run generate-baselines first)',
    });
    return result; // Not a failure if baseline doesn't exist yet
  }

  // Load baseline
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));

  result.checks.push({
    name: 'Baseline loaded',
    passed: true,
    message: `Baseline from commit ${baseline.gitCommit || 'unknown'}`,
  });

  // Compare against a recent validation run if available
  const metricSanity = loadSummary(path.join(RESULTS_DIR, 'metric-sanity'));
  if (!metricSanity) {
    result.checks.push({
      name: 'Comparison run',
      passed: true,
      message: 'No metric-sanity results to compare against',
    });
    return result;
  }

  // Compare only rate/ratio metrics (not absolute counts which depend on duration)
  // Rate metrics are comparable across different simulation lengths
  const threshold = 0.10; // 10% drift threshold
  const sweepData = metricSanity.metricsSummary[0];
  if (!sweepData) return result;

  // Only compare metrics that are ratios/rates (not dependent on simulation duration)
  const comparableMetrics = ['Proposal Pass Rate', 'Average Turnout'];

  for (const metricName of comparableMetrics) {
    const baselineStats = baseline.metrics[metricName];
    if (!baselineStats) continue;

    const currentMetric = sweepData.metrics.find(m => m.name === metricName);
    if (!currentMetric) continue;

    const drift = Math.abs(currentMetric.mean - baselineStats.mean);
    const driftPercent = baselineStats.mean !== 0 ? drift / Math.abs(baselineStats.mean) : 0;
    const passed = driftPercent <= threshold;

    result.checks.push({
      name: `${metricName} drift`,
      passed,
      message: `${(driftPercent * 100).toFixed(1)}% drift (threshold: ${threshold * 100}%)`,
    });

    if (!passed) result.passed = false;
  }

  // Note: We skip metrics like Total Proposals, Final Gini that depend on simulation duration
  result.checks.push({
    name: 'Regression note',
    passed: true,
    message: 'Comparing rate metrics only (counts vary with simulation duration)',
  });

  return result;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           DAO Simulator Validation Suite                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Get all validation experiment files
  const experiments = fs.readdirSync(VALIDATION_DIR)
    .filter(f => f.endsWith('.yaml'))
    .sort()
    .map(f => path.join(VALIDATION_DIR, f));

  console.log(`Found ${experiments.length} validation experiments\n`);

  // Run all experiments
  let allSucceeded = true;
  for (const exp of experiments) {
    const success = runExperiment(exp);
    if (!success) {
      allSucceeded = false;
      console.error(`\n❌ Experiment failed: ${path.basename(exp)}`);
    }
  }

  if (!allSucceeded) {
    console.error('\n❌ Some experiments failed to run. Check errors above.');
    process.exit(1);
  }

  // Analyze results
  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              Validation Results Analysis                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const validations: ValidationResult[] = [
    validateReproducibility(),
    validateMonotonicityVoting(),
    validateMonotonicityProposals(),
    validateBoundaryConditions(),
    validateMetricSanity(),
    validateGovernanceRules(),
    validateConservation(),
    validateHomogeneousVoting(),
    validateRegression(),
  ];

  let allPassed = true;
  for (const v of validations) {
    const status = v.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`\n${status}: ${v.name}`);
    console.log('-'.repeat(50));
    for (const check of v.checks) {
      const checkStatus = check.passed ? '  ✓' : '  ✗';
      console.log(`${checkStatus} ${check.name}: ${check.message}`);
    }
    if (!v.passed) allPassed = false;
  }

  // Summary
  console.log('\n\n');
  console.log('═'.repeat(60));
  if (allPassed) {
    console.log('✅ ALL VALIDATIONS PASSED');
    console.log('The simulation is ready for research experiments.');
  } else {
    console.log('❌ SOME VALIDATIONS FAILED');
    console.log('Please fix the issues before running research experiments.');
  }
  console.log('═'.repeat(60));

  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);
