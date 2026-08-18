#!/usr/bin/env npx tsx

import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { finalizePublicationCampaign } from '../lib/research/publication-finalization';

interface Arguments {
  campaign?: string;
  copy?: string;
  output?: string;
  report?: string;
  experimentIds: string[];
  help: boolean;
}

export function publicationFinalizationUsage(): string {
  return [
    'Usage:',
    '  npm run campaign:finalize-publication -- --campaign <verified-dir>',
    '    --copy <new-read-only-dir> --experiment-ids <id[,id...]> [options]',
    '',
    'Options:',
    '  --output <dir>       Independent analysis and publication outputs',
    '  --report <file>      Final machine-readable identity comparison',
    '  --help               Print this message',
  ].join('\n');
}

export function parsePublicationFinalizationArgs(argv: string[]): Arguments {
  if (argv.includes('--help') || argv.includes('-h')) {
    if (argv.length !== 1) throw new Error('--help cannot be combined with other arguments');
    return { experimentIds: [], help: true };
  }
  const allowed = new Set(['--campaign', '--copy', '--output', '--report', '--experiment-ids']);
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!allowed.has(key)) throw new Error(`Unknown argument: ${key}`);
    if (values.has(key)) throw new Error(`Duplicate argument: ${key}`);
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${key}`);
    values.set(key, value);
  }
  return {
    campaign: values.get('--campaign'),
    copy: values.get('--copy'),
    output: values.get('--output'),
    report: values.get('--report'),
    experimentIds: (values.get('--experiment-ids') ?? '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean),
    help: false,
  };
}

function main(): void {
  const rootDir = process.cwd();
  const args = parsePublicationFinalizationArgs(process.argv.slice(2));
  if (args.help) {
    console.log(publicationFinalizationUsage());
    return;
  }
  if (!args.campaign || !args.copy || args.experimentIds.length === 0) {
    throw new Error('--campaign, --copy, and --experiment-ids are required');
  }
  const campaignDir = path.resolve(rootDir, args.campaign);
  const campaignId = path.basename(campaignDir);
  const outputDir = path.resolve(
    rootDir,
    args.output ?? path.join('results', 'publication-finalization', campaignId),
  );
  const reportPath = path.resolve(
    rootDir,
    args.report ?? path.join(outputDir, 'finalization-report.json'),
  );
  const report = finalizePublicationCampaign({
    rootDir,
    campaignDir,
    copyDir: path.resolve(rootDir, args.copy),
    outputDir,
    reportPath,
    experimentIds: args.experimentIds,
  });
  console.log(
    `Publication finalization passed for ${report.campaignId}: `
    + `analysis sha256:${report.sourceAnalysisIdentitySha256}, `
    + `publication sha256:${report.sourcePublicationIdentitySha256}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
