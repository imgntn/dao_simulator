// Path validation utilities
// Port from utils/path_utils.py

/**
 * Validate that a path string is safe and within allowed directory
 * Note: In browser environment, this is mostly for validation
 * Server-side validation should use Node.js path module
 */
export function validateDirectory(
  pathStr: string,
  allowedBase?: string
): string {
  // Basic path traversal protection
  if (pathStr.includes('..')) {
    throw new Error(`Path contains unsafe components: ${pathStr}`);
  }

  if (allowedBase && !pathStr.startsWith(allowedBase)) {
    throw new Error(`Path is outside allowed directory: ${pathStr}`);
  }

  return pathStr;
}

/**
 * Validate that a file path is safe
 */
export function validateFile(
  pathStr: string,
  allowedBase?: string
): string {
  // Basic path traversal protection
  if (pathStr.includes('..')) {
    throw new Error(`Path contains unsafe components: ${pathStr}`);
  }

  if (allowedBase && !pathStr.startsWith(allowedBase)) {
    throw new Error(`Path is outside allowed directory: ${pathStr}`);
  }

  return pathStr;
}

/**
 * Sanitize a filename for safe use
 */
export function sanitizeFilename(filename: string): string {
  // Remove or replace unsafe characters
  return filename
    .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 255); // Limit length
}

/**
 * Check if a path is safe (no traversal attempts)
 */
export function isSafePath(pathStr: string): boolean {
  return !pathStr.includes('..') && !pathStr.startsWith('/');
}
