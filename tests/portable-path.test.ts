import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { portableArtifactPath } from '../lib/research/portable-path';

describe('portable artifact paths', () => {
  it('uses forward-slash relative paths inside the release root', () => {
    const root = path.resolve('release-root');
    expect(portableArtifactPath(root, path.join(root, 'artifacts', 'campaign')))
      .toBe('artifacts/campaign');
    expect(portableArtifactPath(root, root)).toBe('.');
  });

  it('redacts parent directories for external inputs', () => {
    const root = path.resolve('release-root');
    const external = path.resolve('..', 'private-inputs', 'campaign-final');
    const portable = portableArtifactPath(root, external);

    expect(portable).toBe('external/campaign-final');
    expect(portable).not.toContain('private-inputs');
    expect(path.isAbsolute(portable)).toBe(false);
  });
});
