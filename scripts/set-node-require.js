// Preload script to expose Node's require for ESM contexts
// This satisfies the CalibrationLoader's fallback when globalThis.__nodeRequire is missing.
global.__nodeRequire = require;
