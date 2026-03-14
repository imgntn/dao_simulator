/**
 * Paper Archive Script
 * Archives paper PDFs and optional source bundles for paper profiles.
 */

import * as fs from 'fs';
import * as path from 'path';
import { uploadToR2 } from './r2-upload';

type ProfileArg = 'full' | 'p1' | 'p2' | 'llm';

interface ParsedArgs {
  list: boolean;
  withSource: boolean;
  profile: ProfileArg;
  paperDirs: string[];
}

function getTimestamp(): string {
  const now = new Date();
  return now.toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19);
}

const VALID_PROFILES: ProfileArg[] = ['full', 'p1', 'p2', 'llm'];

function parseArgs(args: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    list: false,
    withSource: false,
    profile: 'full',
    paperDirs: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--list') {
      parsed.list = true;
    } else if (arg === '--with-source') {
      parsed.withSource = true;
    } else if (arg === '--profile') {
      const value = args[i + 1] as string | undefined;
      if (value && (VALID_PROFILES as string[]).includes(value)) {
        parsed.profile = value as ProfileArg;
      } else if (value) {
        console.warn(`[paper-archive] Unknown profile '${value}', using default 'full'. Valid: ${VALID_PROFILES.join(', ')}`);
      }
      i++;
    } else if (arg.startsWith('--profile=')) {
      const value = arg.split('=')[1] as string | undefined;
      if (value && (VALID_PROFILES as string[]).includes(value)) {
        parsed.profile = value as ProfileArg;
      } else if (value) {
        console.warn(`[paper-archive] Unknown profile '${value}', using default 'full'. Valid: ${VALID_PROFILES.join(', ')}`);
      }
    } else if (arg === '--paper-dir') {
      const value = args[i + 1];
      if (value) parsed.paperDirs.push(value);
      i++;
    } else if (arg.startsWith('--paper-dir=')) {
      const value = arg.split('=')[1];
      if (value) parsed.paperDirs.push(value);
    }
  }

  return parsed;
}

function resolvePaperDirs(rootDir: string, parsed: ParsedArgs): string[] {
  if (parsed.paperDirs.length > 0) {
    return parsed.paperDirs.map((dir) => (
      path.isAbsolute(dir) ? dir : path.resolve(rootDir, dir)
    ));
  }

  return [path.join(rootDir, 'paper')];
}

function ensureArchiveDir(archiveDir: string): void {
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }
}

function getVersionNumber(archiveDir: string): number {
  if (!fs.existsSync(archiveDir)) {
    return 1;
  }

  // Count existing archives to determine version number
  const files = fs.readdirSync(archiveDir);
  const pdfFiles = files.filter(f => f.endsWith('.pdf'));
  return pdfFiles.length + 1;
}

/**
 * Archive a paper PDF and optionally its source bundle.
 * Returns the version number used so the source bundle can share it.
 */
function archivePDF(paperDir: string): number {
  const archiveDir = path.join(paperDir, 'archive');
  const pdfPath = path.join(paperDir, 'main.pdf');
  const paperId = path.basename(paperDir);

  if (!fs.existsSync(pdfPath)) {
    console.log(`[${paperId}] No existing PDF to archive`);
    return 0;
  }

  ensureArchiveDir(archiveDir);

  const timestamp = getTimestamp();
  const version = getVersionNumber(archiveDir);
  const archiveName = `dao-governance-${paperId}_v${version.toString().padStart(3, '0')}_${timestamp}.pdf`;
  const archivePath = path.join(archiveDir, archiveName);

  fs.copyFileSync(pdfPath, archivePath);

  const stats = fs.statSync(archivePath);
  const sizeKB = Math.round(stats.size / 1024);

  console.log(`[${paperId}] Archived: ${archiveName} (${sizeKB}KB)`);

  // Upload archived version to R2
  try {
    const r2Key = `dao-simulator-papers/${paperId}/archive/${archiveName}`;
    const result = uploadToR2(archivePath, r2Key);
    if (result.success) {
      console.log(`[${paperId}] Uploaded archive to R2: ${r2Key}`);
    } else {
      console.warn(`[${paperId}] R2 upload failed (non-fatal): ${result.error}`);
    }
  } catch {
    // Non-fatal — local archive is the primary copy
  }

  return version;
}

function archiveSourceBundle(paperDir: string, version: number): void {
  const archiveDir = path.join(paperDir, 'archive');
  const paperId = path.basename(paperDir);

  const timestamp = getTimestamp();
  const bundleDir = path.join(archiveDir, `source_${paperId}_v${version.toString().padStart(3, '0')}_${timestamp}`);

  ensureArchiveDir(archiveDir);
  fs.mkdirSync(bundleDir, { recursive: true });

  // Copy main.tex
  const mainTex = path.join(paperDir, 'main.tex');
  if (fs.existsSync(mainTex)) {
    fs.copyFileSync(mainTex, path.join(bundleDir, 'main.tex'));
  }

  // Copy sections
  const sectionsDir = path.join(paperDir, 'sections');
  const bundleSectionsDir = path.join(bundleDir, 'sections');
  if (fs.existsSync(sectionsDir)) {
    fs.mkdirSync(bundleSectionsDir, { recursive: true });
    const sections = fs.readdirSync(sectionsDir).filter(f => f.endsWith('.tex'));
    for (const section of sections) {
      fs.copyFileSync(
        path.join(sectionsDir, section),
        path.join(bundleSectionsDir, section)
      );
    }
  }

  console.log(`[${paperId}] Archived source bundle: ${path.basename(bundleDir)}/`);
}

function listArchives(paperDir: string): void {
  const archiveDir = path.join(paperDir, 'archive');
  const paperId = path.basename(paperDir);

  if (!fs.existsSync(archiveDir)) {
    console.log(`[${paperId}] No archives found`);
    return;
  }

  const files = fs.readdirSync(archiveDir)
    .filter(f => f.endsWith('.pdf'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log(`[${paperId}] No archived PDFs found`);
    return;
  }

  console.log(`\n=== Paper Archive (${paperId}) ===\n`);
  for (const file of files) {
    const filePath = path.join(archiveDir, file);
    const stats = fs.statSync(filePath);
    const sizeKB = Math.round(stats.size / 1024);
    const date = stats.mtime.toLocaleDateString();
    console.log(`  ${file} (${sizeKB}KB) - ${date}`);
  }
  console.log(`\nTotal: ${files.length} versions archived for ${paperId}`);
}

// Main
const rootDir = process.cwd();
const parsed = parseArgs(process.argv.slice(2));
const paperDirs = resolvePaperDirs(rootDir, parsed).filter((dir) => fs.existsSync(dir));

if (paperDirs.length === 0) {
  console.error('No paper directories found to archive.');
  process.exit(1);
}

if (parsed.list) {
  for (const paperDir of paperDirs) {
    listArchives(paperDir);
  }
} else {
  console.log('=== Archiving Previous Paper Version(s) ===\n');
  for (const paperDir of paperDirs) {
    const version = archivePDF(paperDir);
    if (parsed.withSource && version > 0) {
      archiveSourceBundle(paperDir, version);
    }
  }
}
