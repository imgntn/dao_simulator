'use client';

import { useState, useEffect } from 'react';

interface StickyNavProps {
  sections: { id: string; label: string }[];
}

export function StickyNav({ sections }: StickyNavProps) {
  const [visible, setVisible] = useState(false);
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    // Show sticky nav when hero nav scrolls out of view
    const heroNav = document.querySelector('nav[aria-label="Page sections"]');
    if (!heroNav) return;

    const showObserver = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 },
    );
    showObserver.observe(heroNav);

    // Track active section
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 },
    );

    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) sectionObserver.observe(el);
    }

    return () => {
      showObserver.disconnect();
      sectionObserver.disconnect();
    };
  }, [sections]);

  if (!visible) return null;

  return (
    <nav
      aria-label="Sticky navigation"
      className="fixed left-0 right-0 top-0 z-40 border-b border-[var(--border-default)] bg-[var(--surface-page)]/90 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2 sm:justify-center sm:gap-2">
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="shrink-0 rounded-full border border-transparent px-4 py-1.5 text-sm font-bold text-[var(--text-heading)] transition hover:text-[var(--accent-teal)]"
        >
          DAO Simulator
        </a>
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
              activeId === s.id
                ? 'border-[var(--accent-teal)] bg-[var(--accent-teal)]/10 text-[var(--accent-teal)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-heading)]'
            }`}
          >
            {s.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
