import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  assertCorePublicationSelection,
  scientificAnalysisIdentity,
} from '../lib/research/publication-finalization';
import {
  parsePublicationFinalizationArgs,
  publicationFinalizationUsage,
} from '../scripts/finalize-publication-campaign';

describe('publication campaign finalization', () => {
  it('compares scientific analysis independently of wall-clock metadata', () => {
    const first = scientificAnalysisIdentity({
      schemaVersion: '1.0.0',
      generatedAt: '2026-01-01T00:00:00.000Z',
      effects: [{ estimate: 0.25 }],
    });
    const second = scientificAnalysisIdentity({
      schemaVersion: '1.0.0',
      generatedAt: '2026-07-18T00:00:00.000Z',
      effects: [{ estimate: 0.25 }],
    });
    const changed = scientificAnalysisIdentity({
      schemaVersion: '1.0.0',
      generatedAt: '2026-07-18T00:00:00.000Z',
      effects: [{ estimate: 0.26 }],
    });

    expect(first).toBe(second);
    expect(first).not.toBe(changed);
  });

  it('parses the required source, copy, and experiment set', () => {
    expect(parsePublicationFinalizationArgs([
      '--campaign', 'source',
      '--copy', 'archive',
      '--experiment-ids', 'rq2, rq1',
    ])).toMatchObject({
      campaign: 'source',
      copy: 'archive',
      experimentIds: ['rq2', 'rq1'],
      help: false,
    });
  });

  it('provides a strict non-mutating help path', () => {
    expect(parsePublicationFinalizationArgs(['--help'])).toEqual({
      experimentIds: [],
      help: true,
    });
    expect(publicationFinalizationUsage()).toContain('--copy <new-read-only-dir>');
    expect(() => parsePublicationFinalizationArgs(['--wat', 'value']))
      .toThrow('Unknown argument');
  });

  it('rejects a selected campaign with no core-confirmatory experiment', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dao-finalization-selection-'));
    try {
      fs.writeFileSync(path.join(directory, 'resolved-config.json'), JSON.stringify({
        experiments: [{
          experimentId: 'supporting-study',
          config: { research: { publicationRole: 'supporting-exploratory' } },
        }],
      }));
      expect(() => assertCorePublicationSelection(directory, ['supporting-study']))
        .toThrow('requires at least one selected core-confirmatory');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('requires the complete resolved experiment set', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dao-finalization-complete-'));
    try {
      fs.writeFileSync(path.join(directory, 'resolved-config.json'), JSON.stringify({
        experiments: [
          {
            experimentId: 'rq1',
            config: { research: { publicationRole: 'core-confirmatory' } },
          },
          {
            experimentId: 'rq2',
            config: { research: { publicationRole: 'core-confirmatory' } },
          },
        ],
      }));
      expect(() => assertCorePublicationSelection(directory, ['rq1']))
        .toThrow('must exactly match');
      expect(() => assertCorePublicationSelection(directory, ['rq1', 'rq2']))
        .not.toThrow();
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
