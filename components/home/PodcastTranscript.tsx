'use client';

import { useEffect, useRef, useState, useCallback, type RefObject } from 'react';

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

interface PodcastTranscriptProps {
  audioRef: RefObject<HTMLAudioElement | null>;
  segments: TranscriptSegment[];
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PodcastTranscript({ audioRef, segments }: PodcastTranscriptProps) {
  const [activeId, setActiveId] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const userScrolledRef = useRef(false);
  const userScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track the active segment via timeupdate
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      const t = audio.currentTime;
      // Binary-search-like: segments are sorted by start time
      let found = -1;
      for (let i = segments.length - 1; i >= 0; i--) {
        if (t >= segments[i].start) {
          found = segments[i].id;
          break;
        }
      }
      setActiveId(found);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    return () => audio.removeEventListener('timeupdate', onTimeUpdate);
  }, [audioRef, segments]);

  // Detect user scroll — pause auto-scroll for 5 seconds
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onScroll = () => {
      userScrolledRef.current = true;
      if (userScrollTimerRef.current) clearTimeout(userScrollTimerRef.current);
      userScrollTimerRef.current = setTimeout(() => {
        userScrolledRef.current = false;
      }, 5000);
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      if (userScrollTimerRef.current) clearTimeout(userScrollTimerRef.current);
    };
  }, []);

  // Auto-scroll active segment into view
  useEffect(() => {
    if (userScrolledRef.current) return;
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeId]);

  // Click-to-seek
  const handleClick = useCallback((start: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = start;
    if (audio.paused) audio.play();
  }, [audioRef]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Podcast transcript"
      className="max-h-64 overflow-y-auto rounded-2xl border border-[var(--border-default)] bg-[var(--surface-warm)]"
    >
      <div className="p-1">
        {segments.map((seg) => {
          const isActive = seg.id === activeId;
          return (
            <button
              key={seg.id}
              ref={isActive ? activeRef : undefined}
              type="button"
              onClick={() => handleClick(seg.start)}
              aria-current={isActive ? 'true' : undefined}
              className={`flex w-full gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                isActive
                  ? 'border-l-2 border-l-[var(--accent-teal)] bg-[var(--accent-teal)]/10'
                  : 'border-l-2 border-l-transparent text-[var(--text-body-secondary)] hover:bg-[var(--surface-warm-deep)]'
              }`}
            >
              <span className="shrink-0 pt-0.5 font-mono text-xs text-[var(--text-muted)]">
                {formatTime(seg.start)}
              </span>
              <span className={`text-sm leading-relaxed ${isActive ? 'text-[var(--text-heading)]' : ''}`}>
                {seg.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
