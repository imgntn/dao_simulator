#!/usr/bin/env npx tsx
/**
 * Notify on calibration regression.
 *
 * Called by ci/validate-*.sh after the validation loop exits non-zero.
 * Reads the latest validation run from history.jsonl, finds its markdown
 * report, and emails a concise summary using the SMTP credentials already
 * configured for the feedback form (SMTP_HOST/PORT/USER/PASS, CONTACT_EMAIL).
 *
 * Quiet by design: no SMTP config = log + exit 0 (don't break CI further).
 * On success: exit 0. On send failure: exit 0 (logged), so CI still
 * reports the underlying regression rather than a notifier glitch.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import {
  ValidationRunSchema,
  type ValidationRun,
} from '../lib/research/baseline-schema';
import { logger } from '../lib/utils/logger';

interface CliOptions {
  historyPath: string;
  reportDir: string;
  exitCode: number;
}

function readOpt(argv: string[], flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  if (idx >= 0 && idx + 1 < argv.length) return argv[idx + 1];
  return undefined;
}

function parseArgs(): CliOptions {
  const argv = process.argv.slice(2);
  const root = process.cwd();
  return {
    historyPath: readOpt(argv, '--history') ?? path.join(root, 'results', 'validation', 'history.jsonl'),
    reportDir: readOpt(argv, '--report-dir') ?? path.join(root, 'results', 'validation'),
    exitCode: Number(readOpt(argv, '--exit-code') ?? '1'),
  };
}

async function readLastRun(historyPath: string): Promise<ValidationRun | null> {
  if (!fs.existsSync(historyPath)) return null;
  const stream = fs.createReadStream(historyPath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let lastValid: ValidationRun | null = null;
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = ValidationRunSchema.safeParse(JSON.parse(trimmed));
      if (parsed.success) lastValid = parsed.data;
    } catch {
      continue;
    }
  }
  return lastValid;
}

function exitCodeLabel(code: number): string {
  switch (code) {
    case 1: return 'REGRESSION';
    case 2: return 'CONFIG-DRIFT';
    case 3: return 'INFRA-FAILURE';
    default: return `EXIT-${code}`;
  }
}

function summarize(run: ValidationRun): string {
  const scores = Object.values(run.perDao);
  if (scores.length === 0) return 'No per-DAO results.';
  const avg = scores.reduce((a, b) => a + b.score, 0) / scores.length;
  const worst = [...scores].sort((a, b) => a.score - b.score)[0];
  return [
    `Suite: ${run.suite}`,
    `Started: ${run.startedAt}`,
    `Git SHA: ${run.gitSha}`,
    `Baseline v${run.baselineVersion}, config hash ${run.configHash}`,
    `DAOs: ${scores.length}, average score: ${avg.toFixed(3)}`,
    `Worst DAO: ${worst.daoId} @ ${worst.score.toFixed(3)}`,
    `Regression count: ${run.regressionCount}`,
  ].join('\n');
}

async function main(): Promise<void> {
  const opts = parseArgs();
  const run = await readLastRun(opts.historyPath);
  if (!run) {
    logger.warn('notify: no validation run found, skipping notification');
    return;
  }

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const to = process.env.CONTACT_EMAIL ?? 'james.b.pollack@gmail.com';

  const label = exitCodeLabel(opts.exitCode);
  const subject = `[dao-sim] calibration ${label} — ${run.suite} suite — ${run.runId}`;
  const reportPath = path.join(opts.reportDir, `${run.runId}.md`);
  const reportExists = fs.existsSync(reportPath);
  const reportBody = reportExists
    ? fs.readFileSync(reportPath, 'utf-8')
    : '(report markdown not found)';

  const body = [
    `Calibration validation ${label}`,
    '',
    summarize(run),
    '',
    `Report: ${reportPath}`,
    `History: ${opts.historyPath}`,
    '',
    '--- report.md follows ---',
    '',
    reportBody,
  ].join('\n');

  if (!host || !user || !pass) {
    logger.warn(`notify: SMTP not configured (SMTP_HOST/USER/PASS missing). Subject would have been: ${subject}`);
    console.log(body);
    return;
  }

  let nodemailer: typeof import('nodemailer');
  try {
    nodemailer = await import('nodemailer');
  } catch (err) {
    logger.warn(`notify: nodemailer not installed (${(err as Error).message}); skipping send.`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port: port ? Number(port) : 465,
    secure: !port || Number(port) === 465,
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from: user,
      to,
      subject,
      text: body,
    });
    logger.info(`notify: sent regression email to ${to}`);
  } catch (err) {
    logger.warn(`notify: send failed (${(err as Error).message}); regression is still logged.`);
  }
}

main().catch((err) => {
  console.error(`notify-calibration-regression failed: ${(err as Error).message}`);
});
