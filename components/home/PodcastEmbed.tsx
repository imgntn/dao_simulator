'use client';

import { useEffect, useRef, useCallback } from 'react';

interface PodcastEmbedProps {
  url: string;
  lang?: string;
}

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

export function PodcastEmbed({ url, lang = 'en' }: PodcastEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const currentTimeRef = useRef(0);

  // Listen for timeupdate messages from the iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'timeupdate' && typeof e.data.time === 'number') {
        currentTimeRef.current = e.data.time;
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const seekTo = useCallback((time: number) => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'seek', time }, '*');
  }, []);

  const iframeSrc = `${url}?lang=${encodeURIComponent(lang)}`;

  return (
    <div className="mt-5 space-y-3">
      {/* Iframe — 16:9 responsive container */}
      <div className="relative w-full overflow-hidden rounded-xl border border-[var(--border-subtle)]" style={{ aspectRatio: '16/9', maxHeight: 400 }}>
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          className="absolute inset-0 h-full w-full border-0"
          allow="autoplay; fullscreen"
          title="Podcast Player"
        />
      </div>

      {/* Chapter list — same as before, sends seek via postMessage */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-warm-deep)] p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Chapters</p>
        <div className="mt-2 grid gap-1">
          {PODCAST_CHAPTERS.map((ch, i) => (
            <button
              key={i}
              type="button"
              onClick={() => seekTo(ch.time)}
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
