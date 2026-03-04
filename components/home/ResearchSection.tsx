'use client';

import { useState, Children, isValidElement, type ReactNode } from 'react';
import { TableOfContents } from './TableOfContents';
import { BriefSearch } from './BriefSearch';

interface TocItem {
  id: string;
  label: string;
  title: string;
}

interface BriefMeta {
  id: string;
  title: string;
  question: string;
  summary: string;
}

interface ResearchSectionProps {
  tocItems: TocItem[];
  briefs: BriefMeta[];
  children: ReactNode;
}

export function ResearchSection({ tocItems, briefs, children }: ResearchSectionProps) {
  const [query, setQuery] = useState('');

  const lowerQuery = query.toLowerCase().trim();

  // Build a set of visible brief IDs based on the search query
  const visibleIds = new Set<string>();
  if (!lowerQuery) {
    for (const b of briefs) visibleIds.add(b.id);
  } else {
    for (const b of briefs) {
      if (
        b.title.toLowerCase().includes(lowerQuery) ||
        b.question.toLowerCase().includes(lowerQuery) ||
        b.summary.toLowerCase().includes(lowerQuery)
      ) {
        visibleIds.add(b.id);
      }
    }
  }

  // Filter children (CollapsibleBrief wrappers) by matching their id prop
  const filteredChildren = Children.toArray(children).filter((child) => {
    if (isValidElement(child) && typeof child.props === 'object' && 'id' in (child.props as Record<string, unknown>)) {
      return visibleIds.has((child.props as { id: string }).id);
    }
    return true;
  });

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex-1">
          <TableOfContents items={tocItems} />
        </div>
        <div className="w-full sm:w-64">
          <BriefSearch value={query} onChange={setQuery} />
        </div>
      </div>

      <div className="grid gap-5">
        {filteredChildren.length > 0 ? (
          filteredChildren
        ) : (
          <p className="py-8 text-center text-base text-[var(--text-muted)]">
            No briefs match &ldquo;{query}&rdquo;
          </p>
        )}
      </div>
    </>
  );
}
