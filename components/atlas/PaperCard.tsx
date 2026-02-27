import { artifactHref } from '@/lib/atlas/parsers';
import { getMessages } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

interface PaperCardProps {
  label: string;
  description: string;
  currentPdf: string | null;
  currentTex: string | null;
  latestArchive: string | null;
  locale: Locale;
}

export function PaperCard({ label, description, currentPdf, currentTex, latestArchive, locale }: PaperCardProps) {
  const m = getMessages(locale);

  return (
    <article className="rounded-2xl border border-[var(--border-default)] bg-white p-4">
      <h3 className="text-lg font-semibold text-[var(--text-heading)]">{label}</h3>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {currentPdf && (
          <a className="hub-link" href={artifactHref(currentPdf)}>
            {m.atlas?.currentPdf ?? 'Current PDF'}
          </a>
        )}
        {currentTex && (
          <a className="hub-link" href={artifactHref(currentTex)}>
            {m.atlas?.currentTex ?? 'Current TeX'}
          </a>
        )}
        {latestArchive && (
          <a className="hub-link" href={artifactHref(latestArchive)}>
            {m.atlas?.latestArchivedPdf ?? 'Latest Archived PDF'}
          </a>
        )}
      </div>
    </article>
  );
}
