#!/usr/bin/env npx tsx

import * as path from 'node:path';
import { compileManuscript } from '../lib/research/manuscript-compile';

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const result = process.argv[index + 1];
  if (!result || result.startsWith('--')) throw new Error(`Missing value for ${name}`);
  return result;
}

function main(): void {
  const source = argument('--source');
  const build = argument('--build');
  if (!source || !build) {
    throw new Error(
      'Usage: npm run manuscript:compile -- --source <verified-package> '
      + '--build <empty-dir>',
    );
  }
  const report = compileManuscript({
    rootDir: process.cwd(),
    sourceDir: path.resolve(source),
    buildDir: path.resolve(build),
  });
  console.log(`Compiled manuscript: ${path.resolve(build, report.pdf.path)}`);
  console.log(`PDF: sha256:${report.pdf.sha256}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
