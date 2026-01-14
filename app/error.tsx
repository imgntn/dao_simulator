'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { messages as m } from '@/lib/i18n';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="mx-auto w-24 h-24 mb-6 text-red-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Error Message */}
        <h1 className="text-3xl font-bold text-white mb-3">{m.errors.somethingWentWrong}</h1>
        <p className="text-gray-400 mb-2">
          {m.errors.unexpectedError}
        </p>

        {/* Error Details (development only) */}
        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mt-4 p-4 bg-gray-800 rounded-lg text-left">
            <p className="text-sm font-mono text-red-300 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-gray-500 mt-2">
                {m.errors.errorId} {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            {m.errors.tryAgain}
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            {m.errors.goHome}
          </Link>
        </div>

        {/* Help Text */}
        <p className="mt-8 text-sm text-gray-500">
          {m.errors.persistsReport}{' '}
          <a
            href="https://github.com/imgntn/dao_simulator_private/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            {m.errors.reportIssue}
          </a>
        </p>
      </div>
    </div>
  );
}
