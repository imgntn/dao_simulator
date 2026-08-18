import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '..');
const INCLUDED_ROOTS = [
  'app',
  'components',
  'lib',
  'scripts',
  'paper',
  'docs',
  'tests',
];
const INCLUDED_FILES = [
  'README.md',
  'SIM_EXPERIENCE_STATUS.md',
  'Dockerfile',
  'Dockerfile.research',
  'docker-compose.yml',
  'compose.research.yml',
];
const OMITTED_DIRECTORIES = new Set(['archive']);
const MARKER = new RegExp(`\\b(?:${['TO', 'DO'].join('')}|${['FIX', 'ME'].join('')})\\b`);

function sourceFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && OMITTED_DIRECTORIES.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

describe('source completeness markers', () => {
  it('contains no unresolved implementation markers in active source or publication files', () => {
    const files = [
      ...INCLUDED_ROOTS.flatMap(root => sourceFiles(path.join(ROOT, root))),
      ...INCLUDED_FILES.map(file => path.join(ROOT, file)).filter(fs.existsSync),
    ];
    const violations = files.flatMap(file => {
      const contents = fs.readFileSync(file, 'utf8');
      return contents
        .split(/\r?\n/)
        .map((line, index) => ({ file: path.relative(ROOT, file), line: index + 1, text: line }))
        .filter(item => MARKER.test(item.text));
    });
    expect(violations).toEqual([]);
  }, 15_000);
});
