/**
 * Paper Compile Script
 * Compiles one or more paper profiles to PDF.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { uploadPaperArtifacts } from './r2-upload';

type ProfileArg = 'full' | 'p1' | 'p2' | 'llm' | 'both' | 'all';

interface ParsedArgs {
  archiveBeforeCompile: boolean;
  profile: ProfileArg;
  paperDirs: string[];
}

const ROOT_DIR = process.cwd();
const TECTONIC_PATH = path.join(ROOT_DIR, 'tools', 'tectonic.exe');

function parseArgs(args: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    archiveBeforeCompile: args.includes('--archive'),
    profile: 'full',
    paperDirs: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--profile') {
      const value = args[i + 1] as ProfileArg | undefined;
      if (value && ['full', 'p1', 'p2', 'llm', 'both', 'all'].includes(value)) {
        parsed.profile = value;
      }
      i++;
    } else if (arg.startsWith('--profile=')) {
      const value = arg.split('=')[1] as ProfileArg | undefined;
      if (value && ['full', 'p1', 'p2', 'llm', 'both', 'all'].includes(value)) {
        parsed.profile = value;
      }
    } else if (arg === '--paper-dir') {
      const value = args[i + 1];
      if (value) parsed.paperDirs.push(value);
      i++;
    } else if (arg.startsWith('--paper-dir=')) {
      const value = arg.split('=')[1];
      if (value) parsed.paperDirs.push(value);
    } else if (arg === '--no-archive') {
      parsed.archiveBeforeCompile = false;
    } else if (arg === '--archive') {
      parsed.archiveBeforeCompile = true;
    }
  }

  return parsed;
}

function resolvePaperDirs(parsed: ParsedArgs): string[] {
  if (parsed.paperDirs.length > 0) {
    return parsed.paperDirs.map((dir) => (
      path.isAbsolute(dir) ? dir : path.resolve(ROOT_DIR, dir)
    ));
  }

  return [path.join(ROOT_DIR, 'paper')];
}

function checkTectonic(): boolean {
  return fs.existsSync(TECTONIC_PATH);
}

function compileWithTectonic(paperDir: string): void {
  const fontsConf = path.join(ROOT_DIR, 'tools', 'fonts.conf');
  execSync(`"${TECTONIC_PATH}" -X compile --reruns 2 main.tex`, {
    cwd: paperDir,
    stdio: 'inherit',
    env: { ...process.env, FONTCONFIG_FILE: fontsConf },
  });
}

function compileWithPdfLatex(paperDir: string): void {
  execSync('pdflatex -interaction=nonstopmode main.tex', { cwd: paperDir, stdio: 'inherit' });
  execSync('bibtex main', { cwd: paperDir, stdio: 'inherit' });
  execSync('pdflatex -interaction=nonstopmode main.tex', { cwd: paperDir, stdio: 'inherit' });
  execSync('pdflatex -interaction=nonstopmode main.tex', { cwd: paperDir, stdio: 'inherit' });
}

function compilePaperDir(paperDir: string): void {
  const mainTex = path.join(paperDir, 'main.tex');
  if (!fs.existsSync(mainTex)) {
    throw new Error(`main.tex not found: ${mainTex}`);
  }

  const paperId = path.basename(paperDir);
  console.log(`\n=== Compiling ${paperId} ===\n`);

  if (checkTectonic()) {
    compileWithTectonic(paperDir);
  } else {
    console.warn(`Tectonic not found at ${TECTONIC_PATH}. Falling back to pdflatex/bibtex.`);
    compileWithPdfLatex(paperDir);
  }

  const pdfPath = path.join(paperDir, 'main.pdf');
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`Compilation finished without producing ${pdfPath}`);
  }

  const stats = fs.statSync(pdfPath);
  const sizeKB = Math.round(stats.size / 1024);
  console.log(`[${paperId}] PDF generated: ${pdfPath} (${sizeKB}KB)`);

  // Upload PDF and figures to R2
  try {
    uploadPaperArtifacts(paperDir);
  } catch (err) {
    console.warn(`[${paperId}] R2 upload failed (non-fatal):`, err);
  }
}

function main(): void {
  const parsed = parseArgs(process.argv.slice(2));
  const paperDirs = resolvePaperDirs(parsed).filter((dir) => fs.existsSync(dir));
  if (paperDirs.length === 0) {
    console.error('No paper directories found to compile.');
    process.exit(1);
  }

  if (parsed.archiveBeforeCompile) {
    console.log('Running archive step before compile...\n');
    for (const dir of paperDirs) {
      execSync(`npx tsx scripts/paper-archive.ts --paper-dir "${dir}"`, {
        cwd: ROOT_DIR,
        stdio: 'inherit',
      });
    }
  }

  for (const paperDir of paperDirs) {
    compilePaperDir(paperDir);
  }
}

main();
