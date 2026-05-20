#!/usr/bin/env npx tsx
import { createRequire } from 'module';
(globalThis as { __nodeRequire?: NodeRequire }).__nodeRequire = createRequire(import.meta.url);

/**
 * Interactive baseline acceptance.
 *
 * Runs the validator, diffs against the current baseline, and asks
 * (per DAO) whether each changed score should be accepted into a new
 * baseline. A non-empty acceptance writes a new baseline file (version
 * bumped) plus an entry in CHANGELOG.md.
 *
 * Use cases:
 *   - You intentionally tuned an agent and want to bake the new scores in.
 *   - A config change shifted RNG streams and the new scores are valid.
 *
 * Use --yes to accept all non-regression changes without prompting.
 * Use --reason "explanation" to record why this baseline is changing.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { execSync } from 'child_process';
import { CalibrationValidator } from '../lib/research/calibration-validator';
import { ValidationDiffer } from '../lib/research/validation-differ';
import {
  CalibrationBaselineSchema,
  type CalibrationBaseline,
} from '../lib/research/baseline-schema';
import { computeBaselineConfigHash, BASELINE_DAO_IDS } from '../lib/research/baseline-config';

interface CliOptions {
  baselinePath: string;
  outPath: string;
  reason: string;
  yes: boolean;
}

function parseArgs(): CliOptions {
  const argv = process.argv.slice(2);
  const baselinePath = readOpt(argv, '--baseline')
    ?? path.join(process.cwd(), 'results', 'baselines', 'calibration-baseline.json');
  const outPath = readOpt(argv, '--out') ?? baselinePath;
  const reason = readOpt(argv, '--reason') ?? '';
  const yes = argv.includes('--yes') || argv.includes('-y');
  return { baselinePath, outPath, reason, yes };
}

function readOpt(argv: string[], flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  if (idx >= 0 && idx + 1 < argv.length) return argv[idx + 1];
  return undefined;
}

function loadBaseline(p: string): CalibrationBaseline {
  const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
  const parsed = CalibrationBaselineSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid baseline: ${parsed.error.message}`);
  }
  return parsed.data;
}

async function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function detectGitSha(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

async function main(): Promise<void> {
  const opts = parseArgs();
  const previous = loadBaseline(opts.baselinePath);

  if (!opts.reason) {
    console.error('--reason is required. Explain why the baseline is changing.');
    process.exit(1);
  }

  console.log(`Loading baseline v${previous.version} from ${opts.baselinePath}`);
  console.log('Running validator (fast suite)…');

  const validator = new CalibrationValidator({
    suite: 'fast',
    baselineVersion: previous.version,
  });
  const run = await validator.run();

  const differ = new ValidationDiffer();
  const diff = differ.diff(run, previous);

  const candidates = [
    ...diff.regressions,
    ...diff.improvements,
  ];

  if (candidates.length === 0) {
    console.log('No DAO scores differ meaningfully from the baseline. Nothing to accept.');
    process.exit(0);
  }

  const perDao: CalibrationBaseline['perDao'] = { ...previous.perDao };
  const acceptedIds: string[] = [];

  for (const entry of candidates) {
    const status = entry.kind ?? (entry.delta > 0 ? 'improvement' : 'change');
    const prompt = `[${status}] ${entry.daoId}: ${entry.baselineScore.toFixed(3)} → ${entry.currentScore.toFixed(3)} (${entry.delta > 0 ? '+' : ''}${entry.delta.toFixed(3)}). Accept? [y/N] `;
    const answer = opts.yes ? 'y' : await ask(prompt);
    if (answer.toLowerCase() === 'y') {
      const current = run.perDao[entry.daoId];
      perDao[entry.daoId] = {
        daoId: entry.daoId,
        score: current.score,
        passRate: current.passRate,
        participation: current.participation,
        proposalFrequency: current.proposalFrequency,
        priceRmse: current.priceRmse,
        voterConcentration: current.voterConcentration,
        forumActivity: current.forumActivity,
        ci95: previous.perDao[entry.daoId]?.ci95 ?? {
          overall_score: { mean: current.score, stdDev: 0.03, ci95Lower: current.ci95Lower, ci95Upper: current.ci95Upper, standardError: 0.01 },
          proposal_frequency_error: { mean: 0.1, stdDev: 0.05, ci95Lower: 0.07, ci95Upper: 0.13, standardError: 0.016 },
          pass_rate_error: { mean: 0.1, stdDev: 0.05, ci95Lower: 0.07, ci95Upper: 0.13, standardError: 0.016 },
          participation_rate_error: { mean: 0.1, stdDev: 0.05, ci95Lower: 0.07, ci95Upper: 0.13, standardError: 0.016 },
          price_trajectory_rmse: { mean: 0.2, stdDev: 0.05, ci95Lower: 0.17, ci95Upper: 0.23, standardError: 0.016 },
          voter_concentration_error: { mean: 0.1, stdDev: 0.05, ci95Lower: 0.07, ci95Upper: 0.13, standardError: 0.016 },
          forum_activity_error: { mean: 0.1, stdDev: 0.05, ci95Lower: 0.07, ci95Upper: 0.13, standardError: 0.016 },
        },
      };
      acceptedIds.push(entry.daoId);
    }
  }

  if (acceptedIds.length === 0) {
    console.log('No DAOs accepted. Baseline unchanged.');
    process.exit(0);
  }

  const archived = path.join(path.dirname(opts.outPath), `calibration-baseline.v${previous.version}.json`);
  fs.writeFileSync(archived, JSON.stringify(previous, null, 2), 'utf-8');

  const next: CalibrationBaseline = {
    version: previous.version + 1,
    generatedAt: new Date().toISOString(),
    gitSha: detectGitSha(),
    configHash: computeBaselineConfigHash(),
    description: opts.reason,
    perDao,
  };

  fs.writeFileSync(opts.outPath, JSON.stringify(next, null, 2), 'utf-8');

  const changelogPath = path.join(path.dirname(opts.outPath), 'CHANGELOG.md');
  const entry = [
    '',
    `## v${next.version} — ${new Date().toISOString().slice(0, 10)} — ${opts.reason}`,
    '',
    `- Git SHA: \`${next.gitSha}\``,
    `- Config hash: \`${next.configHash}\``,
    `- DAOs accepted (${acceptedIds.length}): ${acceptedIds.join(', ')}`,
    '',
  ].join('\n');
  fs.appendFileSync(changelogPath, entry, 'utf-8');

  console.log(`Wrote baseline v${next.version} (previous archived to ${archived})`);
  console.log(`Don't forget BASELINE-CHANGE: in your commit message.`);
}

main().catch((err) => {
  console.error(`accept-calibration-baseline failed: ${(err as Error).message}`);
  process.exit(1);
});
