import { validateRuntimeEnv } from '../lib/config/env';

const result = validateRuntimeEnv();

for (const warning of result.warnings) {
  console.warn(`[env] warning: ${warning}`);
}

if (!result.ok) {
  for (const error of result.errors) {
    console.error(`[env] error: ${error}`);
  }
  process.exit(1);
}

console.log('[env] runtime environment configuration is valid for the current NODE_ENV.');
