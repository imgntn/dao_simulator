#!/usr/bin/env node

import * as path from 'node:path';
import { verifyCampaign } from '../lib/research/campaign-manifest';

function main(): void {
  const requestedPath = process.argv[2];
  if (!requestedPath) {
    console.error('Usage: npm run campaign:verify -- <campaign-directory>');
    process.exitCode = 2;
    return;
  }

  const campaignDir = path.resolve(requestedPath);
  const result = verifyCampaign(campaignDir);
  if (!result.valid) {
    console.error(`Campaign verification failed: ${campaignDir}`);
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Campaign verified: ${campaignDir}`);
}

main();
