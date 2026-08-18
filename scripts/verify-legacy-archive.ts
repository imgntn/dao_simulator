#!/usr/bin/env node

import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

interface ArchiveEntry {
  path: string;
  bytes: number;
  sha256: string;
}

interface ArchiveManifest {
  schemaVersion: number;
  archiveName: string;
  fileCount: number;
  totalBytes: number;
  files: ArchiveEntry[];
}

async function hashFile(filePath: string): Promise<string> {
  return createHash('sha256').update(await fs.readFile(filePath)).digest('hex');
}

async function main(): Promise<void> {
  const archiveDir = path.resolve(process.argv[2] ?? '');
  if (!process.argv[2]) throw new Error('Usage: npx tsx scripts/verify-legacy-archive.ts <archive-directory>');
  const manifestPath = path.join(archiveDir, 'archive-manifest.json');
  const manifestContent = (await fs.readFile(manifestPath, 'utf8')).replace(/^\uFEFF/, '');
  const manifest = JSON.parse(manifestContent) as ArchiveManifest;
  if (manifest.schemaVersion !== 1) throw new Error(`Unsupported archive schema: ${manifest.schemaVersion}`);
  if (manifest.fileCount !== manifest.files.length) throw new Error('Manifest file count mismatch');
  const totalBytes = manifest.files.reduce((sum, entry) => sum + entry.bytes, 0);
  if (totalBytes !== manifest.totalBytes) throw new Error('Manifest byte count mismatch');

  const errors: string[] = [];
  const concurrency = 32;
  let cursor = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (cursor < manifest.files.length) {
      const entry = manifest.files[cursor++];
      const filePath = path.resolve(archiveDir, entry.path);
      if (!filePath.startsWith(`${archiveDir}${path.sep}`)) {
        errors.push(`Path escapes archive: ${entry.path}`);
        continue;
      }
      try {
        const stat = await fs.stat(filePath);
        if (stat.size !== entry.bytes) errors.push(`Size mismatch: ${entry.path}`);
        if (await hashFile(filePath) !== entry.sha256) errors.push(`Hash mismatch: ${entry.path}`);
      } catch (error) {
        errors.push(`Unreadable file ${entry.path}: ${(error as Error).message}`);
      }
    }
  });
  await Promise.all(workers);
  if (errors.length > 0) throw new Error(`Archive verification failed:\n${errors.join('\n')}`);
  console.log(`Archive verified: ${manifest.archiveName} (${manifest.fileCount} files, ${manifest.totalBytes} bytes)`);
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exitCode = 1;
});
