'use client';

import { useEffect, useRef, useState, useCallback, type RefObject } from 'react';
import { createPortal } from 'react-dom';

interface StickyAudioBarProps {
  audioRef: RefObject<HTMLAudioElement | null>;
  /** Ref to the main player container — sticky bar shows when this is out of view */
  playerRef: RefObject<HTMLDivElement | null>;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function StickyAudioBar({ audioRef, playerRef }: StickyAudioBarProps) {
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const rafRef = useRef<number>(0);

  // Track whether user has started playback at least once
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setHasInteracted(true);
    audio.addEventListener('play', onPlay);
    return () => audio.removeEventListener('play', onPlay);
  }, [audioRef]);

  // Show sticky bar when main player is scrolled out of view AND user has interacted
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting && hasInteracted);
      },
      { threshold: 0 }
    );

    observer.observe(player);
    return () => observer.disconnect();
  }, [playerRef, hasInteracted]);

  // Sync playback state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onMeta = () => setDuration(audio.duration);
    const onEnded = () => setPlaying(false);

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('durationchange', onMeta);
    audio.addEventListener('ended', onEnded);

    if (audio.duration) setDuration(audio.duration);
    if (!audio.paused) setPlaying(true);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('durationchange', onMeta);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioRef]);

  // RAF time tracking
  useEffect(() => {
    if (!visible) return;
    const audio = audioRef.current;
    if (!audio) return;

    const tick = () => {
      setCurrentTime(audio.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [audioRef, visible]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play(); else audio.pause();
  }, [audioRef]);

  const skip = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + delta));
  }, [audioRef]);

  const seekTo = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = fraction * audio.duration;
  }, [audioRef]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!visible || !mounted) return null;

  const progress = duration > 0 ? currentTime / duration : 0;

  const bar = (
    <div className="fixed top-[var(--nav-height,49px)] left-0 right-0 z-30 border-b border-[var(--border-default)] bg-[var(--surface-warm)]/95 backdrop-blur-sm">
      {/* Progress bar — thin line at top */}
      <div
        className="h-1 cursor-pointer bg-[var(--surface-warm-deep)]"
        onClick={seekTo}
      >
        <div
          className="h-full bg-[var(--accent-teal)] transition-[width] duration-100"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 pt-2.5 pb-1.5 sm:px-6">
        {/* Skip back */}
        <button
          type="button"
          onClick={() => skip(-15)}
          className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-heading)] transition-colors"
          aria-label="Skip back 15 seconds"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11 7L2 12l9 5V7z" />
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-teal)] text-white shadow transition hover:opacity-90"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Skip forward */}
        <button
          type="button"
          onClick={() => skip(15)}
          className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-heading)] transition-colors"
          aria-label="Skip forward 15 seconds"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 7l9 5-9 5V7z" />
          </svg>
        </button>

        {/* Title */}
        <span className="hidden truncate text-xs font-medium text-[var(--text-body-secondary)] sm:block">
          Green Pill #123: AI DAO Simulator
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Time */}
        <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );

  return createPortal(bar, document.body);
}
