#!/usr/bin/env npx tsx
import * as path from 'node:path';
import {
  generatePublicationArtifacts,
  publicationBundleIdentity,
  verifyPublicationBundle,
} from '../lib/research/publication-artifacts';

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index >= 0) return process.argv[index + 1];
  return process.argv.find(value => value.startsWith(`${name}=`))?.slice(name.length + 1);
}

function main(): void {
  const campaignValue = argument('--campaign');
  if (!campaignValue) {
    throw new Error(
      'Usage: npm run publication:generate -- --campaign <verified-campaign-dir> [--output <dir>]'
    );
  }
  const campaignDir = path.resolve(campaignValue);
  const campaignId = path.basename(campaignDir);
  const outputDir = path.resolve(
    argument('--output') ?? path.join('publication', 'campaigns', campaignId)
  );
  const pipelineSmoke = process.argv.includes('--pipeline-smoke');
  const supporting = process.argv.includes('--supporting');
  if (pipelineSmoke && supporting) {
    throw new Error('--pipeline-smoke and --supporting are mutually exclusive');
  }
  const manifest = generatePublicationArtifacts(
    campaignDir,
    outputDir,
    { mode: pipelineSmoke ? 'pipeline-smoke' : supporting ? 'supporting' : 'publication' },
  );
  const errors = verifyPublicationBundle(outputDir);
  if (errors.length > 0) throw new Error(`Publication verification failed: ${errors.join('; ')}`);
  console.log(`Publication bundle: ${outputDir}`);
  console.log(`Bundle identity: sha256:${publicationBundleIdentity(manifest)}`);
}

main();
