export const CALIBRATION_VALIDATION_REPORT_SCHEMA_VERSION = '3.0.0';

export interface CalibrationValidationResultRow {
  dao_id: string;
  governance_rule: string;
  overall_score: number;
  ci95: string;
  proposal_freq_error: number;
  pass_rate_error: number;
  participation_error: number;
  price_level_error: number;
  voter_conc_error: number;
  forum_error: number;
  best: number;
  worst: number;
  std: number;
  persistence_score: number;
  uncalibrated_score: number | null;
  skill_vs_persistence: number;
  skill_vs_uncalibrated: number | null;
}

export interface CalibrationValidationReport {
  schemaVersion: string;
  timestamp: string;
  provenance: {
    gitSha: string;
    workingTreeClean: boolean;
    configHash: string;
    launchCommand: string[];
    nodeVersion: string;
    platform: string;
    arch: string;
  };
  config: {
    episodes: number;
    stepsPerEpisode: number;
    seed: number;
    evaluationMode: string;
    includeUncalibratedNull: boolean;
  };
  averageScore: number;
  status: string;
  expectedDaoCount: number;
  daoCount: number;
  failedDaoCount: number;
  failures: Array<{ daoId: string; error: string }>;
  results: CalibrationValidationResultRow[];
}

const REQUIRED_FINITE_FIELDS: Array<keyof CalibrationValidationResultRow> = [
  'overall_score',
  'proposal_freq_error',
  'pass_rate_error',
  'participation_error',
  'price_level_error',
  'voter_conc_error',
  'forum_error',
  'best',
  'worst',
  'std',
  'persistence_score',
  'skill_vs_persistence',
];

export function calibrationValidationReportErrors(
  value: unknown,
  minimumDaoCount = 1,
): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return ['Calibration validation report must be a JSON object'];
  }
  const report = value as Partial<CalibrationValidationReport>;
  if (report.schemaVersion !== CALIBRATION_VALIDATION_REPORT_SCHEMA_VERSION) {
    errors.push(`Unsupported calibration validation schema: ${String(report.schemaVersion)}`);
  }
  if (report.status !== 'passed') errors.push('Calibration validation status is not passed');
  if (!Number.isSafeInteger(report.expectedDaoCount) || Number(report.expectedDaoCount) < minimumDaoCount) {
    errors.push(`Calibration validation must expect at least ${minimumDaoCount} DAOs`);
  }
  if (!Number.isSafeInteger(report.daoCount) || report.daoCount !== report.expectedDaoCount) {
    errors.push('Calibration completed DAO count differs from expected count');
  }
  if (report.failedDaoCount !== 0) errors.push('Calibration validation reports failed DAOs');
  if (!Array.isArray(report.failures) || report.failures.length !== 0) {
    errors.push('Calibration failure index is not empty');
  }
  if (!Array.isArray(report.results) || report.results.length !== report.daoCount) {
    errors.push('Calibration result rows differ from completed DAO count');
    return errors;
  }
  const daoIds = new Set<string>();
  for (const row of report.results) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      errors.push('Calibration result contains a non-object row');
      continue;
    }
    const result = row as CalibrationValidationResultRow;
    if (!result.dao_id?.trim()) errors.push('Calibration result has no DAO identifier');
    else if (daoIds.has(result.dao_id)) errors.push(`Duplicate calibration DAO: ${result.dao_id}`);
    else daoIds.add(result.dao_id);
    for (const field of REQUIRED_FINITE_FIELDS) {
      if (!Number.isFinite(result[field])) {
        errors.push(`Calibration result ${result.dao_id || '<unknown>'} has non-finite ${field}`);
      }
    }
    for (const field of ['uncalibrated_score', 'skill_vs_uncalibrated'] as const) {
      if (result[field] !== null && !Number.isFinite(result[field])) {
        errors.push(`Calibration result ${result.dao_id || '<unknown>'} has invalid ${field}`);
      }
    }
  }
  if (!Number.isFinite(report.averageScore)) {
    errors.push('Calibration average score is non-finite');
  }
  if (
    !report.provenance
    || !/^[0-9a-f]{40}$/i.test(report.provenance.gitSha ?? '')
    || report.provenance.workingTreeClean !== true
    || !/^[0-9a-f]{64}$/i.test(report.provenance.configHash ?? '')
    || !Array.isArray(report.provenance.launchCommand)
    || report.provenance.launchCommand.length < 2
    || report.provenance.launchCommand.some(value => typeof value !== 'string' || value.length === 0)
    || typeof report.provenance.nodeVersion !== 'string'
    || report.provenance.nodeVersion.length === 0
    || typeof report.provenance.platform !== 'string'
    || report.provenance.platform.length === 0
    || typeof report.provenance.arch !== 'string'
    || report.provenance.arch.length === 0
  ) {
    errors.push('Calibration provenance is incomplete or not bound to a clean Git revision');
  }
  if (
    !report.config
    || !Number.isSafeInteger(report.config.episodes)
    || report.config.episodes <= 0
    || !Number.isSafeInteger(report.config.stepsPerEpisode)
    || report.config.stepsPerEpisode <= 0
    || !Number.isSafeInteger(report.config.seed)
  ) {
    errors.push('Calibration execution configuration is invalid');
  }
  if (report.config?.evaluationMode !== 'temporal_holdout') {
    errors.push('Calibration publication report is not a temporal holdout evaluation');
  }
  if (report.config?.includeUncalibratedNull !== true) {
    errors.push('Calibration publication report omits the uncalibrated null model');
  }
  return errors;
}

export function assertCalibrationValidationReport(
  value: unknown,
  minimumDaoCount = 1,
): asserts value is CalibrationValidationReport {
  const errors = calibrationValidationReportErrors(value, minimumDaoCount);
  if (errors.length > 0) {
    throw new Error(`Invalid calibration validation report: ${errors.join('; ')}`);
  }
}
