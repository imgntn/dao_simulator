import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  parseReproductionArgs,
  reproductionEngineeringCommands,
  reproductionUsage,
} from '../lib/research/reproduction';

describe('publication reproduction interface', () => {
  it('resolves deterministic default output and report locations', () => {
    const root = path.resolve('fixture-root');
    const parsed = parseReproductionArgs(
      ['--campaign', 'artifacts/campaigns/final-001'],
      root,
    );
    expect('help' in parsed).toBe(false);
    if ('help' in parsed) return;
    expect(parsed.profile).toBe('artifacts');
    expect(parsed.campaignDir).toBe(
      path.resolve(root, 'artifacts/campaigns/final-001'),
    );
    expect(parsed.outputDir).toBe(
      path.resolve(root, 'publication/campaigns/final-001'),
    );
    expect(parsed.reportPath).toBe(
      path.resolve(root, 'results/reproduction/final-001-artifacts.json'),
    );
  });

  it('rejects unknown profiles and missing campaign paths', () => {
    expect(() => parseReproductionArgs([])).toThrow('Missing required --campaign');
    expect(() =>
      parseReproductionArgs(['--campaign', 'x', '--profile', 'partial']),
    ).toThrow('Unsupported reproduction profile');
  });

  it('defines a complete platform-specific engineering gate sequence', () => {
    expect(reproductionEngineeringCommands('linux').map(item => item.id)).toEqual([
      'lint',
      'typecheck',
      'unit-tests',
      'python-tests',
      'application-build',
    ]);
    expect(reproductionEngineeringCommands('win32')[0].command).toBe('npm.cmd');
    expect(reproductionEngineeringCommands('linux')[0].command).toBe('npm');
    expect(reproductionEngineeringCommands('linux')[3].command).toBe('python3');
  });

  it('offers a non-mutating help path', () => {
    expect(parseReproductionArgs(['--help'])).toEqual({ help: true });
    expect(reproductionUsage()).toContain('--profile <name>');
  });
});
