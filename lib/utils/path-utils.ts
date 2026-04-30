// Path validation utilities
// Port from utils/path_utils.py

function normalizePathString(pathStr: string): string {
  return pathStr.replace(/\\/g, '/').replace(/\/+/g, '/');
}

function hasTraversalSegment(pathStr: string): boolean {
  return normalizePathString(pathStr).split('/').some((segment) => segment === '..');
}

function isAbsolutePath(pathStr: string): boolean {
  const normalized = normalizePathString(pathStr);
  return normalized.startsWith('/') || /^[a-zA-Z]:\//.test(normalized);
}

function isInsideAllowedBase(pathStr: string, allowedBase: string): boolean {
  const normalizedPath = normalizePathString(pathStr).replace(/\/$/, '');
  const normalizedBase = normalizePathString(allowedBase).replace(/\/$/, '');
  return normalizedPath === normalizedBase || normalizedPath.startsWith(`${normalizedBase}/`);
}

function validateSafeRelativePath(pathStr: string, allowedBase?: string): string {
  if (hasTraversalSegment(pathStr) || isAbsolutePath(pathStr)) {
    throw new Error(`Path contains unsafe components: ${pathStr}`);
  }

  if (allowedBase && !isInsideAllowedBase(pathStr, allowedBase)) {
    throw new Error(`Path is outside allowed directory: ${pathStr}`);
  }

  return pathStr;
}

/**
 * Validate that a path string is safe and within allowed directory.
 * Server-side file access should prefer lib/utils/server-paths.ts.
 */
export function validateDirectory(
  pathStr: string,
  allowedBase?: string
): string {
  return validateSafeRelativePath(pathStr, allowedBase);
}

/**
 * Validate that a file path is safe
 */
export function validateFile(
  pathStr: string,
  allowedBase?: string
): string {
  return validateSafeRelativePath(pathStr, allowedBase);
}

/**
 * Sanitize a filename for safe use
 */
export function sanitizeFilename(filename: string): string {
  // Remove or replace unsafe characters
  return filename
    .replace(/[^a-zA-Z0-9_.-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 255); // Limit length
}

/**
 * Check if a path is safe (no traversal attempts)
 */
export function isSafePath(pathStr: string): boolean {
  return !hasTraversalSegment(pathStr) && !isAbsolutePath(pathStr);
}
