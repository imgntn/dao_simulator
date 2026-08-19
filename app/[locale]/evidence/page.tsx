import Link from 'next/link';
import { PageShell } from '@/components/layout/PageShell';
import { getMessages, isValidLocale, defaultLocale } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { RESEARCH_STATUS, RESEARCH_STATUS_SUMMARY } from '@/lib/home/research-status';
import { RESEARCH_CLAIMS } from '@/lib/home/research-claims';

export const metadata = {
  title: 'Evidence and claim registry | DAO Simulator',
  description: 'Public status, provenance, and confirmatory plan for DAO Simulator research claims.',
};

export default async function EvidencePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : defaultLocale;
  const m = getMessages(locale);

  return (
    <PageShell locale={locale}>
      <header className="max-w-3xl">
        <Link href={`/${locale}`} className="text-sm font-semibold text-[var(--accent-teal)] underline underline-offset-4">
          {m.results?.backToHome ?? 'Back to home'}
        </Link>
        <p className="mucha-section-heading mt-8 text-xs">Public claim registry</p>
        <h1 className="mt-3 font-serif-display text-4xl text-[var(--text-heading)] sm:text-5xl">Evidence, status, and what comes next</h1>
        <p className="mt-4 text-lg leading-relaxed text-[var(--text-body)]">
          This page separates exploratory findings from confirmatory evidence so readers can see exactly what the current site supports.
        </p>
      </header>

      <aside className="mt-8 rounded-2xl border border-amber-500/35 bg-amber-50 p-5 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100" aria-label="Research status">
        <p className="text-xs font-bold uppercase tracking-[0.14em]">{RESEARCH_STATUS.classification} - {RESEARCH_STATUS.confirmatoryStatus}</p>
        <p className="mt-2 text-sm leading-relaxed">{RESEARCH_STATUS_SUMMARY}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-xs uppercase tracking-wide opacity-70">Legacy runs</dt><dd className="mt-1 text-xl font-semibold">{RESEARCH_STATUS.legacyExploratoryRunsLabel}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide opacity-70">Calibrated DAOs</dt><dd className="mt-1 text-xl font-semibold">{RESEARCH_STATUS.calibratedDaoCount}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide opacity-70">Experiment configs</dt><dd className="mt-1 text-xl font-semibold">{RESEARCH_STATUS.experimentConfigurationCount}</dd></div>
        </dl>
      </aside>

      <section className="mt-10" aria-labelledby="claims-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="claims-heading" className="font-serif-display text-3xl text-[var(--text-heading)]">Claim registry</h2>
            <p className="mt-2 text-[var(--text-muted)]">Every legacy brief remains useful for forming hypotheses, but none is presented here as confirmed causal or forecasting evidence.</p>
          </div>
          <Link href={`/${locale}/simulate?guided=1`} className="rounded-xl bg-[var(--accent-teal)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-teal-hover)]">
            Explore a guided scenario
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {RESEARCH_CLAIMS.map(claim => (
            <article key={claim.id} className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-teal)]">{claim.id}</span>
                <span className="rounded-full border border-amber-500/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-200">Exploratory</span>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-[var(--text-heading)]">{claim.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-body-secondary)]">{claim.question}</p>
              <dl className="mt-4 space-y-2 border-t border-[var(--border-subtle)] pt-3 text-xs">
                <div><dt className="font-semibold text-[var(--text-muted)]">Current source</dt><dd className="mt-0.5 break-all text-[var(--text-body-secondary)]">{claim.sourcePath}</dd></div>
                <div><dt className="font-semibold text-[var(--text-muted)]">Next evidence</dt><dd className="mt-0.5 text-[var(--text-body-secondary)]">{claim.nextEvidence}</dd></div>
              </dl>
              <Link href={`/${locale}#${claim.id}`} className="mt-4 inline-flex text-sm font-semibold text-[var(--accent-teal)] underline underline-offset-4">Read the brief</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3" aria-label="Evidence workflow">
        {[
          ['1', 'Freeze', 'Lock hypotheses, paired seeds, metrics, and exclusions before running the confirmatory campaign.'],
          ['2', 'Verify', 'Publish hashes, run manifests, quality checks, and uncertainty summaries with the result files.'],
          ['3', 'Interpret', 'Update claim status only after the campaign passes verification and independent review.'],
        ].map(([number, title, body]) => (
          <article key={number} className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-warm)] p-5">
            <span className="text-2xl font-semibold text-[var(--accent-gold)]">{number}</span>
            <h2 className="mt-2 text-lg font-semibold text-[var(--text-heading)]">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-body-secondary)]">{body}</p>
          </article>
        ))}
      </section>
    </PageShell>
  );
}
