#!/usr/bin/env npx tsx
/**
 * Calibration Validation Loop — main entry point.
 *
 * Reads the baseline, runs the validator at the requested suite level,
 * diffs the run against the baseline, writes a markdown report + appends
 * to history.jsonl, and exits with a stable code that CI can wire on.
 *
 * Exit codes (see lib/research/baseline-config.ts):
 *   0 — pass
 *   1 — regression detected (or finding inverted)
 *   2 — config-hash mismatch with baseline (intentional baseline regen needed)
 *   3 — infrastructure failure (file missing, schema invalid, runner threw)
 */

import { createRequire } from 'module';
(globalThis as { __nodeRequire?: NodeRequire }).__nodeRequire = createRequire(import.meta.url);

import * as fs from 'fs';
import * as path from 'path';
import { CalibrationValidator, populateExp10Magnitude } from '../lib/research/calibration-validator';
import { ValidationDiffer } from '../lib/research/validation-differ';
import { FindingChecker } from '../lib/research/finding-checker';
import { writeValidationReport } from '../lib/research/validation-report';
import {
  CalibrationBaselineSchema,
  ExperimentBaselineSchema,
  type CalibrationBaseline,
  type ExperimentBaseline,
} from '../lib/research/baseline-schema';
import {
  computeBaselineConfigHash,
  EXIT_OK,
  EXIT_REGRESSION,
  EXIT_CONFIG_DRIFT,
  EXIT_INFRA_FAILURE,
} from '../lib/research/baseline-config';
import { logger } from '../lib/utils/logger';

interface CliOptions {
  suite: 'smoke' | 'fast' | 'full' | 'llm';
  baselinePath: string;
  experimentBaselinePath: string;
  outDir: string;
  historyPath: string;
  allowConfigDrift: boolean;
  quiet: boolean;
}

function parseArgs(): CliOptions {
  const argv = process.argv.slice(2);
  const args = new Set(argv);

  let suite: CliOptions['suite'] = 'fast';
  if (args.has('--smoke')) suite = 'smoke';
  else if (args.has('--full')) suite = 'full';
  else if (args.has('--llm')) suite = 'llm';
  else if (args.has('--fast')) suite = 'fast';

  const root = process.cwd();
  const baselinePath = readOpt(argv, '--baseline')
    ?? path.join(root, 'results', 'baselines', 'calibration-baseline.json');
  const experimentBaselinePath = readOpt(argv, '--experiment-baseline')
    ?? path.join(root, 'results', 'baselines', 'experiment-baseline.json');
  const outDir = readOpt(argv, '--out')
    ?? path.join(root, 'results', 'validation');
  const historyPath = readOpt(argv, '--history')
    ?? path.join(outDir, 'history.jsonl');

  return {
    suite,
    baselinePath,
    experimentBaselinePath,
    outDir,
    historyPath,
    allowConfigDrift: args.has('--allow-config-drift'),
    quiet: args.has('--quiet'),
  };
}

function readOpt(argv: string[], flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  if (idx >= 0 && idx + 1 < argv.length) return argv[idx + 1];
  return undefined;
}

function loadCalibrationBaseline(p: string): CalibrationBaseline {
  if (!fs.existsSync(p)) {
    throw new Error(`Calibration baseline not found at ${p}`);
  }
  const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
  const parsed = CalibrationBaselineSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid calibration baseline: ${parsed.error.message}`);
  }
  return parsed.data;
}

function loadExperimentBaseline(p: string): ExperimentBaseline | null {
  if (!fs.existsSync(p)) return null;
  const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
  const parsed = ExperimentBaselineSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid experiment baseline: ${parsed.error.message}`);
  }
  return parsed.data;
}

async function main(): Promise<void> {
  const opts = parseArgs();
  if (!opts.quiet) {
    logger.setLevel('info');
  }

  let calibrationBaseline: CalibrationBaseline;
  let experimentBaseline: ExperimentBaseline | null;
  try {
    calibrationBaseline = loadCalibrationBaseline(opts.baselinePath);
    experimentBaseline = loadExperimentBaseline(opts.experimentBaselinePath);
  } catch (err) {
    console.error(`Infra failure: ${(err as Error).message}`);
    process.exit(EXIT_INFRA_FAILURE);
  }

  const currentConfigHash = computeBaselineConfigHash();
  const baselineHash = calibrationBaseline.configHash;
  const placeholder = baselineHash === 'seed-v1';

  if (!placeholder && baselineHash !== currentConfigHash && !opts.allowConfigDrift) {
    console.error(
      `Config drift: baseline hash ${baselineHash} != current ${currentConfigHash}.`
        + ' Regenerate the baseline (scripts/accept-calibration-baseline.ts)'
        + ' or pass --allow-config-drift to override.',
    );
    process.exit(EXIT_CONFIG_DRIFT);
  }

  const validator = new CalibrationValidator({
    suite: opts.suite,
    baselineVersion: calibrationBaseline.version,
  });

  let run;
  try {
    run = await validator.run();
  } catch (err) {
    console.error(`Infra failure during validation: ${(err as Error).message}`);
    process.exit(EXIT_INFRA_FAILURE);
  }

  if (run.perExperiment) {
    populateExp10Magnitude(run);
  }

  const differ = new ValidationDiffer();
  const diff = differ.diff(run, calibrationBaseline);

  let findings;
  if (experimentBaseline && run.perExperiment) {
    const checker = new FindingChecker();
    findings = checker.check(run, experimentBaseline);
  }

  const hasRegression = diff.regressions.length > 0
    || (findings ? findings.inversions.length > 0 : false);

  run.regressionCount = diff.regressions.length + (findings ? findings.inversions.length : 0);
  run.status = hasRegression ? 'regression' : 'pass';

  const { markdownPath } = writeValidationReport(
    {
      run,
      diff,
      findings,
      baselineGitSha: calibrationBaseline.gitSha,
    },
    {
      outDir: opts.outDir,
      historyPath: opts.historyPath,
    },
  );

  if (!opts.quiet) {
    console.log(`Report: ${markdownPath}`);
    console.log(`History: ${opts.historyPath}`);
    console.log(`Status: ${run.status}`);
    if (diff.regressions.length > 0) {
      console.log(`Regressions: ${diff.regressions.length}`);
      for (const r of diff.regressions) {
        console.log(`  - ${r.daoId}: ${r.kind} (${r.details})`);
      }
    }
    if (findings && findings.inversions.length > 0) {
      console.log(`Finding inversions: ${findings.inversions.length}`);
      for (const f of findings.inversions) {
        console.log(`  - ${f.experimentId}: ${f.details}`);
      }
    }
  }

  process.exit(hasRegression ? EXIT_REGRESSION : EXIT_OK);
}

main().catch((err) => {
  console.error(`Unhandled error: ${(err as Error).message}`);
  process.exit(EXIT_INFRA_FAILURE);
});
