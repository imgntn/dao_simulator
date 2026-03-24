'use client';

import { Suspense, useRef } from 'react';
import { PodcastEmbed } from './PodcastEmbed';
import { BasicPodcastPlayer } from './BasicPodcastPlayer';
import { StickyAudioBar } from './StickyAudioBar';
import { useLocale } from '@/lib/i18n/locale-context';

const PODCAST_EMBED_URL = process.env.NEXT_PUBLIC_PODCAST_EMBED_URL;
const PODCAST_SRC = 'https://pub-5203989d31a346d288f97e48812ab2e0.r2.dev/greenpill-123-james-pollack.mp3';

function PodcastPlayerInner() {
  const { locale } = useLocale();
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  if (PODCAST_EMBED_URL) {
    return <PodcastEmbed url={PODCAST_EMBED_URL} lang={locale} />;
  }

  return (
    <>
      {/* Hidden native audio element */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} preload="none" className="hidden">
        <source src={PODCAST_SRC} type="audio/mpeg" />
      </audio>

      {/* Main player — sticky bar shows when this scrolls out of view */}
      <div ref={playerRef} className="mt-5">
        <BasicPodcastPlayer audioRef={audioRef} />
      </div>

      {/* Sticky mini-player bar under nav */}
      <StickyAudioBar audioRef={audioRef} playerRef={playerRef} />
    </>
  );
}

export function PodcastPlayer() {
  return (
    <Suspense fallback={<div className="mt-5 h-24 animate-pulse rounded-2xl bg-[var(--surface-warm)]" />}>
      <PodcastPlayerInner />
    </Suspense>
  );
}
