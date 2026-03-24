'use client';

import { type RefObject } from 'react';
import { AudioControls } from './AudioControls';

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

interface BasicPodcastPlayerProps {
  audioRef: RefObject<HTMLAudioElement | null>;
}

export function BasicPodcastPlayer({ audioRef }: BasicPodcastPlayerProps) {
  return (
    <div className="space-y-3">
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
    </div>
  );
}
