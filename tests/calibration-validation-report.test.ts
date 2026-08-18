import { describe, expect, it } from 'vitest';
import {
  assertCalibrationValidationReport,
  calibrationValidationReportErrors,
  type CalibrationValidationReport,
} from '../lib/research/calibration-validation-report';

function fixture(): CalibrationValidationReport {
  return {
    schemaVersion: '3.0.0',
    timestamp: '2026-07-17T00:00:00.000Z',
    provenance: {
      gitSha: '0123456789abcdef0123456789abcdef01234567',
      workingTreeClean: true,
      configHash: 'a'.repeat(64),
      launchCommand: ['node', 'scripts/run-calibration-validation.ts'],
      nodeVersion: 'v24.0.0',
      platform: 'win32',
      arch: 'x64',
    },
    config: {
      episodes: 30,
      stepsPerEpisode: 1440,
      seed: 42,
      evaluationMode: 'temporal_holdout',
      includeUncalibratedNull: true,
    },
    averageScore: 0.6,
    status: 'passed',
    expectedDaoCount: 1,
    daoCount: 1,
    failedDaoCount: 0,
    failures: [],
    results: [{
      dao_id: 'fixture',
      governance_rule: 'majority',
      overall_score: 0.6,
      ci95: '0.5-0.7',
      proposal_freq_error: 0.1,
      pass_rate_error: 0.1,
      participation_error: 0.1,
      price_level_error: 0.1,
      voter_conc_error: 0.1,
      forum_error: 0.1,
      best: 0.7,
      worst: 0.5,
      std: 0.05,
      persistence_score: 0.4,
      uncalibrated_score: 0.3,
      skill_vs_persistence: 0.2,
      skill_vs_uncalibrated: 0.3,
    }],
  };
}

describe('calibration validation reports', () => {
  it('accepts a complete temporal holdout report with both null comparisons', () => {
    const report = fixture();
    expect(() => assertCalibrationValidationReport(report)).not.toThrow();
    expect(calibrationValidationReportErrors(report)).toEqual([]);
  });

  it('rejects incomplete, duplicate, non-finite, or non-holdout evidence', () => {
    const report = fixture();
    report.status = 'failed';
    report.results[0].overall_score = Number.NaN;
    report.config.evaluationMode = 'aggregate_diagnostic';
    report.config.includeUncalibratedNull = false;
    report.provenance.workingTreeClean = false;
    expect(calibrationValidationReportErrors(report)).toEqual(expect.arrayContaining([
      'Calibration validation status is not passed',
      'Calibration result fixture has non-finite overall_score',
      'Calibration publication report is not a temporal holdout evaluation',
      'Calibration publication report omits the uncalibrated null model',
      'Calibration provenance is incomplete or not bound to a clean Git revision',
    ]));
  });

  it('enforces the requested publication-scale DAO count', () => {
    expect(() => assertCalibrationValidationReport(fixture(), 14))
      .toThrow('must expect at least 14 DAOs');
  });
});
