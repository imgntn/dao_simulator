#!/usr/bin/env npx tsx

import * as path from 'node:path';
import { abortCampaign } from '../lib/research/campaign-abort';

function value(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const result = process.argv[index + 1];
  if (!result || result.startsWith('--')) throw new Error(`Missing value for ${name}`);
  return result;
}

function main(): void {
  const allowed = new Set(['--campaign', '--reason']);
  for (const argument of process.argv.slice(2)) {
    if (argument.startsWith('--') && !allowed.has(argument)) {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  const campaign = value('--campaign');
  const reason = value('--reason');
  if (!campaign || !reason) {
    throw new Error(
      'Usage: npm run campaign:abort -- --campaign <campaign-dir> --reason <reason>',
    );
  }
  const report = abortCampaign(path.resolve(campaign), reason);
  console.log(`Aborted campaign ${report.campaignId}: ${report.reason}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
