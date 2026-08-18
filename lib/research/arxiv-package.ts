import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  canonicalJson,
  copyFileAtomic,
  sha256,
  sha256File,
  writeJsonAtomic,
} from './campaign-manifest';
import {
  verifyManuscriptPackage,
  type ManuscriptPackageManifest,
} from './manuscript-assembly';

export const ARXIV_PACKAGE_SCHEMA_VERSION = '1.0.0';

const REQUIRED_SOURCE_FILES = [
  'main.tex',
  'references.bib',
  'sections/abstract.tex',
  'sections/introduction.tex',
  'sections/methods.tex',
  'sections/discussion.tex',
  'sections/limitations.tex',
  'sections/conclusion.tex',
  'evidence/core/fragments/results.tex',
  'evidence/core/fragments/results-table.tex',
  'evidence/core/fragments/calibration.tex',
  'evidence/core/fragments/reproducibility-table.tex',
  'evidence/supporting/fragments/methods.tex',
  'evidence/supporting/fragments/results.tex',
  'evidence/supporting/fragments/results-table.tex',
  'evidence/supporting/fragments/reproducibility-table.tex',
  'figures/core-paired-effects.png',
  'figures/supporting-paired-effects.png',
  'figures/calibration-holdout.png',
] as const;

const TEXT_FILE = /\.(?:tex|bib|md|json)$/i;
const FORBIDDEN_CONTENT = [
  {
    label: 'placeholder marker',
    pattern: new RegExp(`\\b(?:${['TO', 'DO'].join('')}|${['FIX', 'ME'].join('')}|TBD)\\b`, 'i'),
  },
  { label: 'Windows absolute path', pattern: /(?:^|[\s"'`{(])[A-Za-z]:[\\/]/m },
  { label: 'Windows user profile path', pattern: /[\\/]Users[\\/][^\\/\s]+/i },
  { label: 'Unix home path', pattern: /\/(?:home|Users)\/[^/\s]+/ },
  { label: 'file URI', pattern: /file:\/\//i },
] as const;

interface ArxivPackageFile {
  path: string;
  bytes: number;
  sha256: string;
}

export interface ArxivPackageManifest {
  schemaVersion: string;
  generatedAt: string;
  sourceManuscriptIdentitySha256: string;
  sourceCampaigns: ManuscriptPackageManifest['sourceBundles'];
  claimIds: string[];
  files: ArxivPackageFile[];
  totalBytes: number;
  identitySha256: string;
}

export function createArxivPackage(
  sourceDir: string,
  outputDir: string,
): ArxivPackageManifest {
  const source = path.resolve(sourceDir);
  const output = path.resolve(outputDir);
  const sourceErrors = verifyManuscriptPackage(source);
  if (sourceErrors.length > 0) {
    throw new Error(`Source manuscript verification failed: ${sourceErrors.join('; ')}`);
  }
  assertEmptyDirectory(output);
  const sourceManifest = readJson<ManuscriptPackageManifest>(
    path.join(source, 'manuscript-manifest.json'),
  );

  for (const relativePath of REQUIRED_SOURCE_FILES) {
    const sourcePath = containedFile(source, relativePath);
    const stat = fs.lstatSync(sourcePath);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error(`arXiv source is not a regular file: ${relativePath}`);
    }
    copyFileAtomic(sourcePath, containedFile(output, relativePath, false));
  }
  writeReadme(output, sourceManifest);
  assertSafeTextFiles(output);

  const files = listRegularFiles(output).map(relativePath => {
    const absolutePath = containedFile(output, relativePath);
    return {
      path: relativePath,
      bytes: fs.statSync(absolutePath).size,
      sha256: sha256File(absolutePath),
    };
  });
  const identityPayload = {
    schemaVersion: ARXIV_PACKAGE_SCHEMA_VERSION,
    sourceManuscriptIdentitySha256: sourceManifest.identitySha256,
    sourceCampaigns: sourceManifest.sourceBundles,
    claimIds: [...sourceManifest.claimIds].sort(),
    files,
  };
  const manifest: ArxivPackageManifest = {
    ...identityPayload,
    generatedAt: sourceManifest.generatedAt,
    totalBytes: files.reduce((total, file) => total + file.bytes, 0),
    identitySha256: sha256(canonicalJson(identityPayload)),
  };
  writeJsonAtomic(path.join(output, 'arxiv-manifest.json'), manifest);
  const verification = verifyArxivPackage(output);
  if (verification.length > 0) {
    throw new Error(`Generated arXiv package failed verification: ${verification.join('; ')}`);
  }
  return manifest;
}

export function verifyArxivPackage(outputDir: string): string[] {
  const root = path.resolve(outputDir);
  const errors: string[] = [];
  const manifestPath = path.join(root, 'arxiv-manifest.json');
  if (!fs.existsSync(manifestPath)) return ['Missing arxiv-manifest.json'];
  let manifest: ArxivPackageManifest;
  try {
    manifest = readJson<ArxivPackageManifest>(manifestPath);
  } catch {
    return ['Invalid arxiv-manifest.json'];
  }
  if (manifest.schemaVersion !== ARXIV_PACKAGE_SCHEMA_VERSION) {
    errors.push(`Unsupported arXiv package schema: ${manifest.schemaVersion}`);
  }

  const indexed = new Set<string>();
  for (const file of manifest.files ?? []) {
    if (indexed.has(file.path)) errors.push(`Duplicate arXiv file: ${file.path}`);
    indexed.add(file.path);
    try {
      const absolutePath = containedFile(root, file.path);
      const stat = fs.lstatSync(absolutePath);
      if (!stat.isFile() || stat.isSymbolicLink()) {
        errors.push(`arXiv entry is not a regular file: ${file.path}`);
        continue;
      }
      if (stat.size !== file.bytes) errors.push(`arXiv file size mismatch: ${file.path}`);
      if (sha256File(absolutePath) !== file.sha256) {
        errors.push(`arXiv file hash mismatch: ${file.path}`);
      }
    } catch {
      errors.push(`Missing or unsafe arXiv file: ${file.path}`);
    }
  }
  for (const required of [...REQUIRED_SOURCE_FILES, 'README.md']) {
    if (!indexed.has(required)) errors.push(`Required arXiv file is not indexed: ${required}`);
  }
  for (const relativePath of listRegularFiles(root)) {
    if (relativePath !== 'arxiv-manifest.json' && !indexed.has(relativePath)) {
      errors.push(`Unindexed arXiv file: ${relativePath}`);
    }
  }
  const calculatedTotal = (manifest.files ?? [])
    .reduce((total, file) => total + file.bytes, 0);
  if (manifest.totalBytes !== calculatedTotal) errors.push('arXiv total byte count mismatch');
  const identityPayload = {
    schemaVersion: manifest.schemaVersion,
    sourceManuscriptIdentitySha256: manifest.sourceManuscriptIdentitySha256,
    sourceCampaigns: manifest.sourceCampaigns,
    claimIds: [...(manifest.claimIds ?? [])].sort(),
    files: manifest.files,
  };
  if (sha256(canonicalJson(identityPayload)) !== manifest.identitySha256) {
    errors.push('arXiv package identity mismatch');
  }
  try {
    assertSafeTextFiles(root);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return errors;
}

function writeReadme(root: string, source: ManuscriptPackageManifest): void {
  const contents = [
    '# arXiv source package',
    '',
    'This minimal package is generated from a verified manuscript package.',
    `Source manuscript identity: \`${source.identitySha256}\``,
    '',
    'Compile with pdflatex, bibtex, pdflatex, and pdflatex.',
    'The JSON manifest records every submitted source file and its SHA-256 digest.',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(root, 'README.md'), contents, 'utf8');
}

function assertSafeTextFiles(root: string): void {
  for (const relativePath of listRegularFiles(root)) {
    if (!TEXT_FILE.test(relativePath) || relativePath === 'arxiv-manifest.json') continue;
    const contents = fs.readFileSync(containedFile(root, relativePath), 'utf8');
    for (const forbidden of FORBIDDEN_CONTENT) {
      if (forbidden.pattern.test(contents)) {
        throw new Error(`Forbidden ${forbidden.label} in arXiv file: ${relativePath}`);
      }
    }
  }
}

function listRegularFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const output: string[] = [];
  const pending = [root];
  while (pending.length > 0) {
    const directory = pending.pop()!;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`Symbolic links are forbidden in arXiv package: ${absolutePath}`);
      }
      if (entry.isDirectory()) pending.push(absolutePath);
      else if (entry.isFile()) {
        output.push(path.relative(root, absolutePath).replaceAll(path.sep, '/'));
      }
    }
  }
  return output.sort((left, right) => left.localeCompare(right));
}

function assertEmptyDirectory(directory: string): void {
  if (fs.existsSync(directory) && fs.readdirSync(directory).length > 0) {
    throw new Error(`arXiv output directory is not empty: ${directory}`);
  }
  fs.mkdirSync(directory, { recursive: true });
}

function containedFile(root: string, relativePath: string, mustExist = true): string {
  if (!relativePath || path.isAbsolute(relativePath)) {
    throw new Error(`Unsafe arXiv relative path: ${relativePath}`);
  }
  const absoluteRoot = path.resolve(root);
  const absolutePath = path.resolve(absoluteRoot, relativePath);
  if (!absolutePath.startsWith(`${absoluteRoot}${path.sep}`)) {
    throw new Error(`arXiv path escapes package: ${relativePath}`);
  }
  if (mustExist && !fs.existsSync(absolutePath)) {
    throw new Error(`Missing arXiv file: ${relativePath}`);
  }
  return absolutePath;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}
