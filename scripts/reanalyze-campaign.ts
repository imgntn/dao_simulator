#!/usr/bin/env npx tsx

import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  reanalyzeCampaign,
  verifyCampaignReanalysis,
} from '../lib/research/campaign-reanalysis';

export interface ReanalysisArguments {
  campaignDir?: string;
  outputDir?: string;
  reanalysisId?: string;
  experimentIds: string[];
  designConfigDir?: string;
  verifyDir?: string;
  help: boolean;
}

const VALUE_ARGUMENTS = new Set([
  '--campaign-dir',
  '--output-dir',
  '--reanalysis-id',
  '--experiment-ids',
  '--design-config-dir',
  '--verify',
]);

export function reanalysisUsage(): string {
  return [
    'Usage:',
    '  npm run campaign:reanalyze -- --campaign-dir <dir> --output-dir <dir>',
    '    --reanalysis-id <id> --experiment-ids <id[,id...]>',
    '    [--design-config-dir <dir>]',
    '  npm run campaign:reanalyze -- --verify <reanalysis-dir>',
    '',
    'Options:',
    '  --campaign-dir <dir>       Immutable source campaign',
    '  --output-dir <dir>         New, empty derivation directory',
    '  --reanalysis-id <id>       Stable derivation identifier',
    '  --experiment-ids <ids>     Comma-separated experiment identifiers',
    '  --design-config-dir <dir>  Optional corrected design configuration',
    '  --verify <dir>             Verify an existing derivation without writing',
    '  --help                     Print this message',
  ].join('\n');
}

export function parseReanalysisArguments(argv: string[]): ReanalysisArguments {
  if (argv.includes('--help') || argv.includes('-h')) {
    if (argv.length !== 1) throw new Error('--help cannot be combined with other arguments');
    return { experimentIds: [], help: true };
  }
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith('--')) throw new Error(`Unexpected argument: ${key}`);
    if (!VALUE_ARGUMENTS.has(key)) throw new Error(`Unknown argument: ${key}`);
    if (values.has(key)) throw new Error(`Duplicate argument: ${key}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${key}`);
    values.set(key, value);
    index += 1;
  }
  return {
    campaignDir: values.get('--campaign-dir'),
    outputDir: values.get('--output-dir'),
    reanalysisId: values.get('--reanalysis-id'),
    experimentIds: (values.get('--experiment-ids') ?? '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean),
    designConfigDir: values.get('--design-config-dir'),
    verifyDir: values.get('--verify'),
    help: false,
  };
}

function main(): void {
  const args = parseReanalysisArguments(process.argv.slice(2));
  if (args.help) {
    console.log(reanalysisUsage());
    return;
  }
  if (args.verifyDir) {
    if (
      args.campaignDir
      || args.outputDir
      || args.reanalysisId
      || args.experimentIds.length > 0
      || args.designConfigDir
    ) {
      throw new Error('--verify cannot be combined with reanalysis-creation arguments');
    }
    const verification = verifyCampaignReanalysis(args.verifyDir);
    if (!verification.valid) {
      throw new Error(`Reanalysis verification failed: ${verification.errors.join('; ')}`);
    }
    console.log(`Verified campaign reanalysis: ${path.resolve(args.verifyDir)}`);
    return;
  }
  if (
    !args.campaignDir
    || !args.outputDir
    || !args.reanalysisId
    || args.experimentIds.length === 0
  ) {
    throw new Error(
      '--campaign-dir, --output-dir, --reanalysis-id, and --experiment-ids are required'
    );
  }
  const manifest = reanalyzeCampaign({
    campaignDir: args.campaignDir,
    outputDir: args.outputDir,
    reanalysisId: args.reanalysisId,
    experimentIds: args.experimentIds,
    designConfigDir: args.designConfigDir,
  });
  console.log(
    `Verified reanalysis ${manifest.reanalysisId}: `
    + `${manifest.sourceRuns.length} source runs, ${path.resolve(args.outputDir)}`
  );
}

const isMain = Boolean(
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
);
if (isMain) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  }
}
