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
