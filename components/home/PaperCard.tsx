import { artifactHref } from '@/lib/home/parsers';
import { getMessages } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

interface PaperCardProps {
  label: string;
  description: string;
  currentPdf: string | null;
  currentTex: string | null;
  locale: Locale;
}

export function PaperCard({ label, description, currentPdf, currentTex, locale }: PaperCardProps) {
  const m = getMessages(locale);

  return (
    <article className="rounded-2xl border border-[var(--border-default)] bg-white p-4">
      <h3 className="text-xl font-semibold text-[var(--text-heading)]">{label}</h3>
      <p className="mt-1 text-base text-[var(--text-muted)]">{description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {currentPdf && (
          <a className="hub-link" href={artifactHref(currentPdf)}>
            {m.home?.currentPdf ?? 'Current PDF'}
          </a>
        )}
        {currentTex && (
          <a className="hub-link" href={artifactHref(currentTex)}>
            {m.home?.currentTex ?? 'Current TeX'}
          </a>
        )}
      </div>
    </article>
  );
}
