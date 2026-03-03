import type { CalibrationProfile } from './calibration-loader';

export interface CalibrationDataProvider {
  loadProfile(daoId: string): CalibrationProfile | null;
  listAvailableIds(): string[];
  hasProfile(daoId: string): boolean;
}
