#!/usr/bin/env npx tsx

import * as path from 'node:path';
import {
  assembleManuscript,
  verifyManuscriptPackage,
} from '../lib/research/manuscript-assembly';

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const result = process.argv[index + 1];
  if (!result || result.startsWith('--')) throw new Error(`Missing value for ${name}`);
  return result;
}

async function main(): Promise<void> {
  const core = argument('--core');
  const supporting = argument('--supporting');
  const output = argument('--output');
  if (!core || !supporting || !output) {
    throw new Error(
      'Usage: npm run manuscript:assemble -- --core <bundle> '
      + '--supporting <bundle> --output <empty-dir>',
    );
  }
  const manifest = await assembleManuscript({
    coreBundleDir: path.resolve(core),
    supportingBundleDir: path.resolve(supporting),
    outputDir: path.resolve(output),
    referencesPath: path.resolve('paper', 'references.bib'),
  });
  const errors = verifyManuscriptPackage(path.resolve(output));
  if (errors.length > 0) throw new Error(errors.join('; '));
  console.log(`Manuscript package: ${path.resolve(output)}`);
  console.log(`Identity: sha256:${manifest.identitySha256}`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
