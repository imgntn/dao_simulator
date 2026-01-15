/**
 * Paper Archive Script
 * Archives the current paper PDF and source files before generating a new version
 */

import * as fs from 'fs';
import * as path from 'path';

const PAPER_DIR = path.join(process.cwd(), 'paper');
const ARCHIVE_DIR = path.join(PAPER_DIR, 'archive');

function getTimestamp(): string {
  const now = new Date();
  return now.toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19);
}

function ensureArchiveDir(): void {
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  }
}

function getVersionNumber(): number {
  // Count existing archives to determine version number
  const files = fs.readdirSync(ARCHIVE_DIR);
  const pdfFiles = files.filter(f => f.endsWith('.pdf'));
  return pdfFiles.length + 1;
}

function archivePDF(): void {
  const pdfPath = path.join(PAPER_DIR, 'main.pdf');

  if (!fs.existsSync(pdfPath)) {
    console.log('No existing PDF to archive');
    return;
  }

  ensureArchiveDir();

  const timestamp = getTimestamp();
  const version = getVersionNumber();
  const archiveName = `dao-governance-paper_v${version.toString().padStart(3, '0')}_${timestamp}.pdf`;
  const archivePath = path.join(ARCHIVE_DIR, archiveName);

  fs.copyFileSync(pdfPath, archivePath);

  const stats = fs.statSync(archivePath);
  const sizeKB = Math.round(stats.size / 1024);

  console.log(`Archived: ${archiveName} (${sizeKB}KB)`);
}

function archiveSourceBundle(): void {
  // Optionally create a snapshot of the .tex sources
  const timestamp = getTimestamp();
  const version = getVersionNumber();
  const bundleDir = path.join(ARCHIVE_DIR, `source_v${version.toString().padStart(3, '0')}_${timestamp}`);

  // Only archive sources if --with-source flag is passed
  if (!process.argv.includes('--with-source')) {
    return;
  }

  fs.mkdirSync(bundleDir, { recursive: true });

  // Copy main.tex
  const mainTex = path.join(PAPER_DIR, 'main.tex');
  if (fs.existsSync(mainTex)) {
    fs.copyFileSync(mainTex, path.join(bundleDir, 'main.tex'));
  }

  // Copy sections
  const sectionsDir = path.join(PAPER_DIR, 'sections');
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

  console.log(`Archived source bundle: source_v${version.toString().padStart(3, '0')}_${timestamp}/`);
}

function listArchives(): void {
  if (!fs.existsSync(ARCHIVE_DIR)) {
    console.log('No archives found');
    return;
  }

  const files = fs.readdirSync(ARCHIVE_DIR)
    .filter(f => f.endsWith('.pdf'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log('No archived PDFs found');
    return;
  }

  console.log('\n=== Paper Archive ===\n');
  for (const file of files) {
    const filePath = path.join(ARCHIVE_DIR, file);
    const stats = fs.statSync(filePath);
    const sizeKB = Math.round(stats.size / 1024);
    const date = stats.mtime.toLocaleDateString();
    console.log(`  ${file} (${sizeKB}KB) - ${date}`);
  }
  console.log(`\nTotal: ${files.length} versions archived`);
}

// Main
if (process.argv.includes('--list')) {
  listArchives();
} else {
  console.log('=== Archiving Previous Paper Version ===\n');
  archivePDF();
  archiveSourceBundle();
}
