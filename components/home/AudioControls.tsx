'use client';

import { useEffect, useRef, useState, useCallback, type RefObject } from 'react';

interface AudioControlsProps {
  audioRef: RefObject<HTMLAudioElement | null>;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export function AudioControls({ audioRef }: AudioControlsProps) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const rafRef = useRef<number>(0);
  const progressRef = useRef<HTMLDivElement>(null);

  // RAF-based time tracking for smooth progress
  const updateTime = useCallback(() => {
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      setCurrentTime(audio.currentTime);
      // Update buffered range
      if (audio.buffered.length > 0) {
        setBuffered(audio.buffered.end(audio.buffered.length - 1));
      }
      rafRef.current = requestAnimationFrame(updateTime);
    }
  }, [audioRef]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => {
      setPlaying(true);
      rafRef.current = requestAnimationFrame(updateTime);
    };
    const onPause = () => {
      setPlaying(false);
      cancelAnimationFrame(rafRef.current);
    };
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onDurationChange = () => setDuration(audio.duration);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => {
      setPlaying(false);
      cancelAnimationFrame(rafRef.current);
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    // Init state if audio already loaded
    if (audio.duration) setDuration(audio.duration);
    if (!audio.paused) {
      setPlaying(true);
      rafRef.current = requestAnimationFrame(updateTime);
    }

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      cancelAnimationFrame(rafRef.current);
    };
  }, [audioRef, updateTime]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }, [audioRef]);

  const skip = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + delta));
  }, [audioRef]);

  const seekTo = useCallback((fraction: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = fraction * audio.duration;
    setCurrentTime(audio.currentTime);
  }, [audioRef]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(fraction);
  }, [seekTo]);

  const changeSpeed = useCallback((s: number) => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = s;
    setSpeed(s);
    setShowSpeedMenu(false);
  }, [audioRef]);

  const changeVolume = useCallback((v: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = v;
      audio.muted = false;
    }
    setVolume(v);
    setMuted(false);
  }, [audioRef]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  }, [audioRef]);

  // Media Session API — lock screen / notification controls + background playback
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'Green Pill #123: AI DAO Simulator',
      artist: 'James Pollack',
      album: 'Green Pill Podcast',
      artwork: [
        { src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' },
      ],
    });

    navigator.mediaSession.setActionHandler('play', () => {
      audioRef.current?.play();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current?.pause();
    });
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      skip(-(details.seekOffset ?? 15));
    });
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      skip(details.seekOffset ?? 15);
    });
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      const audio = audioRef.current;
      if (audio && details.seekTime != null) {
        audio.currentTime = details.seekTime;
        setCurrentTime(details.seekTime);
      }
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      skip(-15);
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      skip(15);
    });

    return () => {
      // Clean up handlers
      const actions: MediaSessionAction[] = ['play', 'pause', 'seekbackward', 'seekforward', 'seekto', 'previoustrack', 'nexttrack'];
      for (const action of actions) {
        try { navigator.mediaSession.setActionHandler(action, null); } catch {}
      }
    };
  }, [audioRef, skip]);

  // Keep Media Session position state in sync
  useEffect(() => {
    if (!('mediaSession' in navigator) || !duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: speed,
        position: Math.min(currentTime, duration),
      });
    } catch {}
  }, [currentTime, duration, speed]);

  const progress = duration > 0 ? currentTime / duration : 0;
  const bufferedProgress = duration > 0 ? buffered / duration : 0;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-warm)] px-4 py-3">
      {/* Progress bar */}
      <div
        ref={progressRef}
        onClick={handleProgressClick}
        className="group relative h-2 cursor-pointer rounded-full bg-[var(--surface-warm-deep)]"
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') skip(5);
          else if (e.key === 'ArrowLeft') skip(-5);
        }}
      >
        {/* Buffered */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent-teal)]/20"
          style={{ width: `${bufferedProgress * 100}%` }}
        />
        {/* Progress */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent-teal)]"
          style={{ width: `${progress * 100}%` }}
        />
        {/* Thumb */}
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-[var(--accent-teal)] bg-white opacity-0 shadow transition group-hover:opacity-100"
          style={{ left: `${progress * 100}%` }}
        />
      </div>

      {/* Controls — two rows on mobile, single row on desktop */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        {/* Transport: skip / play / skip — centered on mobile */}
        <div className="flex items-center justify-center gap-4 sm:gap-2">
          <button
            type="button"
            onClick={() => skip(-15)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-warm-deep)] hover:text-[var(--text-heading)] sm:h-auto sm:w-auto sm:gap-0.5 sm:px-1.5 sm:py-1"
            aria-label="Skip back 15 seconds"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="sm:h-3.5 sm:w-3.5">
              <path d="M11 7L2 12l9 5V7z" />
            </svg>
            <span className="hidden text-[10px] font-semibold leading-none sm:inline">15</span>
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent-teal)] text-white shadow transition hover:opacity-90 sm:h-10 sm:w-10"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="sm:h-[18px] sm:w-[18px]">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="sm:h-[18px] sm:w-[18px]">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={() => skip(15)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-warm-deep)] hover:text-[var(--text-heading)] sm:h-auto sm:w-auto sm:gap-0.5 sm:px-1.5 sm:py-1"
            aria-label="Skip forward 15 seconds"
          >
            <span className="hidden text-[10px] font-semibold leading-none sm:inline">15</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="sm:h-3.5 sm:w-3.5">
              <path d="M13 7l9 5-9 5V7z" />
            </svg>
          </button>
        </div>

        {/* Time + speed — second row on mobile, inline on desktop */}
        <div className="flex items-center justify-between sm:flex-1 sm:justify-start sm:gap-3">
          <span className="font-mono text-xs text-[var(--text-muted)]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="hidden sm:block sm:flex-1" />

          {/* Speed selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSpeedMenu((v) => !v)}
              className="rounded-full border border-[var(--border-default)] px-2.5 py-1 font-mono text-xs text-[var(--text-muted)] transition hover:bg-[var(--surface-warm-deep)] hover:text-[var(--text-heading)] sm:px-2 sm:py-0.5"
              aria-label="Playback speed"
            >
              {speed}x
            </button>
            {showSpeedMenu && (
              <div className="absolute bottom-full right-0 mb-1 flex flex-col rounded-lg border border-[var(--border-default)] bg-[var(--surface-warm)] py-1 shadow-lg">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => changeSpeed(s)}
                    className={`px-4 py-1.5 text-left font-mono text-xs transition hover:bg-[var(--surface-warm-deep)] sm:py-1 ${
                      s === speed ? 'text-[var(--accent-teal)] font-bold' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Volume — desktop only */}
          <div className="hidden items-center gap-1 pr-1 sm:flex">
            <button
              type="button"
              onClick={toggleMute}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-warm-deep)] hover:text-[var(--text-heading)]"
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted || volume === 0 ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-[var(--surface-warm-deep)] accent-[var(--accent-teal)]"
              aria-label="Volume"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
