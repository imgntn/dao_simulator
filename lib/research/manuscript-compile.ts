import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { sha256File, writeJsonAtomic } from './campaign-manifest';
import {
  verifyManuscriptPackage,
  type ManuscriptPackageManifest,
} from './manuscript-assembly';
import { portableArtifactPath } from './portable-path';

interface CompileOptions {
  rootDir: string;
  sourceDir: string;
  buildDir: string;
}

interface CompileHooks {
  run?: (
    command: string,
    args: string[],
    cwd: string,
  ) => SpawnSyncReturns<Buffer>;
}

export interface ManuscriptCompileReport {
  schemaVersion: '1.0.0';
  sourcePackage: string;
  sourceIdentitySha256: string;
  commands: string[][];
  pdf: {
    path: string;
    bytes: number;
    sha256: string;
  };
  passed: true;
}

export function compileManuscript(
  options: CompileOptions,
  hooks: CompileHooks = {},
): ManuscriptCompileReport {
  const rootDir = path.resolve(options.rootDir);
  const sourceDir = path.resolve(options.sourceDir);
  const buildDir = path.resolve(options.buildDir);
  const verification = verifyManuscriptPackage(sourceDir);
  if (verification.length > 0) {
    throw new Error(`Source manuscript verification failed: ${verification.join('; ')}`);
  }
  if (fs.existsSync(buildDir) && fs.readdirSync(buildDir).length > 0) {
    throw new Error(`Manuscript build directory is not empty: ${buildDir}`);
  }
  fs.mkdirSync(path.dirname(buildDir), { recursive: true });
  fs.cpSync(sourceDir, buildDir, {
    recursive: true,
    errorOnExist: true,
    force: false,
  });

  const run = hooks.run ?? ((command, args, cwd) => spawnSync(command, args, {
    cwd,
    env: process.env,
    encoding: 'buffer',
    stdio: 'inherit',
    windowsHide: true,
  }));
  const commands = [
    ['pdflatex', '-halt-on-error', '-file-line-error', '-interaction=nonstopmode', 'main.tex'],
    ['bibtex', 'main'],
    ['pdflatex', '-halt-on-error', '-file-line-error', '-interaction=nonstopmode', 'main.tex'],
    ['pdflatex', '-halt-on-error', '-file-line-error', '-interaction=nonstopmode', 'main.tex'],
  ];
  for (const [command, ...args] of commands) {
    const result = run(command, args, buildDir);
    if (result.error || result.status !== 0) {
      throw new Error(`Manuscript compilation failed: ${command} ${args.join(' ')}`);
    }
  }
  const pdfPath = path.join(buildDir, 'main.pdf');
  if (!fs.existsSync(pdfPath) || fs.statSync(pdfPath).size === 0) {
    throw new Error('Manuscript compilation did not produce a non-empty main.pdf');
  }
  const sourceManifest = JSON.parse(
    fs.readFileSync(path.join(sourceDir, 'manuscript-manifest.json'), 'utf8'),
  ) as ManuscriptPackageManifest;
  const report: ManuscriptCompileReport = {
    schemaVersion: '1.0.0',
    sourcePackage: portableArtifactPath(rootDir, sourceDir),
    sourceIdentitySha256: sourceManifest.identitySha256,
    commands,
    pdf: {
      path: 'main.pdf',
      bytes: fs.statSync(pdfPath).size,
      sha256: sha256File(pdfPath),
    },
    passed: true,
  };
  writeJsonAtomic(path.join(buildDir, 'compile-report.json'), report);
  return report;
}
