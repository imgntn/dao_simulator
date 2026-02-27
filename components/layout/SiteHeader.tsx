'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { messages as m } from '@/lib/i18n';

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <nav
      aria-label={m.atlas?.nav ?? 'Main navigation'}
      className="sticky top-0 z-40 border-b border-[var(--border-default)] bg-[var(--surface-panel)] backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="text-sm font-semibold tracking-wide text-[var(--text-heading)]">
          DAO Research Atlas
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <a
            href="#research"
            className="text-[var(--text-muted)] transition hover:text-[var(--accent-teal)]"
            aria-current={pathname === '/' ? 'page' : undefined}
          >
            {m.atlas?.researchHeading ?? 'Research'}
          </a>
          <a
            href="#papers"
            className="text-[var(--text-muted)] transition hover:text-[var(--accent-teal)]"
          >
            {m.atlas?.papersHeading ?? 'Papers'}
          </a>
          <Link
            href="/console"
            className="text-[var(--text-muted)] transition hover:text-[var(--accent-teal)]"
            aria-current={pathname === '/console' ? 'page' : undefined}
          >
            {m.atlas?.consoleLink ?? 'Console'}
          </Link>
        </div>
      </div>
    </nav>
  );
}
