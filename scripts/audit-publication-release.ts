#!/usr/bin/env npx tsx

import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { auditPublicationRelease } from '../lib/research/release-audit';

interface Arguments {
  output: string;
  artifactRoots: string[];
  help: boolean;
}

export function releaseAuditUsage(): string {
  return [
    'Usage:',
    '  npm run audit:release -- [--artifact-root <path>]... [--output <file>]',
    '',
    'Scans tracked source, Git history, dependency licenses, and every explicit',
    'release-artifact root. Artifact roots may be files or directories.',
  ].join('\n');
}

export function parseReleaseAuditArguments(argv: string[]): Arguments {
  if (argv.includes('--help') || argv.includes('-h')) {
    if (argv.length !== 1) throw new Error('--help cannot be combined with other arguments');
    return { output: '', artifactRoots: [], help: true };
  }
  let output = 'results/release-audit/release-audit.json';
  const artifactRoots: string[] = [];
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key !== '--output' && key !== '--artifact-root') {
      throw new Error(`Unknown argument: ${key}`);
    }
    if (!value || value.startsWith('--')) throw new Error(`${key} requires a path`);
    if (key === '--output') output = value;
    else artifactRoots.push(value);
  }
  return { output: path.resolve(output), artifactRoots, help: false };
}

function main(): void {
  const args = parseReleaseAuditArguments(process.argv.slice(2));
  if (args.help) {
    console.log(releaseAuditUsage());
    return;
  }
  const report = auditPublicationRelease(process.cwd(), {
    artifactRoots: args.artifactRoots,
  });
  fs.mkdirSync(path.dirname(args.output), { recursive: true });
  fs.writeFileSync(args.output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(
    `Release audit ${report.passed ? 'passed' : 'failed'}: `
    + `${report.trackedFilesScanned} tracked files, `
    + `${report.releaseArtifactFilesScanned} release files, `
    + `${report.historyCommitsScanned} commits, `
    + `${report.dependencies.packagesScanned} dependencies, `
    + `${report.findings.length} finding(s).`
  );
  console.log(`Report: ${args.output}`);
  if (!report.passed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
