import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ReleaseAuditFinding {
  severity: 'error' | 'warning';
  rule: string;
  source: 'working-tree' | 'release-artifact' | 'git-history' | 'license';
  path?: string;
  commit?: string;
  line?: number;
  fingerprint?: string;
  detail: string;
}

export interface ReleaseAuditReport {
  schemaVersion: '1.1.0';
  generatedAt: string;
  gitCommit: string;
  worktreeDirty: boolean;
  passed: boolean;
  trackedFilesScanned: number;
  releaseArtifactFilesScanned: number;
  historyCommitsScanned: number;
  dependencies: {
    packagesScanned: number;
    licenses: Record<string, number>;
    inferredLicenses: Array<{ name: string; version: string; license: string }>;
  };
  findings: ReleaseAuditFinding[];
}

export interface ReleaseAuditOptions {
  artifactRoots?: string[];
}

interface SecretRule {
  id: string;
  pattern: RegExp;
  historyPickaxePattern: string;
  detail: string;
}

const SECRET_RULES: SecretRule[] = [
  {
    id: 'private-key',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    historyPickaxePattern: '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----',
    detail: 'Private-key material is present.',
  },
  {
    id: 'aws-access-key',
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
    historyPickaxePattern: '(^|[^A-Z0-9])(AKIA|ASIA)[A-Z0-9]{16}([^A-Z0-9]|$)',
    detail: 'An AWS access-key identifier is present.',
  },
  {
    id: 'github-token',
    pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g,
    historyPickaxePattern: '(^|[^A-Za-z0-9_])gh[pousr]_[A-Za-z0-9_]{20,}([^A-Za-z0-9_]|$)',
    detail: 'A GitHub token is present.',
  },
  {
    id: 'provider-token',
    pattern: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}\b|\bsk-[A-Za-z0-9_-]{32,}\b/g,
    historyPickaxePattern: '(^|[^A-Za-z0-9_-])((sk|rk)_(live|test)_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9_-]{32,})([^A-Za-z0-9_-]|$)',
    detail: 'A provider credential is present.',
  },
  {
    id: 'jwt',
    pattern: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/g,
    historyPickaxePattern: '(^|[^A-Za-z0-9_-])eyJ[A-Za-z0-9_-]{20,}\\.[A-Za-z0-9_-]{20,}\\.[A-Za-z0-9_-]{10,}([^A-Za-z0-9_-]|$)',
    detail: 'A serialized JWT is present.',
  },
];

const PRIVATE_PATH_RULE = new RegExp(
  String.raw`(?:[A-Za-z]:\\{1,2}Users\\{1,2}[^\\\r\n]+\\{1,2}|(?<![A-Za-z0-9_.-])\/(?:Users|home)\/[^/\r\n]+\/)`,
  'g',
);
const PRIVATE_PATH_HISTORY_PATTERN =
  '([A-Za-z]:\\\\Users\\\\[^\\\\]+\\\\|(^|[[:space:]"=:(])/(Users|home)/[^/]+/)';
const TEXT_LIMIT_BYTES = 2 * 1024 * 1024;

export function auditPublicationText(
  text: string,
  pathLabel = 'input',
): ReleaseAuditFinding[] {
  const findings: ReleaseAuditFinding[] = [];
  scanText(text, {
    source: 'working-tree',
    path: pathLabel,
    privatePathSeverity: 'error',
    findings,
  });
  return findings;
}

export function auditPublicationRelease(
  rootDir: string,
  options: ReleaseAuditOptions = {},
): ReleaseAuditReport {
  const root = path.resolve(rootDir);
  const findings: ReleaseAuditFinding[] = [];
  const trackedFiles = git(root, ['ls-files', '-z']).split('\0').filter(Boolean);
  for (const relativePath of trackedFiles) {
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).size > TEXT_LIMIT_BYTES) continue;
    const content = fs.readFileSync(absolutePath);
    if (content.includes(0)) continue;
    findings.push(...auditPublicationText(
      content.toString('utf8'),
      relativePath.replace(/\\/g, '/'),
    ));
  }
  const releaseArtifacts = auditReleaseArtifactRoots(root, options.artifactRoots ?? []);
  findings.push(...releaseArtifacts.findings);
  const releaseArtifactFilesScanned = releaseArtifacts.filesScanned;

  const historyCommits = git(root, ['rev-list', '--all']).split(/\r?\n/).filter(Boolean);
  const secretHistoryPattern = SECRET_RULES
    .map(rule => `(${rule.historyPickaxePattern})`)
    .join('|');
  scanGitHistoryByPickaxe(root, secretHistoryPattern, finding => {
    findings.push({
      severity: 'error',
      rule: 'historical-sensitive-signature',
      source: 'git-history',
      path: finding.path,
      commit: finding.commit,
      detail: 'A credential-like signature was added to or removed from this path in Git history.',
    });
  });
  scanGitHistoryByPickaxe(root, PRIVATE_PATH_HISTORY_PATTERN, finding => {
    findings.push({
      severity: 'warning',
      rule: 'private-absolute-path',
      source: 'git-history',
      path: finding.path,
      commit: finding.commit,
      detail: 'A user-specific absolute path remains in Git history; release notes must disclose that history is not path-sanitized.',
    });
  });

  auditRepositoryLicensing(root, findings);
  const dependencies = auditDependencyLicenses(root, findings);
  const uniqueFindings = deduplicateFindings(findings);
  const worktreeDirty = git(root, ['status', '--porcelain']).trim().length > 0;
  if (worktreeDirty) {
    uniqueFindings.push({
      severity: 'error',
      rule: 'dirty-worktree',
      source: 'working-tree',
      detail: 'Publication release audit requires a clean worktree.',
    });
  }

  return {
    schemaVersion: '1.1.0',
    generatedAt: new Date().toISOString(),
    gitCommit: git(root, ['rev-parse', 'HEAD']).trim(),
    worktreeDirty,
    passed: !uniqueFindings.some(finding => finding.severity === 'error'),
    trackedFilesScanned: trackedFiles.length,
    releaseArtifactFilesScanned,
    historyCommitsScanned: historyCommits.length,
    dependencies,
    findings: uniqueFindings.sort((left, right) =>
      `${left.severity}:${left.rule}:${left.path ?? ''}:${left.commit ?? ''}`
        .localeCompare(`${right.severity}:${right.rule}:${right.path ?? ''}:${right.commit ?? ''}`)
    ),
  };
}

export function auditReleaseArtifactRoots(
  repositoryRoot: string,
  artifactRoots: string[],
): { filesScanned: number; findings: ReleaseAuditFinding[] } {
  const root = path.resolve(repositoryRoot);
  const findings: ReleaseAuditFinding[] = [];
  let filesScanned = 0;
  for (const artifactRoot of artifactRoots) {
    const absoluteRoot = path.resolve(root, artifactRoot);
    if (!fs.existsSync(absoluteRoot)) {
      findings.push({
        severity: 'error',
        rule: 'release-artifact-missing',
        source: 'release-artifact',
        path: portablePath(root, absoluteRoot),
        detail: 'A requested release-artifact root does not exist.',
      });
      continue;
    }
    for (const artifactPath of releaseArtifactFiles(absoluteRoot, findings, root)) {
      filesScanned += 1;
      const stat = fs.statSync(artifactPath);
      if (stat.size > TEXT_LIMIT_BYTES) continue;
      const content = fs.readFileSync(artifactPath);
      if (content.includes(0)) continue;
      scanText(content.toString('utf8'), {
        source: 'release-artifact',
        path: portablePath(root, artifactPath),
        privatePathSeverity: 'error',
        findings,
      });
    }
  }
  return { filesScanned, findings: deduplicateFindings(findings) };
}

function scanGitHistoryByPickaxe(
  root: string,
  pattern: string,
  onFinding: (finding: { commit: string; path: string }) => void,
): void {
  const output = git(root, [
    'log',
    '--all',
    '--pickaxe-regex',
    `-S${pattern}`,
    '--name-only',
    '--format=commit:%H',
    '--no-renames',
    '--',
    '.',
  ]);
  let commit = '';
  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith('commit:')) {
      commit = line.slice('commit:'.length);
    } else if (commit && line) {
      onFinding({ commit, path: line.replace(/\\/g, '/') });
    }
  }
}

function scanText(
  text: string,
  options: {
    source: 'working-tree' | 'release-artifact' | 'git-history';
    path: string;
    commit?: string;
    privatePathSeverity: 'error' | 'warning';
    findings: ReleaseAuditFinding[];
  },
): void {
  for (const rule of SECRET_RULES) {
    for (const match of text.matchAll(rule.pattern)) {
      options.findings.push({
        severity: 'error',
        rule: rule.id,
        source: options.source,
        path: options.path,
        commit: options.commit,
        line: options.source !== 'git-history'
          ? text.slice(0, match.index).split(/\r?\n/).length
          : undefined,
        fingerprint: fingerprint(match[0]),
        detail: rule.detail,
      });
    }
  }
  for (const match of text.matchAll(PRIVATE_PATH_RULE)) {
    options.findings.push({
      severity: options.privatePathSeverity,
      rule: 'private-absolute-path',
      source: options.source,
      path: options.path,
      commit: options.commit,
      line: options.source !== 'git-history'
        ? text.slice(0, match.index).split(/\r?\n/).length
        : undefined,
      fingerprint: fingerprint(match[0]),
      detail: options.source !== 'git-history'
        ? 'A user-specific absolute path is present in tracked content.'
        : 'A user-specific absolute path remains in Git history; release notes must disclose that history is not path-sanitized.',
    });
  }
}

function releaseArtifactFiles(
  root: string,
  findings: ReleaseAuditFinding[],
  repositoryRoot: string,
): string[] {
  if (fs.statSync(root).isFile()) return [root];
  const files: string[] = [];
  const pending = [root];
  while (pending.length > 0) {
    const directory = pending.pop()!;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        findings.push({
          severity: 'error',
          rule: 'release-artifact-symlink',
          source: 'release-artifact',
          path: portablePath(repositoryRoot, absolutePath),
          detail: 'Release artifacts must not contain symbolic links or junctions.',
        });
      } else if (entry.isDirectory()) {
        pending.push(absolutePath);
      } else if (entry.isFile()) {
        files.push(absolutePath);
      }
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function portablePath(root: string, target: string): string {
  const relative = path.relative(root, target);
  if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
    return relative.replace(/\\/g, '/');
  }
  return `external/${path.basename(target)}`;
}

function auditRepositoryLicensing(root: string, findings: ReleaseAuditFinding[]): void {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as {
    license?: string;
  };
  if (packageJson.license !== 'AGPL-3.0-or-later') {
    findings.push({
      severity: 'error',
      rule: 'repository-license',
      source: 'license',
      detail: 'package.json must declare AGPL-3.0-or-later.',
    });
  }
  const licensePath = path.join(root, 'LICENSE');
  if (
    !fs.existsSync(licensePath)
    || !fs.readFileSync(licensePath, 'utf8').includes('GNU AFFERO GENERAL PUBLIC LICENSE')
  ) {
    findings.push({
      severity: 'error',
      rule: 'license-file',
      source: 'license',
      detail: 'The AGPL license text is missing or invalid.',
    });
  }
  for (const required of [
    'docs/HISTORICAL_DATA_SOURCE_LEDGER.md',
    'docs/RELEASE_ASSET_CLASSIFICATION.md',
  ]) {
    if (!fs.existsSync(path.join(root, required))) {
      findings.push({
        severity: 'error',
        rule: 'data-rights-documentation',
        source: 'license',
        path: required,
        detail: 'Required release-rights documentation is missing.',
      });
    }
  }
}

function auditDependencyLicenses(
  root: string,
  findings: ReleaseAuditFinding[],
): ReleaseAuditReport['dependencies'] {
  const npmCli = process.env.npm_execpath
    ?? path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  if (!fs.existsSync(npmCli)) {
    throw new Error('The npm CLI entry point could not be located for dependency-license inspection.');
  }
  const packages = JSON.parse(runCommand(
    root,
    process.execPath,
    [npmCli, 'query', '*', '--json'],
    64 * 1024 * 1024,
  )) as Array<{
    name: string;
    version: string;
    license?: string;
    path: string;
  }>;
  const licenses: Record<string, number> = {};
  const inferredLicenses: Array<{ name: string; version: string; license: string }> = [];
  for (const dependency of packages) {
    let license = dependency.license?.trim();
    if (!license) {
      license = inferLicenseFromFiles(dependency.path);
      if (license) {
        inferredLicenses.push({
          name: dependency.name,
          version: dependency.version,
          license,
        });
      }
    }
    if (!license) {
      findings.push({
        severity: 'error',
        rule: 'dependency-license-missing',
        source: 'license',
        detail: `${dependency.name}@${dependency.version} has no declared or bundled recognizable license.`,
      });
      continue;
    }
    licenses[license] = (licenses[license] ?? 0) + 1;
    if (/(?:UNLICENSED|PROPRIETARY|SEE LICENSE IN)/i.test(license)) {
      findings.push({
        severity: 'error',
        rule: 'dependency-license-restricted',
        source: 'license',
        detail: `${dependency.name}@${dependency.version} declares restricted license metadata: ${license}.`,
      });
    }
  }
  return {
    packagesScanned: packages.length,
    licenses: Object.fromEntries(Object.entries(licenses).sort(([left], [right]) =>
      left.localeCompare(right)
    )),
    inferredLicenses: inferredLicenses.sort((left, right) => left.name.localeCompare(right.name)),
  };
}

function inferLicenseFromFiles(packageDir: string): string | undefined {
  for (const fileName of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING']) {
    const filePath = path.join(packageDir, fileName);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8').slice(0, 1000);
    if (/MIT License/i.test(content)) return 'MIT (bundled file)';
    if (/Apache License.*Version 2/i.test(content)) return 'Apache-2.0 (bundled file)';
    if (/BSD 3-Clause/i.test(content)) return 'BSD-3-Clause (bundled file)';
  }
  return undefined;
}

function deduplicateFindings(findings: ReleaseAuditFinding[]): ReleaseAuditFinding[] {
  const byIdentity = new Map<string, ReleaseAuditFinding>();
  for (const finding of findings) {
    const identity = [
      finding.severity,
      finding.rule,
      finding.source,
      finding.path,
      finding.commit,
      finding.fingerprint,
    ].join(':');
    if (!byIdentity.has(identity)) byIdentity.set(identity, finding);
  }
  return [...byIdentity.values()];
}

function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function git(root: string, args: string[]): string {
  return runCommand(root, 'git', args, 16 * 1024 * 1024);
}

function runCommand(
  root: string,
  executable: string,
  args: string[],
  maxBuffer: number,
): string {
  try {
    return execFileSync(executable, args, {
      cwd: root,
      encoding: 'utf8',
      maxBuffer,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw new Error(`${path.basename(executable)} command failed while running the publication release audit.`);
  }
}
