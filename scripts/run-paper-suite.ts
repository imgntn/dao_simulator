#!/usr/bin/env node
/**
 * Paper Suite Runner
 *
 * Usage:
 *   npx tsx scripts/run-paper-suite.ts run [--include-validation] [--profile p1|p2|llm|full]
 *   npx tsx scripts/run-paper-suite.ts report [--include-validation] [--profile p1|p2|llm|full]
 *   npx tsx scripts/run-paper-suite.ts pack [--include-validation] [--output <dir>] [--profile p1|p2|llm|full]
 *   npx tsx scripts/run-paper-suite.ts summary [--include-validation] [--profile p1|p2|llm|full]
 *   npx tsx scripts/run-paper-suite.ts all [--include-validation] [--output <dir>] [--profile p1|p2|llm|full]
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import {
  type PaperProfile,
  assertFreshResults,
  resolveOutputDir,
  resolveProfileConfigPaths,
} from './paper-pipeline-utils';

const ROOT = process.cwd();
const TSX_CLI = path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');

export function parseArgs(args: string[]) {
  const commandSet = new Set(['run', 'report', 'pack', 'summary', 'all']);
  let commandArg = 'all';
  let commandIndex = -1;

  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith('-') && commandSet.has(args[i])) {
      commandArg = args[i];
      commandIndex = i;
      break;
    }
  }

  const result = {
    command: commandArg,
    includeValidation: false,
    outputDir: '',
    profile: 'full' as PaperProfile,
    strictFreshness: true,
  };

  for (let i = 0; i < args.length; i++) {
    if (i === commandIndex) continue;
    const arg = args[i];
    if (arg === '--include-validation') {
      result.includeValidation = true;
    } else if (arg === '--output' || arg === '-o') {
      result.outputDir = args[i + 1] || '';
      i++;
    } else if (arg === '--profile' || arg === '--paper') {
      const profile = args[i + 1] as PaperProfile | undefined;
      result.profile = profile === 'p1' || profile === 'p2' || profile === 'llm' || profile === 'full' ? profile : 'full';
      i++;
    } else if (arg.startsWith('--profile=')) {
      const profile = arg.split('=')[1] as PaperProfile | undefined;
      result.profile = profile === 'p1' || profile === 'p2' || profile === 'llm' || profile === 'full' ? profile : 'full';
    } else if (arg === '--allow-stale' || arg === '--skip-freshness-check') {
      result.strictFreshness = false;
    }
  }

  return result;
}

function runCommand(command: string, args: string[]): void {
  const shouldAppendCmd = process.platform === 'win32'
    && !path.extname(command)
    && !command.includes('\\')
    && !command.includes('/');
  const executable = shouldAppendCmd ? `${command}.cmd` : command;
  const result = spawnSync(executable, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runTsx(scriptPath: string, args: string[]): void {
  if (fs.existsSync(TSX_CLI)) {
    runCommand(process.execPath, [TSX_CLI, scriptPath, ...args]);
    return;
  }
  runCommand('npx', ['tsx', scriptPath, ...args]);
}

function runSuite(configs: string[]): void {
  for (const config of configs) {
    runCommand('npm', ['run', 'exp', '--', 'run', config]);
  }
}

function runReports(configs: string[]): void {
  for (const config of configs) {
    const outputDir = resolveOutputDir(ROOT, config);
    if (!outputDir) {
      console.warn(`[paper-suite] Skipping report; could not resolve output directory for ${config}`);
      continue;
    }
    runTsx('scripts/generate-research-quality-report.ts', [
      outputDir,
      path.join(outputDir, 'research-quality-report.md'),
    ]);
  }
}

function buildPack(configs: string[], outputDir: string): void {
  const args: string[] = [];
  if (outputDir) {
    args.push('--output', outputDir);
  }
  args.push(...configs);
  runTsx('scripts/build-paper-report-pack.ts', args);
}

function generateSummary(configs: string[]): void {
  const dirs = configs
    .map((c) => resolveOutputDir(ROOT, c))
    .filter((dir) => dir && fs.existsSync(path.join(dir, 'summary.json')));

  if (dirs.length === 0) {
    console.warn('[paper-suite] No summary.json files found; skipping executive summary');
    return;
  }

  runTsx('scripts/generate-executive-summary.ts', dirs);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const configs = resolveProfileConfigPaths(ROOT, args.profile, args.includeValidation);

  switch (args.command) {
    case 'run':
      runSuite(configs);
      break;
    case 'report':
      assertFreshResults(ROOT, configs, args.strictFreshness);
      runReports(configs);
      break;
    case 'pack':
      assertFreshResults(ROOT, configs, args.strictFreshness);
      runReports(configs);
      buildPack(configs, args.outputDir);
      generateSummary(configs);
      break;
    case 'summary':
      assertFreshResults(ROOT, configs, args.strictFreshness);
      generateSummary(configs);
      break;
    case 'all':
    default:
      runSuite(configs);
      assertFreshResults(ROOT, configs, args.strictFreshness);
      runReports(configs);
      buildPack(configs, args.outputDir);
      generateSummary(configs);
      break;
  }
}

const isMain = (() => {
  if (!process.argv[1]) return false;
  return import.meta.url === pathToFileURL(process.argv[1]).href;
})();

if (isMain) {
  main();
}
