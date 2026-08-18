import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

interface CampaignLockRecord {
  schemaVersion: '1.0.0';
  campaignId: string;
  pid: number;
  token: string;
  acquiredAt: string;
}

export interface CampaignExecutionLock {
  path: string;
  release: () => void;
}

const CAMPAIGN_ID_PATTERN = /^[a-z0-9][a-z0-9._-]+$/i;

export function acquireCampaignExecutionLock(
  artifactRoot: string,
  campaignId: string,
  processIsAlive: (pid: number) => boolean = defaultProcessIsAlive,
): CampaignExecutionLock {
  if (!CAMPAIGN_ID_PATTERN.test(campaignId)) {
    throw new Error(`Invalid campaign ID: ${campaignId}`);
  }
  // Keep operational locks beside the immutable campaign directories. The
  // repository ignores this whole subtree, so acquiring a lock cannot make a
  // clean worktree appear dirty during provenance capture.
  const lockDirectory = path.join(
    path.resolve(artifactRoot),
    'campaigns',
    '.campaign-locks',
  );
  const lockPath = path.join(lockDirectory, `${campaignId}.lock.json`);
  fs.mkdirSync(lockDirectory, { recursive: true });

  const token = randomUUID();
  const record: CampaignLockRecord = {
    schemaVersion: '1.0.0',
    campaignId,
    pid: process.pid,
    token,
    acquiredAt: new Date().toISOString(),
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const descriptor = fs.openSync(lockPath, 'wx');
      try {
        fs.writeFileSync(descriptor, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
        fs.fsyncSync(descriptor);
      } finally {
        fs.closeSync(descriptor);
      }
      return {
        path: lockPath,
        release: () => releaseOwnedLock(lockPath, token),
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const existing = readLock(lockPath);
      if (existing && processIsAlive(existing.pid)) {
        throw new Error(
          `Campaign ${campaignId} is already running under process ${existing.pid}`,
        );
      }

      const stalePath = `${lockPath}.stale-${token}-${attempt}`;
      try {
        fs.renameSync(lockPath, stalePath);
        fs.unlinkSync(stalePath);
      } catch (renameError) {
        const code = (renameError as NodeJS.ErrnoException).code;
        if (code !== 'ENOENT' && code !== 'EACCES' && code !== 'EPERM') {
          throw renameError;
        }
      }
    }
  }
  throw new Error(`Could not acquire campaign execution lock: ${campaignId}`);
}

function readLock(lockPath: string): CampaignLockRecord | null {
  try {
    const value = JSON.parse(fs.readFileSync(lockPath, 'utf8')) as CampaignLockRecord;
    return (
      value.schemaVersion === '1.0.0'
      && typeof value.pid === 'number'
      && Number.isSafeInteger(value.pid)
      && value.pid > 0
      && typeof value.token === 'string'
    ) ? value : null;
  } catch {
    return null;
  }
}

function releaseOwnedLock(lockPath: string, token: string): void {
  const existing = readLock(lockPath);
  if (!existing || existing.token !== token) return;
  try {
    fs.unlinkSync(lockPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

function defaultProcessIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}
