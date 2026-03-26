'use client';

import { useState, useEffect } from 'react';

interface TocItem {
  id: string;
  label: string;
  title: string;
}

interface TableOfContentsProps {
  items: TocItem[];
}

export function TableOfContents({ items }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const ids = items.map((item) => item.id);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );

    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label="Table of contents" className="flex flex-wrap gap-1.5">
      {items.map((item, index) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          title={item.title}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
            activeId === item.id
              ? 'border-[var(--accent-teal)] bg-[var(--accent-teal)]/10 text-[var(--accent-teal)]'
              : 'border-[var(--border-default)] bg-[var(--surface-warm)] text-[var(--text-muted)] hover:border-[var(--accent-gold)] hover:text-[var(--text-body)]'
          }`}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
