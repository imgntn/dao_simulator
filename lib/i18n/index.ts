/**
 * Internationalization (i18n) Module
 *
 * Provides centralized access to all UI strings with type-safe access
 * and format string support.
 *
 * @example
 * // Basic usage
 * import { messages as m } from '@/lib/i18n';
 * <button>{m.controls.start}</button>
 *
 * @example
 * // With format strings
 * import { messages as m, format } from '@/lib/i18n';
 * <p>{format(m.tutorial.stepOf, { current: 1, total: 5 })}</p>
 * // → "Step 1 of 5"
 */

import { messages } from './messages';
import type { Messages, FormatParams } from './types';

export { messages };
export type { Messages, FormatParams };

/**
 * Format a string with variable substitution.
 * Replaces {key} placeholders with values from the params object.
 *
 * @param template - The template string with {key} placeholders
 * @param params - Object with key-value pairs for substitution
 * @returns The formatted string
 *
 * @example
 * format('Step {current} of {total}', { current: 1, total: 5 })
 * // → 'Step 1 of 5'
 *
 * @example
 * format('{count} members', { count: 42 })
 * // → '42 members'
 *
 * @example
 * format('Price: ${price}', { price: '1.25' })
 * // → 'Price: $1.25'
 */
export function format(template: string, params: FormatParams): string {
  return template.replace(
    /\{(\w+)\}/g,
    (match, key) => {
      const value = params[key];
      return value !== undefined ? String(value) : match;
    }
  );
}

/**
 * Helper to get a nested message path (for dynamic lookups)
 *
 * @param path - Array of keys to traverse
 * @returns The message string or the path joined by dots if not found
 *
 * @example
 * getMessage(['reports', 'stepsCompleted'])
 * // → '{count} steps completed'
 */
export function getMessage(path: string[]): string {
  let current: unknown = messages;
  for (const key of path) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      console.warn(`i18n: Message path not found: ${path.join('.')}`);
      return path.join('.');
    }
  }
  return typeof current === 'string' ? current : path.join('.');
}

/**
 * Create a regex pattern from a message string for use in tests.
 * Escapes special regex characters and adds case-insensitive flag.
 *
 * @param message - The message string to convert to regex
 * @returns A case-insensitive regex pattern
 *
 * @example
 * toRegex(m.controls.start)
 * // → /Start \(Space\)/i
 */
export function toRegex(message: string): RegExp {
  const escaped = message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i');
}

/**
 * Create a regex that matches a format string with any values.
 * Replaces {key} placeholders with flexible patterns.
 *
 * @param template - The format string template
 * @returns A regex that matches the template with any values
 *
 * @example
 * toFormatRegex('Step {current} of {total}')
 * // → /Step \S+ of \S+/i (matches "Step 1 of 5", "Step 10 of 100", etc.)
 */
export function toFormatRegex(template: string): RegExp {
  const escaped = template
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\{\\w+\\\}/g, '\\S+');
  return new RegExp(escaped, 'i');
}

/**
 * Format a number using locale-aware formatting.
 */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat('en-US', options).format(value);
}

/**
 * Format a value as a locale-aware percentage.
 */
export function formatPercent(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Type-safe message access with utilities
 */
export const t = {
  /**
   * Get raw messages object
   */
  raw: messages,

  /**
   * Format a message with params
   */
  format,

  /**
   * Get a nested message by path
   */
  get: getMessage,

  /**
   * Convert message to regex for testing
   */
  toRegex,

  /**
   * Convert format string to regex for testing
   */
  toFormatRegex,
};

export default messages;
