'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-lg w-full text-center">
        {/* Dashboard Error Icon */}
        <div className="mx-auto w-20 h-20 mb-6 text-yellow-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>

        {/* Error Message */}
        <h1 className="text-2xl font-bold text-white mb-3">Dashboard Error</h1>
        <p className="text-gray-400 mb-6">
          The simulation dashboard encountered an error. This could be due to a connection issue or data processing problem.
        </p>

        {/* Possible Causes */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 text-left">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Possible causes:</h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li className="flex items-start gap-2">
              <span className="text-gray-500">•</span>
              WebSocket connection lost to simulation server
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500">•</span>
              Invalid simulation parameters or state
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500">•</span>
              3D visualization rendering issue
            </li>
          </ul>
        </div>

        {/* Error Details (development only) */}
        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mb-6 p-3 bg-red-900/20 border border-red-800 rounded-lg text-left">
            <p className="text-xs font-mono text-red-300 break-all">
              {error.message}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Reload Dashboard
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Full Page Refresh
          </button>
        </div>

        {/* Back Link */}
        <Link
          href="/"
          className="inline-block mt-6 text-sm text-gray-400 hover:text-white transition-colors"
        >
          &larr; Return to Home
        </Link>
      </div>
    </div>
  );
}
