import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { assertExactCampaignSelection } from '../lib/research/publication-finalization';
import {
  analysisFinalizationUsage,
  parseAnalysisFinalizationArgs,
} from '../scripts/finalize-campaign-analysis';

describe('campaign analysis finalization', () => {
  it('parses a complete analysis-only finalization request', () => {
    expect(parseAnalysisFinalizationArgs([
      '--campaign', 'source',
      '--copy', 'archive',
      '--experiment-ids', 'robustness-b, robustness-a',
    ])).toMatchObject({
      campaign: 'source',
      copy: 'archive',
      experimentIds: ['robustness-b', 'robustness-a'],
      help: false,
    });
    expect(analysisFinalizationUsage()).toContain('campaign:finalize-analysis');
  });

  it('has a strict help and argument path', () => {
    expect(parseAnalysisFinalizationArgs(['--help'])).toEqual({
      experimentIds: [],
      help: true,
    });
    expect(() => parseAnalysisFinalizationArgs(['--unknown', 'value']))
      .toThrow('Unknown argument');
    expect(() => parseAnalysisFinalizationArgs(['--campaign', 'one', '--campaign', 'two']))
      .toThrow('Duplicate argument');
  });

  it('accepts supporting-only campaigns while requiring the exact experiment set', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dao-analysis-selection-'));
    try {
      fs.writeFileSync(path.join(directory, 'resolved-config.json'), JSON.stringify({
        experiments: [
          {
            experimentId: 'robustness-a',
            config: { research: { publicationRole: 'supporting-exploratory' } },
          },
          {
            experimentId: 'robustness-b',
            config: { research: { publicationRole: 'supporting-exploratory' } },
          },
        ],
      }));
      expect(() => assertExactCampaignSelection(
        directory,
        ['robustness-a', 'robustness-b'],
      )).not.toThrow();
      expect(() => assertExactCampaignSelection(directory, ['robustness-a']))
        .toThrow('must exactly match');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
