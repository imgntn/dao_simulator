/**
 * Vitest setup file
 *
 * Makes `require` available globally so that CalibrationLoader's
 * `new Function('return require("fs")')()` trick works in ESM mode.
 * The library uses this pattern to hide require() from bundlers (Turbopack/webpack)
 * while still allowing Node.js filesystem access for calibration profiles.
 */
import { createRequire } from 'node:module';

(globalThis as any).require = createRequire(import.meta.url);
