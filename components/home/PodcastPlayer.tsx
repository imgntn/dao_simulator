'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PodcastTranscript, type TranscriptData, type TranscriptSegment, type TranscriptChapter } from './PodcastTranscript';
import { AudioControls } from './AudioControls';

const PODCAST_SRC = 'https://pub-5203989d31a346d288f97e48812ab2e0.r2.dev/greenpill-123-james-pollack.mp3';

function PodcastPlayerInner() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [segments, setSegments] = useState<TranscriptSegment[] | null>(null);
  const [chapters, setChapters] = useState<TranscriptChapter[]>([]);
  const searchParams = useSearchParams();

  // Load transcript JSON
  useEffect(() => {
    fetch('/podcast-transcript.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: TranscriptData) => {
        setSegments(data.segments);
        setChapters(data.chapters ?? []);
      })
      .catch(() => {
        // Transcript unavailable — audio still works, no crash
      });
  }, []);

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

      {segments && segments.length > 0 && (
        <PodcastTranscript audioRef={audioRef} segments={segments} chapters={chapters} />
      )}
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
