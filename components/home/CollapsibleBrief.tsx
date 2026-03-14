'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useLocale } from '@/lib/i18n/locale-context';
import { getMessages } from '@/lib/i18n';

interface CollapsibleBriefProps {
  id: string;
  label: string;
  title: string;
  children: ReactNode;
}

export function CollapsibleBrief({ id, label, title, children }: CollapsibleBriefProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const restoredFromStorage = useRef(false);
  const { locale } = useLocale();
  const m = getMessages(locale);

  useEffect(() => {
    const el = detailsRef.current;
    if (!el) return;

    // Hash match always wins
    if (window.location.hash === `#${id}`) {
      el.open = true;
    } else {
      // Restore from localStorage
      const stored = localStorage.getItem(`brief-open-${id}`);
      if (stored !== null) {
        el.open = stored === 'true';
        restoredFromStorage.current = true;
      }
    }

    // Listen for hash changes (e.g. clicking a cross-link or gallery chart)
    const onHash = () => {
      if (window.location.hash === `#${id}` && detailsRef.current) {
        detailsRef.current.open = true;
      }
    };
    window.addEventListener('hashchange', onHash);

    // Persist toggle state
    const onToggle = () => {
      if (detailsRef.current) {
        localStorage.setItem(`brief-open-${id}`, String(detailsRef.current.open));
      }
    };
    el.addEventListener('toggle', onToggle);

    return () => {
      window.removeEventListener('hashchange', onHash);
      el.removeEventListener('toggle', onToggle);
    };
  }, [id]);

  // On lg+ screens, auto-open unless user explicitly closed (saved in storage)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const apply = () => {
      if (detailsRef.current && mq.matches && !restoredFromStorage.current) {
        detailsRef.current.open = true;
      }
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return (
    <details ref={detailsRef} id={id}>
      <summary className="cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
        <div className="animate-rise rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-5 shadow-[var(--shadow-card)] transition hover:shadow-md sm:p-6 lg:hidden">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--accent-gold)]">
            {label}
          </p>
          <h3 className="mt-1 text-xl font-semibold leading-tight text-[var(--text-heading)]">
            {title}
          </h3>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{m.home?.tapToExpand ?? 'Tap to expand'}</p>
        </div>
      </summary>
      {children}
    </details>
  );
}
