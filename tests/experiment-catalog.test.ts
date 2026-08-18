import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import {
  buildExperimentCatalog,
  discoverExperimentConfigs,
} from '../lib/research/experiment-catalog';

describe('experiment catalog', () => {
  it('discovers only numbered experiment specifications', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-discovery-'));
    const directory = path.join(root, 'experiments', 'paper');
    fs.mkdirSync(directory, { recursive: true });
    for (const name of ['01-valid.yaml', '12b-valid.yml', 'pipeline.config.yaml', 'README.md']) {
      fs.writeFileSync(path.join(directory, name), '');
    }
    expect(discoverExperimentConfigs(root).map(file => path.basename(file))).toEqual([
      '01-valid.yaml',
      '12b-valid.yml',
    ]);
  });

  it('rejects duplicate output directories across otherwise valid configs', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-duplicates-'));
    const directory = path.join(root, 'experiments', 'paper');
    fs.mkdirSync(directory, { recursive: true });
    const fixture = (name: string, id: string) => [
      `id: ${id}`,
      `name: ${name}`,
      'baseConfig:',
      '  inline: {}',
      'execution:',
      '  runsPerConfig: 1',
      '  stepsPerRun: 1',
      '  seedStrategy: sequential',
      '  baseSeed: 1',
      'metrics:',
      '  - name: Proposals',
      '    type: builtin',
      '    builtin: total_proposals',
      'output:',
      '  directory: results/shared',
      '  formats: [json]',
      '',
    ].join('\n');
    fs.writeFileSync(path.join(directory, '01-first.yaml'), fixture('First', 'first'));
    fs.writeFileSync(path.join(directory, '02-second.yaml'), fixture('Second', 'second'));

    expect(() => buildExperimentCatalog(root)).toThrow(/Duplicate experiment output directory/);
  });

  it('assigns unannotated historical studies to the legacy archive role', () => {
    const catalog = buildExperimentCatalog(process.cwd());
    expect(catalog.schemaVersion).toBe('1.1.0');
    expect(catalog.publicationRoleCounts['core-confirmatory']).toBe(4);
    expect(catalog.entries.filter(entry => entry.publicationRole === 'core-confirmatory'))
      .toHaveLength(4);
    expect(
      catalog.entries
        .filter(entry => entry.classification === 'legacy')
        .every(entry => entry.publicationRole === 'legacy-archived')
    ).toBe(true);
  }, 15_000);

  it('accepts a stable generation timestamp for reproducible catalogs', () => {
    const generatedAt = '2026-07-18T09:51:54.301Z';
    const catalog = buildExperimentCatalog(process.cwd(), undefined, { generatedAt });
    expect(catalog.generatedAt).toBe(generatedAt);
  }, 15_000);
});
