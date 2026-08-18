import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  generatePublicationArtifacts,
  publicationBundleIdentity,
  verifyPublicationBundle,
} from './publication-artifacts';
import { verifyCampaign } from './campaign-manifest';
import { portableArtifactPath } from './portable-path';

export type ReproductionProfile = 'artifacts' | 'full';

export interface ReproductionOptions {
  campaignDir: string;
  outputDir: string;
  reportPath: string;
  profile: ReproductionProfile;
  rootDir: string;
}

export interface ReproductionCommand {
  id: string;
  command: string;
  args: string[];
}

export interface ReproductionCheck {
  id: string;
  status: 'passed' | 'failed';
  durationMs: number;
  detail: string;
}

export interface ReproductionReport {
  schemaVersion: '1.0.0';
  profile: ReproductionProfile;
  campaignDir: string;
  outputDir: string;
  campaignIdentitySha256: string;
  publicationBundleIdentitySha256?: string;
  sourceGitSha?: string;
  runtime: {
    platform: NodeJS.Platform;
    architecture: string;
    node: string;
  };
  startedAt: string;
  completedAt: string;
  passed: boolean;
  checks: ReproductionCheck[];
}

export interface ReproductionHooks {
  runCommand?: (
    command: string,
    args: string[],
    cwd: string,
  ) => SpawnSyncReturns<Buffer>;
  now?: () => Date;
}

function argument(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index >= 0) return args[index + 1];
  return args.find(value => value.startsWith(`${name}=`))?.slice(name.length + 1);
}

export function reproductionUsage(): string {
  return [
    'Usage:',
    '  npm run reproduce -- --campaign <verified-campaign-dir> [options]',
    '',
    'Options:',
    '  --output <dir>       Derived publication bundle directory',
    '  --report <file>      Machine-readable reproduction report',
    '  --profile <name>     artifacts (default) or full',
    '  --help               Print this message',
  ].join('\n');
}

export function parseReproductionArgs(
  args: string[],
  rootDir = process.cwd(),
): ReproductionOptions | { help: true } {
  if (args.includes('--help') || args.includes('-h')) return { help: true };
  const campaign = argument(args, '--campaign');
  if (!campaign) throw new Error('Missing required --campaign argument');
  const campaignDir = path.resolve(rootDir, campaign);
  const campaignId = path.basename(campaignDir);
  const profileValue = argument(args, '--profile') ?? 'artifacts';
  if (profileValue !== 'artifacts' && profileValue !== 'full') {
    throw new Error(`Unsupported reproduction profile: ${profileValue}`);
  }
  const outputDir = path.resolve(
    rootDir,
    argument(args, '--output') ?? path.join('publication', 'campaigns', campaignId),
  );
  const reportPath = path.resolve(
    rootDir,
    argument(args, '--report') ??
      path.join('results', 'reproduction', `${campaignId}-${profileValue}.json`),
  );
  return {
    campaignDir,
    outputDir,
    reportPath,
    profile: profileValue,
    rootDir: path.resolve(rootDir),
  };
}

export function reproductionEngineeringCommands(
  platform: NodeJS.Platform = process.platform,
): ReproductionCommand[] {
  const npm = platform === 'win32' ? 'npm.cmd' : 'npm';
  const python = platform === 'win32' ? 'python' : 'python3';
  return [
    { id: 'lint', command: npm, args: ['run', 'lint', '--', '--quiet'] },
    { id: 'typecheck', command: npm, args: ['run', 'typecheck'] },
    { id: 'unit-tests', command: npm, args: ['run', 'test:unit'] },
    {
      id: 'python-tests',
      command: python,
      args: ['-m', 'unittest', 'discover', 'python/tests'],
    },
    { id: 'application-build', command: npm, args: ['run', 'build'] },
  ];
}

function defaultRunCommand(
  command: string,
  args: string[],
  cwd: string,
): SpawnSyncReturns<Buffer> {
  return spawnSync(command, args, {
    cwd,
    env: process.env,
    encoding: 'buffer',
    stdio: 'inherit',
    windowsHide: true,
  });
}

function writeJsonAtomic(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, filePath);
}

function readCampaignIdentity(campaignDir: string): string {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(campaignDir, 'campaign-manifest.json'), 'utf8'),
  ) as { identitySha256?: unknown };
  if (typeof manifest.identitySha256 !== 'string' || !/^[a-f0-9]{64}$/.test(manifest.identitySha256)) {
    throw new Error('Campaign manifest has no valid identity SHA-256');
  }
  return manifest.identitySha256;
}

function readCampaignGitSha(campaignDir: string): string | undefined {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(campaignDir, 'campaign-manifest.json'), 'utf8'),
  ) as { provenance?: { gitCommit?: unknown } };
  const value = manifest.provenance?.gitCommit;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function runReproduction(
  options: ReproductionOptions,
  hooks: ReproductionHooks = {},
): ReproductionReport {
  const now = hooks.now ?? (() => new Date());
  const runCommand = hooks.runCommand ?? defaultRunCommand;
  const started = now();
  const checks: ReproductionCheck[] = [];
  let campaignIdentity = '';
  let sourceGitSha: string | undefined;
  let bundleIdentity: string | undefined;

  const record = (id: string, action: () => string): void => {
    const checkStarted = Date.now();
    try {
      const detail = action();
      checks.push({
        id,
        status: 'passed',
        durationMs: Date.now() - checkStarted,
        detail,
      });
    } catch (error) {
      checks.push({
        id,
        status: 'failed',
        durationMs: Date.now() - checkStarted,
        detail: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  const buildReport = (passed: boolean): ReproductionReport => ({
    schemaVersion: '1.0.0',
    profile: options.profile,
    campaignDir: portableArtifactPath(options.rootDir, options.campaignDir),
    outputDir: portableArtifactPath(options.rootDir, options.outputDir),
    campaignIdentitySha256: campaignIdentity,
    publicationBundleIdentitySha256: bundleIdentity,
    sourceGitSha,
    runtime: {
      platform: process.platform,
      architecture: process.arch,
      node: process.version,
    },
    startedAt: started.toISOString(),
    completedAt: now().toISOString(),
    passed,
    checks,
  });

  try {
    record('campaign-integrity', () => {
      const result = verifyCampaign(options.campaignDir);
      if (!result.valid) throw new Error(result.errors.join('; '));
      campaignIdentity = readCampaignIdentity(options.campaignDir);
      sourceGitSha = readCampaignGitSha(options.campaignDir);
      return `sha256:${campaignIdentity}`;
    });

    if (options.profile === 'full') {
      for (const item of reproductionEngineeringCommands()) {
        record(item.id, () => {
          const result = runCommand(item.command, item.args, options.rootDir);
          if (result.error) throw result.error;
          if (result.status !== 0) {
            throw new Error(`${item.command} exited with status ${result.status ?? 'unknown'}`);
          }
          return `${item.command} ${item.args.join(' ')}`;
        });
      }
    }

    record('publication-generation', () => {
      const manifest = generatePublicationArtifacts(options.campaignDir, options.outputDir);
      bundleIdentity = publicationBundleIdentity(manifest);
      return `sha256:${bundleIdentity}`;
    });

    record('publication-integrity', () => {
      const errors = verifyPublicationBundle(options.outputDir);
      if (errors.length > 0) throw new Error(errors.join('; '));
      return 'All indexed publication files match their byte counts and SHA-256 hashes';
    });

    const report = buildReport(true);
    writeJsonAtomic(options.reportPath, report);
    return report;
  } catch (error) {
    writeJsonAtomic(options.reportPath, buildReport(false));
    throw error;
  }
}
