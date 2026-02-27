'use client';

import Link from 'next/link';
import { useLocale } from '@/lib/i18n/locale-context';

export default function NotFound() {
  const { locale, messages: m } = useLocale();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-page)] px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-32 h-32 mb-8 text-[var(--text-faint)]">
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            className="w-full h-full"
            role="img"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="text-8xl font-bold text-[var(--border-default)] mb-4">404</h1>

        <h2 className="text-2xl font-semibold text-[var(--text-heading)] mb-3">{m.errors.pageNotFound}</h2>
        <p className="text-[var(--text-body)] mb-8">{m.errors.pageNotFoundDesc}</p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={`/${locale}`}
            className="px-6 py-3 bg-[var(--accent-teal)] hover:bg-[var(--accent-teal-hover)] text-white font-medium rounded-lg transition-colors"
          >
            {m.errors.goHome}
          </Link>
        </div>

        <div className="mt-12 flex justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--border-default)]" />
          <div className="w-2 h-2 rounded-full bg-[var(--border-default)]" />
          <div className="w-2 h-2 rounded-full bg-[var(--border-default)]" />
        </div>
      </div>
    </div>
  );
}
