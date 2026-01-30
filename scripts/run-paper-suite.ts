#!/usr/bin/env node
/**
 * Paper Suite Runner
 *
 * Usage:
 *   npx tsx scripts/run-paper-suite.ts run [--include-validation] [--profile p1|p2|full]
 *   npx tsx scripts/run-paper-suite.ts report [--include-validation] [--profile p1|p2|full]
 *   npx tsx scripts/run-paper-suite.ts pack [--include-validation] [--output <dir>] [--profile p1|p2|full]
 *   npx tsx scripts/run-paper-suite.ts all [--include-validation] [--output <dir>] [--profile p1|p2|full]
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { spawnSync } from 'child_process';

const ROOT = process.cwd();

const PAPER_CONFIGS = [
  'experiments/paper/00-academic-baseline.yaml',
  'experiments/paper/01-calibration-participation.yaml',
  'experiments/paper/02-ablation-governance.yaml',
  'experiments/paper/03-sensitivity-quorum.yaml',
  'experiments/paper/04-governance-capture-mitigations.yaml',
  'experiments/paper/05-proposal-pipeline.yaml',
  'experiments/paper/06-treasury-resilience.yaml',
  'experiments/paper/07-inter-dao-cooperation.yaml',
];

const PAPER_PROFILES: Record<string, string[]> = {
  full: PAPER_CONFIGS,
  p1: [
    'experiments/paper/00-academic-baseline.yaml',
    'experiments/paper/01-calibration-participation.yaml',
    'experiments/paper/02-ablation-governance.yaml',
    'experiments/paper/03-sensitivity-quorum.yaml',
    'experiments/paper/04-governance-capture-mitigations.yaml',
  ],
  p2: [
    'experiments/paper/00-academic-baseline.yaml',
    'experiments/paper/02-ablation-governance.yaml',
    'experiments/paper/05-proposal-pipeline.yaml',
    'experiments/paper/06-treasury-resilience.yaml',
    'experiments/paper/07-inter-dao-cooperation.yaml',
  ],
};

function loadValidationConfigs(): string[] {
  const dir = path.join(ROOT, 'experiments', 'validation');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
    .map((f) => path.join('experiments', 'validation', f));
}

function parseArgs(args: string[]) {
  const result = {
    command: 'all',
    includeValidation: false,
    outputDir: '',
    profile: 'full',
  };

  if (args[0] && !args[0].startsWith('-')) {
    result.command = args[0];
  }

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--include-validation') {
      result.includeValidation = true;
    } else if (arg === '--output' || arg === '-o') {
      result.outputDir = args[i + 1] || '';
      i++;
    } else if (arg === '--profile' || arg === '--paper') {
      result.profile = args[i + 1] || 'full';
      i++;
    } else if (arg.startsWith('--profile=')) {
      result.profile = arg.split('=')[1] || 'full';
    }
  }

  return result;
}

function resolveOutputDir(configPath: string): string {
  const absolutePath = path.resolve(configPath);
  const content = fs.readFileSync(absolutePath, 'utf8');
  const parsed = yaml.parse(content);
  const outputDir = parsed?.output?.directory;
  if (outputDir) return outputDir;
  if (parsed?.name) {
    return path.join('results', String(parsed.name).replace(/[^\w\-]+/g, '_').toLowerCase());
  }
  return 'results';
}

function runCommand(command: string, args: string[]): void {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runSuite(configs: string[]): void {
  for (const config of configs) {
    runCommand('npm', ['run', 'exp', '--', 'run', config]);
  }
}

function runReports(configs: string[]): void {
  for (const config of configs) {
    const outputDir = resolveOutputDir(config);
    if (!fs.existsSync(path.join(outputDir, 'summary.json'))) {
      console.warn(`[paper-suite] Skipping report; no summary.json in ${outputDir}`);
      continue;
    }
    runCommand('npx', [
      'tsx',
      'scripts/generate-research-quality-report.ts',
      outputDir,
      path.join(outputDir, 'report.md'),
    ]);
  }
}

function buildPack(configs: string[], outputDir: string): void {
  const args = ['tsx', 'scripts/build-paper-report-pack.ts'];
  if (outputDir) {
    args.push('--output', outputDir);
  }
  args.push(...configs);
  runCommand('npx', args);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  const profileConfigs = PAPER_PROFILES[args.profile] || PAPER_CONFIGS;
  const configs = [
    ...profileConfigs,
    ...(args.includeValidation ? loadValidationConfigs() : []),
  ];

  switch (args.command) {
    case 'run':
      runSuite(configs);
      break;
    case 'report':
      runReports(configs);
      break;
    case 'pack':
      runReports(configs);
      buildPack(configs, args.outputDir);
      break;
    case 'all':
    default:
      runSuite(configs);
      runReports(configs);
      buildPack(configs, args.outputDir);
      break;
  }
}

main();
