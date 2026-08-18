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
  tier: 'strong' | 'moderate' | 'limited';
}

function getTier(score: number): DAOHealthRow['tier'] {
  if (score >= 0.6) return 'strong';
  if (score >= 0.4) return 'moderate';
  return 'limited';
}

const TIER_COLORS = {
  strong: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  moderate: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  limited: { bg: 'bg-zinc-500/15', text: 'text-zinc-400', border: 'border-zinc-500/30' },
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
  const strong = rows.filter(r => r.tier === 'strong').length;
  const moderate = rows.filter(r => r.tier === 'moderate').length;
  const limited = rows.filter(r => r.tier === 'limited').length;

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
          Frozen 2025 temporal-holdout similarity scores for all 14 DAO digital twins. These
          measure composite historical fidelity and are not universal forecasting accuracy.
        </p>

        {/* Summary stats */}
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-warm)] p-4 text-center">
            <p className="text-3xl font-bold tabular-nums text-[var(--accent-teal)]">
              {(avgScore * 100).toFixed(1)}%
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Mean Held-out Similarity</p>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-warm)] p-4 text-center">
            <p className="text-3xl font-bold tabular-nums text-emerald-400">{strong}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Strong (&ge;60%)</p>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-warm)] p-4 text-center">
            <p className="text-3xl font-bold tabular-nums text-amber-400">{moderate}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Moderate (40-59%)</p>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-warm)] p-4 text-center">
            <p className="text-3xl font-bold tabular-nums text-zinc-400">{limited}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Limited (&lt;40%)</p>
          </div>
        </div>
      </header>

      {/* Methodology */}
      <section className="mt-8 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-6 sm:p-8">
        <h2 className="font-serif-display text-2xl text-[var(--text-heading)]">How Scores Are Computed</h2>
        <p className="mt-3 text-base leading-relaxed text-[var(--text-body)]">
          Each twin was trained on 2023-2024 profiles and evaluated on a separately hashed 2025
          holdout over 30 episodes of 1,440 steps. The score is a bounded weighted composite of
          proposal frequency, pass rate, participation, price level, voter concentration, and forum
          activity; unavailable observed dimensions are omitted and weights are renormalized.
          Calibrated runs beat historical persistence for 5/14 DAOs and an uncalibrated simulator
          for 8/14, so the per-DAO failures are part of the result.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Proposal Frequency', weight: '25%' },
            { label: 'Pass Rate', weight: '20%' },
            { label: 'Participation Rate', weight: '20%' },
            { label: 'Price Trajectory', weight: '15%' },
            { label: 'Voter Concentration', weight: '10%' },
            { label: 'Forum Activity', weight: '10%' },
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
                      dao.tier === 'strong' ? 'bg-emerald-500' :
                      dao.tier === 'moderate' ? 'bg-amber-500' : 'bg-zinc-500'
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
