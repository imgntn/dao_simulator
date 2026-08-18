import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';

export interface IdentifiedExperimentConfig {
  id?: string;
}

export interface SelectedExperimentConfig<T extends IdentifiedExperimentConfig> {
  sourcePath: string;
  fileName: string;
  config: T;
}

/**
 * Load campaign configuration files while applying selection before semantic
 * validation. This lets a directory contain non-campaign YAML templates
 * without allowing an unselected template to block a targeted campaign.
 */
export function loadSelectedExperimentConfigs<T extends IdentifiedExperimentConfig>(
  configDir: string,
  selectedIds: string[] | undefined,
  validate: (config: T) => void,
): Array<SelectedExperimentConfig<T>> {
  const absoluteDir = path.resolve(configDir);
  if (!fs.existsSync(absoluteDir)) {
    throw new Error(`Experiment directory does not exist: ${configDir}`);
  }
  const files = fs.readdirSync(absoluteDir)
    .filter(fileName => /\.ya?ml$/i.test(fileName))
    .sort((left, right) => left.localeCompare(right));
  if (files.length === 0) {
    throw new Error(`No experiment configurations found in ${configDir}`);
  }

  const requested = selectedIds?.length ? new Set(selectedIds) : undefined;
  const selected: Array<SelectedExperimentConfig<T>> = [];
  for (const fileName of files) {
    const sourcePath = path.join(absoluteDir, fileName);
    const config = yaml.parse(fs.readFileSync(sourcePath, 'utf8')) as T;
    const id = config.id?.trim();
    if (requested && (!id || !requested.has(id))) continue;
    if (!id) {
      throw new Error(`Campaign experiment requires a stable id: ${fileName}`);
    }
    validate(config);
    selected.push({ sourcePath, fileName, config });
  }

  if (requested) {
    const selectedIdsByFile = new Map<string, string[]>();
    for (const item of selected) {
      const id = item.config.id!.trim();
      selectedIdsByFile.set(id, [...(selectedIdsByFile.get(id) ?? []), item.fileName]);
    }
    const duplicates = [...selectedIdsByFile.entries()]
      .filter(([, fileNames]) => fileNames.length > 1)
      .map(([id, fileNames]) => `${id} (${fileNames.join(', ')})`);
    if (duplicates.length > 0) {
      throw new Error(`Duplicate requested experiment identifiers: ${duplicates.join('; ')}`);
    }
    const missing = [...requested].filter(id => !selectedIdsByFile.has(id));
    if (missing.length > 0) {
      throw new Error(`Requested experiment identifiers were not found: ${missing.join(', ')}`);
    }
  }

  return selected;
}
