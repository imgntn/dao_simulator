import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  auditPublicationText,
  auditReleaseArtifactRoots,
} from '../lib/research/release-audit';

describe('publication release text audit', () => {
  it('detects credential signatures without retaining their values', () => {
    const credential = `ghp_${'A'.repeat(24)}`;
    const findings = auditPublicationText(`token=${credential}`, 'fixture.txt');

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      severity: 'error',
      rule: 'github-token',
      source: 'working-tree',
      path: 'fixture.txt',
      line: 1,
    });
    expect(findings[0].fingerprint).toMatch(/^[a-f0-9]{16}$/);
    expect(JSON.stringify(findings)).not.toContain(credential);
  });

  it('detects user-specific absolute paths but ignores repository route segments', () => {
    const privatePath = `C:\\${'Users'}\\researcher\\private\\input.csv`;
    const findings = auditPublicationText(
      [
        'import chart from "@/components/home/infographics/chart";',
        `input=${privatePath}`,
      ].join('\n'),
      'fixture.ts',
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      severity: 'error',
      rule: 'private-absolute-path',
      path: 'fixture.ts',
      line: 2,
    });
    expect(JSON.stringify(findings)).not.toContain(privatePath);
  });

  it('detects private paths serialized inside JSON', () => {
    const serialized = JSON.stringify({
      sourceRoot: `C:\\${'Users'}\\researcher\\project`,
    });
    const findings = auditPublicationText(serialized, 'catalog.json');

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      rule: 'private-absolute-path',
      path: 'catalog.json',
    });
  });

  it('recognizes Unix home directories only when they are absolute paths', () => {
    const unixPrivatePath = `/${'home'}/researcher/data/input.csv`;
    const findings = auditPublicationText(
      `route=components/home/panel\nsource=${unixPrivatePath}`,
      'fixture.txt',
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      rule: 'private-absolute-path',
      line: 2,
    });
  });

  it('scans explicit release artifact trees and fails closed on missing roots', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dao-release-artifacts-'));
    try {
      const releaseDir = path.join(root, 'publication');
      fs.mkdirSync(releaseDir);
      const credential = `sk-${'B'.repeat(40)}`;
      fs.writeFileSync(path.join(releaseDir, 'manuscript.tex'), `credential=${credential}`);

      const result = auditReleaseArtifactRoots(root, ['publication', 'missing']);

      expect(result.filesScanned).toBe(1);
      expect(result.findings.map(finding => finding.rule).sort()).toEqual([
        'provider-token',
        'release-artifact-missing',
      ]);
      expect(result.findings.every(finding => finding.source === 'release-artifact')).toBe(true);
      expect(JSON.stringify(result)).not.toContain(credential);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
