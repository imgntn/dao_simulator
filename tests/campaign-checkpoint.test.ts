import { describe, expect, it } from 'vitest';
import * as path from 'node:path';
import { campaignCheckpointDirectory } from '../lib/research/campaign-checkpoint';

describe('campaignCheckpointDirectory', () => {
  it('isolates checkpoints beside, but outside, immutable campaign artifacts', () => {
    const root = path.resolve('artifacts');
    const directory = campaignCheckpointDirectory(
      root,
      'core-confirmatory-20260718',
      'rq1/quorum',
    );

    expect(path.relative(root, directory).split(path.sep)).toEqual([
      'campaigns',
      '.campaign-checkpoints',
      'core-confirmatory-20260718',
      expect.stringMatching(/^rq1-quorum-[a-f0-9]{12}$/),
    ]);
    expect(directory).not.toContain(
      `${path.sep}campaigns${path.sep}core-confirmatory-20260718${path.sep}`,
    );
  });

  it('does not collide when experiment IDs have the same safe spelling', () => {
    const first = campaignCheckpointDirectory('artifacts', 'campaign-1', 'rq1/a');
    const second = campaignCheckpointDirectory('artifacts', 'campaign-1', 'rq1:a');

    expect(first).not.toBe(second);
  });

  it('rejects unsafe campaign IDs and empty experiment IDs', () => {
    expect(() => campaignCheckpointDirectory('artifacts', '../escape', 'rq1'))
      .toThrow('Invalid campaign ID');
    expect(() => campaignCheckpointDirectory('artifacts', 'campaign-1', '   '))
      .toThrow('Experiment ID is required');
  });
});
