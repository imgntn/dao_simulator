'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { useActiveSnapshot } from '@/lib/browser/useActiveSnapshot';
import type { SimulationEvent } from '@/lib/browser/worker-protocol';

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

type EventCategory = 'governance' | 'market' | 'social' | 'system';

const CATEGORY_MAP: Record<string, EventCategory> = {
  proposal_created: 'governance',
  proposal_approved: 'governance',
  proposal_rejected: 'governance',
  proposal_expired: 'governance',
  vote_cast: 'governance',
  delegation: 'governance',
  treasury_change: 'market',
  price_change: 'market',
  forum_topic: 'social',
  member_joined: 'social',
  member_left: 'social',
  black_swan: 'system',
};

const CATEGORY_COLORS: Record<EventCategory, string> = {
  governance: '#8b5cf6',
  market: '#f59e0b',
  social: '#3b82f6',
  system: '#ef4444',
};

interface Props {
  className?: string;
}

export function EventFeed({ className = '' }: Props) {
  const snapshot = useActiveSnapshot();
  const events = snapshot?.recentEvents ?? [];

  const [activeCategories, setActiveCategories] = useState<Set<EventCategory>>(
    new Set(['governance', 'market', 'social', 'system'])
  );
  const [paused, setPaused] = useState(false);
  const frozenEvents = useRef<SimulationEvent[]>([]);

  // Freeze events when paused
  useEffect(() => {
    if (!paused) {
      frozenEvents.current = events;
    }
  }, [events, paused]);

  const displayEvents = paused ? frozenEvents.current : events;

  const filtered = useMemo(() => {
    return displayEvents
      .filter(evt => {
        const cat = CATEGORY_MAP[evt.type];
        return cat ? activeCategories.has(cat) : true;
      })
      .slice(-12);
  }, [displayEvents, activeCategories]);

  const toggleCategory = (cat: EventCategory) => {
    setActiveCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  if (events.length === 0 && !paused) return null;

  return (
    <div className={`bg-[var(--sim-bg)]/80 backdrop-blur-sm border-t border-[var(--sim-border)] p-3 ${className}`}>
      {/* Filter bar */}
      <div className="flex items-center gap-1.5 mb-2">
        {(Object.keys(CATEGORY_COLORS) as EventCategory[]).map(cat => (
          <button
            key={cat}
            onClick={() => toggleCategory(cat)}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider transition-all border ${
              activeCategories.has(cat)
                ? 'opacity-100'
                : 'opacity-40'
            }`}
            style={{
              borderColor: CATEGORY_COLORS[cat],
              color: CATEGORY_COLORS[cat],
              backgroundColor: activeCategories.has(cat) ? `${CATEGORY_COLORS[cat]}20` : 'transparent',
            }}
          >
            {cat}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setPaused(!paused)}
          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-colors ${
            paused
              ? 'bg-amber-600/30 text-amber-300 border border-amber-600/50'
              : 'text-[var(--sim-text-muted)] hover:text-[var(--sim-text-secondary)] border border-transparent'
          }`}
        >
          {paused ? 'Frozen' : 'Pause'}
        </button>
      </div>

      {/* Events */}
      <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
        {filtered.map((evt, i) => (
          <div key={`${evt.step}-${evt.type}-${i}`} className="flex items-start gap-2 text-xs leading-relaxed">
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
