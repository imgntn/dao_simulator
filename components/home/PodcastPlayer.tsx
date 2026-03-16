'use client';

import { Suspense } from 'react';
import { PodcastEmbed } from './PodcastEmbed';
import { BasicPodcastPlayer } from './BasicPodcastPlayer';

const PODCAST_EMBED_URL = process.env.NEXT_PUBLIC_PODCAST_EMBED_URL;

function PodcastPlayerInner() {
  if (PODCAST_EMBED_URL) {
    return <PodcastEmbed url={PODCAST_EMBED_URL} />;
  }

  return <BasicPodcastPlayer />;
}

export function PodcastPlayer() {
  return (
    <Suspense fallback={<div className="mt-5 h-24 animate-pulse rounded-2xl bg-[var(--surface-warm)]" />}>
      <PodcastPlayerInner />
    </Suspense>
  );
}
