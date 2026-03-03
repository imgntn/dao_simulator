/**
 * Browser Calibration Provider
 *
 * Implements CalibrationDataProvider using in-memory data
 * loaded from the bundled calibration-profiles.json.
 */

import type { CalibrationDataProvider } from '../digital-twins/calibration-data-provider';
import type { CalibrationProfile } from '../digital-twins/calibration-loader';

export class BrowserCalibrationProvider implements CalibrationDataProvider {
  private profiles: Record<string, CalibrationProfile>;

  constructor(profiles: Record<string, CalibrationProfile>) {
    this.profiles = profiles;
  }

  loadProfile(daoId: string): CalibrationProfile | null {
    return this.profiles[daoId] ?? null;
  }

  listAvailableIds(): string[] {
    return Object.keys(this.profiles);
  }

  hasProfile(daoId: string): boolean {
    return daoId in this.profiles;
  }
}
