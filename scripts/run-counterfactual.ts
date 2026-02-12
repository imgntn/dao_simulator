/**
 * Counterfactual Governance Experiment CLI
 *
 * Runs "what if DAO X used governance rule Y" experiments.
 *
 * Usage:
 *   npx tsx scripts/run-counterfactual.ts --dao optimism --alt quadratic --alt conviction --episodes 10
 *   npx tsx scripts/run-counterfactual.ts --dao uniswap --alt bicameral --alt majority --episodes 5
 *   npx tsx scripts/run-counterfactual.ts --config experiments/counterfactual/optimism-governance.yaml
 */

import * as fs from 'fs';
import * as path from 'path';
import { CounterfactualRunner, type CounterfactualConfig, type CounterfactualResult } from '../lib/research/counterfactual-runner';
import { getGovernanceMapping } from '../lib/digital-twins/governance-mapping';

// =============================================================================
// CONFIG
// =============================================================================

function parseArgs(): CounterfactualConfig {
  const args = process.argv.slice(2);
  const config: CounterfactualConfig = {
    daoId: '',
    alternativeRules: [],
    episodes: 10,
    stepsPerEpisode: 720,
    seed: 42,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dao':
        config.daoId = args[++i];
        break;
      case '--alt':
      case '--alternative':
        config.alternativeRules.push(args[++i]);
        break;
      case '--baseline':
        config.baselineRule = args[++i];
        break;
      case '--episodes':
        config.episodes = parseInt(args[++i], 10);
        break;
      case '--steps':
        config.stepsPerEpisode = parseInt(args[++i], 10);
        break;
      case '--seed':
        config.seed = parseInt(args[++i], 10);
        break;
      case '--config': {
        const configPath = args[++i];
        const yamlContent = fs.readFileSync(configPath, 'utf-8');
        const parsed = parseSimpleYaml(yamlContent);
        if (parsed.dao_id) config.daoId = parsed.dao_id;
        if (parsed.alternatives) config.alternativeRules = parsed.alternatives;
        if (parsed.episodes) config.episodes = parsed.episodes;
        if (parsed.steps_per_episode) config.stepsPerEpisode = parsed.steps_per_episode;
        if (parsed.seed) config.seed = parsed.seed;
        if (parsed.baseline) config.baselineRule = parsed.baseline;
        break;
      }
      case '--help':
        printHelp();
        process.exit(0);
    }
  }

  if (!config.daoId) {
    console.error('Error: --dao is required');
    printHelp();
    process.exit(1);
  }

  if (config.alternativeRules.length === 0) {
    // Default alternatives
    config.alternativeRules = ['majority', 'quadratic', 'conviction'];
  }

  return config;
}

function printHelp(): void {
  console.log(`
Counterfactual Governance Experiment Runner

Usage:
  npx tsx scripts/run-counterfactual.ts --dao <dao_id> [options]

Options:
  --dao <id>          DAO to model (required, e.g. optimism, uniswap, aave)
  --alt <rule>        Alternative governance rule (repeatable)
  --baseline <rule>   Override baseline rule (default: DAO's real rule)
  --episodes <n>      Episodes per configuration (default: 10)
  --steps <n>         Steps per episode (default: 720)
  --seed <n>          RNG seed (default: 42)
  --config <path>     Load config from YAML file

Available governance rules:
  majority, quorum, supermajority, tokenquorum, reputationquorum,
  quadratic, conviction, bicameral, dualgovernance, securitycouncil,
  categoryquorum, approvalvoting, timedecay, optimistic, holographic

Examples:
  npx tsx scripts/run-counterfactual.ts --dao optimism --alt quadratic --alt majority --episodes 5
  npx tsx scripts/run-counterfactual.ts --config experiments/counterfactual/optimism-governance.yaml
`);
}

/**
 * Minimal YAML parser for experiment configs.
 * Handles flat key-value pairs and simple lists.
 */
function parseSimpleYaml(content: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = content.split('\n');
  let currentList: string[] | null = null;
  let currentKey = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // List item
    if (trimmed.startsWith('- ') && currentList !== null) {
      currentList.push(trimmed.slice(2).trim());
      continue;
    }

    // Key-value pair
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > 0) {
      // Save previous list
      if (currentList !== null) {
        result[currentKey] = currentList;
        currentList = null;
      }

      const key = trimmed.slice(0, colonIdx).trim();
      const value = trimmed.slice(colonIdx + 1).trim();

      if (value === '') {
        // Start of a list
        currentList = [];
        currentKey = key;
      } else {
        // Scalar value
        const stripped = value.replace(/^["']|["']$/g, '');
        const num = Number(stripped);
        result[key] = isNaN(num) ? stripped : num;
      }
    }
  }

  // Save final list
  if (currentList !== null) {
    result[currentKey] = currentList;
  }

  return result;
}

// =============================================================================
// OUTPUT
// =============================================================================

function printResults(result: CounterfactualResult): void {
  const mapping = getGovernanceMapping(result.daoId);
  const baselineName = mapping?.ruleName || 'majority';

  console.log();
  console.log('='.repeat(80));
  console.log(`  ${result.daoId.toUpperCase()}: ${result.baseline.ruleName} (baseline) vs Alternatives`);
  console.log('='.repeat(80));
  console.log(`  Episodes: ${result.episodes}, Steps: ${result.stepsPerEpisode}`);
  console.log();

  // Table header
  const headers = ['Rule', 'PassRate', 'Partic', 'TimeToDecn', 'Throughput', 'ExpireRate', 'Score'];
  const widths =  [18,      9,         9,        11,           11,           11,           7];

  const headerLine = headers.map((h, i) => h.padEnd(widths[i])).join('');
  console.log(headerLine);
  console.log('-'.repeat(headerLine.length));

  // Baseline row
  const bm = result.baseline.emergentMetrics;
  console.log(formatRow(
    result.baseline.ruleName + ' *',
    bm.passRate, bm.passRate, // no delta for baseline
    bm.avgTimeToDecision,
    bm.proposalThroughput,
    bm.expirationRate,
    result.baseline.report.overall_score,
    widths,
    true
  ));

  // Alternative rows
  for (const alt of result.alternatives) {
    const am = alt.emergentMetrics;
    console.log(formatRow(
      alt.ruleName,
      am.passRate,
      am.avgTimeToDecision,
      am.proposalThroughput,
      am.expirationRate,
      am.expirationRate,
      alt.report.overall_score,
      widths,
      false
    ));
  }

  console.log();

  // Delta summary
  if (result.alternatives.length > 0) {
    console.log('Deltas from baseline:');
    console.log('-'.repeat(60));
    for (const alt of result.alternatives) {
      const d = alt.delta;
      console.log(
        `  ${alt.ruleName.padEnd(18)}` +
        `PassRate: ${formatDelta(d.passRate)}  ` +
        `Throughput: ${formatDelta(d.proposalThroughput)}  ` +
        `Score: ${formatDelta(d.overallScore)}`
      );
    }
  }

  console.log();
}

function formatRow(
  name: string,
  passRate: number,
  timeToDecision: number,
  throughput: number,
  expirationRate: number,
  _extra: number,
  score: number,
  widths: number[],
  isBaseline: boolean
): string {
  return (
    name.padEnd(widths[0]) +
    passRate.toFixed(3).padEnd(widths[1]) +
    '-'.padEnd(widths[2]) +  // participation not from emergent
    timeToDecision.toFixed(1).padEnd(widths[3]) +
    throughput.toFixed(2).padEnd(widths[4]) +
    expirationRate.toFixed(3).padEnd(widths[5]) +
    score.toFixed(3)
  );
}

function formatDelta(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(3)}`;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const config = parseArgs();
  const runner = new CounterfactualRunner();

  console.log(`Running counterfactual experiment for ${config.daoId}...`);
  console.log(`  Baseline: ${config.baselineRule || '(DAO default)'}`);
  console.log(`  Alternatives: ${config.alternativeRules.join(', ')}`);
  console.log(`  Episodes: ${config.episodes}, Steps: ${config.stepsPerEpisode}`);
  console.log();

  const start = Date.now();
  const result = await runner.runCounterfactual(config);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  printResults(result);
  console.log(`Completed in ${elapsed}s`);

  // Write results JSON
  const outputDir = path.join(process.cwd(), 'results', 'counterfactual');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${config.daoId}_counterfactual.json`);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`Results written to: ${outputPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
