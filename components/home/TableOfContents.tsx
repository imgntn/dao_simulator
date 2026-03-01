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
    <nav aria-label="Table of contents" className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={`rounded-full border px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.11em] transition ${
            activeId === item.id
              ? 'border-[var(--accent-teal)] bg-[var(--accent-teal)]/10 text-[var(--accent-teal)]'
              : 'border-[var(--border-default)] bg-white text-[#405468] hover:border-[#b49567] hover:bg-[#fff4e4]'
          }`}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {item.label} {item.title}
        </a>
      ))}
    </nav>
  );
}
