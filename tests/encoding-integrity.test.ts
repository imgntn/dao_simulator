import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const SOURCE_ROOTS = [
  'app',
  'components',
  'docs',
  'experiments',
  'lib',
  'paper',
  'scripts',
  'tests',
];
const TEXT_EXTENSIONS = new Set([
  '.css', '.csv', '.json', '.md', '.mjs', '.tex', '.ts', '.tsx', '.yaml', '.yml',
]);
const MOJIBAKE_SIGNATURES = [
  '\u00c2',
  '\u00c3',
  '\u00e2\u20ac',
  '\u00e2\u2022',
  '\u00ef\u00bf\u00bd',
  '\ufffd',
];

function collectTextFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTextFiles(absolute);
    return TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) ? [absolute] : [];
  });
}

describe('UTF-8 source integrity', () => {
  it('contains neither replacement characters nor common double-decoding signatures', () => {
    const failures: string[] = [];
    for (const root of SOURCE_ROOTS) {
      for (const file of collectTextFiles(path.join(ROOT, root))) {
        const contents = fs.readFileSync(file, 'utf8');
        for (const signature of MOJIBAKE_SIGNATURES) {
          if (contents.includes(signature)) {
            failures.push(
              `${path.relative(ROOT, file).replace(/\\/g, '/')}: ${JSON.stringify(signature)}`
            );
          }
        }
      }
    }
    expect(failures).toEqual([]);
  }, 15_000);
});
