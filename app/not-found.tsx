import Link from 'next/link';
import { messages as m } from '@/lib/i18n';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Illustration */}
        <div className="mx-auto w-32 h-32 mb-8 text-gray-600">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Error Code */}
        <h1 className="text-8xl font-bold text-gray-700 mb-4">404</h1>

        {/* Message */}
        <h2 className="text-2xl font-semibold text-white mb-3">{m.errors.pageNotFound}</h2>
        <p className="text-gray-400 mb-8">
          {m.errors.pageNotFoundDesc}
        </p>

        {/* Navigation Options */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            {m.errors.goHome}
          </Link>
        </div>

        {/* Decorative Elements */}
        <div className="mt-12 flex justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-700" />
          <div className="w-2 h-2 rounded-full bg-gray-700" />
          <div className="w-2 h-2 rounded-full bg-gray-700" />
        </div>
      </div>
    </div>
  );
}
