/**
 * Validation reporting: markdown generation, JSONL history append,
 * and the suspect-commit-range injection used by Phase 7 alerting.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { ValidationRun } from './baseline-schema';
import type { DiffReport } from './validation-differ';
import type { FindingDiffReport } from './finding-checker';

export interface ReportSinkOptions {
  /** Directory where `<runId>.md` is written. Created if missing. */
  outDir: string;
  /** Path to the JSONL history file. Created if missing, appended otherwise. */
  historyPath: string;
}

export interface ReportContext {
  run: ValidationRun;
  diff: DiffReport;
  findings?: FindingDiffReport;
  baselineGitSha: string;
}

const DEFAULT_OPTIONS: ReportSinkOptions = {
  outDir: path.join(process.cwd(), 'results', 'validation'),
  historyPath: path.join(process.cwd(), 'results', 'validation', 'history.jsonl'),
};

export function writeValidationReport(
  ctx: ReportContext,
  options: Partial<ReportSinkOptions> = {},
): { markdownPath: string; historyPath: string } {
  const opts: ReportSinkOptions = { ...DEFAULT_OPTIONS, ...options };
  ensureDir(opts.outDir);
  ensureDir(path.dirname(opts.historyPath));

  const md = renderMarkdown(ctx);
  const markdownPath = path.join(opts.outDir, `${ctx.run.runId}.md`);
  fs.writeFileSync(markdownPath, md, 'utf-8');

  fs.appendFileSync(opts.historyPath, JSON.stringify(ctx.run) + '\n', 'utf-8');

  return { markdownPath, historyPath: opts.historyPath };
}

function renderMarkdown(ctx: ReportContext): string {
  const { run, diff, findings, baselineGitSha } = ctx;
  const status = run.status.toUpperCase();
  const statusBadge = run.status === 'pass' ? 'PASS' : run.status === 'regression' ? 'REGRESSION' : run.status === 'config-drift' ? 'CONFIG-DRIFT' : 'INFRA-FAILURE';

  const lines: string[] = [];
  lines.push(`# Calibration Validation Report — ${run.runId}`);
  lines.push('');
  lines.push(`**Status:** ${statusBadge}`);
  lines.push(`**Suite:** ${run.suite}`);
  lines.push(`**Started:** ${run.startedAt}`);
  lines.push(`**Finished:** ${run.finishedAt}`);
  lines.push(`**Duration:** ${formatDuration(run.durationMs)}`);
  lines.push(`**Git SHA:** \`${run.gitSha}\``);
  lines.push(`**Baseline version:** v${run.baselineVersion}`);
  lines.push(`**Config hash:** \`${run.configHash}\``);
  lines.push('');

  if (diff.regressions.length > 0) {
    lines.push('## Regressions');
    lines.push('');
    lines.push('| DAO | Baseline | Current | Delta | Kind | Details |');
    lines.push('| --- | -------- | ------- | ----- | ---- | ------- |');
    for (const entry of diff.regressions) {
      lines.push(`| ${entry.daoId} | ${entry.baselineScore.toFixed(3)} | ${entry.currentScore.toFixed(3)} | ${formatDelta(entry.delta)} | ${entry.kind ?? '-'} | ${entry.details ?? ''} |`);
    }
    lines.push('');
  }

  if (findings && findings.inversions.length > 0) {
    lines.push('## Finding Inversions');
    lines.push('');
    lines.push('| Experiment | Baseline Direction | Observed Direction | Magnitude | Details |');
    lines.push('| ---------- | ------------------ | ------------------ | --------- | ------- |');
    for (const f of findings.inversions) {
      lines.push(`| ${f.experimentId} | ${f.baselineDirection} | ${f.observedDirection} | ${f.observedMagnitude.toFixed(3)} | ${f.details ?? ''} |`);
    }
    lines.push('');
  }

  if (findings && findings.warnings.length > 0) {
    lines.push('## Finding Magnitude Warnings');
    lines.push('');
    lines.push('| Experiment | Direction | Observed | Expected Range | Details |');
    lines.push('| ---------- | --------- | -------- | -------------- | ------- |');
    for (const f of findings.warnings) {
      lines.push(`| ${f.experimentId} | ${f.observedDirection} | ${f.observedMagnitude.toFixed(3)} | [${f.baselineRange[0]}, ${f.baselineRange[1]}] | ${f.details ?? ''} |`);
    }
    lines.push('');
  }

  lines.push('## Per-DAO Summary');
  lines.push('');
  lines.push('| DAO | Baseline | Current | Delta | Status |');
  lines.push('| --- | -------- | ------- | ----- | ------ |');
  const allEntries = [...diff.regressions, ...diff.improvements, ...diff.flat];
  allEntries.sort((a, b) => a.daoId.localeCompare(b.daoId));
  for (const entry of allEntries) {
    const status = entry.kind ? entry.kind : entry.delta > 0.01 ? 'improved' : 'flat';
    lines.push(`| ${entry.daoId} | ${entry.baselineScore.toFixed(3)} | ${entry.currentScore.toFixed(3)} | ${formatDelta(entry.delta)} | ${status} |`);
  }
  lines.push('');

  if (diff.regressions.length > 0) {
    lines.push('## Worst Regressions');
    lines.push('');
    const worst = [...diff.regressions]
      .sort((a, b) => a.delta - b.delta)
      .slice(0, 3);
    for (let i = 0; i < worst.length; i++) {
      const w = worst[i];
      lines.push(`${i + 1}. **${w.daoId}** — ${formatDelta(w.delta)} (${w.kind}): ${w.details ?? ''}`);
    }
    lines.push('');
  }

  if (diff.regressions.length > 0 || (findings && findings.inversions.length > 0)) {
    const suspects = collectSuspectCommits(baselineGitSha, run.gitSha);
    if (suspects.length > 0) {
      lines.push('## Suspect Commits');
      lines.push('');
      lines.push('Commits between the baseline and the current run:');
      lines.push('');
      lines.push('```');
      for (const commit of suspects) lines.push(commit);
      lines.push('```');
      lines.push('');
    }
  }

  if (diff.missingFromBaseline.length > 0) {
    lines.push('## DAOs missing from baseline');
    lines.push('');
    for (const d of diff.missingFromBaseline) lines.push(`- ${d}`);
    lines.push('');
  }
  if (diff.missingFromRun.length > 0) {
    lines.push('## DAOs missing from run');
    lines.push('');
    for (const d of diff.missingFromRun) lines.push(`- ${d}`);
    lines.push('');
  }

  return lines.join('\n');
}

export function collectSuspectCommits(baselineGitSha: string, currentGitSha: string): string[] {
  if (!baselineGitSha || baselineGitSha === currentGitSha) return [];
  if (baselineGitSha === 'seed-v1' || baselineGitSha === 'unknown') return [];
  try {
    const out = execSync(
      `git log ${baselineGitSha}..${currentGitSha} --oneline`,
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    return out
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  } catch {
    return [];
  }
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function formatDelta(delta: number): string {
  const prefix = delta > 0 ? '+' : '';
  return `${prefix}${delta.toFixed(3)}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m${remSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours}h${remMinutes}m`;
}
