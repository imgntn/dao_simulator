import type { CuratedBriefCopy } from '@/lib/home/content';
import { getMessages } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

interface BriefCardProps {
  id: string;
  label: string;
  title: string;
  question: string;
  curated: CuratedBriefCopy;
  index: number;
  locale: Locale;
}

export function BriefCard({ id, label, title, question, curated, index, locale }: BriefCardProps) {
  const m = getMessages(locale);
  return (
    <article
      className="animate-rise rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-5 shadow-[var(--shadow-card)]"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--accent-gold)]">
        {label}
      </p>
      <h3 className="mt-2 text-xl font-semibold leading-tight text-[var(--text-heading)]">{title}</h3>
      <p className="mt-2 text-base font-medium leading-relaxed text-[var(--text-body)]">{question}</p>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-[var(--text-body-secondary)]">{curated.summary}</p>
      <ul className="mt-3 space-y-2 text-[0.95rem] text-[var(--text-body-secondary)]">
        {curated.whatWeFound.length > 0
          ? curated.whatWeFound.slice(0, 2).map((item, itemIndex) => (
            <li
              key={`${id}-takeaway-${itemIndex}`}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-warm)] px-3 py-2"
            >
              {item.detail}
            </li>
          ))
          : [m.home?.openFullBrief ?? 'Open brief for outcome details.'].map((text, itemIndex) => (
            <li
              key={`${id}-takeaway-${itemIndex}`}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-warm)] px-3 py-2"
            >
              {text}
            </li>
          ))}
      </ul>
      <a
        href={`#${id}`}
        className="mt-4 inline-flex text-base font-semibold text-[var(--accent-teal)] underline underline-offset-4"
      >
        {m.home?.openFullBrief ?? 'Open full brief'}
      </a>
    </article>
  );
}
