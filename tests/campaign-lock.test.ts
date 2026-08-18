import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { acquireCampaignExecutionLock } from '../lib/research/campaign-lock';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function temporaryRoot(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dao-campaign-lock-'));
  temporaryDirectories.push(directory);
  return directory;
}

describe('campaign execution lock', () => {
  it('rejects a second live controller and permits a later owner after release', () => {
    const root = temporaryRoot();
    const first = acquireCampaignExecutionLock(root, 'campaign-1', () => true);
    expect(first.path).toBe(path.join(
      root,
      'campaigns',
      '.campaign-locks',
      'campaign-1.lock.json',
    ));
    expect(() => acquireCampaignExecutionLock(root, 'campaign-1', () => true))
      .toThrow('already running');
    first.release();

    const second = acquireCampaignExecutionLock(root, 'campaign-1', () => true);
    expect(fs.existsSync(second.path)).toBe(true);
    second.release();
    expect(fs.existsSync(second.path)).toBe(false);
  });

  it('atomically replaces a stale lock', () => {
    const root = temporaryRoot();
    const lockDirectory = path.join(root, 'campaigns', '.campaign-locks');
    const lockPath = path.join(lockDirectory, 'campaign-2.lock.json');
    fs.mkdirSync(lockDirectory, { recursive: true });
    fs.writeFileSync(lockPath, JSON.stringify({
      schemaVersion: '1.0.0',
      campaignId: 'campaign-2',
      pid: 999_999_999,
      token: 'stale',
      acquiredAt: '2026-01-01T00:00:00.000Z',
    }));

    const acquired = acquireCampaignExecutionLock(root, 'campaign-2', () => false);
    const current = JSON.parse(fs.readFileSync(lockPath, 'utf8')) as { token: string };
    expect(current.token).not.toBe('stale');
    acquired.release();
  });

  it('rejects path-like campaign identifiers', () => {
    expect(() => acquireCampaignExecutionLock(temporaryRoot(), '../escape'))
      .toThrow('Invalid campaign ID');
  });
});
