#!/usr/bin/env npx tsx

import * as path from 'node:path';
import { createArxivPackage } from '../lib/research/arxiv-package';

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}`);
  return value;
}

function main(): void {
  const source = argument('--source');
  const output = argument('--output');
  if (!source || !output) {
    throw new Error(
      'Usage: npm run manuscript:arxiv -- --source <verified-manuscript> --output <empty-dir>',
    );
  }
  const manifest = createArxivPackage(path.resolve(source), path.resolve(output));
  console.log(`arXiv source package: ${path.resolve(output)}`);
  console.log(`Files: ${manifest.files.length}; bytes: ${manifest.totalBytes}`);
  console.log(`Identity: sha256:${manifest.identitySha256}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
