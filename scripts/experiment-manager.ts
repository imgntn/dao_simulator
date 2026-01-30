#!/usr/bin/env node
/**
 * Experiment Manager
 *
 * Enhanced experiment runner with:
 * - Real-time log file output (tail -f friendly)
 * - Status JSON file for progress monitoring
 * - Graceful pause/resume with Ctrl+C
 * - Checkpoint-based resume capability
 *
 * Usage:
 *   npx tsx scripts/experiment-manager.ts run <config>     Run an experiment
 *   npx tsx scripts/experiment-manager.ts status <config>  Check experiment status
 *   npx tsx scripts/experiment-manager.ts resume <config>  Resume paused experiment
 *   npx tsx scripts/experiment-manager.ts list             List all experiments
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
// TYPES
// =============================================================================

interface ExperimentStatus {
  name: string;
  state: 'running' | 'paused' | 'completed' | 'failed' | 'not_started';
  startTime?: string;
  lastUpdate: string;
  progress: {
    completedRuns: number;
    totalRuns: number;
    failedRuns: number;
    percentComplete: number;
    runsPerSecond: number;
    estimatedRemainingMs?: number;
  };
  currentSweepValue?: string | number | boolean;
  outputDirectory: string;
  logFile: string;
  checkpointFile?: string;
  error?: string;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'progress' | 'warn' | 'error' | 'metric';
  message: string;
  data?: Record<string, any>;
}

// =============================================================================
// LOGGER CLASS
// =============================================================================

class ExperimentLogger {
  private logPath: string;
  private statusPath: string;
  private status: ExperimentStatus;
  private logStream: fs.WriteStream | null = null;

  constructor(outputDir: string, experimentName: string) {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    this.logPath = path.join(outputDir, 'experiment.log');
    this.statusPath = path.join(outputDir, 'status.json');

    this.status = {
      name: experimentName,
      state: 'not_started',
      lastUpdate: new Date().toISOString(),
      progress: {
        completedRuns: 0,
        totalRuns: 0,
        failedRuns: 0,
        percentComplete: 0,
        runsPerSecond: 0,
      },
      outputDirectory: outputDir,
      logFile: this.logPath,
    };

    // Open log file in append mode
    this.logStream = fs.createWriteStream(this.logPath, { flags: 'a' });
  }

  log(level: LogEntry['level'], message: string, data?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };

    // Write to log file
    const logLine = JSON.stringify(entry) + '\n';
    this.logStream?.write(logLine);

    // Also write human-readable format
    const humanLine = `[${entry.timestamp}] [${level.toUpperCase().padEnd(8)}] ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`;
    this.logStream?.write(humanLine);

    // Console output for important messages
    if (level === 'error') {
      console.error(`[ERROR] ${message}`);
    } else if (level === 'warn') {
      console.warn(`[WARN] ${message}`);
    } else if (level === 'info') {
      console.log(`[INFO] ${message}`);
    }
  }

  updateProgress(progress: BatchProgress): void {
    this.status.progress = {
      completedRuns: progress.completedRuns,
      totalRuns: progress.totalRuns,
      failedRuns: progress.failedRuns,
      percentComplete: progress.percentComplete,
      runsPerSecond: progress.runsPerSecond,
      estimatedRemainingMs: progress.estimatedRemainingMs,
    };
    this.status.currentSweepValue = progress.currentSweepValue;
    this.status.lastUpdate = new Date().toISOString();
    this.writeStatus();

    // Log progress periodically (every 5%)
    const percentInt = Math.floor(progress.percentComplete);
    if (percentInt % 5 === 0 && percentInt > 0) {
      this.log('progress', `Progress: ${percentInt}% (${progress.completedRuns}/${progress.totalRuns})`, {
        runsPerSecond: progress.runsPerSecond.toFixed(2),
        eta: progress.estimatedRemainingMs ? formatDuration(progress.estimatedRemainingMs) : 'unknown',
      });
    }
  }

  setState(state: ExperimentStatus['state'], error?: string): void {
    this.status.state = state;
    this.status.error = error;
    this.status.lastUpdate = new Date().toISOString();
    this.writeStatus();
    this.log('info', `Experiment state changed to: ${state}`, error ? { error } : undefined);
  }

  setStartTime(): void {
    this.status.startTime = new Date().toISOString();
    this.writeStatus();
  }

  setTotalRuns(total: number): void {
    this.status.progress.totalRuns = total;
    this.writeStatus();
  }

  setCheckpointFile(checkpointPath: string): void {
    this.status.checkpointFile = checkpointPath;
    this.writeStatus();
  }

  private writeStatus(): void {
    try {
      fs.writeFileSync(this.statusPath, JSON.stringify(this.status, null, 2));
    } catch (e) {
      // Ignore write errors
    }
  }

  getStatus(): ExperimentStatus {
    return { ...this.status };
  }

  close(): void {
    this.logStream?.end();
  }
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
    try {
      parsed = yaml.parse(content);
    } catch {
      parsed = JSON.parse(content);
    }
  }

  const config: ExperimentConfig = {
    name: parsed.name || 'Unnamed Experiment',
    description: parsed.description,
    version: parsed.version,
    author: parsed.author,
    tags: parsed.tags,
    mode: parsed.mode,
    baseConfig: parsed.baseConfig || {},
    baseCityConfig: parsed.baseCityConfig,
    scenarios: parsed.scenarios,
    sweep: parsed.sweep,
    execution: { ...DEFAULT_EXECUTION_CONFIG, ...parsed.execution },
    metrics: parsed.metrics || DEFAULT_METRICS,
    output: { ...DEFAULT_OUTPUT_CONFIG, ...parsed.output },
  };

  return config;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m`;
}

function createProgressBar(percent: number, width: number = 40): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return `[${'='.repeat(filled)}${' '.repeat(empty)}]`;
}

function calculateTotalRuns(config: ExperimentConfig): number {
  let totalConfigs: number;

  if (!config.sweep) {
    totalConfigs = 1;
  } else if (config.sweep.grid) {
    // Multi-parameter grid search - Cartesian product
    totalConfigs = config.sweep.grid.reduce((acc, g) => {
      const numValues = g.values?.length ||
        (g.range ? Math.ceil((g.range.max - g.range.min) / g.range.step) + 1 : 0);
      return acc * numValues;
    }, 1);
  } else {
    // Single parameter sweep
    totalConfigs = config.sweep.values?.length ||
      (config.sweep.range
        ? Math.ceil((config.sweep.range.max - config.sweep.range.min) / config.sweep.range.step) + 1
        : 1);
  }

  return config.execution.runsPerConfig * totalConfigs;
}

// =============================================================================
// COMMANDS
// =============================================================================

async function runExperiment(configFile: string, options: { resume?: boolean } = {}): Promise<void> {
  console.log(`Loading config: ${configFile}`);
  const config = loadConfig(configFile);
  const outputDir = config.output.directory;
  const logger = new ExperimentLogger(outputDir, config.name);

  // Calculate total runs
  const totalRuns = calculateTotalRuns(config);
  logger.setTotalRuns(totalRuns);

  // Setup graceful shutdown
  let isPaused = false;
  let currentRunner: BatchRunner | null = null;

  const handleSignal = async (signal: string) => {
    if (isPaused) {
      console.log('\nForce stopping...');
      process.exit(1);
    }

    isPaused = true;
    console.log(`\n\nReceived ${signal}. Pausing experiment...`);
    console.log('Press Ctrl+C again to force stop (may lose progress)');
    console.log('');

    logger.setState('paused');
    logger.log('info', `Experiment paused by ${signal}`);

    // Give time for current run to complete and checkpoint
    await new Promise(resolve => setTimeout(resolve, 2000));

    const status = logger.getStatus();
    console.log(`\nExperiment paused at ${status.progress.percentComplete.toFixed(1)}%`);
    console.log(`Completed: ${status.progress.completedRuns}/${status.progress.totalRuns}`);
    console.log(`\nTo resume: npx tsx scripts/experiment-manager.ts resume ${configFile}`);
    console.log(`To check status: npx tsx scripts/experiment-manager.ts status ${configFile}`);
    console.log(`Log file: ${status.logFile}`);

    logger.close();
    process.exit(0);
  };

  process.on('SIGINT', () => handleSignal('SIGINT'));
  process.on('SIGTERM', () => handleSignal('SIGTERM'));

  // Log experiment start
  logger.log('info', `Starting experiment: ${config.name}`);
  logger.log('info', `Description: ${config.description || 'N/A'}`);
  logger.log('info', `Total runs: ${totalRuns} (${config.execution.runsPerConfig} per config)`);
  logger.log('info', `Workers: ${config.execution.workers || 1}`);
  logger.log('info', `Output: ${outputDir}`);

  if (config.sweep) {
    logger.log('info', `Sweep parameter: ${config.sweep.parameter}`);
  }

  // Display info
  console.log(`\nExperiment: ${config.name}`);
  if (config.description) console.log(`Description: ${config.description}`);
  console.log(`Total runs: ${totalRuns}`);
  console.log(`Workers: ${config.execution.workers || 1}`);
  console.log(`Output: ${outputDir}`);
  console.log(`Log file: ${logger.getStatus().logFile}`);
  console.log('');
  console.log('Press Ctrl+C to pause (progress will be saved)');
  console.log('');

  logger.setState('running');
  logger.setStartTime();

  // Create progress callback
  let lastProgressUpdate = Date.now();
  const progressCallback = (progress: BatchProgress) => {
    // Update logger (which writes to status.json)
    logger.updateProgress(progress);

    // Console output - update every 500ms max
    const now = Date.now();
    if (now - lastProgressUpdate > 500) {
      lastProgressUpdate = now;
      const bar = createProgressBar(progress.percentComplete);
      const eta = progress.estimatedRemainingMs
        ? ` ETA: ${formatDuration(progress.estimatedRemainingMs)}`
        : '';
      const rate = progress.runsPerSecond > 0
        ? ` (${progress.runsPerSecond.toFixed(1)}/s)`
        : '';

      process.stdout.write(
        `\r${bar} ${progress.percentComplete.toFixed(1)}% ` +
        `(${progress.completedRuns}/${progress.totalRuns})${rate}${eta}     `
      );
    }
  };

  try {
    // Run the batch
    const startTime = Date.now();
    currentRunner = new BatchRunner(
      config,
      {
        concurrency: config.execution.workers || 1,
        checkpointInterval: Math.max(10, Math.floor(totalRuns / 100)), // Checkpoint every ~1%
      },
      progressCallback
    );

    const batchResult = await currentRunner.run();

    // Clear progress line
    process.stdout.write('\r' + ' '.repeat(100) + '\r');

    // Export results
    logger.log('info', 'Exporting results...');
    const exporter = new ResultsExporter(outputDir, config.output);
    const exportResult = await exporter.exportAll(batchResult.results, batchResult.summary);

    // Log completion
    const duration = Date.now() - startTime;
    logger.log('info', `Experiment completed in ${formatDuration(duration)}`);
    logger.log('info', `Total runs: ${batchResult.summary.totalRuns}`);
    logger.log('info', `Successful: ${batchResult.summary.successfulRuns}`);
    logger.log('info', `Failed: ${batchResult.failedRunIds.length}`);

    // Log metric summaries
    for (const sweepSummary of batchResult.summary.metricsSummary) {
      const sweepLabel = sweepSummary.sweepValue !== undefined
        ? `[${sweepSummary.sweepValue}] `
        : '';
      for (const metric of sweepSummary.metrics) {
        logger.log('metric', `${sweepLabel}${metric.name}: ${metric.mean.toFixed(4)} (std: ${metric.std.toFixed(4)})`);
      }
    }

    logger.setState('completed');

    // Console output
    console.log('\n=== Experiment Complete ===');
    console.log(`Duration: ${formatDuration(duration)}`);
    console.log(`Total runs: ${batchResult.summary.totalRuns}`);
    console.log(`Successful: ${batchResult.summary.successfulRuns}`);
    if (batchResult.failedRunIds.length > 0) {
      console.log(`Failed: ${batchResult.failedRunIds.length}`);
    }
    console.log(`Output: ${exportResult.directory}`);
    console.log(`Files: ${exportResult.files.length}`);

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

  } catch (error) {
    const errorMsg = (error as Error).message;
    logger.log('error', `Experiment failed: ${errorMsg}`);
    logger.setState('failed', errorMsg);
    console.error(`\nError: ${errorMsg}`);
    process.exit(1);
  } finally {
    logger.close();
  }
}

async function checkStatus(configFile: string): Promise<void> {
  const config = loadConfig(configFile);
  const statusPath = path.join(config.output.directory, 'status.json');

  if (!fs.existsSync(statusPath)) {
    console.log(`No status file found for experiment: ${config.name}`);
    console.log(`Expected at: ${statusPath}`);
    console.log('\nExperiment has not been started yet.');
    return;
  }

  const status: ExperimentStatus = JSON.parse(fs.readFileSync(statusPath, 'utf8'));

  console.log(`\n=== Experiment Status ===`);
  console.log(`Name: ${status.name}`);
  console.log(`State: ${status.state.toUpperCase()}`);
  console.log(`Started: ${status.startTime || 'N/A'}`);
  console.log(`Last Update: ${status.lastUpdate}`);
  console.log('');

  const bar = createProgressBar(status.progress.percentComplete);
  console.log(`Progress: ${bar} ${status.progress.percentComplete.toFixed(1)}%`);
  console.log(`Completed: ${status.progress.completedRuns}/${status.progress.totalRuns}`);
  console.log(`Failed: ${status.progress.failedRuns}`);

  if (status.progress.runsPerSecond > 0) {
    console.log(`Rate: ${status.progress.runsPerSecond.toFixed(1)} runs/s`);
  }
  if (status.progress.estimatedRemainingMs) {
    console.log(`ETA: ${formatDuration(status.progress.estimatedRemainingMs)}`);
  }
  if (status.currentSweepValue !== undefined) {
    console.log(`Current sweep value: ${status.currentSweepValue}`);
  }

  console.log('');
  console.log(`Output: ${status.outputDirectory}`);
  console.log(`Log: ${status.logFile}`);

  if (status.error) {
    console.log(`\nError: ${status.error}`);
  }

  if (status.state === 'paused') {
    console.log(`\nTo resume: npx tsx scripts/experiment-manager.ts resume ${configFile}`);
  }

  // Show last few log entries
  const logPath = status.logFile;
  if (fs.existsSync(logPath)) {
    console.log('\n=== Recent Log Entries ===');
    const logContent = fs.readFileSync(logPath, 'utf8');
    const lines = logContent.split('\n').filter(l => l.trim() && !l.startsWith('{'));
    const recentLines = lines.slice(-10);
    for (const line of recentLines) {
      console.log(line);
    }
  }
}

async function listExperiments(): Promise<void> {
  const resultsDir = 'results';

  if (!fs.existsSync(resultsDir)) {
    console.log('No results directory found.');
    return;
  }

  console.log('\n=== Experiments ===\n');

  const dirs = fs.readdirSync(resultsDir, { withFileTypes: true })
    .filter(d => d.isDirectory());

  for (const dir of dirs) {
    const statusPath = path.join(resultsDir, dir.name, 'status.json');
    if (fs.existsSync(statusPath)) {
      const status: ExperimentStatus = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
      const stateColor = {
        running: '\x1b[33m',   // Yellow
        paused: '\x1b[33m',    // Yellow
        completed: '\x1b[32m', // Green
        failed: '\x1b[31m',    // Red
        not_started: '\x1b[90m', // Gray
      }[status.state] || '';
      const reset = '\x1b[0m';

      console.log(`${stateColor}[${status.state.toUpperCase().padEnd(10)}]${reset} ${status.name}`);
      console.log(`    Progress: ${status.progress.percentComplete.toFixed(0)}% (${status.progress.completedRuns}/${status.progress.totalRuns})`);
      console.log(`    Output: ${dir.name}/`);
      console.log('');
    }
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'run':
      if (!args[1]) {
        console.error('Usage: experiment-manager run <config-file>');
        process.exit(1);
      }
      await runExperiment(args[1]);
      break;

    case 'resume':
      if (!args[1]) {
        console.error('Usage: experiment-manager resume <config-file>');
        process.exit(1);
      }
      await runExperiment(args[1], { resume: true });
      break;

    case 'status':
      if (!args[1]) {
        console.error('Usage: experiment-manager status <config-file>');
        process.exit(1);
      }
      await checkStatus(args[1]);
      break;

    case 'list':
      await listExperiments();
      break;

    case 'help':
    case '--help':
    case '-h':
      console.log(`
Experiment Manager - Run and monitor DAO simulation experiments

Usage:
  npx tsx scripts/experiment-manager.ts <command> [options]

Commands:
  run <config>      Run an experiment from config file
  resume <config>   Resume a paused experiment
  status <config>   Check experiment status
  list              List all experiments and their status

During execution:
  - Press Ctrl+C to pause (progress is saved)
  - Monitor with: tail -f results/<name>/experiment.log
  - Check status: npx tsx scripts/experiment-manager.ts status <config>

Files created:
  results/<name>/experiment.log   Real-time log (tail -f friendly)
  results/<name>/status.json      Current status (JSON)
  .checkpoints/<name>.json        Checkpoint for resume

Examples:
  # Run experiment
  npx tsx scripts/experiment-manager.ts run experiments/research/liquid-democracy.yaml

  # Check progress
  npx tsx scripts/experiment-manager.ts status experiments/research/liquid-democracy.yaml

  # Watch logs
  tail -f results/research/liquid-democracy-effectiveness/experiment.log

  # Resume after pause
  npx tsx scripts/experiment-manager.ts resume experiments/research/liquid-democracy.yaml
`);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.log('Use --help for usage information');
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
