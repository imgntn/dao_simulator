import type { ExperimentConfig } from './experiment-config';
import { validateExperimentConfig } from './experiment-config-validator';

export const PILOT_SEEDS = [
  910_001,
  910_019,
  910_031,
  910_043,
  910_057,
  910_069,
  910_081,
  910_097,
] as const;

export function buildPilotConfig(source: ExperimentConfig): ExperimentConfig {
  if (source.research?.classification !== 'confirmatory') {
    throw new Error(`Pilot source must be confirmatory: ${source.name}`);
  }
  if (!source.id) throw new Error(`Pilot source lacks a stable id: ${source.name}`);
  const pilot = structuredClone(source);
  pilot.id = `${source.id}-pilot`;
  pilot.name = `${source.name} — Paired Pilot`;
  pilot.description = `${source.description ?? source.name} Eight-replicate paired-seed pilot for variance, diagnostics, and final power planning.`;
  pilot.tags = [...new Set([...(source.tags ?? []), 'pilot'])];
  pilot.research = {
    ...pilot.research!,
    classification: 'exploratory',
    publicationRole: 'pilot-development',
    hypothesis: `${pilot.research!.hypothesis} This pilot estimates paired variance and checks outcome support before the confirmatory freeze.`,
    estimatedRuntimeMinutes: Math.max(
      1,
      Math.ceil((pilot.research!.estimatedRuntimeMinutes ?? 60) * PILOT_SEEDS.length
        / source.execution.runsPerConfig),
    ),
  };
  pilot.execution = {
    ...pilot.execution,
    runsPerConfig: PILOT_SEEDS.length,
    seedStrategy: 'fixed',
    fixedSeeds: [...PILOT_SEEDS],
    baseSeed: undefined,
    workers: Math.min(4, pilot.execution.workers ?? 1),
  };
  pilot.output = {
    ...pilot.output,
    directory: source.output.directory.replace(/^results[\\/]+paper/, 'results/pilot'),
    includeRawRuns: true,
    includeManifest: true,
  };
  validateExperimentConfig(pilot);
  return pilot;
}
