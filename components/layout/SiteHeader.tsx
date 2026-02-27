'use client';

import Link from 'next/link';
import { messages as m } from '@/lib/i18n';

export function SiteHeader() {
  return (
    <nav
      aria-label={m.atlas?.nav ?? 'Main navigation'}
      className="sticky top-0 z-40 border-b border-[var(--border-default)] bg-[var(--surface-panel)] backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-6xl items-center px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="text-base font-semibold tracking-wide text-[var(--text-heading)]">
          DAO Research Atlas
        </Link>
      </div>
    </nav>
  );
}
