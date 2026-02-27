import { JAMES_SITE_URL } from '@/lib/atlas/content';
import { getMessages } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

export function SiteFooter({ locale }: { locale: Locale }) {
  const m = getMessages(locale);

  return (
    <footer
      role="contentinfo"
      className="mt-14 border-t border-[var(--border-default)] pt-7 text-base leading-relaxed text-[var(--text-muted)]"
    >
      <p>
        {m.atlas?.footerAttribution ?? 'DAO Research Atlas by'}{' '}
        <a
          href={JAMES_SITE_URL}
          target="_blank"
          rel="noreferrer"
          className="text-[var(--accent-teal)] underline decoration-[var(--accent-teal)]/40 underline-offset-4 hover:text-[var(--accent-teal-hover)]"
        >
          James B. Pollack
        </a>
        .
      </p>
    </footer>
  );
}
