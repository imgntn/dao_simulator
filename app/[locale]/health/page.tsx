import {
  CALIBRATION_SCORES,
  DAO_TWIN_FEATURES,
  DAO_URLS,
} from '@/lib/home/content';
import { isValidLocale, defaultLocale } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { PageShell } from '@/components/layout/PageShell';

interface DAOHealthRow {
  name: string;
  score: number;
  governance: string;
  features: string[];
  url?: string;
  tier: 'excellent' | 'good' | 'fair';
}

function getTier(score: number): DAOHealthRow['tier'] {
  if (score >= 0.88) return 'excellent';
  if (score >= 0.85) return 'good';
  return 'fair';
}

const TIER_COLORS = {
  excellent: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  good: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  fair: { bg: 'bg-zinc-500/15', text: 'text-zinc-400', border: 'border-zinc-500/30' },
} as const;

export default async function HealthDashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : defaultLocale;

  const rows: DAOHealthRow[] = Object.entries(CALIBRATION_SCORES)
    .map(([name, score]) => ({
      name,
      score,
      governance: DAO_TWIN_FEATURES[name]?.governance ?? 'Unknown',
      features: DAO_TWIN_FEATURES[name]?.features ?? [],
      url: DAO_URLS[name],
      tier: getTier(score),
    }))
    .sort((a, b) => b.score - a.score);

  const avgScore = rows.reduce((sum, r) => sum + r.score, 0) / rows.length;
  const excellent = rows.filter(r => r.tier === 'excellent').length;
  const good = rows.filter(r => r.tier === 'good').length;
  const fair = rows.filter(r => r.tier === 'fair').length;

  return (
    <PageShell locale={locale}>
      <header className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-7 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[var(--accent-teal)]">
          Governance Health Monitor
        </p>
        <h1 className="mt-3 font-serif-display text-4xl text-[var(--text-heading)] sm:text-5xl">
          Digital Twin Calibration Dashboard
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-[var(--text-body)]">
          Live calibration accuracy scores for all 14 DAO digital twins, measuring how faithfully
          each simulation reproduces real on-chain governance dynamics.
        </p>

        {/* Summary stats */}
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-warm)] p-4 text-center">
            <p className="text-3xl font-bold tabular-nums text-[var(--accent-teal)]">
              {(avgScore * 100).toFixed(1)}%
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Average Accuracy</p>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-warm)] p-4 text-center">
            <p className="text-3xl font-bold tabular-nums text-emerald-400">{excellent}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Excellent (&ge;88%)</p>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-warm)] p-4 text-center">
            <p className="text-3xl font-bold tabular-nums text-amber-400">{good}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Good (85-87%)</p>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-warm)] p-4 text-center">
            <p className="text-3xl font-bold tabular-nums text-zinc-400">{fair}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Fair (&lt;85%)</p>
          </div>
        </div>
      </header>

      {/* Methodology */}
      <section className="mt-8 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-6 sm:p-8">
        <h2 className="font-serif-display text-2xl text-[var(--text-heading)]">How Scores Are Computed</h2>
        <p className="mt-3 text-base leading-relaxed text-[var(--text-body)]">
          Each digital twin is backtested against real historical data over 10 episodes of 720 simulation steps.
          The calibration score is a weighted composite of five metrics: proposal frequency, pass rate,
          participation rate, token price trajectory (RMSE), and forum activity. Scores use Poisson-aware
          error tolerances for low-frequency metrics to account for irreducible stochastic variance.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          {[
            { label: 'Proposal Frequency', weight: '20%' },
            { label: 'Pass Rate', weight: '25%' },
            { label: 'Participation Rate', weight: '25%' },
            { label: 'Price Trajectory', weight: '15%' },
            { label: 'Forum Activity', weight: '15%' },
          ].map(m => (
            <div key={m.label} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-warm)] px-3 py-2">
              <p className="text-xs font-semibold text-[var(--accent-teal)]">{m.weight}</p>
              <p className="text-sm text-[var(--text-body)]">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DAO Cards */}
      <section className="mt-8 space-y-4">
        <h2 className="font-serif-display text-2xl text-[var(--text-heading)]">All Digital Twins</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((dao) => {
            const colors = TIER_COLORS[dao.tier];
            return (
              <article
                key={dao.name}
                className={`rounded-2xl border ${colors.border} bg-[var(--surface-panel)] p-5 transition hover:shadow-md`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {dao.url ? (
                      <a
                        href={dao.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-lg font-semibold text-[var(--text-heading)] underline decoration-[var(--border-default)] underline-offset-2 hover:text-[var(--accent-teal)] hover:decoration-[var(--accent-teal)]"
                      >
                        {dao.name}
                      </a>
                    ) : (
                      <p className="text-lg font-semibold text-[var(--text-heading)]">{dao.name}</p>
                    )}
                    <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      {dao.governance}
                    </p>
                  </div>
                  <div className={`rounded-lg px-3 py-1.5 ${colors.bg}`}>
                    <p className={`text-xl font-bold tabular-nums ${colors.text}`}>
                      {(dao.score * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Score bar */}
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-warm-deep)]">
                  <div
                    className={`h-full rounded-full transition-all ${
                      dao.tier === 'excellent' ? 'bg-emerald-500' :
                      dao.tier === 'good' ? 'bg-amber-500' : 'bg-zinc-500'
                    }`}
                    style={{ width: `${dao.score * 100}%` }}
                  />
                </div>

                {/* Features */}
                <ul className="mt-3 space-y-1">
                  {dao.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs leading-relaxed text-[var(--text-body-secondary)]">
                      <span className="mt-[0.35em] h-1 w-1 shrink-0 rounded-full bg-[var(--accent-teal)]" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <a
                    href={`/${locale}/simulate?dao=${dao.name.toLowerCase().replace(/\s+/g, '_')}`}
                    className="rounded-lg bg-[var(--surface-warm)] px-3 py-1.5 text-xs font-medium text-[var(--text-heading)] transition hover:bg-[var(--accent-teal)] hover:text-white"
                  >
                    Simulate
                  </a>
                  {dao.url && (
                    <a
                      href={dao.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-[var(--surface-warm)] px-3 py-1.5 text-xs font-medium text-[var(--text-heading)] transition hover:bg-[var(--surface-warm-deep)]"
                    >
                      Live Governance
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-2xl border border-[var(--accent-teal)]/30 bg-[var(--accent-teal)]/5 p-7 text-center">
        <h2 className="font-serif-display text-2xl text-[var(--text-heading)]">Run Your Own Calibration</h2>
        <p className="mx-auto mt-3 max-w-2xl text-base text-[var(--text-body)]">
          Use the research console to re-run calibration validation with custom parameters,
          or test counterfactual governance rules against any digital twin.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <a
            href={`/${locale}/simulate`}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-teal)] px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[var(--accent-teal-hover)]"
          >
            Open Simulator
          </a>
          <a
            href={`/${locale}/console`}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-warm)] px-6 py-3 text-base font-semibold text-[var(--text-heading)] shadow-sm transition hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)]"
          >
            Research Console
          </a>
        </div>
      </section>
    </PageShell>
  );
}
