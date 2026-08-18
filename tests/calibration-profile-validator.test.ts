import { describe, expect, it } from 'vitest';

import type { CalibrationProfile } from '@/lib/digital-twins/calibration-loader';
import { assertPublicationCalibrationProfile } from '@/lib/research/calibration-profile-validator';

function validProfile(): CalibrationProfile {
  return {
    dao_id: 'dao',
    calibration_metadata: {
      schema_version: '1.1.0',
      partition: 'train',
      period: { start: '2023-01-01', end: '2024-12-31', inclusive: true },
      method: 'chronological-source-filter',
      source_manifest: {
        snapshot_votes: { rows: 1, date_column: 'created_iso' },
      },
      source_quality: {
        snapshot_votes: {
          raw_rows: 1,
          selected_rows: 1,
          invalid_date_rows: 0,
          period_excluded_rows: 0,
        },
      },
      field_quality: {
        'voting.avg_participation_rate': {
          status: 'derived',
          reason: 'test fixture',
        },
      },
      source_checksums: {
        snapshot_votes: {
          path: 'governance/snapshot_votes.csv',
          sha256: 'a'.repeat(64),
          bytes: 100,
        },
      },
    },
    voting: {
      avg_participation_rate: null,
      participation_distribution: [],
      avg_votes_per_proposal: null,
      voter_concentration: null,
      approval_rate: null,
      avg_for_percentage: null,
      quorum_hit_rate: null,
      delegation_rate: null,
    },
    proposals: {
      avg_proposals_per_month: 0,
      proposal_types: {},
      avg_voting_period_days: null,
      avg_choices_per_proposal: null,
      pass_rate: null,
      monthly_cadence: [0],
    },
    market: null,
    forum: null,
    voter_clusters: [],
    protocol: null,
  };
}

describe('publication calibration profile validation', () => {
  it('accepts an explicit chronological profile with provenance', () => {
    expect(() => assertPublicationCalibrationProfile(validProfile(), {
      expectedDaoId: 'dao',
      expectedPartition: 'train',
    })).not.toThrow();
  });

  it('rejects schema, partition, provenance, and non-finite violations', () => {
    const wrongPartition = validProfile();
    wrongPartition.calibration_metadata!.partition = 'holdout';
    expect(() => assertPublicationCalibrationProfile(wrongPartition, {
      expectedDaoId: 'dao',
      expectedPartition: 'train',
    })).toThrow(/partition mismatch/);

    const nonFinite = validProfile();
    nonFinite.proposals.avg_proposals_per_month = Number.NaN;
    expect(() => assertPublicationCalibrationProfile(nonFinite, {
      expectedDaoId: 'dao',
      expectedPartition: 'train',
    })).toThrow(/non-finite/);

    const missingQuality = validProfile();
    missingQuality.calibration_metadata!.field_quality = {};
    expect(() => assertPublicationCalibrationProfile(missingQuality, {
      expectedDaoId: 'dao',
      expectedPartition: 'train',
    })).toThrow(/field-quality/);
  });
});
