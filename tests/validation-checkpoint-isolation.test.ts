import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('validation checkpoint isolation', () => {
  it('passes a run-scoped checkpoint directory to every validation experiment', () => {
    const source = fs.readFileSync(
      path.resolve('scripts', 'run-validation.ts'),
      'utf8',
    ).replaceAll('\r\n', '\n');
    expect(source).toContain("RESULTS_DIR,\n    '.checkpoints',");
    expect(source).toContain("'--checkpoint-dir',\n      checkpointDir");
  });

  it('supports an explicit checkpoint directory in the experiment CLI', () => {
    const source = fs.readFileSync(
      path.resolve('scripts', 'run-experiment.ts'),
      'utf8',
    );
    expect(source).toContain("case '--checkpoint-dir':");
    expect(source).toContain('checkpointDir: args.checkpointDir');
  });
});
