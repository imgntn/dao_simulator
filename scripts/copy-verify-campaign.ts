#!/usr/bin/env npx tsx

import * as path from 'node:path';
import { copyVerifiedCampaign } from '../lib/research/campaign-copy';

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index >= 0) return process.argv[index + 1];
  return process.argv.find(value => value.startsWith(`${name}=`))?.slice(name.length + 1);
}

function main(): void {
  const sourceDir = argument('--source');
  const destinationDir = argument('--destination');
  if (!sourceDir || !destinationDir) {
    throw new Error(
      'Usage: npm run campaign:copy-verify -- --source <verified-campaign-dir> '
      + '--destination <new-archive-dir> [--receipt <path>]'
    );
  }
  const receipt = copyVerifiedCampaign({
    sourceDir,
    destinationDir,
    receiptPath: argument('--receipt'),
  });
  console.log(`Read-only campaign copy verified: ${path.resolve(destinationDir)}`);
  console.log(`Campaign identity: sha256:${receipt.campaignIdentitySha256}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
}
