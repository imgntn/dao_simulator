import type { ReactNode } from 'react';
import type { CuratedBriefCopy } from '@/lib/atlas/content';
import { getMessages } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

interface BriefDetailProps {
  id: string;
  label: string;
  title: string;
  question: string;
  whyItMatters: string;
  curated: CuratedBriefCopy;
  index: number;
  infographic?: ReactNode;
  locale: Locale;
}

export function BriefDetail({
  id,
  label,
  title,
  question,
  whyItMatters,
  curated,
  index,
  infographic,
  locale,
}: BriefDetailProps) {
  const m = getMessages(locale);
  return (
    <article
      id={id}
      aria-labelledby={`heading-${id}`}
      className="animate-rise rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-6 shadow-[var(--shadow-card)] sm:p-8"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* ── Header ── */}
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--accent-gold)]">
        {label} {m.atlas?.briefLabel ?? 'Brief'}
      </p>
      <h3
        id={`heading-${id}`}
        className="mt-2 max-w-3xl text-2xl font-semibold leading-tight text-[var(--text-heading)] sm:text-[1.95rem]"
      >
        {title}
      </h3>
      <p className="mt-4 max-w-3xl text-[1.04rem] font-medium leading-relaxed text-[#2b5064] sm:text-[1.1rem]">
        {question}
      </p>
      <p className="mt-3 max-w-3xl text-[1.02rem] leading-relaxed text-[var(--text-body-secondary)] sm:text-[1.08rem]">
        {curated.summary}
      </p>
      <p className="mt-4 text-sm text-[var(--text-muted)]">{curated.evidence}</p>
      {curated.confidence && (
        <p className="mt-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-warm)] px-3 py-2 text-sm text-[var(--text-faint)]">
          <span className="font-semibold text-[#3d5568]">
            {m.atlas?.confidenceNote ?? 'Confidence note:'}
          </span>{' '}
          {curated.confidence}
        </p>
      )}

      {/* ── Key Terms (contextual, right after the question) ── */}
      {curated.keyTerms && curated.keyTerms.length > 0 && (
        <details open className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-highlight)] p-4">
          <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-[0.12em] text-[#3d5568]">
            {m.atlas?.keyTerms ?? 'Key Terms'}
          </summary>
          <dl className="mt-3 grid gap-x-3 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
            {curated.keyTerms.map((entry) => (
              <div
                key={`${id}-term-${entry.term}`}
                className="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2"
              >
                <dt className="text-[0.8rem] font-semibold text-[var(--text-heading)]">
                  {entry.term}
                </dt>
                <dd className="mt-0.5 text-[0.8rem] leading-snug text-[var(--text-body-secondary)]">
                  {entry.definition}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      {/* ── Infographic (full width) ── */}
      {infographic && (
        <div className="mt-5 rounded-xl border border-[var(--border-subtle)] bg-white px-3 py-3">
          {infographic}
        </div>
      )}

      {/* ── What Results Showed ── */}
      <div className="mt-5 rounded-2xl border border-[var(--border-warm)] bg-[var(--surface-warm)] p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[#7b5f3d]">
          {m.atlas?.whatWeFound ?? 'What Results Showed'}
        </p>
        {curated.whatWeFound.length > 0 ? (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {curated.whatWeFound.map((takeaway, takeawayIndex) => (
              <li
                key={`${id}-full-takeaway-${takeawayIndex}`}
                className="rounded-xl border border-[var(--border-subtle)] bg-white px-3 py-2 text-sm leading-relaxed text-[var(--text-body-secondary)]"
              >
                {takeaway}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            No extracted outcome points found for this brief.
          </p>
        )}
      </div>

      {/* ── Why this matters ── */}
      <p className="mt-5 max-w-3xl text-[1.01rem] leading-relaxed text-[var(--text-body-secondary)]">
        <span className="font-semibold text-[#2f495d]">
          {m.atlas?.whyItMatters ?? 'Why this matters:'}
        </span>{' '}
        {whyItMatters}
      </p>

      {/* ── What To Do ── */}
      <div className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-warm-deep)] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a5f3f]">
          {m.atlas?.whatToDo ?? 'What To Do'}
        </p>
        <ul className="mt-2 space-y-2 text-sm leading-relaxed text-[var(--text-body-secondary)]">
          {curated.whatToDo.map((action, actionIndex) => (
            <li key={`${id}-action-${actionIndex}`}>{action}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}
