import type { CalibrationProfile } from '../digital-twins/calibration-loader';

export interface CalibrationProfileValidationOptions {
  expectedDaoId: string;
  expectedPartition: string;
  requiredSchemaVersion?: string;
}

function assertFiniteNumbers(value: unknown, path: string): void {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`Calibration profile contains non-finite number at ${path}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertFiniteNumbers(entry, `${path}[${index}]`));
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      assertFiniteNumbers(entry, `${path}.${key}`);
    }
  }
}

export function assertPublicationCalibrationProfile(
  profile: CalibrationProfile,
  options: CalibrationProfileValidationOptions
): void {
  if (profile.dao_id !== options.expectedDaoId) {
    throw new Error(
      `Calibration profile DAO mismatch: expected ${options.expectedDaoId}, `
      + `received ${profile.dao_id}`
    );
  }
  const metadata = profile.calibration_metadata;
  if (!metadata) {
    throw new Error('Publication calibration profile is missing calibration_metadata');
  }
  const requiredSchema = options.requiredSchemaVersion ?? '1.1.0';
  if (metadata.schema_version !== requiredSchema) {
    throw new Error(
      `Calibration schema mismatch: expected ${requiredSchema}, `
      + `received ${metadata.schema_version ?? 'missing'}`
    );
  }
  if (metadata.partition !== options.expectedPartition) {
    throw new Error(
      `Calibration partition mismatch: expected ${options.expectedPartition}, `
      + `received ${metadata.partition ?? 'missing'}`
    );
  }
  if (metadata.method !== 'chronological-source-filter') {
    throw new Error(
      'Publication calibration profiles must use chronological-source-filter'
    );
  }
  if (
    !metadata.period?.start
    || !metadata.period.end
    || metadata.period.inclusive !== true
  ) {
    throw new Error(
      'Publication calibration profile must declare an inclusive non-empty period'
    );
  }
  if (!metadata.source_manifest || Object.keys(metadata.source_manifest).length === 0) {
    throw new Error('Publication calibration profile is missing its source manifest');
  }
  if (!metadata.source_quality || Object.keys(metadata.source_quality).length === 0) {
    throw new Error('Publication calibration profile is missing source-quality counts');
  }
  if (!metadata.field_quality || Object.keys(metadata.field_quality).length === 0) {
    throw new Error('Publication calibration profile is missing field-quality metadata');
  }
  if (!metadata.source_checksums || Object.keys(metadata.source_checksums).length === 0) {
    throw new Error('Publication calibration profile is missing source checksums');
  }
  for (const [source, checksum] of Object.entries(metadata.source_checksums)) {
    if (!/^[a-f0-9]{64}$/.test(checksum.sha256)) {
      throw new Error(`Invalid SHA-256 for calibration source ${source}`);
    }
    if (!checksum.path) {
      throw new Error(`Missing path for calibration source ${source}`);
    }
  }
  assertFiniteNumbers(profile, 'profile');
}
