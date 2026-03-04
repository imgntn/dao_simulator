'use client';

import { useSimulationStore } from '@/lib/browser/simulation-store';

const EVENT_COLORS: Record<string, string> = {
  proposal_created: 'text-blue-400',
  proposal_approved: 'text-green-400',
  proposal_rejected: 'text-red-400',
  proposal_expired: 'text-[var(--sim-text-muted)]',
  vote_cast: 'text-[var(--sim-text-muted)]',
  black_swan: 'text-red-500',
  treasury_change: 'text-yellow-400',
  member_joined: 'text-[var(--sim-accent)]',
  member_left: 'text-orange-400',
  delegation: 'text-purple-400',
  forum_topic: 'text-indigo-400',
  price_change: 'text-amber-400',
};

const EVENT_ICONS: Record<string, string> = {
  proposal_created: '+',
  proposal_approved: '✓',
  proposal_rejected: '✗',
  proposal_expired: '○',
  vote_cast: '→',
  black_swan: '⚡',
  treasury_change: '$',
  price_change: '~',
};

interface Props {
  className?: string;
}

export function EventFeed({ className = '' }: Props) {
  const snapshot = useSimulationStore(s => s.snapshot);
  const events = snapshot?.recentEvents ?? [];

  if (events.length === 0) return null;

  // Show last 8 events
  const visible = events.slice(-8);

  return (
    <div className={`bg-[var(--sim-bg)]/80 backdrop-blur-sm border-t border-[var(--sim-border)] p-3 ${className}`}>
      <div className="space-y-0.5 max-h-[160px] overflow-y-auto">
        {visible.map((evt, i) => (
          <div key={`${evt.step}-${i}`} className="flex items-start gap-2 text-xs leading-relaxed">
            <span className="font-mono text-[var(--sim-text-dim)] min-w-[3ch] text-right">{evt.step}</span>
            <span className={`${EVENT_COLORS[evt.type] ?? 'text-[var(--sim-text-muted)]'} min-w-[1ch]`}>
              {EVENT_ICONS[evt.type] ?? '·'}
            </span>
            <span className="text-[var(--sim-text-muted)] truncate">{evt.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
