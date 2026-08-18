import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadSelectedExperimentConfigs } from '../lib/research/experiment-config-selection';

const temporaryDirectories: string[] = [];

function fixture(files: Record<string, string>): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'experiment-selection-'));
  temporaryDirectories.push(directory);
  for (const [fileName, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(directory, fileName), content, 'utf8');
  }
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('loadSelectedExperimentConfigs', () => {
  it('validates only requested experiments and ignores unselected idless templates', () => {
    const directory = fixture({
      '00-template.yaml': 'name: Academic template\n',
      '01-selected.yaml': 'id: selected\nname: Selected\n',
      '02-other.yaml': 'id: other\nname: Other\n',
    });
    const validate = vi.fn();

    const configs = loadSelectedExperimentConfigs(directory, ['selected'], validate);

    expect(configs.map(item => item.config.id)).toEqual(['selected']);
    expect(validate).toHaveBeenCalledTimes(1);
    expect(validate).toHaveBeenCalledWith(expect.objectContaining({ id: 'selected' }));
  });

  it('still requires stable identifiers when the whole directory is selected', () => {
    const directory = fixture({
      '00-template.yaml': 'name: Academic template\n',
      '01-campaign.yaml': 'id: campaign\nname: Campaign\n',
    });

    expect(() => loadSelectedExperimentConfigs(directory, undefined, vi.fn()))
      .toThrow('Campaign experiment requires a stable id: 00-template.yaml');
  });

  it('rejects missing and duplicate requested identifiers', () => {
    const missingDirectory = fixture({
      '01-campaign.yaml': 'id: campaign\nname: Campaign\n',
    });
    expect(() => loadSelectedExperimentConfigs(missingDirectory, ['absent'], vi.fn()))
      .toThrow('Requested experiment identifiers were not found: absent');

    const duplicateDirectory = fixture({
      '01-a.yaml': 'id: campaign\nname: A\n',
      '02-b.yaml': 'id: campaign\nname: B\n',
    });
    expect(() => loadSelectedExperimentConfigs(duplicateDirectory, ['campaign'], vi.fn()))
      .toThrow('Duplicate requested experiment identifiers: campaign (01-a.yaml, 02-b.yaml)');
  });
});
