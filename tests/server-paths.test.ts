import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isPathInside } from '@/lib/utils/server-paths';

describe('server path containment', () => {
  it('allows the base path itself', () => {
    const base = path.resolve('/repo/results');
    expect(isPathInside(base, base)).toBe(true);
  });

  it('allows nested paths', () => {
    const base = path.resolve('/repo/results');
    expect(isPathInside(base, path.join(base, 'run-1', 'status.json'))).toBe(true);
  });

  it('rejects sibling paths with the same prefix', () => {
    const base = path.resolve('/repo/results');
    const sibling = path.resolve('/repo/results-old/status.json');
    expect(isPathInside(base, sibling)).toBe(false);
  });

  it('rejects traversal outside the base path', () => {
    const base = path.resolve('/repo/results');
    const escaped = path.resolve(base, '..', 'secrets', 'status.json');
    expect(isPathInside(base, escaped)).toBe(false);
  });
});
