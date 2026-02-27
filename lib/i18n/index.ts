/**
 * Internationalization (i18n) Module
 *
 * Provides centralized access to all UI strings with type-safe access,
 * format string support, and multi-locale routing.
 *
 * @example
 * // Server component: load messages for a specific locale
 * import { getMessages } from '@/lib/i18n';
 * const m = getMessages(params.locale as Locale);
 *
 * @example
 * // Client component: use locale context
 * import { useLocale } from '@/lib/i18n/locale-context';
 * const { locale, messages: m } = useLocale();
 *
 * @example
 * // With format strings
 * import { format, getMessages } from '@/lib/i18n';
 * const m = getMessages('en');
 * format(m.tutorial.stepOf, { current: 1, total: 5 })
 * // → "Step 1 of 5"
 */

import { messages as enMessages } from './messages/en';
import type { Messages, FormatParams } from './types';

// Re-export locale infrastructure
export type { Locale } from './config';
export { locales, defaultLocale, isValidLocale, intlLocaleMap, ogLocaleMap } from './config';
export { getMessages } from './get-messages';
export type { Messages, FormatParams };

/**
 * Default (English) messages — backward-compatible export.
 * Prefer getMessages(locale) in locale-aware code paths.
 */
export const messages = enMessages;

/**
 * Format a string with variable substitution.
 * Replaces {key} placeholders with values from the params object.
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
 * Helper to get a nested message path (for dynamic lookups).
 */
export function getMessage(path: string[]): string {
  let current: unknown = enMessages;
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
 */
export function toRegex(message: string): RegExp {
  const escaped = message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i');
}

/**
 * Create a regex that matches a format string with any values.
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
export function formatNumber(value: number, options?: Intl.NumberFormatOptions, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Format a value as a locale-aware percentage.
 */
export function formatPercent(value: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Type-safe message access with utilities
 */
export const t = {
  raw: enMessages,
  format,
  get: getMessage,
  toRegex,
  toFormatRegex,
};

export default enMessages;
