import { describe, expect, it } from 'vitest';
import {
  isSafePath,
  sanitizeFilename,
  validateDirectory,
  validateFile,
} from '@/lib/utils/path-utils';

describe('path utilities', () => {
  it('accepts safe relative paths inside the allowed base', () => {
    expect(validateDirectory('results/run-1', 'results')).toBe('results/run-1');
    expect(validateFile('results/run-1/status.json', 'results')).toBe(
      'results/run-1/status.json'
    );
  });

  it('rejects sibling prefixes outside the allowed base', () => {
    expect(() => validateDirectory('results-old/run-1', 'results')).toThrow(
      /outside allowed directory/
    );
  });

  it('rejects traversal and absolute paths', () => {
    expect(() => validateFile('results/../secrets.txt')).toThrow(
      /unsafe components/
    );
    expect(isSafePath('/etc/passwd')).toBe(false);
    expect(isSafePath('C:\\secrets\\file.txt')).toBe(false);
    expect(isSafePath('results/run-1/status.json')).toBe(true);
  });

  it('sanitizes filenames for display or generated artifacts', () => {
    expect(sanitizeFilename('../bad:name?.json')).toBe('._bad_name_.json');
  });
});
