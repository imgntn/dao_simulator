#!/usr/bin/env npx tsx

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  loadCampaign,
  sha256File,
  verifyCampaign,
} from '../lib/research/campaign-manifest';
import {
  auditClaimRegistry,
  type ClaimRegistry,
} from '../lib/research/claim-registry';

function main(): void {
  const argument = process.argv[2];
  if (!argument) throw new Error('Usage: npm run claims:audit -- <campaign-directory>');
  const campaignDir = path.resolve(argument);
  const verification = verifyCampaign(campaignDir);
  if (!verification.valid) {
    throw new Error(`Campaign verification failed:\n${verification.errors.join('\n')}`);
  }
  const manifest = loadCampaign(campaignDir);
  const analysisArtifact = manifest.artifacts.find(artifact => artifact.id === 'campaign-analysis');
  const claimsArtifact = manifest.artifacts.find(artifact => artifact.id === 'claim-registry');
  if (!analysisArtifact) throw new Error('Campaign has no indexed analysis artifact');
  if (!claimsArtifact) throw new Error('Campaign has no indexed claim registry');
  const claimsPath = path.resolve(campaignDir, claimsArtifact.path);
  const registry = JSON.parse(fs.readFileSync(claimsPath, 'utf8')) as ClaimRegistry;
  const errors = auditClaimRegistry(registry, {
    campaignId: manifest.campaignId,
    analysisPath: analysisArtifact.path,
    analysisSha256: sha256File(path.resolve(campaignDir, analysisArtifact.path)),
    runIds: new Set(manifest.runs.map(run => run.runId)),
  });
  if (errors.length > 0) {
    throw new Error(`Claim registry audit failed:\n${errors.map(error => `- ${error}`).join('\n')}`);
  }
  const statuses = Object.fromEntries(
    [...new Set(registry.claims.map(claim => claim.status))]
      .sort()
      .map(status => [status, registry.claims.filter(claim => claim.status === status).length])
  );
  console.log(JSON.stringify({
    campaignId: manifest.campaignId,
    claims: registry.claims.length,
    statuses,
    analysisSha256: registry.sourceAnalysis.sha256,
    passed: true,
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
