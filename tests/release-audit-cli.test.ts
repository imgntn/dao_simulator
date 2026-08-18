import { describe, expect, it } from 'vitest';
import {
  parseReleaseAuditArguments,
  releaseAuditUsage,
} from '../scripts/audit-publication-release';

describe('publication release audit CLI', () => {
  it('accepts multiple artifact roots', () => {
    const parsed = parseReleaseAuditArguments([
      '--artifact-root', 'publication',
      '--artifact-root', 'arxiv',
      '--output', 'audit.json',
    ]);

    expect(parsed.artifactRoots).toEqual(['publication', 'arxiv']);
    expect(parsed.output).toMatch(/audit\.json$/);
    expect(parsed.help).toBe(false);
  });

  it('supports strict standalone help', () => {
    expect(parseReleaseAuditArguments(['--help'])).toEqual({
      output: '',
      artifactRoots: [],
      help: true,
    });
    expect(releaseAuditUsage()).toContain('--artifact-root <path>');
    expect(() => parseReleaseAuditArguments(['--help', '--output', 'x']))
      .toThrow('--help cannot be combined');
  });
});
