import type { ResearchConfig } from './config-resolver';

function setNestedProperty(obj: Record<string, any>, path: string, value: any): void {
  const parts = path.split('.');
  let current: Record<string, any> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
}

export function applySweepValue(config: ResearchConfig, path: string, value: any): void {
  setNestedProperty(config, path, value);
}
