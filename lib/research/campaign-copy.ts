import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  loadCampaign,
  sha256File,
  verifyCampaign,
  writeJsonAtomic,
} from './campaign-manifest';
import { portableArtifactPath } from './portable-path';

export interface CampaignCopyOptions {
  sourceDir: string;
  destinationDir: string;
  receiptPath?: string;
  receiptBaseDir?: string;
  now?: () => Date;
}

export interface CampaignCopyReceipt {
  schemaVersion: '1.0.0';
  campaignId: string;
  campaignIdentitySha256: string;
  sourceDir: string;
  destinationDir: string;
  sourceManifestSha256: string;
  destinationManifestSha256: string;
  copiedAt: string;
  fileCount: number;
  totalBytes: number;
  readOnlyFileCount: number;
  readOnlyDirectoryCount: number;
  sourceVerified: true;
  destinationVerified: true;
}

function containedBy(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function treeStatistics(root: string): { fileCount: number; totalBytes: number } {
  let fileCount = 0;
  let totalBytes = 0;
  const pending = [root];
  while (pending.length > 0) {
    const directory = pending.pop()!;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        pending.push(absolutePath);
      } else if (entry.isFile()) {
        const stat = fs.statSync(absolutePath);
        fileCount += 1;
        totalBytes += stat.size;
      } else {
        throw new Error(`Campaign copy contains an unsupported filesystem entry: ${absolutePath}`);
      }
    }
  }
  return { fileCount, totalBytes };
}

function makeTreeReadOnly(root: string): {
  readOnlyFileCount: number;
  readOnlyDirectoryCount: number;
} {
  const directories: string[] = [];
  let readOnlyFileCount = 0;
  const pending = [root];
  while (pending.length > 0) {
    const directory = pending.pop()!;
    directories.push(directory);
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        pending.push(absolutePath);
      } else if (entry.isFile()) {
        fs.chmodSync(absolutePath, 0o444);
        readOnlyFileCount += 1;
      }
    }
  }
  directories
    .sort((left, right) => right.length - left.length)
    .forEach(directory => fs.chmodSync(directory, 0o555));
  return {
    readOnlyFileCount,
    readOnlyDirectoryCount: directories.length,
  };
}

export function copyVerifiedCampaign(options: CampaignCopyOptions): CampaignCopyReceipt {
  const sourceDir = path.resolve(options.sourceDir);
  const destinationDir = path.resolve(options.destinationDir);
  if (sourceDir === destinationDir) {
    throw new Error('Campaign copy destination must differ from the source');
  }
  if (containedBy(sourceDir, destinationDir) || containedBy(destinationDir, sourceDir)) {
    throw new Error('Campaign source and destination must not contain one another');
  }
  if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
    throw new Error(`Campaign source directory does not exist: ${sourceDir}`);
  }
  if (fs.existsSync(destinationDir)) {
    throw new Error(`Campaign copy destination already exists: ${destinationDir}`);
  }

  const sourceVerification = verifyCampaign(sourceDir);
  if (!sourceVerification.valid) {
    throw new Error(`Source campaign verification failed: ${sourceVerification.errors.join('; ')}`);
  }
  const sourceManifest = loadCampaign(sourceDir);
  if (sourceManifest.state !== 'verified') {
    throw new Error(`Campaign must be verified before archival copy (state: ${sourceManifest.state})`);
  }

  fs.mkdirSync(path.dirname(destinationDir), { recursive: true });
  fs.cpSync(sourceDir, destinationDir, {
    recursive: true,
    errorOnExist: true,
    force: false,
    preserveTimestamps: true,
  });

  const destinationVerification = verifyCampaign(destinationDir);
  if (!destinationVerification.valid) {
    throw new Error(
      `Copied campaign verification failed: ${destinationVerification.errors.join('; ')}`
    );
  }
  const sourceManifestPath = path.join(sourceDir, 'campaign-manifest.json');
  const destinationManifestPath = path.join(destinationDir, 'campaign-manifest.json');
  const sourceManifestSha256 = sha256File(sourceManifestPath);
  const destinationManifestSha256 = sha256File(destinationManifestPath);
  if (sourceManifestSha256 !== destinationManifestSha256) {
    throw new Error('Copied campaign manifest differs from its source');
  }

  const statistics = treeStatistics(destinationDir);
  const readOnly = makeTreeReadOnly(destinationDir);
  const finalVerification = verifyCampaign(destinationDir);
  if (!finalVerification.valid) {
    throw new Error(
      `Read-only campaign copy verification failed: ${finalVerification.errors.join('; ')}`
    );
  }

  const receipt: CampaignCopyReceipt = {
    schemaVersion: '1.0.0',
    campaignId: sourceManifest.campaignId,
    campaignIdentitySha256: sourceManifest.identitySha256,
    sourceDir: portableArtifactPath(options.receiptBaseDir ?? process.cwd(), sourceDir),
    destinationDir: portableArtifactPath(
      options.receiptBaseDir ?? process.cwd(),
      destinationDir,
    ),
    sourceManifestSha256,
    destinationManifestSha256,
    copiedAt: (options.now ?? (() => new Date()))().toISOString(),
    ...statistics,
    ...readOnly,
    sourceVerified: true,
    destinationVerified: true,
  };
  const receiptPath = path.resolve(
    options.receiptPath ?? `${destinationDir}.copy-receipt.json`
  );
  if (containedBy(destinationDir, receiptPath)) {
    throw new Error('Campaign copy receipt must be stored outside the immutable campaign directory');
  }
  if (fs.existsSync(receiptPath)) {
    throw new Error(`Campaign copy receipt already exists: ${receiptPath}`);
  }
  writeJsonAtomic(receiptPath, receipt);
  return receipt;
}
