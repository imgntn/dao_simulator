import type { ResearchConfig } from './config-resolver';

function setNestedProperty(obj: Record<string, any>, parts: string[], value: any): void {
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

export function applySweepValue(config: any, paramPath: string, value: any): any {
  const result = JSON.parse(JSON.stringify(config)); // deep clone
  const parts = paramPath.split('.');

  // Validate that the path exists in the original config (warn if creating new)
  let checkObj = config;
  let pathExists = true;
  for (let i = 0; i < parts.length - 1; i++) {
    if (checkObj && typeof checkObj === 'object' && parts[i] in checkObj) {
      checkObj = checkObj[parts[i]];
    } else {
      pathExists = false;
      break;
    }
  }
  if (!pathExists) {
    console.warn(`[sweep-mapper] Warning: path "${paramPath}" does not exist in base config. Creating new property.`);
  }

  setNestedProperty(result, parts, value);
  return result;
}
