import { afterEach, describe, expect, it } from 'vitest';
import type { SpawnSyncReturns } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  assembleManuscript,
  verifyManuscriptPackage,
} from '../lib/research/manuscript-assembly';
import {
  sha256File,
  writeJsonAtomic,
} from '../lib/research/campaign-manifest';
import {
  createArxivPackage,
  verifyArxivPackage,
} from '../lib/research/arxiv-package';
import { compileManuscript } from '../lib/research/manuscript-compile';
import type { PublicationBundleManifest } from '../lib/research/publication-artifacts';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function createBundle(
  root: string,
  mode: 'publication' | 'supporting',
): string {
  const campaignId = `${mode}-fixture`;
  const bundleDir = path.join(root, mode);
  const role = mode === 'publication'
    ? 'core-confirmatory'
    : 'supporting-exploratory';
  const claimId = mode === 'publication' ? 'C-CORE-001' : 'E-SUPPORT-001';
  const files: Array<{ path: string; contents: string; mediaType: string }> = [
    {
      path: 'claims.json',
      contents: `${JSON.stringify({
        schemaVersion: '1.0.0',
        campaignId,
        generatedAt: '2026-07-18T00:00:00.000Z',
        analysis: { path: 'analysis.json', sha256: 'a'.repeat(64) },
        claims: [{
          id: claimId,
          experimentId: `${mode}-experiment`,
          researchQuestionIds: ['RQ-FIXTURE'],
          status: mode === 'publication'
            ? 'supported-practically-important'
            : 'equivalent-within-declared-margin',
          text: 'treatment=true minus treatment=false changed the outcome by 0.100 (95% CI 0.050 to 0.150).',
          interpretation: 'Fixture interpretation.',
        }],
      }, null, 2)}\n`,
      mediaType: 'application/json',
    },
    {
      path: 'fragments/methods.tex',
      contents: 'Verified methods.\n',
      mediaType: 'application/x-tex',
    },
    {
      path: 'fragments/results.tex',
      contents: 'Verified results.\n',
      mediaType: 'application/x-tex',
    },
    {
      path: 'fragments/results-table.tex',
      contents: 'Verified table.\n',
      mediaType: 'application/x-tex',
    },
    {
      path: 'fragments/reproducibility-table.tex',
      contents: 'Verified provenance.\n',
      mediaType: 'application/x-tex',
    },
    {
      path: 'figures/paired-effects.svg',
      contents: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="5"/></svg>\n',
      mediaType: 'image/svg+xml',
    },
  ];
  if (mode === 'publication') {
    files.push(
      {
        path: 'fragments/calibration.tex',
        contents: 'Held-out calibration.\n',
        mediaType: 'application/x-tex',
      },
      {
        path: 'figures/calibration-holdout.svg',
        contents: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20"/></svg>\n',
        mediaType: 'image/svg+xml',
      },
    );
  }
  for (const file of files) {
    const absolutePath = path.join(bundleDir, file.path);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, file.contents);
  }
  const manifest: PublicationBundleManifest = {
    schemaVersion: '1.2.0',
    campaignId,
    generatedAt: '2026-07-18T00:00:00.000Z',
    sourceCampaign: {
      identitySha256: mode === 'publication' ? 'b'.repeat(64) : 'c'.repeat(64),
      manifestSha256: 'd'.repeat(64),
      analysisPath: 'analysis.json',
      analysisSha256: 'a'.repeat(64),
      claimsPath: 'claims.json',
      claimsSha256: sha256File(path.join(bundleDir, 'claims.json')),
      gitCommit: 'e'.repeat(40),
      runCount: mode === 'publication' ? 400 : 100,
    },
    scope: {
      mode,
      publicationRole: role,
      experimentIds: [`${mode}-experiment`],
      claimIds: [claimId],
    },
    files: files.map(file => {
      const absolutePath = path.join(bundleDir, file.path);
      return {
        path: file.path,
        bytes: fs.statSync(absolutePath).size,
        sha256: sha256File(absolutePath),
        mediaType: file.mediaType,
      };
    }),
  };
  writeJsonAtomic(path.join(bundleDir, 'publication-manifest.json'), manifest);
  return bundleDir;
}

describe('manuscript assembly', () => {
  it('builds and verifies a placeholder-free package from scoped evidence bundles', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dao-manuscript-'));
    temporaryDirectories.push(root);
    const core = createBundle(root, 'publication');
    const supporting = createBundle(root, 'supporting');
    const references = path.join(root, 'references.bib');
    fs.writeFileSync(references, '@misc{fixture,title={Fixture}}\n');
    const output = path.join(root, 'output');

    const manifest = await assembleManuscript({
      coreBundleDir: core,
      supportingBundleDir: supporting,
      outputDir: output,
      referencesPath: references,
    });

    expect(manifest.claimIds).toEqual(['C-CORE-001', 'E-SUPPORT-001']);
    expect(manifest.identitySha256).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyManuscriptPackage(output)).toEqual([]);
    expect(fs.readFileSync(path.join(output, 'sections', 'abstract.tex'), 'utf8'))
      .toContain('400 core simulation runs plus 100 supporting robustness runs');
    expect(fs.existsSync(path.join(output, 'figures', 'core-paired-effects.png')))
      .toBe(true);

    fs.appendFileSync(path.join(output, 'main.tex'), '\nmutation');
    expect(verifyManuscriptPackage(output)).toEqual(expect.arrayContaining([
      'Manuscript file size mismatch: main.tex',
      'Manuscript file hash mismatch: main.tex',
    ]));
    fs.writeFileSync(path.join(output, 'unexpected.txt'), 'not indexed');
    expect(verifyManuscriptPackage(output))
      .toContain('Unindexed manuscript file: unexpected.txt');
  });

  it('creates a minimal, portable, fully indexed arXiv source package', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dao-arxiv-'));
    temporaryDirectories.push(root);
    const manuscript = path.join(root, 'manuscript');
    const references = path.join(root, 'references.bib');
    fs.writeFileSync(references, '@misc{fixture,title={Fixture}}\n');
    await assembleManuscript({
      coreBundleDir: createBundle(root, 'publication'),
      supportingBundleDir: createBundle(root, 'supporting'),
      outputDir: manuscript,
      referencesPath: references,
    });
    const output = path.join(root, 'arxiv');
    const manifest = createArxivPackage(manuscript, output);

    expect(manifest.files.length).toBe(20);
    expect(manifest.totalBytes).toBeGreaterThan(0);
    expect(verifyArxivPackage(output)).toEqual([]);
    expect(fs.existsSync(path.join(output, 'evidence', 'core', 'claims.json'))).toBe(false);

    fs.appendFileSync(path.join(output, 'sections', 'abstract.tex'), '\nC:\\private\\file');
    expect(verifyArxivPackage(output)).toEqual(expect.arrayContaining([
      'arXiv file size mismatch: sections/abstract.tex',
      'arXiv file hash mismatch: sections/abstract.tex',
      'Forbidden Windows absolute path in arXiv file: sections/abstract.tex',
    ]));
  });

  it('compiles only after source verification and records portable PDF provenance', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dao-compile-'));
    temporaryDirectories.push(root);
    const references = path.join(root, 'references.bib');
    fs.writeFileSync(references, '@misc{fixture,title={Fixture}}\n');
    const manuscript = path.join(root, 'manuscript');
    const assembled = await assembleManuscript({
      coreBundleDir: createBundle(root, 'publication'),
      supportingBundleDir: createBundle(root, 'supporting'),
      outputDir: manuscript,
      referencesPath: references,
    });
    const build = path.join(root, 'build');
    const commands: string[] = [];
    const report = compileManuscript({
      rootDir: root,
      sourceDir: manuscript,
      buildDir: build,
    }, {
      run(command, args, cwd) {
        commands.push([command, ...args].join(' '));
        fs.writeFileSync(path.join(cwd, 'main.pdf'), '%PDF-1.4\nfixture\n');
        return {
          pid: 1,
          output: [],
          stdout: Buffer.alloc(0),
          stderr: Buffer.alloc(0),
          status: 0,
          signal: null,
          error: undefined,
        } as SpawnSyncReturns<Buffer>;
      },
    });

    expect(commands).toHaveLength(4);
    expect(report.sourcePackage).toBe('manuscript');
    expect(report.sourceIdentitySha256).toBe(assembled.identitySha256);
    expect(report.pdf.bytes).toBeGreaterThan(0);
    expect(report.pdf.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.parse(fs.readFileSync(path.join(build, 'compile-report.json'), 'utf8')))
      .toEqual(report);
  });
});
