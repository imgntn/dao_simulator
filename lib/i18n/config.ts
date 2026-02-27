/**
 * Locale configuration for route-based internationalization.
 */

export const locales = ['en', 'es', 'zh', 'ja'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export function isValidLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Map locale codes to Intl-compatible locale strings. */
export const intlLocaleMap: Record<Locale, string> = {
  en: 'en-US',
  es: 'es-ES',
  zh: 'zh-CN',
  ja: 'ja-JP',
};

/** Map locale codes to OpenGraph locale strings. */
export const ogLocaleMap: Record<Locale, string> = {
  en: 'en_US',
  es: 'es_ES',
  zh: 'zh_CN',
  ja: 'ja_JP',
};

/** Human-readable labels for the language selector. */
export const localeLabels: Record<Locale, string> = {
  en: 'English',
  es: 'Espa\u00f1ol',
  zh: '\u4e2d\u6587',
  ja: '\u65e5\u672c\u8a9e',
};
