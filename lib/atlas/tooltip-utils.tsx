import type { ReactNode } from 'react';
import type { KeyTerm } from './content';

/**
 * Scans text for key-term matches and wraps them in tooltip spans.
 * Uses longest-first matching to avoid partial hits (e.g. "Pass Rate" before "Rate").
 * Word-boundary regex, case-insensitive. Server-safe (returns JSX, no hooks).
 */
export function injectTermTooltips(
  text: string,
  keyTerms: KeyTerm[] | undefined,
): ReactNode {
  if (!keyTerms || keyTerms.length === 0) return text;

  // Sort longest-first to avoid partial matches
  const sorted = [...keyTerms].sort((a, b) => b.term.length - a.term.length);

  // Build a single regex that matches any term with word boundaries
  const escaped = sorted.map((t) =>
    t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  const pattern = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');

  // Build a lookup map (lowercase → definition)
  const defMap = new Map<string, string>();
  for (const t of sorted) {
    defMap.set(t.term.toLowerCase(), t.definition);
  }

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    // Push preceding plain text
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const matched = match[0];
    const definition = defMap.get(matched.toLowerCase());

    parts.push(
      <span
        key={key++}
        className="term-tooltip"
        data-tooltip={definition}
      >
        {matched}
      </span>,
    );

    lastIndex = match.index + matched.length;
  }

  // Push trailing plain text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
