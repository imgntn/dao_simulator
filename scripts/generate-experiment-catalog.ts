#!/usr/bin/env npx tsx

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  buildExperimentCatalog,
  discoverExperimentConfigs,
  writeExperimentCatalog,
} from '../lib/research/experiment-catalog';

const rootDir = process.cwd();
const configPaths = [
  ...discoverExperimentConfigs(rootDir, 'experiments/paper'),
  ...discoverExperimentConfigs(rootDir, 'experiments/robustness-final'),
];
const catalogPath = path.join(rootDir, 'docs', 'experiment-catalog.json');
let generatedAt: string | undefined;
try {
  const existing = JSON.parse(fs.readFileSync(catalogPath, 'utf8')) as { generatedAt?: unknown };
  generatedAt = typeof existing.generatedAt === 'string' ? existing.generatedAt : undefined;
} catch {
  // A new catalog receives the current timestamp from buildExperimentCatalog.
}
const catalog = buildExperimentCatalog(rootDir, configPaths, { generatedAt });
writeExperimentCatalog(rootDir, catalog);
console.log(
  `Wrote ${catalog.experimentCount} experiments and `
  + `${catalog.expectedRunCount} planned runs to docs/experiment-catalog.json`
);
