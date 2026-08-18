import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import {
  copyFileAtomic,
  canonicalJson,
  collectProvenance,
  createCampaign,
  indexRunArtifact,
  indexRunArtifacts,
  indexCampaignArtifact,
  loadCampaign,
  recordFailedRun,
  resolveFailedRun,
  renameAtomicWithRetry,
  assertResumeIdentity,
  sha256,
  transitionCampaign,
  verifyCampaign,
} from '../lib/research/campaign-manifest';

function fixtureRepo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-manifest-'));
  fs.writeFileSync(path.join(root, 'package.json'), '{"version":"1.2.3"}');
  fs.writeFileSync(path.join(root, 'package-lock.json'), '{"lockfileVersion":3}');
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['commit', '-qm', 'fixture'], { cwd: root });
  return root;
}

describe('campaign manifests', () => {
  it('canonicalizes object keys and hashes deterministically', () => {
    expect(canonicalJson({ b: 2, a: { d: 4, c: 3 } }))
      .toBe('{"a":{"c":3,"d":4},"b":2}');
    expect(sha256(canonicalJson({ b: 2, a: 1 })))
      .toBe(sha256(canonicalJson({ a: 1, b: 2 })));
  });

  it('copies campaign inputs atomically without changing their bytes', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-copy-'));
    const source = path.join(root, 'source.bin');
    const destination = path.join(root, 'nested', 'destination.bin');
    const bytes = Buffer.from([0, 1, 2, 127, 128, 255]);
    fs.writeFileSync(source, bytes);
    copyFileAtomic(source, destination);
    expect(fs.readFileSync(destination)).toEqual(bytes);
    expect(
      fs.readdirSync(path.dirname(destination)).filter(name => name.endsWith('.tmp')),
    ).toEqual([]);
  });

  it('retries transient Windows atomic-rename failures without leaving temp files', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-rename-retry-'));
    const destination = path.join(root, 'manifest.json');
    const temporary = path.join(root, 'manifest.json.tmp');
    fs.writeFileSync(temporary, '{"state":"verified"}\n');
    let attempts = 0;
    const transientRename: typeof fs.renameSync = (source, target) => {
      attempts++;
      if (attempts < 3) {
        const error = new Error('transient file lock') as NodeJS.ErrnoException;
        error.code = 'EPERM';
        throw error;
      }
      fs.renameSync(source, target);
    };
    renameAtomicWithRetry(temporary, destination, transientRename);

    expect(attempts).toBe(3);
    expect(JSON.parse(fs.readFileSync(destination, 'utf8'))).toEqual({ state: 'verified' });
    expect(fs.readdirSync(root).filter(name => name.endsWith('.tmp'))).toEqual([]);
  });

  it('creates and verifies a clean immutable campaign identity', () => {
    const root = fixtureRepo();
    const manifest = createCampaign({
      rootDir: root,
      campaignId: '2026-07-17-test',
      resolvedConfig: { runs: 2, condition: 'baseline' },
      expectedRuns: 2,
      workerCount: 1,
    });
    expect(manifest.provenance.packageVersion).toBe('1.2.3');
    expect(manifest.provenance.gitDirty).toBe(false);
    expect(verifyCampaign(path.join(root, 'campaigns', manifest.campaignId))).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('binds archived input artifacts to provenance in schema 4 campaigns', () => {
    const root = fixtureRepo();
    const inputPath = path.join(root, 'input.json');
    fs.writeFileSync(inputPath, '{"value":1}\n');
    execFileSync('git', ['add', '.'], { cwd: root });
    execFileSync('git', ['commit', '-qm', 'input'], { cwd: root });
    const manifest = createCampaign({
      rootDir: root,
      campaignId: '2026-07-17-input-binding',
      resolvedConfig: { runs: 0 },
      expectedRuns: 0,
      workerCount: 1,
      inputFiles: { calibrationBaseline: 'input.json' },
    });
    const campaignDir = path.join(root, 'campaigns', manifest.campaignId);
    expect(verifyCampaign(campaignDir).errors).toContain(
      'Campaign input is not archived: calibrationBaseline',
    );

    const archivedPath = path.join(campaignDir, 'inputs', 'calibrationBaseline', 'input.json');
    copyFileAtomic(inputPath, archivedPath);
    indexCampaignArtifact(campaignDir, {
      id: 'input:calibrationBaseline',
      kind: 'input',
      path: 'inputs/calibrationBaseline/input.json',
    });
    expect(verifyCampaign(campaignDir)).toEqual({ valid: true, errors: [] });
  });

  it('refuses dirty research execution by default', () => {
    const root = fixtureRepo();
    fs.writeFileSync(path.join(root, 'dirty.txt'), 'dirty');
    expect(() => createCampaign({
      rootDir: root,
      campaignId: 'dirty-test',
      resolvedConfig: {},
      expectedRuns: 1,
      workerCount: 1,
    })).toThrow(/clean Git worktree/);
  });

  it('refuses to overwrite an existing campaign', () => {
    const root = fixtureRepo();
    const options = {
      rootDir: root,
      campaignId: 'immutable-test',
      resolvedConfig: {},
      expectedRuns: 0,
      workerCount: 1,
    };
    createCampaign(options);
    expect(() => createCampaign(options)).toThrow(/already exists/);
  });

  it('indexes and verifies immutable run artifacts through the lifecycle', () => {
    const root = fixtureRepo();
    const manifest = createCampaign({
      rootDir: root,
      campaignId: 'lifecycle-test',
      resolvedConfig: { conditions: ['baseline'] },
      expectedRuns: 1,
      workerCount: 1,
    });
    const campaignDir = path.join(root, 'campaigns', manifest.campaignId);
    transitionCampaign(campaignDir, 'validating');
    transitionCampaign(campaignDir, 'running');
    const runPath = path.join(campaignDir, 'experiments', 'baseline', 'runs', 'run-0.json');
    fs.mkdirSync(path.dirname(runPath), { recursive: true });
    fs.writeFileSync(runPath, '{"metric":1}\n');
    indexRunArtifact(campaignDir, {
      runId: 'run-0',
      experimentId: 'baseline',
      conditionId: 'control',
      replicateIndex: 0,
      seed: 42,
      path: path.relative(campaignDir, runPath),
    });
    transitionCampaign(campaignDir, 'completed');
    transitionCampaign(campaignDir, 'verified');

    expect(loadCampaign(campaignDir).state).toBe('verified');
    expect(verifyCampaign(campaignDir)).toEqual({ valid: true, errors: [] });
  });

  it('prevents completion when failures or missing runs exist', () => {
    const root = fixtureRepo();
    const manifest = createCampaign({
      rootDir: root,
      campaignId: 'failed-accounting',
      resolvedConfig: {},
      expectedRuns: 1,
      workerCount: 1,
    });
    const campaignDir = path.join(root, 'campaigns', manifest.campaignId);
    transitionCampaign(campaignDir, 'validating');
    transitionCampaign(campaignDir, 'running');
    recordFailedRun(campaignDir);
    expect(() => transitionCampaign(campaignDir, 'completed')).toThrow(/exact successful run accounting/);
  }, 15_000);

  it('allows an explicit identity-matched retry to resolve failed-run accounting', () => {
    const root = fixtureRepo();
    const options = {
      rootDir: root,
      campaignId: 'retry-accounting',
      resolvedConfig: { profile: 'fixture' },
      expectedRuns: 1,
      workerCount: 1,
      command: ['node', 'campaign', '--campaign-id', 'retry-accounting'],
    };
    const originalProvenance = collectProvenance(options);
    const manifest = createCampaign(options);
    const campaignDir = path.join(root, 'campaigns', manifest.campaignId);
    transitionCampaign(campaignDir, 'validating');
    transitionCampaign(campaignDir, 'running');
    recordFailedRun(campaignDir, { runId: 'run-0', experimentId: 'experiment' });
    transitionCampaign(campaignDir, 'partial');
    transitionCampaign(campaignDir, 'failed');

    expect(assertResumeIdentity(campaignDir, originalProvenance).campaignId)
      .toBe('retry-accounting');
    transitionCampaign(campaignDir, 'running');
    resolveFailedRun(campaignDir, 'run-0');

    expect(loadCampaign(campaignDir).accounting).toEqual({
      expected: 1,
      attempted: 0,
      completed: 0,
      skipped: 0,
      failed: 0,
    });
  });

  it('verifies every indexed run against the resolved condition and seed plan', () => {
    const root = fixtureRepo();
    const manifest = createCampaign({
      rootDir: root,
      campaignId: 'resolved-plan-test',
      resolvedConfig: {
        schemaVersion: '1.1.0',
        experiments: [{
          experimentId: 'experiment',
          tasks: [{
            runId: 'run-0',
            conditionId: 'condition-a',
            replicateIndex: 0,
            seed: 42,
          }],
        }],
      },
      expectedRuns: 1,
      workerCount: 1,
    });
    const campaignDir = path.join(root, 'campaigns', manifest.campaignId);
    transitionCampaign(campaignDir, 'validating');
    transitionCampaign(campaignDir, 'running');
    fs.writeFileSync(path.join(campaignDir, 'run.json'), '{"value":1}');
    indexRunArtifact(campaignDir, {
      runId: 'run-0',
      experimentId: 'experiment',
      conditionId: 'condition-b',
      replicateIndex: 0,
      seed: 42,
      path: 'run.json',
    });

    expect(verifyCampaign(campaignDir).errors)
      .toContain('Condition mismatch for planned run: run-0');
  });

  it('detects run artifact tampering', () => {
    const root = fixtureRepo();
    const manifest = createCampaign({
      rootDir: root,
      campaignId: 'tamper-test',
      resolvedConfig: {},
      expectedRuns: 1,
      workerCount: 1,
    });
    const campaignDir = path.join(root, 'campaigns', manifest.campaignId);
    transitionCampaign(campaignDir, 'validating');
    transitionCampaign(campaignDir, 'running');
    const runPath = path.join(campaignDir, 'run.json');
    fs.writeFileSync(runPath, '{"value":1}');
    indexRunArtifact(campaignDir, {
      runId: 'run',
      experimentId: 'experiment',
      conditionId: 'condition',
      replicateIndex: 0,
      seed: 1,
      path: 'run.json',
    });
    fs.writeFileSync(runPath, '{"value":2}');
    expect(verifyCampaign(campaignDir).errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/hash mismatch/)])
    );
  });

  it('detects stale unindexed run files', () => {
    const root = fixtureRepo();
    const manifest = createCampaign({
      rootDir: root,
      campaignId: 'stale-run-test',
      resolvedConfig: {},
      expectedRuns: 0,
      workerCount: 1,
    });
    const campaignDir = path.join(root, 'campaigns', manifest.campaignId);
    const stalePath = path.join(campaignDir, 'experiments', 'exp', 'runs', 'stale.json');
    fs.mkdirSync(path.dirname(stalePath), { recursive: true });
    fs.writeFileSync(stalePath, '{}');
    expect(verifyCampaign(campaignDir).errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/Unexpected unindexed run artifact/)])
    );
  });

  it('supports a separate immutable artifact root and verifies indexed non-run artifacts', () => {
    const root = fixtureRepo();
    const artifactRoot = path.join(root, 'artifacts');
    const manifest = createCampaign({
      rootDir: root,
      outputRootDir: artifactRoot,
      campaignId: 'artifact-root-test',
      resolvedConfig: { profile: 'pilot' },
      expectedRuns: 2,
      workerCount: 1,
    });
    const campaignDir = path.join(artifactRoot, 'campaigns', manifest.campaignId);
    transitionCampaign(campaignDir, 'validating');
    transitionCampaign(campaignDir, 'running');
    const runDir = path.join(campaignDir, 'experiments', 'pilot', 'runs');
    fs.mkdirSync(runDir, { recursive: true });
    fs.writeFileSync(path.join(runDir, 'one.json'), '{"value":1}\n');
    fs.writeFileSync(path.join(runDir, 'two.json'), '{"value":2}\n');
    indexRunArtifacts(campaignDir, [
      {
        runId: 'one',
        experimentId: 'pilot',
        conditionId: 'control',
        replicateIndex: 0,
        seed: 1,
        path: path.relative(campaignDir, path.join(runDir, 'one.json')),
      },
      {
        runId: 'two',
        experimentId: 'pilot',
        conditionId: 'control',
        replicateIndex: 1,
        seed: 2,
        path: path.relative(campaignDir, path.join(runDir, 'two.json')),
      },
    ]);
    const analysisPath = path.join(campaignDir, 'analysis', 'effects.json');
    fs.mkdirSync(path.dirname(analysisPath), { recursive: true });
    fs.writeFileSync(analysisPath, '{"effect":0.2}\n');
    indexCampaignArtifact(campaignDir, {
      id: 'pilot-effects',
      kind: 'analysis',
      path: path.relative(campaignDir, analysisPath),
    });
    transitionCampaign(campaignDir, 'completed');
    transitionCampaign(campaignDir, 'verified');
    expect(verifyCampaign(campaignDir)).toEqual({ valid: true, errors: [] });
  });
});
