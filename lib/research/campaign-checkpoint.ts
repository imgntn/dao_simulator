import * as path from 'node:path';
import { sha256 } from './campaign-manifest';

const CAMPAIGN_ID_PATTERN = /^[a-z0-9][a-z0-9._-]+$/i;

function readableSegment(value: string): string {
  const normalized = value
    .normalize('NFKC')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[. -]+$/g, '')
    .slice(0, 72);
  return normalized || 'experiment';
}

/**
 * Keep resumable execution state outside the immutable campaign artifact tree
 * while isolating it by campaign and experiment. The hash prevents two
 * experiment identifiers with the same filesystem-safe spelling from sharing
 * a checkpoint.
 */
export function campaignCheckpointDirectory(
  artifactRoot: string,
  campaignId: string,
  experimentId: string,
): string {
  if (!CAMPAIGN_ID_PATTERN.test(campaignId)) {
    throw new Error(`Invalid campaign ID: ${campaignId}`);
  }
  if (!experimentId.trim()) {
    throw new Error('Experiment ID is required for checkpoint isolation');
  }

  const experimentSegment =
    `${readableSegment(experimentId)}-${sha256(experimentId).slice(0, 12)}`;
  return path.join(
    path.resolve(artifactRoot),
    'campaigns',
    '.campaign-checkpoints',
    campaignId,
    experimentSegment,
  );
}
