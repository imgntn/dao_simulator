/**
 * FindingChecker
 *
 * Verifies that the qualitative headline findings of each baseline experiment
 * still hold against the current code. Two failure modes:
 *
 *   - direction_inversion: observed direction (positive/negative/neutral)
 *     differs from the baseline. This is the most serious failure — it means
 *     a published finding has flipped.
 *   - magnitude_warning: observed magnitude is outside the baseline's
 *     expected range. Direction is intact but the effect size has moved
 *     enough to warrant inspection.
 */

import type {
  ExperimentBaseline,
  ExperimentFindingRecord,
  ExperimentValidationResult,
  ValidationRun,
} from './baseline-schema';

export type FindingIssueKind = 'direction_inversion' | 'magnitude_warning';

export interface FindingDiffEntry {
  experimentId: string;
  description: string;
  baselineDirection: ExperimentFindingRecord['direction'];
  observedDirection: ExperimentValidationResult['observedDirection'];
  baselineRange: [number, number];
  observedMagnitude: number;
  kind?: FindingIssueKind;
  details?: string;
}

export interface FindingDiffReport {
  baselineVersion: number;
  runId: string;
  inversions: FindingDiffEntry[];
  warnings: FindingDiffEntry[];
  ok: FindingDiffEntry[];
  missing: string[];
}

export class FindingChecker {
  check(run: ValidationRun, baseline: ExperimentBaseline): FindingDiffReport {
    const inversions: FindingDiffEntry[] = [];
    const warnings: FindingDiffEntry[] = [];
    const ok: FindingDiffEntry[] = [];
    const missing: string[] = [];

    const observed = run.perExperiment ?? {};
    for (const [expId, finding] of Object.entries(baseline.findings)) {
      const obs = observed[expId];
      if (!obs) {
        missing.push(expId);
        continue;
      }

      const entry: FindingDiffEntry = {
        experimentId: expId,
        description: finding.description,
        baselineDirection: finding.direction,
        observedDirection: obs.observedDirection,
        baselineRange: finding.magnitudeRange,
        observedMagnitude: obs.observedMagnitude,
      };

      if (obs.observedDirection !== finding.direction) {
        entry.kind = 'direction_inversion';
        entry.details = `direction inverted: baseline=${finding.direction}, observed=${obs.observedDirection}`;
        inversions.push(entry);
        continue;
      }

      const [low, high] = finding.magnitudeRange;
      if (obs.observedMagnitude < low || obs.observedMagnitude > high) {
        entry.kind = 'magnitude_warning';
        entry.details = `magnitude ${obs.observedMagnitude.toFixed(3)} outside expected [${low}, ${high}]`;
        warnings.push(entry);
        continue;
      }

      ok.push(entry);
    }

    return {
      baselineVersion: baseline.version,
      runId: run.runId,
      inversions,
      warnings,
      ok,
      missing,
    };
  }
}
