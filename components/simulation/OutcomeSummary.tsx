'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useSimulationStore } from '@/lib/browser/simulation-store';
import { useActiveSnapshot } from '@/lib/browser/useActiveSnapshot';
import { useAnalytics } from '@/components/analytics/AnalyticsProvider';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';

function signed(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '--';
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}`;
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function OutcomeSummary() {
  const snapshot = useActiveSnapshot();
  const previous = useSimulationStore(s => s.previousSnapshot);
  const config = useSimulationStore(s => s.config);
  const { trackEvent } = useAnalytics();
  const tracked = useRef(false);

  useEffect(() => {
    if (!snapshot || tracked.current) return;
    tracked.current = true;
    trackEvent(ANALYTICS_EVENTS.OUTCOME_SUMMARY_VIEWED);
  }, [snapshot, trackEvent]);

  const outcome = useMemo(() => {
    if (!snapshot) return null;
    const baseline = previous ?? snapshot;
    const participationDelta = snapshot.avgParticipationRate - baseline.avgParticipationRate;
    const inequalityDelta = snapshot.gini - baseline.gini;
    const treasuryDelta = snapshot.treasuryFunds - baseline.treasuryFunds;
    const latestEvent = snapshot.recentEvents[0];
    const signal = participationDelta >= 0.01
      ? 'Participation is strengthening.'
      : participationDelta <= -0.01
        ? 'Participation is weakening.'
        : inequalityDelta >= 0.015
          ? 'Power is concentrating.'
          : inequalityDelta <= -0.015
            ? 'Power is spreading more evenly.'
            : 'The latest state is broadly stable.';

    return {
      signal,
      participationDelta,
      inequalityDelta,
      treasuryDelta,
      latestEvent,
    };
  }, [previous, snapshot]);

  if (!outcome || !snapshot) {
    return (
      <div className="p-3 text-xs text-[var(--sim-text-muted)]">
        Choose a guided scenario and run it to see the first outcome summary.
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3" data-testid="outcome-summary" role="status" aria-live="polite">
      <div className="rounded border p-3" style={{ borderColor: 'var(--sim-accent)', background: 'rgba(64,232,255,0.06)' }}>
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--sim-accent)]">First read</div>
        <p className="mt-1 text-sm font-semibold text-[var(--sim-text-secondary)]">{outcome.signal}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--sim-text-muted)]">
          This is an exploratory model readout, not a forecast. Compare a second scenario before drawing a conclusion.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded border p-2" style={{ borderColor: 'var(--sim-border)' }}>
          <dt className="text-[var(--sim-text-muted)]">Participation</dt>
          <dd className="mt-1 font-semibold text-[var(--sim-text-secondary)]">{percent(snapshot.avgParticipationRate)} <span className="text-[var(--sim-accent)]">({signed(outcome.participationDelta * 100)} pts)</span></dd>
        </div>
        <div className="rounded border p-2" style={{ borderColor: 'var(--sim-border)' }}>
          <dt className="text-[var(--sim-text-muted)]">Inequality (Gini)</dt>
          <dd className="mt-1 font-semibold text-[var(--sim-text-secondary)]">{percent(snapshot.gini)} <span className="text-[var(--sim-accent)]">({signed(outcome.inequalityDelta * 100)} pts)</span></dd>
        </div>
        <div className="rounded border p-2" style={{ borderColor: 'var(--sim-border)' }}>
          <dt className="text-[var(--sim-text-muted)]">Treasury</dt>
          <dd className="mt-1 font-semibold text-[var(--sim-text-secondary)]">${Math.round(snapshot.treasuryFunds).toLocaleString()} <span className="text-[var(--sim-accent)]">({signed(outcome.treasuryDelta, 0)})</span></dd>
        </div>
        <div className="rounded border p-2" style={{ borderColor: 'var(--sim-border)' }}>
          <dt className="text-[var(--sim-text-muted)]">Run</dt>
          <dd className="mt-1 font-semibold text-[var(--sim-text-secondary)]">{config.daoId} · step {snapshot.step}</dd>
        </div>
      </dl>

      <p className="text-[11px] leading-relaxed text-[var(--sim-text-muted)]">
        Latest signal: {outcome.latestEvent?.message ?? 'No discrete event is leading the current explanation.'}
      </p>
    </div>
  );
}
