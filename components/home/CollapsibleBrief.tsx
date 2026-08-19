'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useLocale } from '@/lib/i18n/locale-context';
import { getMessages } from '@/lib/i18n';

interface CollapsibleBriefProps {
  id: string;
  label: string;
  title: string;
  question: string;
  children: ReactNode;
}

export function CollapsibleBrief({ id, label, title, question, children }: CollapsibleBriefProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
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

  return (
    <details ref={detailsRef} id={id}>
      <summary className="cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
        <div className="animate-rise rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-5 shadow-[var(--shadow-card)] transition hover:border-[var(--accent-teal)] hover:shadow-md sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--accent-gold)]">
            {label}
          </p>
          <h3 className="mt-1 text-xl font-semibold leading-tight text-[var(--text-heading)]">
            {title}
          </h3>
          <p className="mt-2 max-w-3xl text-base text-[var(--text-body-secondary)]">{question}</p>
          <p className="mt-3 text-sm font-semibold text-[var(--accent-teal)]">{m.home?.tapToExpand ?? 'Tap to expand'}</p>
        </div>
      </summary>
      {children}
    </details>
  );
}
