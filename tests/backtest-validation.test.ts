import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { BacktestRunner } from '../lib/research/backtest-runner';

const hasChronologicalProfiles = fs.existsSync(path.resolve(
  'results',
  'historical',
  'validation',
  'holdout',
  'uniswap_profile.json',
));

describe.runIf(hasChronologicalProfiles)('chronological calibration backtests', () => {
  it('uses a declared holdout period and reports null-model skill', async () => {
    const runner = new BacktestRunner();
    const result = await runner.runBacktest({
      daoId: 'uniswap',
      episodes: 1,
      stepsPerEpisode: 2,
      seed: 101,
      evaluationMode: 'temporal_holdout',
      includeUncalibratedNull: false,
    });

    expect(result.evaluation.design).toBe('temporal_holdout');
    expect(result.evaluation.targetUse).toBe('held_out');
    expect(result.evaluation.trainingPeriod).toEqual({
      start: '2023-01-01',
      end: '2024-12-31',
    });
    expect(result.evaluation.evaluationPeriod).toEqual({
      start: '2025-01-01',
      end: '2025-12-31',
    });
    expect(result.evaluation.historicalPersistenceScore).toBeGreaterThanOrEqual(0);
    expect(result.evaluation.historicalPersistenceScore).toBeLessThanOrEqual(1);
    expect(result.evaluation.absoluteSkillVsPersistence).toBeCloseTo(
      result.averageReport.overall_score
        - result.evaluation.historicalPersistenceScore
    );
    expect(result.evaluation.uncalibratedScore).toBeNull();
    expect(Object.keys(result.evaluation.sourceChecksums.training ?? {})).not.toHaveLength(0);
    expect(Object.keys(result.evaluation.sourceChecksums.evaluation ?? {})).not.toHaveLength(0);
  }, 15_000);
});
