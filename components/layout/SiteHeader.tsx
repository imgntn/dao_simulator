'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n/locale-context';
import { locales, localeLabels } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

export function SiteHeader() {
  const { locale, messages: m } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  function switchLocale(newLocale: Locale) {
    // Replace the current locale prefix in the pathname
    const rest = pathname.replace(new RegExp(`^/${locale}`), '') || '/';
    router.push(`/${newLocale}${rest === '/' ? '' : rest}`);
    setOpen(false);
  }

  return (
    <nav
      aria-label={m.atlas?.nav ?? 'Main navigation'}
      className="sticky top-0 z-40 border-b border-[var(--border-default)] bg-[var(--surface-panel)] backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href={`/${locale}`} className="text-base font-semibold tracking-wide text-[var(--text-heading)]">
          DAO Research Atlas
        </Link>

        {/* Language selector */}
        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-haspopup="listbox"
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--text-body)] transition hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)]"
          >
            <svg
              className="h-4 w-4 opacity-60"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.97.633-3.794 1.708-5.278"
              />
            </svg>
            {localeLabels[locale]}
            <svg
              className={`h-3 w-3 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {open && (
            <ul
              role="listbox"
              aria-label="Select language"
              className="absolute right-0 mt-1 w-40 overflow-hidden rounded-lg border border-[var(--border-default)] bg-white shadow-lg"
            >
              {locales.map((loc) => (
                <li key={loc} role="option" aria-selected={loc === locale}>
                  <button
                    type="button"
                    onClick={() => switchLocale(loc)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-[var(--surface-warm)] ${
                      loc === locale
                        ? 'font-semibold text-[var(--accent-teal)]'
                        : 'text-[var(--text-body)]'
                    }`}
                  >
                    {localeLabels[loc]}
                    {loc === locale && (
                      <svg className="ml-auto h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </nav>
  );
}
