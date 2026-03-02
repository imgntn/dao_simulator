'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface StickyNavProps {
  sections: { id: string; label: string }[];
}

export function StickyNav({ sections }: StickyNavProps) {
  const [visible, setVisible] = useState(false);
  const [activeId, setActiveId] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close menu on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const handleNavClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    setMenuOpen(false);
  }, []);

  if (!visible) return null;

  return (
    <nav
      ref={menuRef}
      aria-label="Sticky navigation"
      className="fixed left-0 right-0 top-0 z-40 border-b border-[var(--border-default)] bg-[var(--surface-page)]/90 backdrop-blur-md"
    >
      {/* Desktop layout (sm and above) — unchanged */}
      <div className="mx-auto hidden max-w-6xl gap-1 overflow-x-auto px-4 py-2 sm:flex sm:justify-center sm:gap-2">
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

      {/* Mobile layout (below sm) — hamburger */}
      <div className="flex items-center justify-between px-4 py-2 sm:hidden">
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); setMenuOpen(false); }}
          className="text-sm font-bold text-[var(--text-heading)] transition hover:text-[var(--accent-teal)]"
        >
          DAO Simulator
        </a>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--surface-warm-deep)] hover:text-[var(--text-heading)]"
        >
          {menuOpen ? (
            // X icon
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            // Hamburger icon
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile slide-down panel */}
      {menuOpen && (
        <div className="flex flex-col gap-1 border-t border-[var(--border-default)] px-4 pb-3 pt-2 sm:hidden">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={handleNavClick}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                activeId === s.id
                  ? 'bg-[var(--accent-teal)]/10 text-[var(--accent-teal)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--surface-warm-deep)] hover:text-[var(--text-heading)]'
              }`}
            >
              {s.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
