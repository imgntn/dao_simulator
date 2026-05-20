/**
 * Self-test for the calibration validation loop.
 *
 * Strategy:
 *   - Build a "mini-baseline" with two synthetic DAOs at high scores.
 *   - Inject a stub BacktestRunner that returns deliberately worse scores.
 *   - Confirm the differ flags both DAOs as regressions and the report
 *     mentions them.
 *
 * This protects against the validator itself silently breaking — if this
 * test fails after a refactor, the validation loop is no longer trustworthy.
 */

import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdtempSync, readFileSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CalibrationValidator } from '../lib/research/calibration-validator';
import { ValidationDiffer } from '../lib/research/validation-differ';
import { FindingChecker } from '../lib/research/finding-checker';
import { writeValidationReport, collectSuspectCommits } from '../lib/research/validation-report';
import {
  CalibrationBaselineSchema,
  ExperimentBaselineSchema,
  type CalibrationBaseline,
  type ExperimentBaseline,
  type ValidationRun,
} from '../lib/research/baseline-schema';
import {
  computeBaselineConfigHash,
} from '../lib/research/baseline-config';
import type { BacktestRunner, BacktestResult } from '../lib/research/backtest-runner';
import {
  adaptiveEpisodeCount,
} from '../lib/research/validation-cost-control';

function makeBaselineDao(daoId: string, score: number): CalibrationBaseline['perDao'][string] {
  return {
    daoId,
    score,
    passRate: 0.6,
    participation: 0.1,
    proposalFrequency: 5,
    priceRmse: 0.2,
    voterConcentration: 0.5,
    forumActivity: 5,
    ci95: {
      overall_score: { mean: score, stdDev: 0.02, ci95Lower: score - 0.012, ci95Upper: score + 0.012, standardError: 0.006 },
      proposal_frequency_error: { mean: 0.1, stdDev: 0.05, ci95Lower: 0.07, ci95Upper: 0.13, standardError: 0.016 },
      pass_rate_error: { mean: 0.1, stdDev: 0.05, ci95Lower: 0.07, ci95Upper: 0.13, standardError: 0.016 },
      participation_rate_error: { mean: 0.1, stdDev: 0.05, ci95Lower: 0.07, ci95Upper: 0.13, standardError: 0.016 },
      price_trajectory_rmse: { mean: 0.2, stdDev: 0.05, ci95Lower: 0.17, ci95Upper: 0.23, standardError: 0.016 },
      voter_concentration_error: { mean: 0.1, stdDev: 0.05, ci95Lower: 0.07, ci95Upper: 0.13, standardError: 0.016 },
      forum_activity_error: { mean: 0.1, stdDev: 0.05, ci95Lower: 0.07, ci95Upper: 0.13, standardError: 0.016 },
    },
  };
}

function makeStubRunner(scoreOverride: (daoId: string) => number): BacktestRunner {
  const stub = {
    async runBacktest(config: { daoId: string; episodes: number; stepsPerEpisode: number }): Promise<BacktestResult> {
      const score = scoreOverride(config.daoId);
      return {
        daoId: config.daoId,
        episodes: config.episodes,
        stepsPerEpisode: config.stepsPerEpisode,
        reports: [],
        averageReport: {
          dao_id: config.daoId,
          period: { start: 'stub', end: 'stub' },
          metrics: {
            proposal_frequency_error: 0.1,
            pass_rate_error: 0.1,
            participation_rate_error: 0.1,
            price_trajectory_rmse: 0.2,
            voter_concentration_error: 0.1,
            forum_activity_error: 0.1,
          },
          overall_score: score,
          details: {
            sim_pass_rate: 0.6,
            sim_participation_rate: 0.1,
            sim_proposals_per_month: 5,
            sim_voter_concentration: 0.5,
            sim_forum_topics_per_month: 5,
          },
        },
        bestScore: score,
        worstScore: score,
        stdDevScore: 0,
        confidenceIntervals: {
          overall_score: { mean: score, stdDev: 0.02, ci95Lower: score - 0.012, ci95Upper: score + 0.012, standardError: 0.006 },
          proposal_frequency_error: { mean: 0.1, stdDev: 0.05, ci95Lower: 0.07, ci95Upper: 0.13, standardError: 0.016 },
          pass_rate_error: { mean: 0.1, stdDev: 0.05, ci95Lower: 0.07, ci95Upper: 0.13, standardError: 0.016 },
          participation_rate_error: { mean: 0.1, stdDev: 0.05, ci95Lower: 0.07, ci95Upper: 0.13, standardError: 0.016 },
          price_trajectory_rmse: { mean: 0.2, stdDev: 0.05, ci95Lower: 0.17, ci95Upper: 0.23, standardError: 0.016 },
          voter_concentration_error: { mean: 0.1, stdDev: 0.05, ci95Lower: 0.07, ci95Upper: 0.13, standardError: 0.016 },
          forum_activity_error: { mean: 0.1, stdDev: 0.05, ci95Lower: 0.07, ci95Upper: 0.13, standardError: 0.016 },
        },
      };
    },
    runAllBacktests: async () => new Map(),
  } as unknown as BacktestRunner;
  return stub;
}

describe('calibration validation loop — self-test', () => {
  it('flags a deliberately injected regression', async () => {
    const baseline: CalibrationBaseline = {
      version: 1,
      generatedAt: '2026-05-18T00:00:00Z',
      gitSha: 'unit-test',
      configHash: computeBaselineConfigHash(),
      perDao: {
        gitcoin: makeBaselineDao('gitcoin', 0.92),
        lido: makeBaselineDao('lido', 0.88),
      },
    };

    const validator = new CalibrationValidator({
      suite: 'smoke',
      baselineVersion: 1,
      daoIds: ['gitcoin', 'lido'],
      episodesOverride: 2,
      stepsOverride: 50,
      runner: makeStubRunner(() => 0.6),
    });

    const run = await validator.run();
    expect(Object.keys(run.perDao).sort()).toEqual(['gitcoin', 'lido']);
    expect(run.perDao.gitcoin.score).toBeCloseTo(0.6, 5);

    const differ = new ValidationDiffer();
    const diff = differ.diff(run, baseline);
    expect(diff.regressions.length).toBe(2);
    expect(diff.regressions.map((r) => r.daoId).sort()).toEqual(['gitcoin', 'lido']);
    expect(diff.regressions.every((r) => r.kind === 'score_drop')).toBe(true);
  });

  it('passes when scores match the baseline within tolerance', async () => {
    const baseline: CalibrationBaseline = {
      version: 1,
      generatedAt: '2026-05-18T00:00:00Z',
      gitSha: 'unit-test',
      configHash: computeBaselineConfigHash(),
      perDao: {
        gitcoin: makeBaselineDao('gitcoin', 0.92),
      },
    };

    const validator = new CalibrationValidator({
      suite: 'smoke',
      baselineVersion: 1,
      daoIds: ['gitcoin'],
      episodesOverride: 2,
      stepsOverride: 50,
      runner: makeStubRunner(() => 0.918),
    });

    const run = await validator.run();
    const diff = new ValidationDiffer().diff(run, baseline);
    expect(diff.regressions.length).toBe(0);
  });

  it('detects finding-direction inversions', () => {
    const baseline: ExperimentBaseline = {
      version: 1,
      generatedAt: '2026-05-18T00:00:00Z',
      gitSha: 'unit-test',
      configHash: 'unit-test',
      findings: {
        'exp-17-gemma4-e4b': {
          description: 'LLM thinking mode improves governance',
          direction: 'positive',
          magnitudeRange: [0.04, 0.10],
          metric: 'llm_thinking_score_delta',
        },
      },
    };

    const run: ValidationRun = {
      runId: 'test-run',
      startedAt: '2026-05-18T00:00:00Z',
      finishedAt: '2026-05-18T00:00:01Z',
      durationMs: 1000,
      suite: 'full',
      gitSha: 'current',
      configHash: 'h',
      baselineVersion: 1,
      perDao: {},
      perExperiment: {
        'exp-17-gemma4-e4b': {
          experimentId: 'exp-17-gemma4-e4b',
          observedMagnitude: -0.05,
          observedDirection: 'negative',
          metric: 'llm_thinking_score_delta',
        },
      },
      status: 'pass',
      regressionCount: 0,
    };

    const report = new FindingChecker().check(run, baseline);
    expect(report.inversions.length).toBe(1);
    expect(report.inversions[0].experimentId).toBe('exp-17-gemma4-e4b');
  });

  it('writes a markdown report and appends to history.jsonl', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'calib-validation-'));
    const outDir = path.join(tmp, 'reports');
    const historyPath = path.join(tmp, 'history.jsonl');

    const run: ValidationRun = {
      runId: 'rep-test-1',
      startedAt: '2026-05-18T00:00:00Z',
      finishedAt: '2026-05-18T00:01:00Z',
      durationMs: 60_000,
      suite: 'fast',
      gitSha: 'abc1234',
      configHash: 'h',
      baselineVersion: 1,
      perDao: {
        gitcoin: {
          daoId: 'gitcoin', score: 0.92, passRate: 0.85, participation: 0.12,
          proposalFrequency: 3, priceRmse: 0.15, voterConcentration: 0.45,
          forumActivity: 5, ci95Lower: 0.9, ci95Upper: 0.94, episodes: 10, stepsPerEpisode: 720,
        },
      },
      status: 'pass',
      regressionCount: 0,
    };

    const { markdownPath } = writeValidationReport(
      {
        run,
        diff: { baselineVersion: 1, runId: run.runId, regressions: [], improvements: [], flat: [{ daoId: 'gitcoin', baselineScore: 0.92, currentScore: 0.92, delta: 0 }], missingFromBaseline: [], missingFromRun: [] },
        baselineGitSha: 'baseline-sha',
      },
      { outDir, historyPath },
    );

    const md = readFileSync(markdownPath, 'utf-8');
    expect(md).toContain('Calibration Validation Report');
    expect(md).toContain('gitcoin');

    const hist = readFileSync(historyPath, 'utf-8');
    expect(hist).toContain('rep-test-1');
  });

  it('baseline schemas reject malformed JSON', () => {
    const bad = { version: 'not-a-number', perDao: {} };
    expect(CalibrationBaselineSchema.safeParse(bad).success).toBe(false);

    const badExp = { version: 1, findings: { 'exp': { direction: 'sideways', magnitudeRange: [0, 1], description: 'x', metric: 'y' } } };
    expect(ExperimentBaselineSchema.safeParse(badExp).success).toBe(false);
  });

  it('collectSuspectCommits returns empty when baseline SHA is the seed placeholder', () => {
    const out = collectSuspectCommits('seed-v1', 'abc');
    expect(out).toEqual([]);
  });

  it('adaptive episode count returns configured default with empty history', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'calib-validation-'));
    const historyPath = path.join(tmp, 'history.jsonl');
    writeFileSync(historyPath, '', 'utf-8');
    expect(adaptiveEpisodeCount(historyPath, 'gitcoin')).toBe(10);
  });
});
