#!/usr/bin/env npx tsx
import {
  parseReproductionArgs,
  reproductionUsage,
  runReproduction,
} from '../lib/research/reproduction';

function main(): void {
  const parsed = parseReproductionArgs(process.argv.slice(2));
  if ('help' in parsed) {
    console.log(reproductionUsage());
    return;
  }
  const report = runReproduction(parsed);
  console.log(`Campaign identity: sha256:${report.campaignIdentitySha256}`);
  console.log(`Publication identity: sha256:${report.publicationBundleIdentitySha256}`);
  console.log(`Reproduction report: ${parsed.reportPath}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
