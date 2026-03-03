'use client';

import { useEffect, useRef, useState, useCallback, useMemo, type RefObject } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export interface TranscriptChapter {
  id: number;
  title: string;
  startTime: number;
  endTime: number;
  startSegmentId: number;
  endSegmentId: number;
}

export interface TranscriptData {
  chapters: TranscriptChapter[];
  segments: TranscriptSegment[];
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PodcastTranscriptProps {
  audioRef: RefObject<HTMLAudioElement | null>;
  segments: TranscriptSegment[];
  chapters?: TranscriptChapter[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const SPEAKER_COLORS: Record<string, { bg: string; text: string }> = {
  'Kevin Owocki': { bg: 'bg-[var(--accent-teal)]/15', text: 'text-[var(--accent-teal)]' },
  'James Pollack': { bg: 'bg-[var(--accent-gold)]/15', text: 'text-[var(--accent-gold)]' },
};

function getSpeakerStyle(name: string) {
  return SPEAKER_COLORS[name] ?? { bg: 'bg-[var(--surface-warm-deep)]', text: 'text-[var(--text-muted)]' };
}

function firstName(name: string) {
  return name.split(' ')[0];
}

/** Highlight matching text with <mark> tags */
function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="rounded bg-[var(--accent-gold)]/25 text-[var(--text-heading)] px-0.5">{part}</mark>
    ) : (
      part
    ),
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PodcastTranscript({ audioRef, segments, chapters = [] }: PodcastTranscriptProps) {
  const [activeId, setActiveId] = useState<number>(-1);
  const [focusedId, setFocusedId] = useState<number>(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [collapsedChapters, setCollapsedChapters] = useState<Set<number>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const userScrolledRef = useRef(false);
  const userScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Search matches ----
  const matchingIds = useMemo(() => {
    if (!searchQuery.trim()) return [] as number[];
    const q = searchQuery.toLowerCase();
    return segments.filter((seg) => seg.text.toLowerCase().includes(q)).map((seg) => seg.id);
  }, [segments, searchQuery]);

  // Ensure matchIndex stays in bounds
  useEffect(() => {
    if (matchIndex >= matchingIds.length) setMatchIndex(0);
  }, [matchingIds, matchIndex]);

  // Expand chapters containing matches
  useEffect(() => {
    if (!searchQuery.trim() || chapters.length === 0) return;
    const matchSet = new Set(matchingIds);
    const toExpand: number[] = [];
    for (const ch of chapters) {
      for (let sid = ch.startSegmentId; sid <= ch.endSegmentId; sid++) {
        if (matchSet.has(sid)) {
          toExpand.push(ch.id);
          break;
        }
      }
    }
    if (toExpand.length > 0) {
      setCollapsedChapters((prev) => {
        const next = new Set(prev);
        for (const id of toExpand) next.delete(id);
        return next;
      });
    }
  }, [matchingIds, chapters, searchQuery]);

  // ---- Track active segment via timeupdate ----
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      const t = audio.currentTime;
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

  // ---- Detect user scroll — pause auto-scroll for 5s ----
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

  // ---- Auto-scroll active segment into view ----
  useEffect(() => {
    if (userScrolledRef.current) return;
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeId]);

  // ---- Click-to-seek ----
  const handleClick = useCallback((start: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = start;
    if (audio.paused) audio.play();
  }, [audioRef]);

  // ---- Copy shareable link ----
  const handleCopyLink = useCallback((seg: TranscriptSegment) => {
    const url = new URL(window.location.href);
    url.searchParams.set('t', String(Math.floor(seg.start)));
    navigator.clipboard.writeText(url.toString());
    setCopiedId(seg.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // ---- Toggle chapter ----
  const toggleChapter = useCallback((chapterId: number) => {
    setCollapsedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  }, []);

  // ---- Keyboard navigation ----
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const ids = segments.map((s) => s.id);
    const currentIdx = ids.indexOf(focusedId);

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const nextIdx = currentIdx < ids.length - 1 ? currentIdx + 1 : 0;
        setFocusedId(ids[nextIdx]);
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : ids.length - 1;
        setFocusedId(ids[prevIdx]);
        break;
      }
      case 'Enter':
      case ' ': {
        e.preventDefault();
        if (focusedId >= 0) {
          const seg = segments.find((s) => s.id === focusedId);
          if (seg) handleClick(seg.start);
        }
        break;
      }
      case 'Escape':
        e.preventDefault();
        containerRef.current?.blur();
        setFocusedId(-1);
        break;
    }
  }, [focusedId, segments, handleClick]);

  // Scroll focused segment into view
  useEffect(() => {
    if (focusedId < 0) return;
    const el = document.getElementById(`seg-${focusedId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [focusedId]);

  // ---- Search navigation ----
  const navigateMatch = useCallback((direction: 1 | -1) => {
    if (matchingIds.length === 0) return;
    setMatchIndex((prev) => {
      const next = prev + direction;
      if (next < 0) return matchingIds.length - 1;
      if (next >= matchingIds.length) return 0;
      return next;
    });
  }, [matchingIds]);

  // Scroll to current match
  useEffect(() => {
    if (matchingIds.length === 0) return;
    const targetId = matchingIds[matchIndex];
    const el = document.getElementById(`seg-${targetId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [matchIndex, matchingIds]);

  // ---- Build chapter map ----
  const chapterForSegment = useMemo(() => {
    const map = new Map<number, TranscriptChapter>();
    for (const ch of chapters) {
      for (let sid = ch.startSegmentId; sid <= ch.endSegmentId; sid++) {
        map.set(sid, ch);
      }
    }
    return map;
  }, [chapters]);

  // ---- Render helpers ----
  const hasChapters = chapters.length > 0;
  const matchSet = useMemo(() => new Set(matchingIds), [matchingIds]);

  const renderSegment = (seg: TranscriptSegment, prevSpeaker: string | undefined) => {
    const isActive = seg.id === activeId;
    const isFocused = seg.id === focusedId;
    const isMatch = matchSet.has(seg.id);
    const dimmed = searchQuery.trim() && !isMatch;
    const showSpeaker = seg.speaker && seg.speaker !== prevSpeaker;
    const speakerStyle = seg.speaker ? getSpeakerStyle(seg.speaker) : null;

    return (
      <div key={seg.id} id={`seg-${seg.id}`} className={dimmed ? 'opacity-40' : ''}>
        {/* Speaker badge — only on speaker change */}
        {showSpeaker && speakerStyle && (
          <div className="ml-3 mt-2 mb-0.5">
            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${speakerStyle.bg} ${speakerStyle.text}`}>
              {firstName(seg.speaker!)}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={() => handleClick(seg.start)}
          aria-current={isActive ? 'true' : undefined}
          aria-selected={isFocused}
          role="option"
          className={`group/seg flex w-full gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
            isActive
              ? 'border-l-2 border-l-[var(--accent-teal)] bg-[var(--accent-teal)]/10'
              : 'border-l-2 border-l-transparent text-[var(--text-body-secondary)] hover:bg-[var(--surface-warm-deep)]'
          } ${isFocused ? 'ring-2 ring-[var(--accent-teal)]' : ''}`}
        >
          <span className="shrink-0 pt-0.5 font-mono text-xs text-[var(--text-muted)]">
            {formatTime(seg.start)}
          </span>
          <span className={`flex-1 text-sm leading-relaxed ${isActive ? 'text-[var(--text-heading)]' : ''}`}>
            {searchQuery.trim() && isMatch ? highlightText(seg.text, searchQuery.trim()) : seg.text}
          </span>

          {/* Copy link button */}
          <span className="relative shrink-0">
            {copiedId === seg.id ? (
              <span className="text-[10px] font-medium text-[var(--accent-teal)]">Copied!</span>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyLink(seg);
                }}
                className="opacity-0 group-hover/seg:opacity-100 transition-opacity text-[var(--text-muted)] hover:text-[var(--accent-teal)]"
                aria-label={`Copy link to ${formatTime(seg.start)}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                </svg>
              </button>
            )}
          </span>
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col rounded-2xl border border-[var(--border-default)] bg-[var(--surface-warm)]">
      {/* Search bar */}
      <div className="flex items-center gap-2 border-b border-[var(--border-default)] px-3 py-2">
        {/* Search icon */}
        <svg className="shrink-0 text-[var(--text-muted)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search transcript..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setMatchIndex(0); }}
          className="flex-1 bg-transparent text-sm text-[var(--text-heading)] placeholder:text-[var(--text-muted)] outline-none"
          aria-label="Search transcript"
        />

        {searchQuery.trim() && (
          <>
            {/* Match counter */}
            <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)]">
              {matchingIds.length > 0 ? `${matchIndex + 1} of ${matchingIds.length}` : 'No matches'}
            </span>

            {/* Navigate matches */}
            {matchingIds.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => navigateMatch(-1)}
                  className="rounded p-0.5 text-[var(--text-muted)] hover:bg-[var(--surface-warm-deep)]"
                  aria-label="Previous match"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6" /></svg>
                </button>
                <button
                  type="button"
                  onClick={() => navigateMatch(1)}
                  className="rounded p-0.5 text-[var(--text-muted)] hover:bg-[var(--surface-warm-deep)]"
                  aria-label="Next match"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                </button>
              </>
            )}

            {/* Clear search */}
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setMatchIndex(0); }}
              className="rounded p-0.5 text-[var(--text-muted)] hover:bg-[var(--surface-warm-deep)]"
              aria-label="Clear search"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </>
        )}
      </div>

      {/* Transcript body */}
      <div
        ref={containerRef}
        role="listbox"
        aria-label="Podcast transcript"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (focusedId < 0 && segments.length > 0) setFocusedId(segments[0].id); }}
        className="max-h-80 overflow-y-auto outline-none"
      >
        <div className="p-1">
          {hasChapters
            ? renderWithChapters(segments, chapters, collapsedChapters, toggleChapter, handleClick, renderSegment)
            : renderFlat(segments, renderSegment)}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rendering strategies
// ---------------------------------------------------------------------------

function renderFlat(
  segments: TranscriptSegment[],
  renderSegment: (seg: TranscriptSegment, prevSpeaker: string | undefined) => React.ReactNode,
) {
  return segments.map((seg, i) => renderSegment(seg, i > 0 ? segments[i - 1].speaker : undefined));
}

function renderWithChapters(
  segments: TranscriptSegment[],
  chapters: TranscriptChapter[],
  collapsedChapters: Set<number>,
  toggleChapter: (id: number) => void,
  seekTo: (start: number) => void,
  renderSegment: (seg: TranscriptSegment, prevSpeaker: string | undefined) => React.ReactNode,
) {
  const elements: React.ReactNode[] = [];

  for (const chapter of chapters) {
    const isCollapsed = collapsedChapters.has(chapter.id);
    const chapterSegments = segments.filter(
      (s) => s.id >= chapter.startSegmentId && s.id <= chapter.endSegmentId,
    );

    // Chapter header
    elements.push(
      <div key={`ch-${chapter.id}`} className="sticky top-0 z-10 bg-[var(--surface-warm)] border-b border-[var(--border-default)]">
        <button
          type="button"
          onClick={() => toggleChapter(chapter.id)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] transition hover:text-[var(--text-heading)]"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={`shrink-0 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
          >
            <path d="M8 5v14l11-7z" />
          </svg>
          <span className="flex-1 truncate">{chapter.title}</span>
          <span
            className="shrink-0 font-mono font-normal text-[var(--text-muted)] cursor-pointer hover:text-[var(--accent-teal)]"
            onClick={(e) => {
              e.stopPropagation();
              seekTo(chapter.startTime);
            }}
          >
            {formatTime(chapter.startTime)}
          </span>
        </button>
      </div>,
    );

    // Chapter segments
    if (!isCollapsed) {
      chapterSegments.forEach((seg, i) => {
        const prevSpeaker = i > 0 ? chapterSegments[i - 1].speaker : undefined;
        elements.push(renderSegment(seg, prevSpeaker));
      });
    }
  }

  return elements;
}
