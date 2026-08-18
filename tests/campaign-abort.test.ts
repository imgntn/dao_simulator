import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { abortCampaign } from '../lib/research/campaign-abort';
import {
  createCampaign,
  loadCampaign,
  transitionCampaign,
  verifyCampaign,
} from '../lib/research/campaign-manifest';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('campaign abort', () => {
  it('records a hashed diagnostic before transitioning an active campaign to failed', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dao-campaign-abort-'));
    temporaryDirectories.push(root);
    createCampaign({
      rootDir: process.cwd(),
      outputRootDir: root,
      campaignId: 'aborted-fixture',
      resolvedConfig: { experiments: [] },
      expectedRuns: 1,
      workerCount: 1,
      allowDirty: true,
      command: ['fixture'],
    });
    const campaignDir = path.join(root, 'campaigns', 'aborted-fixture');
    transitionCampaign(campaignDir, 'validating');
    transitionCampaign(campaignDir, 'running');

    const report = abortCampaign(campaignDir, 'A frozen design assumption was invalid.');
    const campaign = loadCampaign(campaignDir);
    expect(report.previousState).toBe('running');
    expect(campaign.state).toBe('failed');
    expect(campaign.artifacts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'campaign-abort',
        path: 'diagnostics/campaign-abort.json',
      }),
    ]));
    expect(verifyCampaign(campaignDir).valid).toBe(true);
    expect(() => abortCampaign(campaignDir, 'again')).toThrow('already failed');
  });
});
