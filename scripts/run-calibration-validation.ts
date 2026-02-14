/**
 * Calibration Validation Script
 *
 * Runs BacktestRunner for all available calibrated DAOs,
 * collects accuracy reports, and writes results to results/calibration/.
 *
 * Usage:
 *   npx tsx scripts/run-calibration-validation.ts
 *   npx tsx scripts/run-calibration-validation.ts --dao aave --episodes 10
 *   npx tsx scripts/run-calibration-validation.ts --quick
 */

import * as fs from 'fs';
import * as path from 'path';
import { BacktestRunner, type BacktestResult } from '../lib/research/backtest-runner';
import { CalibrationLoader } from '../lib/digital-twins/calibration-loader';
import { getGovernanceMapping } from '../lib/digital-twins/governance-mapping';

// =============================================================================
// CONFIG
// =============================================================================

interface ValidationConfig {
  daoIds: string[];       // which DAOs to validate (empty = all)
  episodes: number;       // episodes per DAO
  stepsPerEpisode: number;
  seed: number;
  outputDir: string;
}

function parseArgs(): ValidationConfig {
  const args = process.argv.slice(2);
  const config: ValidationConfig = {
    daoIds: [],
    episodes: 30,
    stepsPerEpisode: 1440, // 60 days
    seed: 42,
    outputDir: path.join(process.cwd(), 'results', 'calibration'),
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dao':
        config.daoIds.push(args[++i]);
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
      case '--output':
        config.outputDir = args[++i];
        break;
      case '--quick':
        config.episodes = 3;
        config.stepsPerEpisode = 360;
        break;
    }
  }

  return config;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const config = parseArgs();
  const runner = new BacktestRunner();

  // Discover available DAOs
  const availableIds = CalibrationLoader.getAvailableIds();
  const daoIds = config.daoIds.length > 0
    ? config.daoIds.filter(id => availableIds.includes(id))
    : availableIds;

  console.log('='.repeat(70));
  console.log('  Calibration Validation');
  console.log('='.repeat(70));
  console.log(`  DAOs:     ${daoIds.join(', ')} (${daoIds.length} total)`);
  console.log(`  Episodes: ${config.episodes} per DAO`);
  console.log(`  Steps:    ${config.stepsPerEpisode} per episode`);
  console.log(`  Seed:     ${config.seed}`);
  console.log(`  Output:   ${config.outputDir}`);
  console.log('='.repeat(70));
  console.log();

  // Create output directory
  fs.mkdirSync(config.outputDir, { recursive: true });

  const results: Record<string, BacktestResult> = {};
  const summary: Array<{
    dao_id: string;
    governance_rule: string;
    overall_score: number;
    ci95: string;
    proposal_freq_error: number;
    pass_rate_error: number;
    participation_error: number;
    price_rmse: number;
    voter_conc_error: number;
    forum_error: number;
    best: number;
    worst: number;
    std: number;
  }> = [];

  for (const daoId of daoIds) {
    console.log(`[${daoId}] Running ${config.episodes} episodes...`);
    const start = Date.now();

    try {
      const result = await runner.runBacktest({
        daoId,
        episodes: config.episodes,
        stepsPerEpisode: config.stepsPerEpisode,
        seed: config.seed,
        oracleType: 'calibrated_gbm',
        forumEnabled: true,
      });

      results[daoId] = result;

      const avg = result.averageReport;
      const ci = result.confidenceIntervals.overall_score;
      const mapping = getGovernanceMapping(daoId);
      summary.push({
        dao_id: daoId,
        governance_rule: mapping?.ruleName || 'majority',
        overall_score: avg.overall_score,
        ci95: `${ci.ci95Lower.toFixed(3)}-${ci.ci95Upper.toFixed(3)}`,
        proposal_freq_error: avg.metrics.proposal_frequency_error,
        pass_rate_error: avg.metrics.pass_rate_error,
        participation_error: avg.metrics.participation_rate_error,
        price_rmse: avg.metrics.price_trajectory_rmse,
        voter_conc_error: avg.metrics.voter_concentration_error,
        forum_error: avg.metrics.forum_activity_error,
        best: result.bestScore,
        worst: result.worstScore,
        std: result.stdDevScore,
      });

      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(
        `[${daoId}] Score: ${avg.overall_score.toFixed(3)} ` +
        `(95% CI: ${ci.ci95Lower.toFixed(3)}-${ci.ci95Upper.toFixed(3)}, ` +
        `best=${result.bestScore.toFixed(3)}, worst=${result.worstScore.toFixed(3)}) ` +
        `[${elapsed}s]`
      );

      // Log sim vs hist details from the last episode for diagnostics
      const lastReport = result.reports[result.reports.length - 1];
      if (lastReport?.details && Object.keys(lastReport.details).length > 0) {
        console.log(`[${daoId}] Diagnostics (last episode):`);
        for (const [key, val] of Object.entries(lastReport.details)) {
          console.log(`  ${key}: ${typeof val === 'number' ? val.toFixed(4) : val}`);
        }
      }

      // Write per-DAO result
      const daoOutputPath = path.join(config.outputDir, `${daoId}_backtest.json`);
      fs.writeFileSync(daoOutputPath, JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(`[${daoId}] FAILED:`, error);
    }
  }

  // Write summary
  console.log();
  console.log('='.repeat(70));
  console.log('  SUMMARY');
  console.log('='.repeat(70));
  console.log();

  // Table header
  console.log(
    'DAO'.padEnd(13) +
    'Rule'.padEnd(16) +
    'Score'.padEnd(7) +
    '95% CI'.padEnd(14) +
    'PropFrq'.padEnd(8) +
    'PassRt'.padEnd(8) +
    'Partic'.padEnd(8) +
    'Price'.padEnd(8) +
    'VotCnc'.padEnd(8) +
    'Forum'.padEnd(8) +
    'Best'.padEnd(7) +
    'Worst'
  );
  console.log('-'.repeat(113));

  for (const row of summary.sort((a, b) => b.overall_score - a.overall_score)) {
    console.log(
      row.dao_id.padEnd(13) +
      row.governance_rule.padEnd(16) +
      row.overall_score.toFixed(3).padEnd(7) +
      row.ci95.padEnd(14) +
      row.proposal_freq_error.toFixed(3).padEnd(8) +
      row.pass_rate_error.toFixed(3).padEnd(8) +
      row.participation_error.toFixed(3).padEnd(8) +
      row.price_rmse.toFixed(3).padEnd(8) +
      row.voter_conc_error.toFixed(3).padEnd(8) +
      row.forum_error.toFixed(3).padEnd(8) +
      row.best.toFixed(3).padEnd(7) +
      row.worst.toFixed(3)
    );
  }

  const avgScore = summary.length > 0
    ? summary.reduce((s, r) => s + r.overall_score, 0) / summary.length
    : 0;
  console.log('-'.repeat(97));
  console.log(`Average score across ${summary.length} DAOs: ${avgScore.toFixed(3)}`);
  console.log();

  // Write summary JSON
  const summaryPath = path.join(config.outputDir, 'validation_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    config: {
      episodes: config.episodes,
      stepsPerEpisode: config.stepsPerEpisode,
      seed: config.seed,
    },
    averageScore: avgScore,
    daoCount: summary.length,
    results: summary,
  }, null, 2));
  console.log(`Summary written to: ${summaryPath}`);

  // Write CSV for paper table
  const csvPath = path.join(config.outputDir, 'validation_summary.csv');
  const csvHeader = 'dao_id,overall_score,ci95,proposal_freq_error,pass_rate_error,participation_error,price_rmse,voter_conc_error,forum_error,best,worst,std\n';
  const csvRows = summary.map(r =>
    `${r.dao_id},${r.overall_score},${r.ci95},${r.proposal_freq_error},${r.pass_rate_error},${r.participation_error},${r.price_rmse},${r.voter_conc_error},${r.forum_error},${r.best},${r.worst},${r.std}`
  ).join('\n');
  fs.writeFileSync(csvPath, csvHeader + csvRows + '\n');
  console.log(`CSV written to: ${csvPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
