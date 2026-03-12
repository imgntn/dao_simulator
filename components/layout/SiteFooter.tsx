import { JAMES_SITE_URL } from '@/lib/home/content';
import { getMessages } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

const GITHUB_REPO_URL = 'https://github.com/imgntn/dao_simulator';

export function SiteFooter({ locale }: { locale: Locale }) {
  const m = getMessages(locale);

  return (
    <footer
      role="contentinfo"
      className="mt-14 border-t border-[var(--border-default)] pt-7 text-base leading-relaxed text-[var(--text-muted)]"
    >
      <p>
        {m.home?.footerAttribution ?? 'DAO Simulator by'}{' '}
        <a
          href={JAMES_SITE_URL}
          target="_blank"
          rel="noreferrer"
          className="text-[var(--accent-teal)] underline decoration-[var(--accent-teal)]/40 underline-offset-4 hover:text-[var(--accent-teal-hover)]"
        >
          James B. Pollack
        </a>
        {' · '}
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="text-[var(--accent-teal)] underline decoration-[var(--accent-teal)]/40 underline-offset-4 hover:text-[var(--accent-teal-hover)]"
        >
          GitHub
        </a>
        {' · '}
        <a
          href={`${GITHUB_REPO_URL}/blob/main/LICENSE`}
          target="_blank"
          rel="noreferrer"
          className="text-[var(--text-muted)] hover:text-[var(--accent-teal)]"
        >
          AGPL-3.0
        </a>
      </p>
    </footer>
  );
}
