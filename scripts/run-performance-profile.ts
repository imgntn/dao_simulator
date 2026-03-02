/**
 * Performance Profiling Script
 *
 * Measures simulation engine performance at various agent counts.
 * Tracks wall clock time, throughput (steps/sec), time per step,
 * and memory usage across multiple repetitions.
 *
 * Usage:
 *   npx tsx scripts/run-performance-profile.ts
 *   npx tsx scripts/run-performance-profile.ts --steps 200 --reps 5
 *   npx tsx scripts/run-performance-profile.ts --agents 50,100,500
 *   npx tsx scripts/run-performance-profile.ts --agents 25,50 --steps 50 --reps 1
 */

import * as fs from 'fs';
import * as path from 'path';
import { DAOSimulation } from '../lib/engine/simulation';
import type { DAOSimulationConfig } from '../lib/engine/simulation';

// =============================================================================
// CONFIG
// =============================================================================

interface ProfileConfig {
  agentCounts: number[];
  steps: number;
  reps: number;
  seed: number;
  outputDir: string;
}

function parseArgs(): ProfileConfig {
  const args = process.argv.slice(2);
  const config: ProfileConfig = {
    agentCounts: [50, 100, 200, 500, 1000],
    steps: 100,
    reps: 3,
    seed: 42,
    outputDir: path.join(process.cwd(), 'results', 'performance'),
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--agents':
        config.agentCounts = args[++i].split(',').map(s => parseInt(s.trim(), 10));
        break;
      case '--steps':
        config.steps = parseInt(args[++i], 10);
        break;
      case '--reps':
        config.reps = parseInt(args[++i], 10);
        break;
      case '--seed':
        config.seed = parseInt(args[++i], 10);
        break;
      case '--output':
        config.outputDir = args[++i];
        break;
      case '--help':
        console.log('Usage: npx tsx scripts/run-performance-profile.ts [options]');
        console.log();
        console.log('Options:');
        console.log('  --agents <list>   Comma-separated agent counts (default: 50,100,200,500,1000)');
        console.log('  --steps <n>       Steps per simulation run (default: 100)');
        console.log('  --reps <n>        Repetitions per agent count (default: 3)');
        console.log('  --seed <n>        Base RNG seed (default: 42)');
        console.log('  --output <dir>    Output directory (default: results/performance)');
        process.exit(0);
    }
  }

  return config;
}

// =============================================================================
// AGENT DISTRIBUTION
// =============================================================================

/**
 * Distribute a target total agent count across the standard agent types.
 * Uses a proportional mix that mirrors realistic DAO composition:
 *   - Heavy on passive members, developers, delegators
 *   - Moderate investors, traders, validators, proposal creators
 *   - Light on specialists (auditors, arbitrators, whistleblowers, etc.)
 *
 * Returns a partial config with all num_* fields summing to `total`.
 */
function distributeAgents(total: number): Partial<DAOSimulationConfig> {
  // Proportional weights (must sum to 1.0)
  const distribution: Array<{ key: keyof DAOSimulationConfig; weight: number }> = [
    { key: 'num_developers',         weight: 0.12 },
    { key: 'num_investors',          weight: 0.06 },
    { key: 'num_traders',            weight: 0.05 },
    { key: 'num_adaptive_investors', weight: 0.04 },
    { key: 'num_delegators',         weight: 0.08 },
    { key: 'num_liquid_delegators',  weight: 0.03 },
    { key: 'num_proposal_creators',  weight: 0.06 },
    { key: 'num_validators',         weight: 0.06 },
    { key: 'num_service_providers',  weight: 0.04 },
    { key: 'num_arbitrators',        weight: 0.02 },
    { key: 'num_regulators',         weight: 0.02 },
    { key: 'num_auditors',           weight: 0.02 },
    { key: 'num_bounty_hunters',     weight: 0.03 },
    { key: 'num_external_partners',  weight: 0.02 },
    { key: 'num_passive_members',    weight: 0.15 },
    { key: 'num_artists',            weight: 0.03 },
    { key: 'num_collectors',         weight: 0.03 },
    { key: 'num_speculators',        weight: 0.03 },
    { key: 'num_stakers',            weight: 0.02 },
    { key: 'num_rl_traders',         weight: 0.02 },
    { key: 'num_governance_experts', weight: 0.03 },
    { key: 'num_governance_whales',  weight: 0.01 },
    { key: 'num_risk_managers',      weight: 0.02 },
    { key: 'num_market_makers',      weight: 0.02 },
    { key: 'num_whistleblowers',     weight: 0.01 },
  ];

  // Assign proportional counts, rounding down
  const counts: Record<string, number> = {};
  let assigned = 0;
  for (const entry of distribution) {
    const count = Math.floor(total * entry.weight);
    counts[entry.key as string] = count;
    assigned += count;
  }

  // Distribute remainder to passive_members (largest category)
  counts['num_passive_members'] += (total - assigned);

  // Zero out LLM agents (not part of performance profiling)
  counts['num_llm_agents'] = 0;
  counts['num_llm_reporters'] = 0;

  return counts as Partial<DAOSimulationConfig>;
}

// =============================================================================
// MEASUREMENT
// =============================================================================

interface RunResult {
  agentCount: number;
  rep: number;
  steps: number;
  wallClockMs: number;
  stepsPerSecond: number;
  msPerStep: number;
  memoryBeforeMB: NodeJS.MemoryUsage;
  memoryAfterMB: NodeJS.MemoryUsage;
  heapUsedDeltaMB: number;
  rssDeltaMB: number;
}

interface AggregateSummary {
  agentCount: number;
  steps: number;
  reps: number;
  avgWallClockMs: number;
  avgStepsPerSecond: number;
  avgMsPerStep: number;
  minWallClockMs: number;
  maxWallClockMs: number;
  avgHeapUsedMB: number;
  avgRssMB: number;
  peakHeapUsedMB: number;
  peakRssMB: number;
  runs: RunResult[];
}

function toMB(usage: NodeJS.MemoryUsage): NodeJS.MemoryUsage {
  return {
    rss: parseFloat((usage.rss / 1024 / 1024).toFixed(2)),
    heapTotal: parseFloat((usage.heapTotal / 1024 / 1024).toFixed(2)),
    heapUsed: parseFloat((usage.heapUsed / 1024 / 1024).toFixed(2)),
    external: parseFloat((usage.external / 1024 / 1024).toFixed(2)),
    arrayBuffers: parseFloat((usage.arrayBuffers / 1024 / 1024).toFixed(2)),
  };
}

async function runSingleProfile(
  agentCount: number,
  steps: number,
  rep: number,
  seed: number,
): Promise<RunResult> {
  // Force GC if available (run with --expose-gc for best results)
  if (global.gc) {
    global.gc();
  }

  const agentConfig = distributeAgents(agentCount);

  const simConfig: DAOSimulationConfig = {
    ...agentConfig,
    governance_rule: 'majority',
    learning_enabled: false,
    forum_enabled: false,
    llm_enabled: false,
    seed: seed + rep,
    exportCsv: false,
    eventLogging: false,
    collectionInterval: 10,
  };

  const memBefore = process.memoryUsage();

  const sim = new DAOSimulation(simConfig);

  const startTime = performance.now();
  await sim.run(steps);
  const endTime = performance.now();

  const memAfter = process.memoryUsage();
  const wallClockMs = endTime - startTime;

  return {
    agentCount,
    rep,
    steps,
    wallClockMs,
    stepsPerSecond: (steps / wallClockMs) * 1000,
    msPerStep: wallClockMs / steps,
    memoryBeforeMB: toMB(memBefore),
    memoryAfterMB: toMB(memAfter),
    heapUsedDeltaMB: parseFloat(
      ((memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024).toFixed(2)
    ),
    rssDeltaMB: parseFloat(
      ((memAfter.rss - memBefore.rss) / 1024 / 1024).toFixed(2)
    ),
  };
}

// =============================================================================
// REPORTING
// =============================================================================

function aggregate(runs: RunResult[]): AggregateSummary {
  const n = runs.length;
  const agentCount = runs[0].agentCount;
  const steps = runs[0].steps;

  const wallClocks = runs.map(r => r.wallClockMs);
  const stepsPerSec = runs.map(r => r.stepsPerSecond);
  const msPerStep = runs.map(r => r.msPerStep);
  const heapAfter = runs.map(r => r.memoryAfterMB.heapUsed);
  const rssAfter = runs.map(r => r.memoryAfterMB.rss);

  return {
    agentCount,
    steps,
    reps: n,
    avgWallClockMs: wallClocks.reduce((a, b) => a + b, 0) / n,
    avgStepsPerSecond: stepsPerSec.reduce((a, b) => a + b, 0) / n,
    avgMsPerStep: msPerStep.reduce((a, b) => a + b, 0) / n,
    minWallClockMs: Math.min(...wallClocks),
    maxWallClockMs: Math.max(...wallClocks),
    avgHeapUsedMB: heapAfter.reduce((a, b) => a + b, 0) / n,
    avgRssMB: rssAfter.reduce((a, b) => a + b, 0) / n,
    peakHeapUsedMB: Math.max(...heapAfter),
    peakRssMB: Math.max(...rssAfter),
    runs,
  };
}

function printSummaryTable(summaries: AggregateSummary[]): void {
  console.log();
  console.log('='.repeat(100));
  console.log('  PERFORMANCE PROFILE RESULTS');
  console.log('='.repeat(100));
  console.log();

  // Header
  console.log(
    'Agents'.padEnd(8) +
    'Steps'.padEnd(7) +
    'Reps'.padEnd(6) +
    'Avg Time(s)'.padEnd(13) +
    'Min(s)'.padEnd(10) +
    'Max(s)'.padEnd(10) +
    'Steps/s'.padEnd(10) +
    'ms/Step'.padEnd(10) +
    'Heap(MB)'.padEnd(10) +
    'RSS(MB)'.padEnd(10) +
    'Peak Heap'.padEnd(10)
  );
  console.log('-'.repeat(100));

  for (const s of summaries) {
    console.log(
      String(s.agentCount).padEnd(8) +
      String(s.steps).padEnd(7) +
      String(s.reps).padEnd(6) +
      (s.avgWallClockMs / 1000).toFixed(2).padEnd(13) +
      (s.minWallClockMs / 1000).toFixed(2).padEnd(10) +
      (s.maxWallClockMs / 1000).toFixed(2).padEnd(10) +
      s.avgStepsPerSecond.toFixed(1).padEnd(10) +
      s.avgMsPerStep.toFixed(2).padEnd(10) +
      s.avgHeapUsedMB.toFixed(1).padEnd(10) +
      s.avgRssMB.toFixed(1).padEnd(10) +
      s.peakHeapUsedMB.toFixed(1).padEnd(10)
    );
  }

  console.log('-'.repeat(100));

  // Scaling analysis
  if (summaries.length >= 2) {
    console.log();
    console.log('Scaling Analysis:');
    const base = summaries[0];
    for (let i = 1; i < summaries.length; i++) {
      const s = summaries[i];
      const agentRatio = s.agentCount / base.agentCount;
      const timeRatio = s.avgWallClockMs / base.avgWallClockMs;
      const scalingExponent = Math.log(timeRatio) / Math.log(agentRatio);
      console.log(
        `  ${base.agentCount} -> ${s.agentCount} agents: ` +
        `${agentRatio.toFixed(1)}x agents, ` +
        `${timeRatio.toFixed(1)}x time, ` +
        `scaling exponent = ${scalingExponent.toFixed(2)} ` +
        `(1.0 = linear, 2.0 = quadratic)`
      );
    }
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const config = parseArgs();

  console.log('='.repeat(70));
  console.log('  DAO Simulation Performance Profiler');
  console.log('='.repeat(70));
  console.log(`  Agent counts: ${config.agentCounts.join(', ')}`);
  console.log(`  Steps/run:    ${config.steps}`);
  console.log(`  Repetitions:  ${config.reps}`);
  console.log(`  Base seed:    ${config.seed}`);
  console.log(`  Output:       ${config.outputDir}`);
  console.log('='.repeat(70));
  console.log();

  fs.mkdirSync(config.outputDir, { recursive: true });

  const allSummaries: AggregateSummary[] = [];

  for (const agentCount of config.agentCounts) {
    console.log(`--- Profiling ${agentCount} agents ---`);
    const runs: RunResult[] = [];

    for (let rep = 0; rep < config.reps; rep++) {
      process.stdout.write(`  Rep ${rep + 1}/${config.reps}... `);

      const result = await runSingleProfile(
        agentCount,
        config.steps,
        rep,
        config.seed,
      );

      runs.push(result);

      console.log(
        `${(result.wallClockMs / 1000).toFixed(2)}s ` +
        `(${result.stepsPerSecond.toFixed(1)} steps/s, ` +
        `heap=${result.memoryAfterMB.heapUsed}MB)`
      );
    }

    const summary = aggregate(runs);
    allSummaries.push(summary);

    console.log(
      `  Avg: ${(summary.avgWallClockMs / 1000).toFixed(2)}s, ` +
      `${summary.avgStepsPerSecond.toFixed(1)} steps/s, ` +
      `${summary.avgMsPerStep.toFixed(2)} ms/step`
    );
    console.log();
  }

  // Print formatted table
  printSummaryTable(allSummaries);

  // Write JSON results
  const outputPath = path.join(config.outputDir, 'profile.json');
  const output = {
    timestamp: new Date().toISOString(),
    config: {
      agentCounts: config.agentCounts,
      steps: config.steps,
      reps: config.reps,
      seed: config.seed,
    },
    platform: {
      node: process.version,
      arch: process.arch,
      platform: process.platform,
    },
    summaries: allSummaries.map(s => ({
      agentCount: s.agentCount,
      steps: s.steps,
      reps: s.reps,
      avgWallClockMs: parseFloat(s.avgWallClockMs.toFixed(2)),
      avgStepsPerSecond: parseFloat(s.avgStepsPerSecond.toFixed(2)),
      avgMsPerStep: parseFloat(s.avgMsPerStep.toFixed(2)),
      minWallClockMs: parseFloat(s.minWallClockMs.toFixed(2)),
      maxWallClockMs: parseFloat(s.maxWallClockMs.toFixed(2)),
      avgHeapUsedMB: parseFloat(s.avgHeapUsedMB.toFixed(2)),
      avgRssMB: parseFloat(s.avgRssMB.toFixed(2)),
      peakHeapUsedMB: parseFloat(s.peakHeapUsedMB.toFixed(2)),
      peakRssMB: parseFloat(s.peakRssMB.toFixed(2)),
    })),
    rawRuns: allSummaries.flatMap(s => s.runs),
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log();
  console.log(`Results written to: ${outputPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
