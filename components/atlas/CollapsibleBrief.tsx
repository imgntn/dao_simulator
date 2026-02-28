'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface CollapsibleBriefProps {
  id: string;
  label: string;
  title: string;
  children: ReactNode;
}

export function CollapsibleBrief({ id, label, title, children }: CollapsibleBriefProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    // Auto-open if URL hash matches this brief
    if (window.location.hash === `#${id}`) {
      if (detailsRef.current) detailsRef.current.open = true;
    }

    // Listen for hash changes (e.g. clicking a cross-link or gallery chart)
    const onHash = () => {
      if (window.location.hash === `#${id}` && detailsRef.current) {
        detailsRef.current.open = true;
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [id]);

  // On lg+ screens, use a media query to default open via CSS
  // We start closed and let CSS/JS handle opening
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const apply = () => {
      if (detailsRef.current && mq.matches) {
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
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--accent-gold)]">
            {label}
          </p>
          <h3 className="mt-1 text-lg font-semibold leading-tight text-[var(--text-heading)]">
            {title}
          </h3>
          <p className="mt-2 text-xs text-[var(--text-muted)]">Tap to expand</p>
        </div>
      </summary>
      {children}
    </details>
  );
}
