#!/usr/bin/env npx tsx
/**
 * Baseline Generator Script
 *
 * Generates regression baselines from standard simulation configurations.
 * Run this after verifying the simulation is working correctly.
 *
 * Usage:
 *   npx tsx scripts/generate-baselines.ts
 *   npm run generate-baselines
 */

import * as path from 'path';
import { execSync } from 'child_process';
import { ExperimentRunner } from '../lib/research/experiment-runner';
import { generateBaseline, saveBaseline } from '../lib/research/regression-tester';
import type { ExperimentConfig } from '../lib/research/experiment-config';

const BASELINES_DIR = path.join(process.cwd(), 'results', 'baselines');

interface BaselineConfig {
  name: string;
  template: string;
  totalMembers: number;
  stepsPerRun: number;
  runsPerConfig: number;
  seed: number;
}

// Standard baseline configurations
const BASELINE_CONFIGS: BaselineConfig[] = [
  {
    name: 'compound-standard',
    template: 'compound',
    totalMembers: 100,
    stepsPerRun: 300,
    runsPerConfig: 10,
    seed: 42,
  },
  {
    name: 'compound-small',
    template: 'compound',
    totalMembers: 25,
    stepsPerRun: 200,
    runsPerConfig: 10,
    seed: 42,
  },
  {
    name: 'compound-large',
    template: 'compound',
    totalMembers: 200,
    stepsPerRun: 200,
    runsPerConfig: 10,
    seed: 42,
  },
];

// Get git commit hash
function getGitCommit(): string | undefined {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return undefined;
  }
}

async function generateBaselineForConfig(config: BaselineConfig): Promise<void> {
  console.log(`\nGenerating baseline: ${config.name}`);
  console.log('-'.repeat(50));

  const experimentConfig: ExperimentConfig = {
    name: `baseline-${config.name}`,
    baseConfig: {
      template: config.template,
      overrides: {
        memberDistribution: {
          totalMembers: config.totalMembers,
        },
      },
    },
    execution: {
      runsPerConfig: config.runsPerConfig,
      stepsPerRun: config.stepsPerRun,
      seedStrategy: 'sequential',
      baseSeed: config.seed,
    },
    metrics: [
      { name: 'Proposal Pass Rate', type: 'builtin', builtin: 'proposal_pass_rate' },
      { name: 'Average Turnout', type: 'builtin', builtin: 'average_turnout' },
      { name: 'Total Proposals', type: 'builtin', builtin: 'total_proposals' },
      { name: 'Final Treasury', type: 'builtin', builtin: 'final_treasury' },
      { name: 'Final Gini', type: 'builtin', builtin: 'final_gini' },
      { name: 'Final Token Price', type: 'builtin', builtin: 'final_token_price' },
      { name: 'Final Member Count', type: 'builtin', builtin: 'final_member_count' },
    ],
    output: {
      directory: path.join(BASELINES_DIR, config.name),
      formats: ['json'],
    },
  };

  // Run experiment
  const runner = new ExperimentRunner(experimentConfig, (progress) => {
    const pct = progress.percentComplete.toFixed(0);
    process.stdout.write(`\r  Progress: ${pct}% (${progress.currentRun}/${progress.totalRuns})`);
  });

  const summary = await runner.run();
  console.log(''); // New line after progress

  // Extract metrics data
  const metricsData: Array<{ name: string; values: number[] }> = [];

  if (summary.metricsSummary.length > 0) {
    const sweepMetrics = summary.metricsSummary[0].metrics;
    for (const metric of sweepMetrics) {
      metricsData.push({
        name: metric.name,
        values: metric.values,
      });
    }
  }

  // Generate and save baseline
  const gitCommit = getGitCommit();
  const baseline = generateBaseline(
    config.name,
    {
      template: config.template,
      totalMembers: config.totalMembers,
      stepsPerRun: config.stepsPerRun,
      seed: config.seed,
    },
    metricsData,
    gitCommit
  );

  const outputPath = path.join(BASELINES_DIR, `${config.name}.json`);
  saveBaseline(baseline, outputPath);

  console.log(`  ✓ Saved baseline to: ${outputPath}`);

  // Print summary
  console.log('  Metrics:');
  for (const [name, stats] of Object.entries(baseline.metrics)) {
    console.log(`    ${name}: ${stats.mean.toFixed(4)} (±${stats.std.toFixed(4)})`);
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           Regression Baseline Generator                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const gitCommit = getGitCommit();
  if (gitCommit) {
    console.log(`\nGit commit: ${gitCommit}`);
  }

  console.log(`\nGenerating ${BASELINE_CONFIGS.length} baselines...`);

  for (const config of BASELINE_CONFIGS) {
    await generateBaselineForConfig(config);
  }

  console.log('\n');
  console.log('═'.repeat(60));
  console.log('✅ ALL BASELINES GENERATED');
  console.log(`Output directory: ${BASELINES_DIR}`);
  console.log('═'.repeat(60));
}

main().catch((error) => {
  console.error('Error generating baselines:', error);
  process.exit(1);
});
