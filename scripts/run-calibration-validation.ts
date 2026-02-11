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
    episodes: 5,
    stepsPerEpisode: 720, // 30 days
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
    overall_score: number;
    proposal_freq_error: number;
    pass_rate_error: number;
    participation_error: number;
    price_rmse: number;
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
      summary.push({
        dao_id: daoId,
        overall_score: avg.overall_score,
        proposal_freq_error: avg.metrics.proposal_frequency_error,
        pass_rate_error: avg.metrics.pass_rate_error,
        participation_error: avg.metrics.participation_rate_error,
        price_rmse: avg.metrics.price_trajectory_rmse,
        best: result.bestScore,
        worst: result.worstScore,
        std: result.stdDevScore,
      });

      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(
        `[${daoId}] Score: ${avg.overall_score.toFixed(3)} ` +
        `(best=${result.bestScore.toFixed(3)}, worst=${result.worstScore.toFixed(3)}) ` +
        `[${elapsed}s]`
      );

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
    'DAO'.padEnd(15) +
    'Score'.padEnd(8) +
    'PropFreq'.padEnd(10) +
    'PassRate'.padEnd(10) +
    'Particip'.padEnd(10) +
    'PriceRMS'.padEnd(10) +
    'Best'.padEnd(7) +
    'Worst'.padEnd(7) +
    'StdDev'
  );
  console.log('-'.repeat(77));

  for (const row of summary.sort((a, b) => b.overall_score - a.overall_score)) {
    console.log(
      row.dao_id.padEnd(15) +
      row.overall_score.toFixed(3).padEnd(8) +
      row.proposal_freq_error.toFixed(3).padEnd(10) +
      row.pass_rate_error.toFixed(3).padEnd(10) +
      row.participation_error.toFixed(3).padEnd(10) +
      row.price_rmse.toFixed(3).padEnd(10) +
      row.best.toFixed(3).padEnd(7) +
      row.worst.toFixed(3).padEnd(7) +
      row.std.toFixed(3)
    );
  }

  const avgScore = summary.length > 0
    ? summary.reduce((s, r) => s + r.overall_score, 0) / summary.length
    : 0;
  console.log('-'.repeat(77));
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
  const csvHeader = 'dao_id,overall_score,proposal_freq_error,pass_rate_error,participation_error,price_rmse,best,worst,std\n';
  const csvRows = summary.map(r =>
    `${r.dao_id},${r.overall_score},${r.proposal_freq_error},${r.pass_rate_error},${r.participation_error},${r.price_rmse},${r.best},${r.worst},${r.std}`
  ).join('\n');
  fs.writeFileSync(csvPath, csvHeader + csvRows + '\n');
  console.log(`CSV written to: ${csvPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
