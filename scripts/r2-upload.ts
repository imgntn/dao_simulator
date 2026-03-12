/**
 * R2 Upload Utility
 *
 * Uploads files to Cloudflare R2 via the wrangler CLI.
 * Used by paper pipeline scripts to automatically upload generated artifacts.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const R2_BUCKET = 'dao-research-media';
const R2_PREFIX = 'dao-simulator-papers';

export interface UploadResult {
  localPath: string;
  r2Key: string;
  success: boolean;
  error?: string;
}

/**
 * Upload a single file to R2.
 */
export function uploadToR2(localPath: string, r2Key: string): UploadResult {
  if (!fs.existsSync(localPath)) {
    return { localPath, r2Key, success: false, error: `File not found: ${localPath}` };
  }

  try {
    execSync(
      `wrangler r2 object put "${R2_BUCKET}/${r2Key}" --file "${localPath}" --remote`,
      { stdio: 'pipe', timeout: 120_000 }
    );
    return { localPath, r2Key, success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { localPath, r2Key, success: false, error: message };
  }
}

/**
 * Upload a generated PDF to R2 with a versioned key.
 * Key format: dao-simulator-papers/paper/main_2026-03-12.pdf
 */
export function uploadPdf(pdfPath: string, paperDir: string): UploadResult {
  const paperId = path.basename(paperDir);
  const fileName = path.basename(pdfPath, '.pdf');
  const date = new Date().toISOString().slice(0, 10);
  const r2Key = `${R2_PREFIX}/${paperId}/${fileName}_${date}.pdf`;

  console.log(`Uploading ${pdfPath} → r2://${R2_BUCKET}/${r2Key}`);
  const result = uploadToR2(pdfPath, r2Key);

  // Also upload as "latest" (no date suffix)
  const latestKey = `${R2_PREFIX}/${paperId}/${fileName}.pdf`;
  uploadToR2(pdfPath, latestKey);

  return result;
}

/**
 * Upload all PNG figures from a directory to R2.
 */
export function uploadFigures(figuresDir: string, paperDir: string): UploadResult[] {
  if (!fs.existsSync(figuresDir)) return [];

  const paperId = path.basename(paperDir);
  const results: UploadResult[] = [];

  const files = fs.readdirSync(figuresDir).filter((f) => f.endsWith('.png'));
  if (files.length === 0) return [];

  console.log(`Uploading ${files.length} figures from ${figuresDir}...`);
  for (const file of files) {
    const localPath = path.join(figuresDir, file);
    const r2Key = `${R2_PREFIX}/${paperId}/figures/${file}`;
    results.push(uploadToR2(localPath, r2Key));
  }

  const succeeded = results.filter((r) => r.success).length;
  console.log(`Uploaded ${succeeded}/${files.length} figures to R2.`);
  return results;
}

/**
 * Upload all paper artifacts (PDF + figures) after compilation.
 */
export function uploadPaperArtifacts(paperDir: string): void {
  const pdfPath = path.join(paperDir, 'main.pdf');
  const figuresDir = path.join(paperDir, 'figures');

  if (fs.existsSync(pdfPath)) {
    const result = uploadPdf(pdfPath, paperDir);
    if (result.success) {
      console.log(`PDF uploaded to R2.`);
    } else {
      console.warn(`PDF upload failed: ${result.error}`);
    }
  }

  if (fs.existsSync(figuresDir)) {
    uploadFigures(figuresDir, paperDir);
  }
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: tsx scripts/r2-upload.ts <file-or-dir> [r2-key-prefix]');
    console.log('  Upload a file:      tsx scripts/r2-upload.ts paper/main.pdf');
    console.log('  Upload a directory:  tsx scripts/r2-upload.ts paper/figures/');
    process.exit(0);
  }

  const target = path.resolve(args[0]);
  const stats = fs.statSync(target);

  if (stats.isFile()) {
    const key = args[1] || `${R2_PREFIX}/${path.basename(target)}`;
    const result = uploadToR2(target, key);
    console.log(result.success ? `Uploaded: ${result.r2Key}` : `Failed: ${result.error}`);
  } else if (stats.isDirectory()) {
    uploadPaperArtifacts(target);
  }
}
