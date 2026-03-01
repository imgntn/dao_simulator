'use client';

import { useEffect, useRef, useState } from 'react';
import { PodcastTranscript, type TranscriptSegment } from './PodcastTranscript';

const PODCAST_SRC = 'https://pub-5203989d31a346d288f97e48812ab2e0.r2.dev/greenpill-123-james-pollack.mp3';

export function PodcastPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [segments, setSegments] = useState<TranscriptSegment[] | null>(null);

  useEffect(() => {
    fetch('/podcast-transcript.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { segments: TranscriptSegment[] }) => {
        setSegments(data.segments);
      })
      .catch(() => {
        // Transcript unavailable — audio still works, no crash
      });
  }, []);

  return (
    <div className="mt-5 space-y-3">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        controls
        preload="none"
        className="w-full max-w-lg rounded-lg"
      >
        <source src={PODCAST_SRC} type="audio/mpeg" />
      </audio>

      {segments && segments.length > 0 && (
        <PodcastTranscript audioRef={audioRef} segments={segments} />
      )}
    </div>
  );
}
