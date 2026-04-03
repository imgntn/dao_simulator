/**
 * Worker Bootstrap for TypeScript
 *
 * This JavaScript file bootstraps the TypeScript worker using tsx.
 * Worker threads don't inherit the --import flag, so we need this wrapper.
 */

import { register } from 'node:module';
import { URL, pathToFileURL } from 'node:url';

// Register tsx for TypeScript support
register('tsx/esm', pathToFileURL('./'));

// Now import and run the actual worker
const workerPath = new URL('./simulation-worker.ts', import.meta.url);
await import(workerPath);
