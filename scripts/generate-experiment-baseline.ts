#!/usr/bin/env npx tsx

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  CalibrationBaselineSchema,
  ExperimentBaselineSchema,
  ValidationRunSchema,
  type ExperimentBaseline,
  type ValidationRun,
} from '../lib/research/baseline-schema';
import { EXPERIMENT_REPLAY_CONTRACTS } from '../lib/research/baseline-config';
import {
  computeExperimentBaselineConfigHash,
  experimentIdsForSuite,
  type ExperimentBaselineSuite,
} from '../lib/research/experiment-baseline-identity';

interface CliOptions {
  historyPath: string;
  outPath: string;
  runId?: string;
  suite: ExperimentBaselineSuite;
  reason: string;
}

function readOption(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index >= 0 && index + 1 < argv.length ? argv[index + 1] : undefined;
}

function readTrailingText(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  if (index < 0) return undefined;
  const values: string[] = [];
  for (let cursor = index + 1; cursor < argv.length && !argv[cursor].startsWith('--'); cursor++) {
    values.push(argv[cursor]);
  }
  return values.length > 0 ? values.join(' ') : undefined;
}

function parseArgs(): CliOptions {
  const argv = process.argv.slice(2);
  const rawSuite = readOption(argv, '--suite') ?? 'full';
  if (rawSuite !== 'full' && rawSuite !== 'llm') {
    throw new Error(`--suite must be full or llm, received ${rawSuite}`);
  }
  return {
    historyPath: path.resolve(
      readOption(argv, '--history')
        ?? path.join('results', 'validation', 'history.jsonl')
    ),
    outPath: path.resolve(
      readOption(argv, '--out')
        ?? path.join('results', 'baselines', 'experiment-baseline.json')
    ),
    runId: readOption(argv, '--run-id'),
    suite: rawSuite,
    reason: readTrailingText(argv, '--reason')
      ?? 'Measured replay baseline generated from a completed validation run',
  };
}

function loadRuns(historyPath: string): ValidationRun[] {
  if (!fs.existsSync(historyPath)) {
    throw new Error(`Validation history does not exist: ${historyPath}`);
  }
  const runs: ValidationRun[] = [];
  let legacyRows = 0;
  fs.readFileSync(historyPath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .forEach((line, index) => {
      let value: unknown;
      try {
        value = JSON.parse(line);
      } catch {
        throw new Error(`Validation history row ${index + 1} is not valid JSON`);
      }
      const parsed = ValidationRunSchema.safeParse(value);
      if (!parsed.success) {
        legacyRows += 1;
        return;
      }
      runs.push(parsed.data);
    });
  if (legacyRows > 0) {
    console.warn(
      `Ignored ${legacyRows} legacy history row(s) that predate the current schema`
    );
  }
  return runs;
}

function selectRun(runs: ValidationRun[], options: CliOptions): ValidationRun {
  const requiredIds = experimentIdsForSuite(options.suite);
  const candidates = runs.filter(run =>
    run.suite === options.suite
    && run.perExperiment
    && requiredIds.every(id => run.perExperiment?.[id])
  );
  const selected = options.runId
    ? candidates.find(run => run.runId === options.runId)
    : candidates.at(-1);
  if (!selected) {
    throw new Error(
      `No completed ${options.suite} validation run contains every required replay`
    );
  }
  if (!/^[0-9a-f]{40}$/i.test(selected.gitSha)) {
    throw new Error(`Selected run has weak Git provenance: ${selected.gitSha}`);
  }
  return selected;
}

function magnitudeRange(value: number): [number, number] {
  const tolerance = Math.max(0.005, Math.abs(value) * 0.05);
  return [value - tolerance, value + tolerance];
}

function loadPrevious(outPath: string): ExperimentBaseline | null {
  if (!fs.existsSync(outPath)) return null;
  const parsed = ExperimentBaselineSchema.safeParse(
    JSON.parse(fs.readFileSync(outPath, 'utf8'))
  );
  if (!parsed.success) {
    throw new Error(`Existing experiment baseline is invalid: ${parsed.error.message}`);
  }
  return parsed.data;
}

function archivePrevious(
  previous: ExperimentBaseline,
  outPath: string
): void {
  const archivePath = path.join(
    path.dirname(outPath),
    `experiment-baseline.v${previous.version}.`
    + `${previous.configHash.slice(0, 12)}.${previous.gitSha.slice(0, 8)}.json`
  );
  if (fs.existsSync(archivePath)) {
    const archived = ExperimentBaselineSchema.parse(
      JSON.parse(fs.readFileSync(archivePath, 'utf8'))
    );
    if (JSON.stringify(archived) !== JSON.stringify(previous)) {
      throw new Error(`Refusing to overwrite a different archive: ${archivePath}`);
    }
    return;
  }
  fs.writeFileSync(archivePath, `${JSON.stringify(previous, null, 2)}\n`, 'utf8');
}

function main(): void {
  const options = parseArgs();
  const run = selectRun(loadRuns(options.historyPath), options);
  const previous = loadPrevious(options.outPath);
  if (previous) archivePrevious(previous, options.outPath);

  const findings: ExperimentBaseline['findings'] = {};
  for (const experimentId of experimentIdsForSuite(options.suite)) {
    const observed = run.perExperiment?.[experimentId];
    const contract = EXPERIMENT_REPLAY_CONTRACTS[experimentId];
    if (!observed || !contract) {
      throw new Error(`Missing replay result or measurement contract for ${experimentId}`);
    }
    if (observed.metric !== contract.metric) {
      throw new Error(
        `${experimentId} metric mismatch: run=${observed.metric}, contract=${contract.metric}`
      );
    }
    findings[experimentId] = {
      description: contract.description,
      direction: observed.observedDirection,
      magnitudeRange: magnitudeRange(observed.observedMagnitude),
      metric: observed.metric,
      observedMagnitude: observed.observedMagnitude,
      observedAt: run.finishedAt,
    };
  }

  const baseline: ExperimentBaseline = {
    version: (previous?.version ?? 0) + 1,
    generatedAt: new Date().toISOString(),
    gitSha: run.gitSha,
    configHash: computeExperimentBaselineConfigHash(options.suite),
    suite: options.suite,
    sourceRunId: run.runId,
    description: options.reason,
    findings,
  };
  ExperimentBaselineSchema.parse(baseline);
  CalibrationBaselineSchema.parse(
    JSON.parse(
      fs.readFileSync(
        path.join(path.dirname(options.outPath), 'calibration-baseline.json'),
        'utf8'
      )
    )
  );
  fs.mkdirSync(path.dirname(options.outPath), { recursive: true });
  fs.writeFileSync(options.outPath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
  console.log(
    `Wrote measured ${options.suite} experiment baseline v${baseline.version} `
    + `from ${run.runId} to ${options.outPath}`
  );
}

try {
  main();
} catch (error) {
  console.error(
    `generate-experiment-baseline failed: ${
      error instanceof Error ? error.message : String(error)
    }`
  );
  process.exit(1);
}
