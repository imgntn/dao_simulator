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
  resolvePaperConfig,
} from './paper-pipeline-utils';
import {
  createCampaign,
  verifyCampaign,
  transitionCampaign,
} from '../lib/research/campaign-manifest';

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
    campaignId: '',
    allowDirty: false,
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
      result.profile = profile === 'p1' || profile === 'p2' || profile === 'p3' || profile === 'llm' || profile === 'full' ? profile : 'full';
      i++;
    } else if (arg.startsWith('--profile=')) {
      const profile = arg.split('=')[1] as PaperProfile | undefined;
      result.profile = profile === 'p1' || profile === 'p2' || profile === 'p3' || profile === 'llm' || profile === 'full' ? profile : 'full';
    } else if (arg === '--allow-stale' || arg === '--skip-freshness-check') {
      result.strictFreshness = false;
    } else if (arg === '--campaign-id') {
      result.campaignId = args[i + 1] || '';
      i++;
    } else if (arg.startsWith('--campaign-id=')) {
      result.campaignId = arg.split('=')[1] || '';
    } else if (arg === '--allow-dirty') {
      result.allowDirty = true;
    }
  }

  return result;
}

function runCommand(command: string, args: string[], env?: NodeJS.ProcessEnv): void {
  const shouldAppendCmd = process.platform === 'win32'
    && !path.extname(command)
    && !command.includes('\\')
    && !command.includes('/');
  const executable = shouldAppendCmd ? `${command}.cmd` : command;
  const result = spawnSync(executable, args, {
    stdio: 'inherit',
    env: env ?? process.env,
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status ?? 1}): ${executable} ${args.join(' ')}`);
  }
}

function runTsx(scriptPath: string, args: string[]): void {
  if (fs.existsSync(TSX_CLI)) {
    runCommand(process.execPath, [TSX_CLI, scriptPath, ...args]);
    return;
  }
  runCommand('npx', ['tsx', scriptPath, ...args]);
}

function runSuite(configs: string[], campaignDir?: string): void {
  for (const config of configs) {
    runCommand('npm', ['run', 'exp', '--', 'run', config], campaignDir
      ? { ...process.env, DAO_SIM_CAMPAIGN_DIR: campaignDir }
      : process.env);
  }
}

function createSuiteCampaign(
  configs: string[],
  profile: PaperProfile,
  requestedId: string,
  allowDirty: boolean
): string {
  const shortCommit = spawnSync('git', ['rev-parse', '--short=8', 'HEAD'], {
    encoding: 'utf8',
    windowsHide: true,
  }).stdout.trim();
  const date = new Date().toISOString().slice(0, 10);
  const campaignId = requestedId || `${date}-${shortCommit}-${profile}`;
  const resolved = configs.map((configPath) => resolvePaperConfig(ROOT, configPath));
  const inputFiles = Object.fromEntries(configs.map((configPath, index) => [`config-${index}`, configPath]));
  createCampaign({
    rootDir: ROOT,
    campaignId,
    resolvedConfig: {
      profile,
      experiments: resolved.map((item) => ({
        configPath: item.configPath,
        expectedRuns: item.expectedRuns,
        config: item.parsedConfig,
      })),
    },
    expectedRuns: resolved.reduce((sum, item) => sum + item.expectedRuns, 0),
    workerCount: Math.max(...resolved.map((item) => Number(item.parsedConfig?.execution?.workers ?? 1))),
    inputFiles,
    command: process.argv,
    allowDirty,
  });
  const campaignDir = path.join(ROOT, 'campaigns', campaignId);
  transitionCampaign(campaignDir, 'validating');
  transitionCampaign(campaignDir, 'running');
  return campaignDir;
}

function campaignExperimentDirs(configs: string[], campaignDir: string): string[] {
  return configs.map(configPath => {
    const resolved = resolvePaperConfig(ROOT, configPath);
    const experimentId = String(resolved.parsedConfig?.name ?? path.basename(configPath))
      .replace(/[^a-zA-Z0-9._-]+/g, '_');
    return path.join(campaignDir, 'experiments', experimentId);
  });
}

function assertCampaignOutputs(configs: string[], campaignDir: string): string[] {
  const verification = verifyCampaign(campaignDir);
  if (!verification.valid) {
    throw new Error(`Campaign verification failed: ${verification.errors.join('; ')}`);
  }
  const dirs = campaignExperimentDirs(configs, campaignDir);
  configs.forEach((configPath, index) => {
    const expected = resolvePaperConfig(ROOT, configPath).expectedRuns;
    const summaryPath = path.join(dirs[index], 'summary.json');
    const manifestPath = path.join(dirs[index], 'manifest.json');
    if (!fs.existsSync(summaryPath) || !fs.existsSync(manifestPath)) {
      throw new Error(`Campaign output is incomplete: ${dirs[index]}`);
    }
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (
      summary.totalRuns !== expected ||
      summary.successfulRuns !== expected ||
      summary.failedRuns !== 0 ||
      manifest?.execution?.totalRuns !== expected
    ) {
      throw new Error(`Campaign output run accounting mismatch: ${dirs[index]}`);
    }
    if (!/^sha256:[a-f0-9]{64}$/i.test(String(manifest?.metricDefinitions?.hash ?? ''))) {
      throw new Error(`Campaign output lacks metric-definition provenance: ${dirs[index]}`);
    }
  });
  return dirs;
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

function runReportsForDirs(dirs: string[]): void {
  for (const outputDir of dirs) {
    runTsx('scripts/generate-research-quality-report.ts', [
      outputDir,
      path.join(outputDir, 'research-quality-report.md'),
    ]);
  }
}

function buildPack(configs: string[], outputDir: string, resultsRoot?: string): void {
  const args: string[] = [];
  if (outputDir) {
    args.push('--output', outputDir);
  }
  if (resultsRoot) {
    args.push('--results-root', resultsRoot);
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

function generateSummaryFromDirs(dirs: string[], outputPath?: string): void {
  if (dirs.length === 0) {
    throw new Error('Cannot generate an executive summary without campaign results');
  }
  const args = [...dirs];
  if (outputPath) {
    args.push('--output', outputPath);
  }
  runTsx('scripts/generate-executive-summary.ts', args);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const configs = resolveProfileConfigPaths(ROOT, args.profile, args.includeValidation);

  switch (args.command) {
    case 'run':
      {
        const campaignDir = createSuiteCampaign(
          configs,
          args.profile,
          args.campaignId,
          args.allowDirty
        );
        try {
          runSuite(configs, campaignDir);
          transitionCampaign(campaignDir, 'completed');
          transitionCampaign(campaignDir, 'verified');
          console.log(`[paper-suite] Verified campaign: ${campaignDir}`);
        } catch (error) {
          try {
            transitionCampaign(campaignDir, 'failed');
          } catch {
            // Preserve the original execution failure.
          }
          throw error;
        }
      }
      break;
    case 'report':
      if (args.campaignId) {
        runReportsForDirs(assertCampaignOutputs(
          configs,
          path.join(ROOT, 'campaigns', args.campaignId)
        ));
      } else {
        assertFreshResults(ROOT, configs, args.strictFreshness);
        runReports(configs);
      }
      break;
    case 'pack':
      if (args.campaignId) {
        const campaignDir = path.join(ROOT, 'campaigns', args.campaignId);
        const dirs = assertCampaignOutputs(configs, campaignDir);
        runReportsForDirs(dirs);
        buildPack(configs, args.outputDir, path.join(campaignDir, 'experiments'));
        generateSummaryFromDirs(dirs);
      } else {
        assertFreshResults(ROOT, configs, args.strictFreshness);
        runReports(configs);
        buildPack(configs, args.outputDir);
        generateSummary(configs);
      }
      break;
    case 'summary':
      if (args.campaignId) {
        generateSummaryFromDirs(assertCampaignOutputs(
          configs,
          path.join(ROOT, 'campaigns', args.campaignId)
        ));
      } else {
        assertFreshResults(ROOT, configs, args.strictFreshness);
        generateSummary(configs);
      }
      break;
    case 'all':
    default:
      {
        const campaignDir = createSuiteCampaign(
          configs,
          args.profile,
          args.campaignId,
          args.allowDirty
        );
        try {
          runSuite(configs, campaignDir);
          transitionCampaign(campaignDir, 'completed');
          transitionCampaign(campaignDir, 'verified');
          const dirs = assertCampaignOutputs(configs, campaignDir);
          runReportsForDirs(dirs);
          buildPack(
            configs,
            args.outputDir || path.join(campaignDir, 'paper-pack'),
            path.join(campaignDir, 'experiments')
          );
          generateSummaryFromDirs(dirs, path.join(campaignDir, 'executive-summary.md'));
          console.log(`[paper-suite] Verified campaign and report pack: ${campaignDir}`);
        } catch (error) {
          try {
            transitionCampaign(campaignDir, 'failed');
          } catch {
            // Preserve the original execution failure.
          }
          throw error;
        }
      }
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
