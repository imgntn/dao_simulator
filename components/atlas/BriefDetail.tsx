import type { ReactNode } from 'react';
import type { CuratedBriefCopy } from '@/lib/atlas/content';
import { BRIEF_CROSS_LINKS, DECISION_BRIEF_SECTIONS } from '@/lib/atlas/content';
import { injectTermTooltips } from '@/lib/atlas/tooltip-utils';
import { ChartLightbox } from './ChartLightbox';
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
  const tt = (text: string) => injectTermTooltips(text, curated.keyTerms);

  return (
    <article
      aria-labelledby={`heading-${id}`}
      className="animate-rise rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-6 shadow-[var(--shadow-card)] sm:p-8"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* ── Full-width header ── */}
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--accent-gold)]">
        {label} {m.atlas?.briefLabel ?? 'Brief'}
      </p>
      <h3
        id={`heading-${id}`}
        className="mt-2 max-w-3xl text-[1.75rem] font-semibold leading-tight text-[var(--text-heading)] sm:text-[2.25rem]"
      >
        {title}
      </h3>
      <p className="mt-4 max-w-3xl text-[1.12rem] font-medium leading-relaxed text-[#2b5064] sm:text-[1.22rem]">
        {tt(question)}
      </p>
      <p className="mt-3 max-w-3xl text-[1.1rem] leading-relaxed text-[var(--text-body-secondary)] sm:text-[1.18rem]">
        {tt(curated.summary)}
      </p>
      <p className="mt-4 text-base text-[var(--text-muted)]">{curated.evidence}</p>
      {curated.confidence && (
        <p className="mt-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-warm)] px-3 py-2.5 text-base text-[var(--text-faint)]">
          <span className="font-semibold text-[#3d5568]">
            {m.atlas?.confidenceNote ?? 'Confidence note:'}
          </span>{' '}
          {curated.confidence}
        </p>
      )}

      {/* ── Infographic (near the top, full width) ── */}
      {infographic && (
        <div className="mt-5">
          <ChartLightbox>{infographic}</ChartLightbox>
        </div>
      )}

      {/* ── 2-column grid (stacks on mobile) ── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* ── Left column ── */}
        <div className="space-y-4">
          {/* Why this matters */}
          <p className="max-w-prose text-[1.1rem] leading-relaxed text-[var(--text-body-secondary)]">
            <span className="font-semibold text-[#2f495d]">
              {m.atlas?.whyItMatters ?? 'Why this matters:'}
            </span>{' '}
            {tt(whyItMatters)}
          </p>

          {/* What To Do */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-warm-deep)] p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#7a5f3f]">
              {m.atlas?.whatToDo ?? 'What To Do'}
            </p>
            <ul className="mt-2 space-y-2 text-base leading-relaxed text-[var(--text-body-secondary)]">
              {curated.whatToDo.map((action, actionIndex) => (
                <li key={`${id}-action-${actionIndex}`}>{tt(action)}</li>
              ))}
            </ul>
          </div>

          {/* Key Terms (collapsed by default) */}
          {curated.keyTerms && curated.keyTerms.length > 0 && (
            <details className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-highlight)] p-4">
              <summary className="cursor-pointer select-none text-sm font-semibold uppercase tracking-[0.12em] text-[#3d5568]">
                {m.atlas?.keyTerms ?? 'Key Terms'}
              </summary>
              <dl className="mt-3 grid gap-x-3 gap-y-2 sm:grid-cols-2">
                {curated.keyTerms.map((entry) => (
                  <div
                    key={`${id}-term-${entry.term}`}
                    className="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2"
                  >
                    <dt className="text-[0.9rem] font-semibold text-[var(--text-heading)]">
                      {entry.term}
                    </dt>
                    <dd className="mt-0.5 text-[0.9rem] leading-snug text-[var(--text-body-secondary)]">
                      {entry.definition}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4">
          {/* What Results Showed (with headlines) */}
          <div className="rounded-2xl border border-[var(--border-warm)] bg-[var(--surface-warm)] p-4 sm:p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.13em] text-[#7b5f3d]">
              {m.atlas?.whatWeFound ?? 'What Results Showed'}
            </p>
            {curated.whatWeFound.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {curated.whatWeFound.map((finding, findingIndex) => {
                  const accentColors = ['border-l-[var(--accent-teal)]', 'border-l-[var(--accent-gold)]', 'border-l-[#5ba3b0]'];
                  const badgeColors = ['bg-[var(--accent-teal)]/15 text-[var(--accent-teal)]', 'bg-[var(--accent-gold)]/15 text-[var(--accent-gold)]', 'bg-[#5ba3b0]/15 text-[#5ba3b0]'];
                  return (
                    <li
                      key={`${id}-finding-${findingIndex}`}
                      className={`rounded-xl border border-[var(--border-subtle)] border-l-[3px] ${accentColors[findingIndex % 3]} bg-white px-4 py-3`}
                    >
                      <p className="flex items-center gap-2.5 text-base font-bold leading-snug text-[var(--text-heading)]">
                        <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.75rem] font-bold ${badgeColors[findingIndex % 3]}`}>
                          {findingIndex + 1}
                        </span>
                        {finding.headline}
                      </p>
                      <p className="mt-1 pl-[2.12rem] text-[0.95rem] leading-relaxed text-[var(--text-body-secondary)]">
                        {tt(finding.detail)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 text-base text-[var(--text-muted)]">
                No extracted outcome points found for this brief.
              </p>
            )}
          </div>

        </div>
      </div>

      {/* ── Cross-links to related briefs ── */}
      {BRIEF_CROSS_LINKS[id] && BRIEF_CROSS_LINKS[id].length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">See also:</span>
          {BRIEF_CROSS_LINKS[id].map((link) => {
            const target = DECISION_BRIEF_SECTIONS.find((s) => s.id === link.id);
            if (!target) return null;
            return (
              <a
                key={`${id}-xlink-${link.id}`}
                href={`#${link.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-body)] transition hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)]"
                title={link.reason}
              >
                {target.title}
                <span className="hidden text-[var(--text-muted)] sm:inline">&middot; {link.reason}</span>
              </a>
            );
          })}
        </div>
      )}
    </article>
  );
}
