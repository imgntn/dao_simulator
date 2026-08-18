#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';
import yaml from 'yaml';
import type { ExperimentConfig } from '../lib/research/experiment-config';
import { buildPilotConfig } from '../lib/research/pilot-config';

const ROOT = process.cwd();
const PAPER_DIR = path.join(ROOT, 'experiments', 'paper');
const PILOT_DIR = path.join(ROOT, 'experiments', 'pilot');
const SOURCE_FILES = [
  '03-sensitivity-quorum.yaml',
  '04-governance-capture-mitigations.yaml',
  '05-proposal-pipeline.yaml',
  '06-treasury-resilience.yaml',
] as const;

function atomicWrite(filePath: string, contents: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(temporaryPath, contents, 'utf8');
  fs.renameSync(temporaryPath, filePath);
}

function main(): void {
  for (const file of SOURCE_FILES) {
    const sourcePath = path.join(PAPER_DIR, file);
    const source = yaml.parse(fs.readFileSync(sourcePath, 'utf8')) as ExperimentConfig;
    const pilot = buildPilotConfig(source);
    const target = path.join(PILOT_DIR, file);
    atomicWrite(
      target,
      `# Generated from experiments/paper/${file}; regenerate with npm run catalog:pilots.\n`
        + yaml.stringify(pilot, { lineWidth: 0 }),
    );
    console.log(path.relative(ROOT, target).replace(/\\/g, '/'));
  }
}

main();
