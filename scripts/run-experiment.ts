#!/usr/bin/env node
/**
 * Experiment Runner CLI
 *
 * Usage:
 *   npx ts-node scripts/run-experiment.ts <config-file>
 *   npm run experiment -- <config-file>
 *
 * Options:
 *   --output, -o <dir>     Override output directory
 *   --runs, -r <number>    Override runs per config
 *   --steps, -s <number>   Override steps per run
 *   --seed <number>        Override base seed
 *   --concurrency, -c <n>  Run N simulations concurrently (default: 1)
 *   --resume               Resume from checkpoint if available
 *   --quiet, -q            Suppress progress output
 *   --help, -h             Show help
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import {
  BatchRunner,
  ResultsExporter,
  type ExperimentConfig,
  type BatchProgress,
  DEFAULT_EXECUTION_CONFIG,
  DEFAULT_OUTPUT_CONFIG,
  DEFAULT_METRICS,
} from '../lib/research';

// =============================================================================
// ARGUMENT PARSING
// =============================================================================

interface CliArgs {
  configFile?: string;
  outputDir?: string;
  runsPerConfig?: number;
  stepsPerRun?: number;
  baseSeed?: number;
  concurrency: number;
  resume: boolean;
  quiet: boolean;
  help: boolean;
}

function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {
    concurrency: 1,
    resume: false,
    quiet: false,
    help: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    switch (arg) {
      case '--help':
      case '-h':
        result.help = true;
        break;

      case '--quiet':
      case '-q':
        result.quiet = true;
        break;

      case '--resume':
        result.resume = true;
        break;

      case '--output':
      case '-o':
        result.outputDir = args[++i];
        break;

      case '--runs':
      case '-r':
        result.runsPerConfig = parseInt(args[++i], 10);
        break;

      case '--steps':
      case '-s':
        result.stepsPerRun = parseInt(args[++i], 10);
        break;

      case '--seed':
        result.baseSeed = parseInt(args[++i], 10);
        break;

      case '--concurrency':
      case '-c':
        result.concurrency = parseInt(args[++i], 10);
        break;

      default:
        if (!arg.startsWith('-') && !result.configFile) {
          result.configFile = arg;
        }
        break;
    }

    i++;
  }

  return result;
}

function showHelp(): void {
  console.log(`
DAO Simulator - Experiment Runner

Usage:
  npx ts-node scripts/run-experiment.ts <config-file> [options]
  npm run experiment -- <config-file> [options]

Arguments:
  config-file           Path to YAML or JSON experiment configuration

Options:
  --output, -o <dir>    Override output directory
  --runs, -r <number>   Override runs per configuration
  --steps, -s <number>  Override steps per simulation run
  --seed <number>       Override base random seed
  --concurrency, -c <n> Run N simulations concurrently (default: 1)
  --resume              Resume from checkpoint if available
  --quiet, -q           Suppress progress output
  --help, -h            Show this help message

Examples:
  # Basic run
  npm run experiment -- experiments/example.yaml

  # Parameter sweep with more runs
  npm run experiment -- experiments/quorum-sweep.yaml --runs 50

  # Concurrent execution (faster)
  npm run experiment -- experiments/quorum-sweep.yaml -c 4

  # Custom output directory
  npm run experiment -- experiments/example.yaml -o results/my-study

Config File Format (YAML):
  name: "My Experiment"
  description: "What this experiment tests"

  baseConfig:
    template: "compound"    # Or inline: {...}
    overrides:              # Optional modifications
      quorumConfig:
        baseQuorumPercent: 5

  sweep:                    # Optional - omit for single config
    parameter: "quorumConfig.baseQuorumPercent"
    range: { min: 1, max: 20, step: 1 }
    # Or values: [1, 5, 10, 15, 20]

  execution:
    runsPerConfig: 30
    stepsPerRun: 500
    seedStrategy: "sequential"
    baseSeed: 12345

  metrics:
    - name: "Proposal Pass Rate"
      type: "builtin"
      builtin: "proposal_pass_rate"

  output:
    directory: "results/my-experiment"
    formats: ["json", "csv"]
    includeRawRuns: true
    includeManifest: true
`);
}

// =============================================================================
// CONFIG LOADING
// =============================================================================

function loadConfig(filePath: string): ExperimentConfig {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Config file not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  const ext = path.extname(filePath).toLowerCase();

  let parsed: any;
  if (ext === '.yaml' || ext === '.yml') {
    parsed = yaml.parse(content);
  } else if (ext === '.json') {
    parsed = JSON.parse(content);
  } else {
    // Try YAML first, then JSON
    try {
      parsed = yaml.parse(content);
    } catch {
      parsed = JSON.parse(content);
    }
  }

  // Apply defaults
  const config: ExperimentConfig = {
    name: parsed.name || 'Unnamed Experiment',
    description: parsed.description,
    version: parsed.version,
    author: parsed.author,
    tags: parsed.tags,
    baseConfig: parsed.baseConfig || {},
    sweep: parsed.sweep,
    execution: { ...DEFAULT_EXECUTION_CONFIG, ...parsed.execution },
    metrics: parsed.metrics || DEFAULT_METRICS,
    output: { ...DEFAULT_OUTPUT_CONFIG, ...parsed.output },
  };

  return config;
}

// =============================================================================
// PROGRESS DISPLAY
// =============================================================================

function createBatchProgressCallback(quiet: boolean): ((progress: BatchProgress) => void) | undefined {
  if (quiet) return undefined;

  let lastPercent = -1;

  return (progress: BatchProgress) => {
    const percent = Math.floor(progress.percentComplete);

    // Only update on percentage change
    if (percent !== lastPercent) {
      lastPercent = percent;

      const bar = createProgressBar(percent);
      const rateInfo = progress.runsPerSecond > 0
        ? ` (${progress.runsPerSecond.toFixed(1)} runs/s)`
        : '';
      const etaInfo = progress.estimatedRemainingMs && progress.estimatedRemainingMs > 0
        ? ` ETA: ${formatDuration(progress.estimatedRemainingMs)}`
        : '';

      process.stdout.write(
        `\r${bar} ${percent}% (${progress.completedRuns}/${progress.totalRuns})${rateInfo}${etaInfo}   `
      );
    }
  };
}

function createProgressBar(percent: number): string {
  const width = 30;
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return `[${'='.repeat(filled)}${' '.repeat(empty)}]`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (!args.configFile) {
    console.error('Error: No config file specified\n');
    showHelp();
    process.exit(1);
  }

  // Load config
  console.log(`Loading config: ${args.configFile}`);
  let config: ExperimentConfig;
  try {
    config = loadConfig(args.configFile);
  } catch (error) {
    console.error(`Error loading config: ${(error as Error).message}`);
    process.exit(1);
  }

  // Apply CLI overrides
  if (args.outputDir) {
    config.output.directory = args.outputDir;
  }
  if (args.runsPerConfig) {
    config.execution.runsPerConfig = args.runsPerConfig;
  }
  if (args.stepsPerRun) {
    config.execution.stepsPerRun = args.stepsPerRun;
  }
  if (args.baseSeed) {
    config.execution.baseSeed = args.baseSeed;
    config.execution.seedStrategy = 'sequential';
  }
  // CLI concurrency takes precedence over config workers
  // If CLI specifies -c N, use N. Otherwise use config workers (default 1).
  const cliSpecifiedConcurrency = process.argv.some(arg => arg === '-c' || arg === '--concurrency');
  const concurrency = cliSpecifiedConcurrency ? args.concurrency : (config.execution.workers ?? 1);
  config.execution.workers = concurrency;

  // Display experiment info
  console.log(`\nExperiment: ${config.name}`);
  if (config.description) {
    console.log(`Description: ${config.description}`);
  }

  const sweepInfo = config.sweep
    ? `Sweep: ${config.sweep.parameter} (${config.sweep.values?.length || 'range'} values)`
    : 'No parameter sweep';
  console.log(sweepInfo);

  const totalRuns = config.execution.runsPerConfig *
    (config.sweep
      ? (config.sweep.values?.length ||
          Math.ceil((config.sweep.range!.max - config.sweep.range!.min) / config.sweep.range!.step) + 1)
      : 1);

  console.log(`Runs: ${totalRuns} (${config.execution.runsPerConfig} per config, ${config.execution.stepsPerRun} steps each)`);
  console.log(`Workers: ${concurrency}${concurrency > 1 ? ' (parallel)' : ' (sequential)'}`);
  console.log(`Output: ${config.output.directory}`);
  console.log('');

  // Run experiment using BatchRunner
  const startTime = Date.now();
  const progressCallback = createBatchProgressCallback(args.quiet);

  try {
    const runner = new BatchRunner(
      config,
      {
        concurrency,
        checkpointInterval: 10,
      },
      progressCallback
    );

    const batchResult = await runner.run();

    // Clear progress line
    if (!args.quiet) {
      process.stdout.write('\r' + ' '.repeat(100) + '\r');
    }

    // Export results
    const exporter = new ResultsExporter(config.output.directory, config.output);
    const exportResult = await exporter.exportAll(batchResult.results, batchResult.summary);

    // Display summary
    const duration = (Date.now() - startTime) / 1000;
    console.log('\n=== Experiment Complete ===');
    console.log(`Duration: ${formatDuration(duration * 1000)}`);
    console.log(`Total runs: ${batchResult.summary.totalRuns}`);
    console.log(`Successful: ${batchResult.summary.successfulRuns}`);
    if (batchResult.failedRunIds.length > 0) {
      console.log(`Failed: ${batchResult.failedRunIds.length}`);
    }
    console.log(`Output directory: ${exportResult.directory}`);
    console.log(`Files created: ${exportResult.files.length}`);

    // Display metric summaries
    console.log('\n=== Results Summary ===');
    for (const sweepSummary of batchResult.summary.metricsSummary) {
      if (sweepSummary.sweepValue !== undefined) {
        console.log(`\nSweep value: ${sweepSummary.sweepValue}`);
      }
      for (const metric of sweepSummary.metrics) {
        console.log(`  ${metric.name}: ${metric.mean.toFixed(4)} (std: ${metric.std.toFixed(4)})`);
      }
    }

    console.log('\nDone!');

    // Exit with error code if there were failures
    if (batchResult.failedRunIds.length > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error(`\nError running experiment: ${(error as Error).message}`);
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
}

// Run main
main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
