import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import {
  createCampaign,
  indexCampaignArtifact,
  indexRunArtifact,
  transitionCampaign,
} from '../lib/research/campaign-manifest';
import {
  listCampaignRunMetadata,
  listCampaignEvidence,
  readVerifiedCampaignRun,
} from '../lib/research/campaign-evidence';

describe('campaign Evidence source', () => {
  it('lists immutable manifests, condition counts, verification, analyses, and claims', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-evidence-'));
    const artifactRoot = path.join(root, 'artifacts');
    fs.mkdirSync(artifactRoot);
    fs.writeFileSync(path.join(artifactRoot, 'package.json'), '{"version":"1.0.0"}');
    fs.writeFileSync(path.join(artifactRoot, 'package-lock.json'), '{"lockfileVersion":3}');
    execFileSync('git', ['init', '-q'], { cwd: artifactRoot });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: artifactRoot });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: artifactRoot });
    execFileSync('git', ['add', '.'], { cwd: artifactRoot });
    execFileSync('git', ['commit', '-qm', 'fixture'], { cwd: artifactRoot });
    const campaignDir = path.join(artifactRoot, 'campaigns', 'pilot-1');
    createCampaign({
      rootDir: artifactRoot,
      campaignId: 'pilot-1',
      resolvedConfig: { experiment: 'rq1' },
      expectedRuns: 1,
      workerCount: 1,
      command: ['test'],
    });
    transitionCampaign(campaignDir, 'validating');
    transitionCampaign(campaignDir, 'running');
    const runPath = path.join(campaignDir, 'runs', 'run-1.json');
    fs.mkdirSync(path.dirname(runPath), { recursive: true });
    fs.writeFileSync(runPath, '{"ok":true}', 'utf8');
    indexRunArtifact(campaignDir, {
      runId: 'run-1',
      experimentId: 'rq1',
      conditionId: 'control',
      replicateIndex: 0,
      seed: 42,
      path: 'runs/run-1.json',
    });
    fs.mkdirSync(path.join(campaignDir, 'analysis'), { recursive: true });
    fs.writeFileSync(
      path.join(campaignDir, 'analysis', 'analysis.json'),
      JSON.stringify({ schemaVersion: 1 }),
      'utf8',
    );
    fs.writeFileSync(path.join(campaignDir, 'claims.json'), '[]', 'utf8');
    indexCampaignArtifact(campaignDir, {
      id: 'campaign-analysis',
      kind: 'analysis',
      path: 'analysis/analysis.json',
    });
    indexCampaignArtifact(campaignDir, {
      id: 'claim-registry',
      kind: 'claim-registry',
      path: 'claims.json',
    });
    transitionCampaign(campaignDir, 'completed');
    transitionCampaign(campaignDir, 'verified');

    const listed = listCampaignEvidence(root, { verify: true });
    expect(listed).toHaveLength(1);
    expect(listed[0].verification?.valid).toBe(true);
    expect(listed[0].conditionCounts).toEqual({ control: 1 });
    expect(listed[0].analysis).toEqual({ schemaVersion: 1 });
    expect(listed[0].claims).toEqual([]);
    expect(listed[0].runMetadataOmitted).toBe(false);
    expect(listed[0].totalRunMetadata).toBe(1);
    const compact = listCampaignEvidence(root, { includeRuns: false });
    expect(compact[0].manifest.runs).toEqual([]);
    expect(compact[0].conditionCounts).toEqual({ control: 1 });
    expect(compact[0].totalRunMetadata).toBe(1);
    expect(listCampaignEvidence(root, { campaignId: 'absent' })).toEqual([]);
    expect(listCampaignEvidence(root, { campaignId: 'pilot-1' })).toHaveLength(1);
    expect(listCampaignRunMetadata(root, 'pilot-1', { query: '42' })).toMatchObject({
      campaignId: 'pilot-1',
      total: 1,
      runs: [expect.objectContaining({ runId: 'run-1', seed: 42 })],
    });
    expect(listCampaignRunMetadata(root, 'pilot-1', { query: 'absent' }).total).toBe(0);
    expect(() => listCampaignRunMetadata(root, 'pilot-1', { limit: 201 }))
      .toThrow('Run limit must be an integer from 1 to 200');
    expect(readVerifiedCampaignRun(root, 'pilot-1', 'run-1')).toEqual({ ok: true });
    expect(() => readVerifiedCampaignRun(root, 'pilot-1', 'missing'))
      .toThrow('Run not found');
  });
});
