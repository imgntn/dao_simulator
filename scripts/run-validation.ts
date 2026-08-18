#!/usr/bin/env npx tsx
/**
 * Validation Suite Runner
 * Runs all validation experiments and checks results against expected criteria
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import * as yaml from 'yaml';
import { CalibrationBaselineSchema } from '../lib/research/baseline-schema';
import { computeBaselineConfigHash } from '../lib/research/baseline-config';

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
  values: number[];
}

interface SweepResult {
  sweepValue: number | string | boolean;
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
let RESULTS_DIR = path.join(process.cwd(), 'results', 'validation');

function experimentOutputName(configPath: string): string {
  const config = yaml.parse(fs.readFileSync(configPath, 'utf8')) as {
    output?: { directory?: string };
  };
  if (!config.output?.directory) {
    throw new Error(`Validation experiment lacks output.directory: ${configPath}`);
  }
  return path.basename(path.normalize(config.output.directory));
}

function runExperiment(configPath: string): boolean {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${path.basename(configPath)}`);
  console.log('='.repeat(60));

  const outputDir = path.join(RESULTS_DIR, experimentOutputName(configPath));
  const checkpointDir = path.join(
    RESULTS_DIR,
    '.checkpoints',
    experimentOutputName(configPath),
  );
  const tsxCli = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const execution = spawnSync(
    process.execPath,
    [
      tsxCli,
      path.join(process.cwd(), 'scripts', 'run-experiment.ts'),
      configPath,
      '--output',
      outputDir,
      '--checkpoint-dir',
      checkpointDir,
    ],
    {
      stdio: 'inherit',
      cwd: process.cwd(),
      windowsHide: true,
    }
  );
  if (execution.status === 0) {
    return true;
  } else {
    console.error(`Failed to run experiment: ${configPath}`);
    if (execution.error) console.error(execution.error);
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

function getMetric(
  summary: ExperimentSummary,
  sweepValue: number | string | boolean,
  metricName: string
): MetricSummary | null {
  const sweep = summary.metricsSummary.find(s => String(s.sweepValue) === String(sweepValue));
  if (!sweep) return null;
  return sweep.metrics.find(m => m.name === metricName) || null;
}

function validateCampaignCompleteness(experiments: string[]): ValidationResult {
  const result: ValidationResult = {
    name: 'Campaign completeness and finite outputs',
    passed: true,
    checks: [],
  };
  for (const experiment of experiments) {
    const outputName = experimentOutputName(experiment);
    const summary = loadSummary(path.join(RESULTS_DIR, outputName));
    if (!summary) {
      result.passed = false;
      result.checks.push({
        name: outputName,
        passed: false,
        message: 'summary.json is missing',
      });
      continue;
    }
    const exactAccounting = summary.totalRuns > 0
      && summary.successfulRuns === summary.totalRuns
      && summary.failedRuns === 0;
    const metricValues = summary.metricsSummary.flatMap(sweep =>
      sweep.metrics.flatMap(metric => [
        metric.mean,
        metric.std,
        metric.min,
        metric.max,
      ])
    );
    const finite = metricValues.length > 0
      && metricValues.every(value => Number.isFinite(value));
    const passed = exactAccounting && finite;
    result.checks.push({
      name: outputName,
      passed,
      message:
        `${summary.successfulRuns}/${summary.totalRuns} completed, `
        + `${summary.failedRuns} failed, ${metricValues.length} aggregate values finite=${finite}`,
    });
    if (!passed) result.passed = false;
  }
  return result;
}

function writeJsonAtomic(filePath: string, value: unknown): void {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(temporaryPath, filePath);
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
    const metric = summary.metricsSummary[0]?.metrics.find(
      candidate => candidate.name === metricName
    );
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

  const values = [0.0, 0.1, 0.2, 0.3, 0.5, 0.7, 1.0];
  const turnouts = values.map(value =>
    getMetric(summary, value, 'Average Turnout')
  );
  result.checks.push({
    name: 'All voting levels run successfully',
    passed: turnouts.every(Boolean),
    message: `${turnouts.filter(Boolean).length}/${values.length} values completed`,
  });
  if (turnouts.some(metric => !metric)) {
    result.passed = false;
    return result;
  }
  const observed = turnouts as MetricSummary[];
  const zeroPassed = Math.abs(observed[0].mean) <= 1e-12;
  result.checks.push({
    name: 'Zero activity has zero turnout with boosts disabled',
    passed: zeroPassed,
    message: `mean=${observed[0].mean.toFixed(8)}, tolerance=1e-12`,
  });
  if (!zeroPassed) result.passed = false;

  const runsPerLevel = summary.totalRuns / values.length;
  for (let index = 1; index < observed.length; index++) {
    const previous = observed[index - 1];
    const current = observed[index];
    const difference = current.mean - previous.mean;
    const standardError = Math.sqrt(
      (previous.std ** 2 + current.std ** 2) / runsPerLevel
    );
    const upperCompatibilityBound = difference + 1.96 * standardError;
    const passed = upperCompatibilityBound >= 0;
    result.checks.push({
      name: `Adjacent turnout ${values[index - 1]} → ${values[index]}`,
      passed,
      message:
        `Δ=${difference.toFixed(6)}, SE=${standardError.toFixed(6)}, `
        + `95% upper bound=${upperCompatibilityBound.toFixed(6)} ≥ 0`,
    });
    if (!passed) result.passed = false;
  }

  const endpointDifference = observed.at(-1)!.mean - observed[0].mean;
  const endpointSE = Math.sqrt(
    (observed.at(-1)!.std ** 2 + observed[0].std ** 2) / runsPerLevel
  );
  const endpointLower = endpointDifference - 1.96 * endpointSE;
  const endpointPassed = endpointLower > 0;
  result.checks.push({
    name: 'Endpoint turnout effect is positive',
    passed: endpointPassed,
    message:
      `Δ=${endpointDifference.toFixed(6)}, 95% lower bound=${endpointLower.toFixed(6)}`,
  });
  if (!endpointPassed) result.passed = false;

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

  const values = [0, 0.0025, 0.005, 0.01, 0.02];
  const proposals = values.map(value =>
    getMetric(summary, value, 'Total Proposals')
  );
  result.checks.push({
    name: 'All proposal-rate levels run successfully',
    passed: proposals.every(Boolean),
    message: `${proposals.filter(Boolean).length}/${values.length} values completed`,
  });
  if (proposals.some(metric => !metric)) {
    result.passed = false;
    return result;
  }
  const observed = proposals as MetricSummary[];
  const zeroPassed = Math.abs(observed[0].mean) <= 1e-12;
  result.checks.push({
    name: 'Zero proposal probability creates zero proposals',
    passed: zeroPassed,
    message: `mean=${observed[0].mean.toFixed(8)}, tolerance=1e-12`,
  });
  if (!zeroPassed) result.passed = false;

  const runsPerLevel = summary.totalRuns / values.length;
  for (let index = 1; index < observed.length; index++) {
    const previous = observed[index - 1];
    const current = observed[index];
    const difference = current.mean - previous.mean;
    const standardError = Math.sqrt(
      (previous.std ** 2 + current.std ** 2) / runsPerLevel
    );
    const upperCompatibilityBound = difference + 1.96 * standardError;
    const passed = upperCompatibilityBound >= 0;
    result.checks.push({
      name: `Adjacent proposal rate ${values[index - 1]} → ${values[index]}`,
      passed,
      message:
        `Δ=${difference.toFixed(4)}, SE=${standardError.toFixed(4)}, `
        + `95% upper bound=${upperCompatibilityBound.toFixed(4)} ≥ 0`,
    });
    if (!passed) result.passed = false;
  }

  const endpointDifference = observed.at(-1)!.mean - observed[0].mean;
  const endpointSE = Math.sqrt(
    (observed.at(-1)!.std ** 2 + observed[0].std ** 2) / runsPerLevel
  );
  const endpointLower = endpointDifference - 1.96 * endpointSE;
  const endpointPassed = endpointLower > 0;
  result.checks.push({
    name: 'Endpoint proposal-rate effect is positive',
    passed: endpointPassed,
    message:
      `Δ=${endpointDifference.toFixed(4)}, 95% lower bound=${endpointLower.toFixed(4)}`,
  });
  if (!endpointPassed) result.passed = false;

  return result;
}

function validateBoundaryConditions(): ValidationResult {
  const result: ValidationResult = {
    name: 'Boundary Conditions',
    passed: true,
    checks: [],
  };

  const noProposals = loadSummary(path.join(RESULTS_DIR, 'boundary-no-proposals'));
  if (!noProposals) {
    result.passed = false;
    result.checks.push({
      name: 'Zero proposal creation summary',
      passed: false,
      message: 'Could not load summary.json',
    });
  } else {
    const metric = getMetric(noProposals, 42, 'Total Proposals');
    const isZero = metric !== null && Math.abs(metric.mean) <= 1e-12;
    result.checks.push({
      name: 'Zero creation probability = zero proposals',
      passed: isZero,
      message: metric
        ? `mean=${metric.mean.toFixed(8)}, tolerance=1e-12`
        : 'Metric not found',
    });
    if (!isZero) result.passed = false;
  }

  // Check zero-voting experiment
  const zeroVoting = loadSummary(path.join(RESULTS_DIR, 'boundary-zero-voting'));
  if (!zeroVoting) {
    result.passed = false;
    result.checks.push({
      name: 'Zero voting summary',
      passed: false,
      message: 'Could not load summary.json',
    });
  } else {
    const turnout = getMetric(zeroVoting, 42, 'Average Turnout');
    const isZero = turnout !== null && Math.abs(turnout.mean) <= 1e-12;
    result.checks.push({
      name: 'Zero voting and boosts = zero turnout',
      passed: isZero,
      message: turnout
        ? `mean=${turnout.mean.toFixed(8)}, tolerance=1e-12`
        : 'Metric not found',
    });
    if (!isZero) result.passed = false;
  }

  // Check minimal experiment completed
  const minimal = loadSummary(path.join(RESULTS_DIR, 'boundary-minimal'));
  if (!minimal) {
    result.passed = false;
    result.checks.push({
      name: 'Minimal population summary',
      passed: false,
      message: 'Could not load summary.json',
    });
  } else {
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

  const passRates: Record<string, MetricSummary> = {};
  for (const rule of ['majority', 'quorum', 'supermajority']) {
    const metric = getMetric(summary, rule, 'Proposal Pass Rate');
    if (metric) {
      passRates[rule] = metric;
    }
  }

  result.checks.push({
    name: 'All rules produce results',
    passed: Object.keys(passRates).length === 3,
    message: `Found ${Object.keys(passRates).length}/3 rules`,
  });

  if (Object.keys(passRates).length !== 3) {
    result.passed = false;
    return result;
  }
  const runsPerRule = summary.totalRuns / 3;
  const majority = passRates.majority;
  const supermajority = passRates.supermajority;
  const strongDifference = majority.mean - supermajority.mean;
  const strongSE = Math.sqrt(
    (majority.std ** 2 + supermajority.std ** 2) / runsPerRule
  );
  const strongLower = strongDifference - 1.96 * strongSE;
  const strongPassed = strongLower > 0;
  result.checks.push({
    name: 'Supermajority is stricter than majority',
    passed: strongPassed,
    message:
      `Δ=${strongDifference.toFixed(4)}, SE=${strongSE.toFixed(4)}, `
      + `95% lower bound=${strongLower.toFixed(4)}`,
  });
  if (!strongPassed) result.passed = false;

  const rules = Object.entries(passRates);
  let largestStandardizedDifference = 0;
  for (let left = 0; left < rules.length; left++) {
    for (let right = left + 1; right < rules.length; right++) {
      const difference = Math.abs(rules[left][1].mean - rules[right][1].mean);
      const standardError = Math.sqrt(
        (rules[left][1].std ** 2 + rules[right][1].std ** 2) / runsPerRule
      );
      largestStandardizedDifference = Math.max(
        largestStandardizedDifference,
        standardError > 0 ? difference / standardError : (
          difference > 0 ? Number.POSITIVE_INFINITY : 0
        )
      );
    }
  }
  const differentiated = largestStandardizedDifference > 1.96;
  result.checks.push({
    name: 'At least one governance contrast exceeds sampling noise',
    passed: differentiated,
    message: `largest |Δ|/SE=${largestStandardizedDifference.toFixed(3)}, required>1.96`,
  });
  if (!differentiated) result.passed = false;

  return result;
}

function validateConservation(): ValidationResult {
  const result: ValidationResult = {
    name: 'Token Conservation',
    passed: true,
    checks: [],
  };

  for (const experiment of [
    'conservation',
    'multi-asset-conservation',
    'all-agent-economic-conservation',
  ]) {
    const summary = loadSummary(path.join(RESULTS_DIR, experiment));
    if (!summary) {
      result.checks.push({
        name: `${experiment} summary`,
        passed: false,
        message: 'Could not load summary.json',
      });
      result.passed = false;
      continue;
    }
    for (const sweep of summary.metricsSummary) {
      const conservationError = sweep.metrics.find(
        metric => metric.name === 'Token Conservation Error'
      );
      if (conservationError) {
        const tolerance = 1e-8;
        const isValid = Math.abs(conservationError.min) <= tolerance
          && Math.abs(conservationError.max) <= tolerance;
        result.checks.push({
          name: `${experiment} reconciles (condition=${sweep.sweepValue})`,
          passed: isValid,
          message:
            `range=[${conservationError.min.toExponential(3)}, `
            + `${conservationError.max.toExponential(3)}], tolerance=${tolerance}`,
        });
        if (!isValid) result.passed = false;
      } else {
        result.checks.push({
          name: `${experiment} conservation metric (condition=${sweep.sweepValue})`,
          passed: false,
          message: 'Token Conservation Error metric is missing',
        });
        result.passed = false;
      }
    }
  }

  result.checks.push({
    name: 'Conservation checks passed',
    passed: result.passed,
    message: result.passed ? 'No conservation violations detected' : 'Conservation violations found',
  });

  return result;
}

function validateQuorumParticipation(): ValidationResult {
  const result: ValidationResult = {
    name: 'Quorum Uses Total Participation',
    passed: true,
    checks: [],
  };
  const summary = loadSummary(path.join(RESULTS_DIR, 'quorum-participation'));
  if (!summary) {
    result.passed = false;
    result.checks.push({
      name: 'Quorum summary',
      passed: false,
      message: 'Could not load summary.json',
    });
    return result;
  }

  const levels = [0.05, 0.1, 0.15, 0.2];
  const reachRates = levels.map(level =>
    getMetric(summary, level, 'Quorum Reach Rate')
  );
  const passRates = levels.map(level =>
    getMetric(summary, level, 'Proposal Pass Rate')
  );
  const proposalCounts = levels.map(level =>
    getMetric(summary, level, 'Total Proposals')
  );
  const completionRates = levels.map(level =>
    getMetric(summary, level, 'Proposal Completion Rate')
  );
  const complete = [
    ...reachRates,
    ...passRates,
    ...proposalCounts,
    ...completionRates,
  ].every(Boolean);
  result.checks.push({
    name: 'All quorum estimands are present',
    passed: complete,
    message: complete ? '4/4 quorum levels with all required metrics' : 'Missing required quorum metrics',
  });
  if (!complete) {
    result.passed = false;
    return result;
  }

  const reach = reachRates as MetricSummary[];
  const passes = passRates as MetricSummary[];
  const proposals = proposalCounts as MetricSummary[];
  const completions = completionRates as MetricSummary[];
  const runsPerLevel = summary.totalRuns / levels.length;
  const proposalOpportunity = proposals.every(metric => metric.min > 0);
  result.checks.push({
    name: 'Every replicate creates a proposal opportunity',
    passed: proposalOpportunity,
    message: `minimum proposal counts by level: ${proposals.map(metric => metric.min).join(', ')}`,
  });
  if (!proposalOpportunity) result.passed = false;

  for (let index = 0; index < levels.length; index++) {
    const unconditionalApprovals = passes[index].values.map(
      (passRate, runIndex) => passRate * completions[index].values[runIndex]
    );
    const violations = unconditionalApprovals.filter(
      (approvalRate, runIndex) => approvalRate > reach[index].values[runIndex] + 1e-12
    );
    const passCannotExceedReach = violations.length === 0;
    result.checks.push({
      name: `Passing implies quorum at ${levels[index]}`,
      passed: passCannotExceedReach,
      message:
        `unconditional approval max=${Math.max(...unconditionalApprovals).toFixed(4)}, `
        + `reach max=${reach[index].max.toFixed(4)}, violations=${violations.length}`,
    });
    if (!passCannotExceedReach) result.passed = false;
  }

  for (let index = 1; index < levels.length; index++) {
    const difference = reach[index].mean - reach[index - 1].mean;
    const standardError = Math.sqrt(
      (reach[index].std ** 2 + reach[index - 1].std ** 2) / runsPerLevel
    );
    const lowerBound = difference - 1.96 * standardError;
    const noSignificantIncrease = lowerBound <= 0;
    result.checks.push({
      name: `Quorum reach is nonincreasing ${levels[index - 1]} → ${levels[index]}`,
      passed: noSignificantIncrease,
      message:
        `Δ=${difference.toFixed(4)}, SE=${standardError.toFixed(4)}, `
        + `95% lower bound=${lowerBound.toFixed(4)} ≤ 0`,
    });
    if (!noSignificantIncrease) result.passed = false;
  }

  const endpointDifference = reach[0].mean - reach.at(-1)!.mean;
  const endpointSE = Math.sqrt(
    (reach[0].std ** 2 + reach.at(-1)!.std ** 2) / runsPerLevel
  );
  const endpointLower = endpointDifference - 1.96 * endpointSE;
  const discriminates = endpointLower > 0;
  result.checks.push({
    name: 'Higher quorum produces a detectable reach-rate reduction',
    passed: discriminates,
    message:
      `low-minus-high Δ=${endpointDifference.toFixed(4)}, `
      + `95% lower bound=${endpointLower.toFixed(4)}`,
  });
  if (!discriminates) result.passed = false;

  return result;
}

function validateLearningAgents(): ValidationResult {
  const result: ValidationResult = {
    name: 'Learning Agent State and Episode Dynamics',
    passed: true,
    checks: [],
  };
  const summary = loadSummary(path.join(RESULTS_DIR, 'learning-agents'));
  if (!summary) {
    result.passed = false;
    result.checks.push({
      name: 'Learning summary',
      passed: false,
      message: 'Could not load summary.json',
    });
    return result;
  }

  const metricNames = {
    agents: 'Learning Agent Count',
    qTable: 'Mean Learning Q-Table Size',
    states: 'Mean Learning State Count',
    episodes: 'Mean Learning Episode Count',
    exploration: 'Mean Learning Exploration Rate',
    reward: 'Mean Learning Total Reward',
  } as const;
  const disabled = Object.fromEntries(
    Object.entries(metricNames).map(([key, name]) => [key, getMetric(summary, false, name)])
  ) as Record<keyof typeof metricNames, MetricSummary | null>;
  const enabled = Object.fromEntries(
    Object.entries(metricNames).map(([key, name]) => [key, getMetric(summary, true, name)])
  ) as Record<keyof typeof metricNames, MetricSummary | null>;
  const complete = [...Object.values(disabled), ...Object.values(enabled)].every(Boolean);
  result.checks.push({
    name: 'Learning diagnostics are complete',
    passed: complete,
    message: complete ? 'All six diagnostics present for enabled and disabled modes' : 'Missing learning diagnostics',
  });
  if (!complete) {
    result.passed = false;
    return result;
  }

  const off = disabled as Record<keyof typeof metricNames, MetricSummary>;
  const on = enabled as Record<keyof typeof metricNames, MetricSummary>;
  const learningAgentsPresent = off.agents.min > 0 && on.agents.min > 0;
  result.checks.push({
    name: 'Learning-capable population exists',
    passed: learningAgentsPresent,
    message: `disabled min=${off.agents.min}, enabled min=${on.agents.min}`,
  });
  if (!learningAgentsPresent) result.passed = false;

  for (const [key, label] of [
    ['qTable', 'Q-table entries'],
    ['states', 'learned states'],
    ['episodes', 'completed episodes'],
  ] as const) {
    const isZero = Math.abs(off[key].min) <= 1e-12
      && Math.abs(off[key].max) <= 1e-12;
    result.checks.push({
      name: `Disabled learning has zero ${label}`,
      passed: isZero,
      message: `range=[${off[key].min.toFixed(6)}, ${off[key].max.toFixed(6)}]`,
    });
    if (!isZero) result.passed = false;
  }

  const runsPerMode = summary.totalRuns / 2;
  for (const [key, label] of [
    ['qTable', 'Q-table entries'],
    ['states', 'learned states'],
    ['episodes', 'completed episodes'],
  ] as const) {
    const lower = on[key].mean - 1.96 * on[key].std / Math.sqrt(runsPerMode);
    const positive = lower > 0;
    result.checks.push({
      name: `Enabled learning accumulates ${label}`,
      passed: positive,
      message: `mean=${on[key].mean.toFixed(4)}, 95% lower bound=${lower.toFixed(4)}`,
    });
    if (!positive) result.passed = false;
  }

  const expectedEpisodes = 4;
  const episodeLower = on.episodes.mean
    - 1.96 * on.episodes.std / Math.sqrt(runsPerMode);
  const episodeBoundariesPersist = episodeLower > 1
    && on.episodes.max <= expectedEpisodes;
  result.checks.push({
    name: 'Learning state persists across within-replicate episodes',
    passed: episodeBoundariesPersist,
    message:
      `mean=${on.episodes.mean.toFixed(4)}, 95% lower=${episodeLower.toFixed(4)}, `
      + `maximum=${on.episodes.max.toFixed(4)}, scheduled=${expectedEpisodes}; `
      + 'agents joining mid-run correctly observe fewer boundaries',
  });
  if (!episodeBoundariesPersist) result.passed = false;

  const explorationDifference = off.exploration.mean - on.exploration.mean;
  const explorationSE = Math.sqrt(
    (off.exploration.std ** 2 + on.exploration.std ** 2) / runsPerMode
  );
  const explorationLower = explorationDifference - 1.96 * explorationSE;
  const explorationDecays = explorationLower > 0 && on.exploration.std > 0;
  result.checks.push({
    name: 'Exploration decays across within-replicate episodes',
    passed: explorationDecays,
    message:
      `disabled-minus-enabled Δ=${explorationDifference.toFixed(6)}, `
      + `95% lower=${explorationLower.toFixed(6)}, enabled SD=${on.exploration.std.toFixed(6)}`,
  });
  if (!explorationDecays) result.passed = false;

  const rewardFinite = Number.isFinite(on.reward.mean)
    && Number.isFinite(on.reward.min)
    && Number.isFinite(on.reward.max);
  result.checks.push({
    name: 'Learning reward telemetry is finite',
    passed: rewardFinite,
    message: `range=[${on.reward.min.toFixed(4)}, ${on.reward.max.toFixed(4)}]`,
  });
  if (!rewardFinite) result.passed = false;

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
    result.passed = false;
    result.checks.push({
      name: 'Homogeneous voting test',
      passed: false,
      message: 'Could not load summary.json',
    });
    return result;
  }

  const values = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0];
  const turnouts = values.map(value =>
    getMetric(summary, value, 'Average Turnout')
  );
  const complete = turnouts.every(Boolean);
  result.checks.push({
    name: 'All homogeneous voting levels completed',
    passed: complete,
    message: `${turnouts.filter(Boolean).length}/${values.length} levels`,
  });
  if (!complete) {
    result.passed = false;
    return result;
  }
  const observed = turnouts as MetricSummary[];
  const zeroPassed = Math.abs(observed[0].mean) <= 1e-12;
  result.checks.push({
    name: 'Homogeneous zero-activity turnout',
    passed: zeroPassed,
    message: `mean=${observed[0].mean.toFixed(8)}, tolerance=1e-12`,
  });
  if (!zeroPassed) result.passed = false;

  const runsPerLevel = summary.totalRuns / values.length;
  for (let index = 1; index < observed.length; index++) {
    const difference = observed[index].mean - observed[index - 1].mean;
    const standardError = Math.sqrt(
      (observed[index].std ** 2 + observed[index - 1].std ** 2) / runsPerLevel
    );
    const upperBound = difference + 1.96 * standardError;
    const passed = upperBound >= 0;
    result.checks.push({
      name: `Homogeneous adjacent turnout ${values[index - 1]} → ${values[index]}`,
      passed,
      message:
        `Δ=${difference.toFixed(6)}, SE=${standardError.toFixed(6)}, `
        + `95% upper bound=${upperBound.toFixed(6)} ≥ 0`,
    });
    if (!passed) result.passed = false;
  }

  const endpointDifference = observed.at(-1)!.mean - observed[0].mean;
  const endpointSE = Math.sqrt(
    (observed.at(-1)!.std ** 2 + observed[0].std ** 2) / runsPerLevel
  );
  const endpointLower = endpointDifference - 1.96 * endpointSE;
  const practicalThreshold = 0.1;
  const practicallyMeaningful = endpointLower >= practicalThreshold;
  result.checks.push({
    name: 'Homogeneous voting practical effect',
    passed: practicallyMeaningful,
    message:
      `Δ=${endpointDifference.toFixed(6)}, 95% lower bound=${endpointLower.toFixed(6)}, `
      + `required=${practicalThreshold.toFixed(3)}`,
  });
  if (!practicallyMeaningful) result.passed = false;

  return result;
}

function validateRegression(): ValidationResult {
  const result: ValidationResult = {
    name: 'Regression Baseline',
    passed: true,
    checks: [],
  };

  const baselinePath = path.join(
    process.cwd(),
    'results',
    'baselines',
    'calibration-baseline.json'
  );

  if (!fs.existsSync(baselinePath)) {
    result.checks.push({
      name: 'Baseline exists',
      passed: false,
      message: 'Required regression baseline is missing (run generate-baselines first)',
    });
    result.passed = false;
    return result;
  }

  const parsed = CalibrationBaselineSchema.safeParse(
    JSON.parse(fs.readFileSync(baselinePath, 'utf-8'))
  );
  if (!parsed.success) {
    result.passed = false;
    result.checks.push({
      name: 'Baseline schema',
      passed: false,
      message: parsed.error.issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join('; '),
    });
    return result;
  }
  const baseline = parsed.data;

  result.checks.push({
    name: 'Baseline schema and DAO coverage',
    passed: Object.keys(baseline.perDao).length === 14,
    message: `version=${baseline.version}, DAOs=${Object.keys(baseline.perDao).length}/14`,
  });
  if (Object.keys(baseline.perDao).length !== 14) result.passed = false;

  const strongProvenance = /^[0-9a-f]{40}$/i.test(baseline.gitSha)
    && /^[0-9a-f]{64}$/i.test(baseline.configHash);
  result.checks.push({
    name: 'Baseline strong provenance',
    passed: strongProvenance,
    message: `git=${baseline.gitSha}, configHash=${baseline.configHash}`,
  });
  if (!strongProvenance) result.passed = false;

  const currentConfigHash = computeBaselineConfigHash();
  const configMatches = baseline.configHash === currentConfigHash;
  result.checks.push({
    name: 'Baseline matches current calibration configuration',
    passed: configMatches,
    message: `baseline=${baseline.configHash}, current=${currentConfigHash}`,
  });
  if (!configMatches) result.passed = false;

  return result;
}

async function main() {
  const startedAt = new Date();
  const validationRunId = startedAt.toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  const validationRunsRoot = path.join(
    process.cwd(),
    'results',
    'validation',
    'runs'
  );
  fs.mkdirSync(validationRunsRoot, { recursive: true });
  RESULTS_DIR = path.join(
    validationRunsRoot,
    `${validationRunId}-${process.pid}`
  );
  fs.mkdirSync(RESULTS_DIR, { recursive: false });

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
    validateCampaignCompleteness(experiments),
    validateReproducibility(),
    validateMonotonicityVoting(),
    validateMonotonicityProposals(),
    validateBoundaryConditions(),
    validateMetricSanity(),
    validateGovernanceRules(),
    validateConservation(),
    validateQuorumParticipation(),
    validateLearningAgents(),
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

  const finishedAt = new Date();
  writeJsonAtomic(path.join(RESULTS_DIR, 'validation-report.json'), {
    schemaVersion: '1.0.0',
    runId: path.basename(RESULTS_DIR),
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    resultDirectory: path.relative(process.cwd(), RESULTS_DIR).replace(/\\/g, '/'),
    experiments: experiments.map(experiment => ({
      config: path.relative(process.cwd(), experiment).replace(/\\/g, '/'),
      output: experimentOutputName(experiment),
    })),
    passed: allPassed,
    validations,
  });
  console.log(`Validation artifacts: ${RESULTS_DIR}`);

  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);
