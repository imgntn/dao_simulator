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
import { execFileSync } from 'child_process';
import { BacktestRunner } from '../lib/research/backtest-runner';
import { CalibrationLoader } from '../lib/digital-twins/calibration-loader';
import { getGovernanceMapping } from '../lib/digital-twins/governance-mapping';
import { writeJsonAtomic } from '../lib/research/campaign-manifest';
import {
  assertCalibrationValidationReport,
  CALIBRATION_VALIDATION_REPORT_SCHEMA_VERSION,
  type CalibrationValidationReport,
  type CalibrationValidationResultRow,
} from '../lib/research/calibration-validation-report';
import { computeBaselineConfigHash } from '../lib/research/baseline-config';

// =============================================================================
// CONFIG
// =============================================================================

interface ValidationConfig {
  daoIds: string[];       // which DAOs to validate (empty = all)
  episodes: number;       // episodes per DAO
  stepsPerEpisode: number;
  seed: number;
  outputDir: string;
  evaluationMode: 'temporal_holdout' | 'aggregate_diagnostic';
  includeUncalibratedNull: boolean;
}

function parseArgs(): ValidationConfig {
  const args = process.argv.slice(2);
  const config: ValidationConfig = {
    daoIds: [],
    episodes: 30,
    stepsPerEpisode: 1440, // 60 days
    seed: 42,
    outputDir: path.join(
      process.cwd(),
      'results',
      'calibration',
      'runs',
      new Date().toISOString().replace(/[:.]/g, '-'),
    ),
    evaluationMode: 'temporal_holdout',
    includeUncalibratedNull: true,
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
      case '--aggregate-diagnostic':
        config.evaluationMode = 'aggregate_diagnostic';
        break;
      case '--no-uncalibrated-null':
        config.includeUncalibratedNull = false;
        break;
    }
  }

  if (!Number.isSafeInteger(config.episodes) || config.episodes <= 0) {
    throw new Error('--episodes must be a positive safe integer');
  }
  if (!Number.isSafeInteger(config.stepsPerEpisode) || config.stepsPerEpisode <= 0) {
    throw new Error('--steps must be a positive safe integer');
  }
  if (!Number.isSafeInteger(config.seed)) {
    throw new Error('--seed must be a safe integer');
  }
  return config;
}

function writeTextAtomic(filePath: string, contents: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, contents, 'utf8');
  fs.renameSync(temporary, filePath);
}

function collectGitProvenance(): CalibrationValidationReport['provenance'] {
  const gitSha = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  }).trim();
  const workingTreeStatus = execFileSync('git', ['status', '--porcelain'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  }).trim();
  if (!/^[0-9a-f]{40}$/i.test(gitSha)) {
    throw new Error(`Cannot bind calibration run to a full Git SHA: ${gitSha}`);
  }
  if (workingTreeStatus.length > 0) {
    throw new Error(
      'Publication calibration requires a clean Git worktree; commit or remove changes before running'
    );
  }
  return {
    gitSha,
    workingTreeClean: true,
    configHash: computeBaselineConfigHash(),
    launchCommand: [...process.argv],
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  };
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const config = parseArgs();
  const provenance = collectGitProvenance();
  const runner = new BacktestRunner();

  // Discover available DAOs
  const availableIds = CalibrationLoader.getAvailableIds();
  const unknownDaoIds = config.daoIds.filter(id => !availableIds.includes(id));
  if (unknownDaoIds.length > 0) {
    throw new Error(`Unknown calibrated DAO identifiers: ${unknownDaoIds.join(', ')}`);
  }
  const daoIds = config.daoIds.length > 0 ? [...new Set(config.daoIds)] : availableIds;
  if (fs.existsSync(config.outputDir) && fs.readdirSync(config.outputDir).length > 0) {
    throw new Error(`Calibration output directory must be empty: ${config.outputDir}`);
  }

  console.log('='.repeat(70));
  console.log('  Calibration Validation');
  console.log('='.repeat(70));
  console.log(`  DAOs:     ${daoIds.join(', ')} (${daoIds.length} total)`);
  console.log(`  Episodes: ${config.episodes} per DAO`);
  console.log(`  Steps:    ${config.stepsPerEpisode} per episode`);
  console.log(`  Seed:     ${config.seed}`);
  console.log(`  Output:   ${config.outputDir}`);
  console.log(`  Design:   ${config.evaluationMode}`);
  console.log(`  Null sim: ${config.includeUncalibratedNull ? 'enabled' : 'disabled'}`);
  console.log(`  Git SHA:  ${provenance.gitSha}`);
  console.log(`  Config:   ${provenance.configHash}`);
  console.log('='.repeat(70));
  console.log();

  // Create output directory
  fs.mkdirSync(config.outputDir, { recursive: true });

  const failures: Array<{ daoId: string; error: string }> = [];
  const summary: CalibrationValidationResultRow[] = [];

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
        evaluationMode: config.evaluationMode,
        includeUncalibratedNull: config.includeUncalibratedNull,
      });

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
        price_level_error: avg.metrics.price_level_error,
        voter_conc_error: avg.metrics.voter_concentration_error,
        forum_error: avg.metrics.forum_activity_error,
        best: result.bestScore,
        worst: result.worstScore,
        std: result.stdDevScore,
        persistence_score: result.evaluation.historicalPersistenceScore,
        uncalibrated_score: result.evaluation.uncalibratedScore,
        skill_vs_persistence: result.evaluation.absoluteSkillVsPersistence,
        skill_vs_uncalibrated: result.evaluation.absoluteSkillVsUncalibrated,
      });

      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(
        `[${daoId}] Score: ${avg.overall_score.toFixed(3)} ` +
        `(95% CI: ${ci.ci95Lower.toFixed(3)}-${ci.ci95Upper.toFixed(3)}, ` +
        `best=${result.bestScore.toFixed(3)}, worst=${result.worstScore.toFixed(3)}) ` +
        `[${elapsed}s]`
      );
      console.log(
        `[${daoId}] Skill: persistence=${result.evaluation.absoluteSkillVsPersistence.toFixed(3)}, `
        + `uncalibrated=${result.evaluation.absoluteSkillVsUncalibrated?.toFixed(3) ?? 'not-run'}`
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
      writeJsonAtomic(daoOutputPath, result);
    } catch (error) {
      console.error(`[${daoId}] FAILED:`, error);
      failures.push({
        daoId,
        error: error instanceof Error ? error.message : String(error),
      });
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
      row.price_level_error.toFixed(3).padEnd(8) +
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
  const report: CalibrationValidationReport = {
    schemaVersion: CALIBRATION_VALIDATION_REPORT_SCHEMA_VERSION,
    timestamp: new Date().toISOString(),
    provenance,
    config: {
      episodes: config.episodes,
      stepsPerEpisode: config.stepsPerEpisode,
      seed: config.seed,
      evaluationMode: config.evaluationMode,
      includeUncalibratedNull: config.includeUncalibratedNull,
    },
    averageScore: avgScore,
    status: failures.length === 0 && summary.length === daoIds.length ? 'passed' : 'failed',
    expectedDaoCount: daoIds.length,
    daoCount: summary.length,
    failedDaoCount: failures.length,
    failures,
    results: summary,
  };
  if (failures.length === 0 && summary.length === daoIds.length) {
    assertCalibrationValidationReport(report, daoIds.length);
  }
  writeJsonAtomic(summaryPath, report);
  console.log(`Summary written to: ${summaryPath}`);

  // Write CSV for paper table
  const csvPath = path.join(config.outputDir, 'validation_summary.csv');
  const csvHeader = 'dao_id,overall_score,ci95,persistence_score,uncalibrated_score,skill_vs_persistence,skill_vs_uncalibrated,proposal_freq_error,pass_rate_error,participation_error,price_level_error,voter_conc_error,forum_error,best,worst,std\n';
  const csvRows = summary.map(r =>
    `${r.dao_id},${r.overall_score},${r.ci95},${r.persistence_score},${r.uncalibrated_score ?? ''},${r.skill_vs_persistence},${r.skill_vs_uncalibrated ?? ''},${r.proposal_freq_error},${r.pass_rate_error},${r.participation_error},${r.price_level_error},${r.voter_conc_error},${r.forum_error},${r.best},${r.worst},${r.std}`
  ).join('\n');
  writeTextAtomic(csvPath, csvHeader + csvRows + '\n');
  console.log(`CSV written to: ${csvPath}`);
  if (failures.length > 0 || summary.length !== daoIds.length) {
    throw new Error(
      `Calibration validation incomplete: ${summary.length}/${daoIds.length} DAOs passed`
    );
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
