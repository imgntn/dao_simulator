import * as fs from 'node:fs';
import * as path from 'node:path';
import { canonicalJson, sha256 } from './campaign-manifest';
import { EXPERIMENT_REPLAY_CONTRACTS } from './baseline-config';

export type ExperimentBaselineSuite = 'full' | 'llm';

export const EXPERIMENT_REPLAY_CONFIG_FILES: Readonly<
  Record<string, string>
> = Object.freeze({
  'exp-11-advanced-mechanisms': '11-advanced-mechanisms.yaml',
  'exp-13-cross-dao-governance': '13-cross-dao-governance-comparison.yaml',
  'exp-14-black-swan-resilience': '14-black-swan-resilience.yaml',
  'exp-15-counterfactual-expansion': '15-counterfactual-expansion.yaml',
  'exp-16-rl-activation': '16-rl-activation.yaml',
  'exp-17-gemma4-e4b': '17-gemma4-e4b.yaml',
});

export const EXPERIMENT_DIRECTION_THRESHOLD = 0.02;

export function experimentIdsForSuite(
  suite: ExperimentBaselineSuite
): string[] {
  return Object.keys(EXPERIMENT_REPLAY_CONTRACTS)
    .filter(id => suite === 'llm' || id !== 'exp-17-gemma4-e4b')
    .sort();
}

export function computeExperimentBaselineConfigHash(
  suite: ExperimentBaselineSuite,
  rootDir: string = process.cwd()
): string {
  const experimentIds = experimentIdsForSuite(suite);
  const configFiles = experimentIds
    .filter(id => id !== 'exp-10-calibration-validation')
    .map(id => {
      const file = EXPERIMENT_REPLAY_CONFIG_FILES[id];
      if (!file) {
        throw new Error(`Missing replay config identity for ${id}`);
      }
      const relativePath = path.join('experiments', 'paper', file);
      const absolutePath = path.resolve(rootDir, relativePath);
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`Missing replay config required for baseline hashing: ${absolutePath}`);
      }
      return {
        experimentId: id,
        path: relativePath.replaceAll(path.sep, '/'),
        sha256: sha256(fs.readFileSync(absolutePath)),
      };
    });
  const measurementContracts = Object.fromEntries(
    experimentIds.map(id => {
      const contract = EXPERIMENT_REPLAY_CONTRACTS[id];
      return [id, {
        description: contract.description,
        metric: contract.metric,
      }];
    })
  );
  return sha256(canonicalJson({
    suite,
    directionThreshold: EXPERIMENT_DIRECTION_THRESHOLD,
    measurementContracts,
    configFiles,
  }));
}
