'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useLocale } from '@/lib/i18n/locale-context';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorPageProps) {
  const { locale, messages: m } = useLocale();

  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-page)] px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-24 h-24 mb-6 text-red-500">
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
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-[var(--text-heading)] mb-3">{m.errors.somethingWentWrong}</h1>
        <p className="text-[var(--text-body)] mb-2">{m.errors.unexpectedError}</p>

        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mt-4 p-4 bg-[var(--surface-warm)] rounded-lg border border-[var(--border-default)] text-left">
            <p className="text-sm font-mono text-red-600 break-all">{error.message}</p>
            {error.digest && (
              <p className="text-xs text-[var(--text-faint)] mt-2">
                {m.errors.errorId} {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-[var(--accent-teal)] hover:bg-[var(--accent-teal-hover)] text-white font-medium rounded-lg transition-colors"
          >
            {m.errors.tryAgain}
          </button>
          <Link
            href={`/${locale}`}
            className="px-6 py-3 bg-[var(--surface-warm)] hover:bg-[var(--border-subtle)] text-[var(--text-heading)] font-medium rounded-lg border border-[var(--border-default)] transition-colors"
          >
            {m.errors.goHome}
          </Link>
        </div>

        <p className="mt-8 text-sm text-[var(--text-faint)]">
          {m.errors.persistsReport}{' '}
          <a
            href="https://github.com/imgntn/dao_simulator_private/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent-teal)] hover:text-[var(--accent-teal-hover)] underline"
          >
            {m.errors.reportIssue}
          </a>
        </p>
      </div>
    </div>
  );
}
