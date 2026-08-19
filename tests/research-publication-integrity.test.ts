import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { RESEARCH_STATUS, RESEARCH_STATUS_SUMMARY } from '@/lib/home/research-status';

const root = process.cwd();

describe('public research integrity', () => {
  it('uses one canonical exploratory status', () => {
    expect(RESEARCH_STATUS.legacyExploratoryRuns).toBe(21_869);
    expect(RESEARCH_STATUS.confirmatoryStatus).toMatch(/pending/i);
    expect(RESEARCH_STATUS_SUMMARY).toMatch(/not presented as confirmed causal/i);
  });

  it('does not advertise the missing compiled PDF', () => {
    const publicSources = [
      'app/sitemap.ts',
      'app/robots.ts',
      'app/[locale]/layout.tsx',
      'app/llms.txt/route.ts',
      'lib/home/structured-data.ts',
    ];
    const failures = publicSources.filter(file =>
      fs.readFileSync(path.join(root, file), 'utf8').includes('/api/artifacts/paper/main.pdf'),
    );
    expect(failures).toEqual([]);
  });

  it('does not reintroduce the superseded run count', () => {
    const files = [
      'app/[locale]/page.tsx',
      'app/[locale]/layout.tsx',
      'app/llms.txt/route.ts',
      'lib/home/structured-data.ts',
      'lib/i18n/messages/en.ts',
      'EXPERIMENT_STATUS.md',
      'paper/plain-english/00-main-paper.md',
    ];
    expect(files.map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n')).not.toContain('21,919');
  });
});
