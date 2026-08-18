import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { parseArgs } from '../scripts/run-paper-suite';
import {
  assertFreshResults,
  calculateExpectedRuns,
  resolveProfileConfigPaths,
  resolvePaperConfig,
  validateResultFreshness,
} from '../scripts/paper-pipeline-utils';

describe('paper suite arg parsing', () => {
  it('parses flags correctly when no explicit command is provided', () => {
    const parsed = parseArgs(['--profile', 'p1', '--include-validation']);
    expect(parsed.command).toBe('all');
    expect(parsed.profile).toBe('p1');
    expect(parsed.includeValidation).toBe(true);
  });

  it('supports explicit stale-check override flag', () => {
    const parsed = parseArgs(['report', '--profile=p2', '--allow-stale']);
    expect(parsed.command).toBe('report');
    expect(parsed.profile).toBe('p2');
    expect(parsed.strictFreshness).toBe(false);
  });

  it('accepts command after flags', () => {
    const parsed = parseArgs(['--profile', 'p1', 'summary']);
    expect(parsed.command).toBe('summary');
    expect(parsed.profile).toBe('p1');
  });

  it('accepts llm profile', () => {
    const parsed = parseArgs(['summary', '--profile', 'llm']);
    expect(parsed.command).toBe('summary');
    expect(parsed.profile).toBe('llm');
  });
});

describe('paper profile config mapping', () => {
  it('keeps proposal-pipeline experiment in p1 and out of p2', () => {
    const rootDir = process.cwd();
    const p1Configs = resolveProfileConfigPaths(rootDir, 'p1', false);
    const p2Configs = resolveProfileConfigPaths(rootDir, 'p2', false);

    expect(p1Configs).toContain(path.join('experiments', 'paper', '05-proposal-pipeline.yaml'));
    expect(p2Configs).not.toContain(path.join('experiments', 'paper', '05-proposal-pipeline.yaml'));
  });

  it('maps llm profile to experiment 12 only', () => {
    const rootDir = process.cwd();
    const llmConfigs = resolveProfileConfigPaths(rootDir, 'llm', false);
    expect(llmConfigs).toContain(path.join('experiments', 'paper', '12-llm-agent-reasoning.yaml'));
    expect(llmConfigs).toHaveLength(1);
  });
});

describe('paper run counting', () => {
  it('counts city scenarios as independent conditions', () => {
    expect(calculateExpectedRuns({
      name: 'City count fixture',
      mode: 'city',
      baseConfig: { inline: {} },
      baseCityConfig: {},
      scenarios: ['a', 'b', 'c'].map(name => ({
        name,
        daos: [{ id: `dao-${name}`, name, tokenSymbol: `T${name.toUpperCase()}` }],
      })),
      execution: {
        runsPerConfig: 10,
        stepsPerRun: 1,
        seedStrategy: 'sequential',
        baseSeed: 1,
      },
      metrics: [{ name: 'Members', type: 'builtin', builtin: 'final_member_count' }],
      output: { directory: 'unused', formats: ['json'] },
    })).toBe(30);
  });

  it('rejects unequal zip dimensions', () => {
    expect(() => calculateExpectedRuns({
      sweep: {
        type: 'zip',
        grid: [{ values: [1, 2] }, { values: [1, 2, 3] }],
      },
      execution: { runsPerConfig: 1 },
    })).toThrow(/equal lengths/);
  });
});

describe('freshness validation', () => {
  function writeFixtureTree(baseDir: string): string {
    const configDir = path.join(baseDir, 'experiments', 'paper');
    const outputDir = path.join(baseDir, 'results', 'paper', '00-test');
    fs.mkdirSync(configDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });

    const configPath = path.join(configDir, '00-test.yaml');
    fs.writeFileSync(configPath, [
      'name: Test Experiment',
      'baseConfig:',
      '  inline: {}',
      'execution:',
      '  runsPerConfig: 10',
      '  stepsPerRun: 1',
      '  seedStrategy: sequential',
      '  baseSeed: 1',
      'sweep:',
      '  parameter: voting_activity',
      '  values: [1, 2]',
      'metrics:',
      '  - name: Proposal Pass Rate',
      '    type: builtin',
      '    builtin: proposal_pass_rate',
      'output:',
      '  directory: results/paper/00-test',
      '',
    ].join('\n'));

    fs.writeFileSync(path.join(outputDir, 'stats.csv'), 'sweep_value,run_count,Proposal Pass Rate_mean,Proposal Pass Rate_std\n1,10,0.5,0.1\n2,10,0.6,0.1\n');
    fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify({
      schemaVersion: 2,
      configHash: `sha256:${'a'.repeat(64)}`,
      resultsHash: `sha256:${'b'.repeat(64)}`,
      metricDefinitions: {
        hash: `sha256:${'c'.repeat(64)}`,
        versions: { proposal_pass_rate: '1.0.0' },
      },
      software: { gitCommit: 'fixture', gitDirty: false },
      execution: { totalRuns: 20 },
    }, null, 2));
    return configPath;
  }

  it('marks results fresh when run counts and timestamps are valid', () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paper-pipeline-fresh-'));
    const configPath = writeFixtureTree(baseDir);

    const configMtime = new Date(Date.now() - 60_000);
    fs.utimesSync(configPath, configMtime, configMtime);

    const summaryPath = path.join(baseDir, 'results', 'paper', '00-test', 'summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify({
      totalRuns: 20,
      manifest: {
        execution: {
          completedAt: new Date().toISOString(),
        },
      },
    }, null, 2));

    const resolved = resolvePaperConfig(baseDir, path.join('experiments', 'paper', '00-test.yaml'));
    const result = validateResultFreshness(baseDir, resolved);
    expect(result.isFresh).toBe(true);
  });

  it('fails strict validation when config is newer than results', () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paper-pipeline-stale-'));
    const configPath = writeFixtureTree(baseDir);

    const summaryPath = path.join(baseDir, 'results', 'paper', '00-test', 'summary.json');
    const completedAt = new Date(Date.now() - 120_000);
    fs.writeFileSync(summaryPath, JSON.stringify({
      totalRuns: 20,
      manifest: {
        execution: {
          completedAt: completedAt.toISOString(),
        },
      },
    }, null, 2));

    const newerConfigTime = new Date(Date.now() - 30_000);
    fs.utimesSync(configPath, newerConfigTime, newerConfigTime);

    expect(() => {
      assertFreshResults(baseDir, [path.join('experiments', 'paper', '00-test.yaml')], true);
    }).toThrow(/freshness check failed/i);
  });

  it('rejects known dummy and placeholder paper artifacts', () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paper-pipeline-placeholder-'));
    const configPath = writeFixtureTree(baseDir);
    const outputDir = path.join(baseDir, 'results', 'paper', '00-test');
    const oldTime = new Date(Date.now() - 60_000);
    fs.utimesSync(configPath, oldTime, oldTime);

    fs.writeFileSync(path.join(outputDir, 'summary.json'), JSON.stringify({
      totalRuns: 20,
      manifest: { execution: { completedAt: new Date().toISOString() } },
    }, null, 2));
    fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify({
      configHash: 'dummyhash',
    }, null, 2));
    fs.writeFileSync(path.join(outputDir, 'stats.csv'), 'metric,value\nplaceholder,0\n');

    const resolved = resolvePaperConfig(baseDir, path.join('experiments', 'paper', '00-test.yaml'));
    const result = validateResultFreshness(baseDir, resolved);

    expect(result.isFresh).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['placeholder_manifest', 'placeholder_stats'])
    );
  });

  it('cannot generate placeholder-backed manuscript figures', () => {
    const updater = fs.readFileSync(
      path.join(process.cwd(), 'scripts', 'paper-update.ts'),
      'utf8',
    );

    expect(updater).not.toContain('generatePlaceholderChart');
    expect(updater).not.toContain('writing placeholder');
    expect(updater).not.toContain('generating placeholder-backed paper assets');
    expect(updater).toContain(
      '--allow-placeholders was removed: publication assets must be generated from verified results',
    );
  });
});
