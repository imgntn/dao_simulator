'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n/locale-context';
import { locales, localeLabels } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { useTheme } from '@/lib/theme/theme-context';

export function SiteHeader() {
  const { locale, messages: m } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  function switchLocale(newLocale: Locale) {
    // Persist choice so middleware uses it on future visits
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${365 * 24 * 60 * 60};samesite=lax`;
    // Replace the current locale prefix in the pathname
    const rest = pathname.replace(new RegExp(`^/${locale}`), '') || '/';
    router.push(`/${newLocale}${rest === '/' ? '' : rest}`);
  }

  return (
    <nav
      aria-label={m.home?.nav ?? 'Main navigation'}
      className="sticky top-0 z-40 h-16 border-b border-[var(--border-default)] bg-[var(--surface-panel)] backdrop-blur-sm"
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        <Link href={`/${locale}`} className="shrink-0 text-base font-semibold tracking-wide text-[var(--text-heading)] sm:text-lg">
          DAO Simulator
        </Link>

        <div className="flex items-center gap-2">
          {/* Simulate link */}
          <Link
            href={`/${locale}/simulate`}
            className="flex h-11 items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-warm)] px-3 text-sm font-medium text-[var(--text-body)] transition hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)]"
          >
            <svg className="h-4 w-4 opacity-60" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
            </svg>
            <span className="hidden sm:inline">Simulate</span>
          </Link>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-warm)] text-[var(--text-body)] transition hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)]"
          >
            {theme === 'dark' ? (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
              </svg>
            )}
          </button>

          <label className="relative">
            <span className="sr-only">Select language</span>
            <select
              aria-label="Select language"
              value={locale}
              onChange={(event) => switchLocale(event.target.value as Locale)}
              className="h-11 rounded-lg border border-[var(--border-default)] bg-[var(--surface-warm)] px-2 text-sm font-medium text-[var(--text-body)] transition hover:border-[var(--accent-teal)] focus:border-[var(--accent-teal)] focus:outline-none"
            >
              {locales.map((loc) => (
                <option key={loc} value={loc}>
                  {localeLabels[loc]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </nav>
  );
}
