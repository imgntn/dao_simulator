import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { copyVerifiedCampaign } from '../lib/research/campaign-copy';
import {
  createCampaign,
  transitionCampaign,
  verifyCampaign,
} from '../lib/research/campaign-manifest';

const temporaryRoots: string[] = [];

function makeTreeWritable(root: string): void {
  if (!fs.existsSync(root)) return;
  const pending = [root];
  while (pending.length > 0) {
    const directory = pending.pop()!;
    fs.chmodSync(directory, 0o755);
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        pending.push(absolutePath);
      } else if (entry.isFile()) {
        fs.chmodSync(absolutePath, 0o644);
      }
    }
  }
}

function createVerifiedCampaign(): {
  temporaryRoot: string;
  campaignDir: string;
} {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dao-campaign-copy-'));
  temporaryRoots.push(temporaryRoot);
  const repositoryRoot = path.resolve(__dirname, '..');
  const campaignId = `copy-fixture-${path.basename(temporaryRoot).toLowerCase()}`;
  createCampaign({
    rootDir: repositoryRoot,
    outputRootDir: temporaryRoot,
    campaignId,
    resolvedConfig: { schemaVersion: '1.0.0', campaignId, experiments: [] },
    expectedRuns: 0,
    workerCount: 1,
    allowDirty: true,
    command: ['test'],
  });
  const campaignDir = path.join(temporaryRoot, 'campaigns', campaignId);
  transitionCampaign(campaignDir, 'validating');
  transitionCampaign(campaignDir, 'running');
  transitionCampaign(campaignDir, 'completed');
  transitionCampaign(campaignDir, 'verified');
  return { temporaryRoot, campaignDir };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    makeTreeWritable(root);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('copyVerifiedCampaign', () => {
  it('creates a verified immutable copy and an external receipt', () => {
    const { temporaryRoot, campaignDir } = createVerifiedCampaign();
    const destinationDir = path.join(temporaryRoot, 'archive', 'campaign-copy');
    const receipt = copyVerifiedCampaign({
      sourceDir: campaignDir,
      destinationDir,
      now: () => new Date('2026-07-17T00:00:00.000Z'),
    });

    expect(receipt.sourceVerified).toBe(true);
    expect(receipt.destinationVerified).toBe(true);
    expect(receipt.sourceManifestSha256).toBe(receipt.destinationManifestSha256);
    expect(receipt.fileCount).toBeGreaterThanOrEqual(2);
    expect(receipt.readOnlyFileCount).toBe(receipt.fileCount);
    expect(receipt.sourceDir).toMatch(/^external\//);
    expect(receipt.destinationDir).toBe('external/campaign-copy');
    expect(JSON.stringify(receipt)).not.toContain(temporaryRoot);
    expect(verifyCampaign(destinationDir)).toEqual({ valid: true, errors: [] });
    expect(fs.existsSync(`${destinationDir}.copy-receipt.json`)).toBe(true);
  });

  it('rejects an existing or nested destination', () => {
    const { temporaryRoot, campaignDir } = createVerifiedCampaign();
    expect(() => copyVerifiedCampaign({
      sourceDir: campaignDir,
      destinationDir: path.join(campaignDir, 'nested'),
    })).toThrow(/must not contain/);
    expect(() => copyVerifiedCampaign({
      sourceDir: campaignDir,
      destinationDir: temporaryRoot,
    })).toThrow(/must not contain/);
  });
});
