#!/usr/bin/env node
/**
 * Build a paper-ready report pack from experiment configs.
 *
 * Usage:
 *   npx tsx scripts/build-paper-report-pack.ts --output results/paper-pack-YYYY-MM-DD <config> <config> ...
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

interface PackEntry {
  name: string;
  configPath: string;
  outputDir: string;
  stepsPerRun?: number;
  runsPerConfig?: number;
  sweep?: string;
  totalRuns?: number;
  status: 'ok' | 'missing_results';
}

function parseArgs(args: string[]) {
  const result = {
    outputDir: '',
    configs: [] as string[],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--output' || arg === '-o') {
      result.outputDir = args[i + 1] || '';
      i++;
    } else {
      result.configs.push(arg);
    }
  }

  return result;
}

function resolveOutputDir(configPath: string): { name: string; dir: string; steps?: number; runs?: number; sweep?: string } {
  const absolutePath = path.resolve(configPath);
  const content = fs.readFileSync(absolutePath, 'utf8');
  const parsed = yaml.parse(content);
  const name = parsed?.name || path.basename(configPath, path.extname(configPath));
  const outputDir = parsed?.output?.directory
    ? String(parsed.output.directory)
    : path.join('results', String(name).replace(/[^\w\-]+/g, '_').toLowerCase());

  const steps = parsed?.execution?.stepsPerRun;
  const runs = parsed?.execution?.runsPerConfig;
  const sweep = parsed?.sweep?.grid
    ? `grid(${parsed.sweep.grid.length})`
    : parsed?.sweep?.parameter
      ? parsed.sweep.parameter
      : 'none';

  return { name, dir: outputDir, steps, runs, sweep };
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyIfExists(src: string, dest: string): void {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

function buildIndex(packDir: string, entries: PackEntry[]): void {
  const rows = [
    '| Experiment | Runs | Steps | Sweep | Results | Status |',
    '| --- | --- | --- | --- | --- | --- |',
  ];

  for (const entry of entries) {
    const runs = entry.totalRuns ?? entry.runsPerConfig ?? '-';
    const steps = entry.stepsPerRun ?? '-';
    const sweep = entry.sweep ?? '-';
    const resultsPath = entry.status === 'ok'
      ? `./${path.basename(entry.outputDir)}`
      : '-';
    const status = entry.status === 'ok' ? 'ok' : 'missing';

    rows.push(`| ${entry.name} | ${runs} | ${steps} | ${sweep} | ${resultsPath} | ${status} |`);
  }

  const content = [
    '# Paper Report Pack',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    ...rows,
    '',
    'Notes:',
    '- Runs/steps are read from config files.',
    '- Total runs are read from summary.json when available.',
  ].join('\n');

  fs.writeFileSync(path.join(packDir, 'INDEX.md'), content);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (args.configs.length === 0) {
    console.error('No config files provided.');
    process.exit(1);
  }

  const dateTag = new Date().toISOString().slice(0, 10);
  const packDir = args.outputDir || path.join('results', `paper-pack-${dateTag}`);
  ensureDir(packDir);

  const entries: PackEntry[] = [];

  for (const configPath of args.configs) {
    const resolved = resolveOutputDir(configPath);
    const summaryPath = path.join(resolved.dir, 'summary.json');
    const status: PackEntry['status'] = fs.existsSync(summaryPath) ? 'ok' : 'missing_results';

    let totalRuns: number | undefined;
    if (status === 'ok') {
      const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
      totalRuns = summary?.manifest?.execution?.totalRuns ?? summary?.totalRuns;
    }

    const entry: PackEntry = {
      name: resolved.name,
      configPath,
      outputDir: resolved.dir,
      stepsPerRun: resolved.steps,
      runsPerConfig: resolved.runs,
      sweep: resolved.sweep,
      totalRuns,
      status,
    };
    entries.push(entry);

    if (status !== 'ok') {
      continue;
    }

    const destDir = path.join(packDir, path.basename(resolved.dir));
    ensureDir(destDir);

    const filesToCopy = [
      'summary.json',
      'metrics.csv',
      'stats.csv',
      'significance.csv',
      'recommendations.txt',
      'manifest.json',
      'research-quality-report.md',
      'experiment.log',
      'status.json',
    ];

    for (const file of filesToCopy) {
      copyIfExists(path.join(resolved.dir, file), path.join(destDir, file));
    }
  }

  buildIndex(packDir, entries);
  console.log(`[paper-pack] Created ${packDir}`);
}

main();
