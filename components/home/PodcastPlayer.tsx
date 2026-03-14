'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PodcastTranscript, type TranscriptData, type TranscriptSegment, type TranscriptChapter } from './PodcastTranscript';
import { AudioControls } from './AudioControls';
import { useLocale } from '@/lib/i18n/locale-context';

const PODCAST_SRC = 'https://pub-5203989d31a346d288f97e48812ab2e0.r2.dev/greenpill-123-james-pollack.mp3';

const PODCAST_CHAPTERS = [
  { time: 0, label: 'Intro' },
  { time: 173, label: 'DAO Simulator' },
  { time: 633, label: 'Agent Based Model Breakdown' },
  { time: 844, label: 'Complex Systems Meta Commentary' },
  { time: 1098, label: 'Can DAOs Have Programmable Goals?' },
  { time: 1311, label: 'Running An EVM Inside?' },
  { time: 1414, label: 'How Do You Monetize?' },
  { time: 1754, label: 'Reaching The Next Stage Of Maturity' },
  { time: 1941, label: 'What If The Model Lived on Chain?' },
  { time: 2224, label: 'What Features Would Kevin Want?' },
  { time: 2455, label: 'A Fun Design Space To Explore' },
  { time: 2716, label: 'Open Sourcing The Code' },
];

function formatChapterTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function PodcastPlayerInner() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [segments, setSegments] = useState<TranscriptSegment[] | null>(null);
  const [chapters, setChapters] = useState<TranscriptChapter[]>([]);
  const searchParams = useSearchParams();
  const { locale } = useLocale();

  // Load locale-specific transcript JSON (fall back to English)
  useEffect(() => {
    const file = locale === 'en'
      ? '/podcast-transcript.json'
      : `/podcast-transcript-${locale}.json`;

    fetch(file)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: TranscriptData) => {
        setSegments(data.segments);
        setChapters(data.chapters ?? []);
      })
      .catch(() => {
        // Fall back to English transcript if locale version unavailable
        if (locale !== 'en') {
          fetch('/podcast-transcript.json')
            .then((res) => res.ok ? res.json() : null)
            .then((data: TranscriptData | null) => {
              if (data) {
                setSegments(data.segments);
                setChapters(data.chapters ?? []);
              }
            })
            .catch(() => {});
        }
      });
  }, [locale]);

  // Deep link: ?t= param seeks to timestamp on load
  useEffect(() => {
    const tParam = searchParams.get('t');
    if (!tParam) return;
    const seconds = Number(tParam);
    if (!isFinite(seconds) || seconds < 0) return;

    const audio = audioRef.current;
    if (!audio) return;

    const seekOnLoad = () => {
      audio.currentTime = seconds;
    };

    if (audio.readyState >= 1) {
      seekOnLoad();
    } else {
      audio.addEventListener('loadedmetadata', seekOnLoad, { once: true });
      return () => audio.removeEventListener('loadedmetadata', seekOnLoad);
    }
  }, [searchParams]);

  return (
    <div className="mt-5 space-y-3">
      {/* Hidden native audio element — AudioControls provides the UI */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        preload="none"
        className="hidden"
      >
        <source src={PODCAST_SRC} type="audio/mpeg" />
      </audio>

      <AudioControls audioRef={audioRef} />

      {/* Chapter list */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-warm-deep)] p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Chapters</p>
        <div className="mt-2 grid gap-1">
          {PODCAST_CHAPTERS.map((ch, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                const audio = audioRef.current;
                if (audio) {
                  audio.currentTime = ch.time;
                  if (audio.paused) audio.play();
                }
              }}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-[var(--surface-warm)]"
            >
              <span className="shrink-0 font-mono text-xs text-[var(--accent-teal)]">{formatChapterTime(ch.time)}</span>
              <span className="text-[var(--text-body-secondary)]">{ch.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Transcript hidden — content not yet accurate
      {segments && segments.length > 0 && (
        <PodcastTranscript audioRef={audioRef} segments={segments} chapters={chapters} />
      )}
      */}
    </div>
  );
}

export function PodcastPlayer() {
  return (
    <Suspense fallback={<div className="mt-5 h-24 animate-pulse rounded-2xl bg-[var(--surface-warm)]" />}>
      <PodcastPlayerInner />
    </Suspense>
  );
}
