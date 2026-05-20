#!/usr/bin/env npx tsx
/**
 * Generate a fresh calibration baseline.
 *
 * Runs the fast suite against the current code and writes
 * `results/baselines/calibration-baseline.json` (bumping the version).
 * The previous baseline is preserved at `calibration-baseline.v{N}.json`
 * so old versions remain auditable.
 *
 * This script does NOT prompt — it overwrites unconditionally. Use
 * `scripts/accept-calibration-baseline.ts` for the interactive flow.
 */

import { createRequire } from 'module';
(globalThis as { __nodeRequire?: NodeRequire }).__nodeRequire = createRequire(import.meta.url);

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { CalibrationValidator } from '../lib/research/calibration-validator';
import {
  CalibrationBaselineSchema,
  type CalibrationBaseline,
} from '../lib/research/baseline-schema';
import { computeBaselineConfigHash } from '../lib/research/baseline-config';
import { BacktestRunner } from '../lib/research/backtest-runner';
import {
  CALIBRATION_FAST_SEEDS,
} from '../lib/research/canonical-seeds';
import {
  BASELINE_DAO_IDS,
  DAO_SUITE_CONFIG,
  BASELINE_CALIBRATION_CONFIG,
} from '../lib/research/baseline-config';
import { CalibrationLoader } from '../lib/digital-twins/calibration-loader';

interface CliOptions {
  outPath: string;
  reason: string;
}

function parseArgs(): CliOptions {
  const argv = process.argv.slice(2);
  const outPath = readOpt(argv, '--out')
    ?? path.join(process.cwd(), 'results', 'baselines', 'calibration-baseline.json');
  const reason = readOpt(argv, '--reason') ?? '(no reason given)';
  return { outPath, reason };
}

function readOpt(argv: string[], flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  if (idx >= 0 && idx + 1 < argv.length) return argv[idx + 1];
  return undefined;
}

function detectGitSha(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

function loadPrevious(outPath: string): CalibrationBaseline | null {
  if (!fs.existsSync(outPath)) return null;
  try {
    const parsed = CalibrationBaselineSchema.safeParse(JSON.parse(fs.readFileSync(outPath, 'utf-8')));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const opts = parseArgs();
  const dir = path.dirname(opts.outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const previous = loadPrevious(opts.outPath);
  const nextVersion = previous ? previous.version + 1 : 1;

  if (previous) {
    const archivePath = path.join(dir, `calibration-baseline.v${previous.version}.json`);
    fs.writeFileSync(archivePath, JSON.stringify(previous, null, 2), 'utf-8');
    console.log(`Archived previous baseline (v${previous.version}) → ${archivePath}`);
  }

  console.log(`Generating baseline v${nextVersion}…`);
  console.log(`Reason: ${opts.reason}`);

  const runner = new BacktestRunner();
  const available = new Set(CalibrationLoader.getAvailableIds());
  const daoIds = BASELINE_DAO_IDS.filter((id) => available.has(id));
  const perDao: CalibrationBaseline['perDao'] = {};
  const seed = CALIBRATION_FAST_SEEDS[0];

  for (const daoId of daoIds) {
    const suite = DAO_SUITE_CONFIG[daoId] ?? { episodes: 10, stepsPerEpisode: 720, dropThreshold: 0.02 };
    console.log(`  ${daoId}: ${suite.episodes}ep × ${suite.stepsPerEpisode} steps`);
    const result = await runner.runBacktest({
      daoId,
      episodes: suite.episodes,
      stepsPerEpisode: suite.stepsPerEpisode,
      seed,
      oracleType: BASELINE_CALIBRATION_CONFIG.oracleType,
      forumEnabled: BASELINE_CALIBRATION_CONFIG.forumEnabled,
      useRealGovernance: BASELINE_CALIBRATION_CONFIG.useRealGovernance,
    });
    const details = result.averageReport.details;
    perDao[daoId] = {
      daoId,
      score: result.averageReport.overall_score,
      passRate: numOrZero(details['sim_pass_rate']),
      participation: numOrZero(details['sim_participation_rate']),
      proposalFrequency: numOrZero(details['sim_proposals_per_month']),
      priceRmse: result.averageReport.metrics.price_trajectory_rmse,
      voterConcentration: numOrZero(details['sim_voter_concentration']),
      forumActivity: numOrZero(details['sim_forum_topics_per_month']),
      ci95: result.confidenceIntervals,
    };
    console.log(`    score=${result.averageReport.overall_score.toFixed(3)}`);
  }

  const baseline: CalibrationBaseline = {
    version: nextVersion,
    generatedAt: new Date().toISOString(),
    gitSha: detectGitSha(),
    configHash: computeBaselineConfigHash(),
    description: opts.reason,
    perDao,
  };

  fs.writeFileSync(opts.outPath, JSON.stringify(baseline, null, 2), 'utf-8');
  appendChangelog(dir, nextVersion, baseline, opts.reason);
  console.log(`Wrote baseline v${nextVersion} → ${opts.outPath}`);
  console.log(`Remember the BASELINE-CHANGE: marker in your commit message.`);
}

function appendChangelog(dir: string, version: number, baseline: CalibrationBaseline, reason: string): void {
  const changelogPath = path.join(dir, 'CHANGELOG.md');
  const scores = Object.values(baseline.perDao).map((d) => d.score);
  const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const entry = [
    '',
    `## v${version} — ${new Date().toISOString().slice(0, 10)} — ${reason}`,
    '',
    `- Git SHA: \`${baseline.gitSha}\``,
    `- Config hash: \`${baseline.configHash}\``,
    `- DAOs: ${Object.keys(baseline.perDao).length}`,
    `- Average score: ${avg.toFixed(3)}`,
    '',
  ].join('\n');

  if (!fs.existsSync(changelogPath)) {
    fs.writeFileSync(changelogPath, `# Calibration Baseline Changelog\n${entry}`, 'utf-8');
  } else {
    fs.appendFileSync(changelogPath, entry, 'utf-8');
  }
}

function numOrZero(v: unknown): number {
  return typeof v === 'number' && isFinite(v) ? v : 0;
}

main().catch((err) => {
  console.error(`generate-calibration-baseline failed: ${(err as Error).message}`);
  process.exit(1);
});
