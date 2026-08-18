import { describe, expect, it } from 'vitest';
import {
  parseReanalysisArguments,
  reanalysisUsage,
} from '../scripts/reanalyze-campaign';

describe('campaign reanalysis CLI', () => {
  it('supports a standalone help flag', () => {
    expect(parseReanalysisArguments(['--help'])).toEqual({
      experimentIds: [],
      help: true,
    });
    expect(reanalysisUsage()).toContain('--experiment-ids <ids>');
  });

  it('parses a complete derivation request', () => {
    expect(parseReanalysisArguments([
      '--campaign-dir', 'campaign',
      '--output-dir', 'derived',
      '--reanalysis-id', 'robustness-review',
      '--experiment-ids', 'first, second',
    ])).toMatchObject({
      campaignDir: 'campaign',
      outputDir: 'derived',
      reanalysisId: 'robustness-review',
      experimentIds: ['first', 'second'],
      help: false,
    });
  });

  it('rejects ambiguous flags and malformed values', () => {
    expect(() => parseReanalysisArguments(['--help', '--verify', 'derived']))
      .toThrow('--help cannot be combined');
    expect(() => parseReanalysisArguments(['--unknown', 'value']))
      .toThrow('Unknown argument');
    expect(() => parseReanalysisArguments(['--verify']))
      .toThrow('Missing value');
    expect(() => parseReanalysisArguments(['--verify', 'one', '--verify', 'two']))
      .toThrow('Duplicate argument');
  });
});
