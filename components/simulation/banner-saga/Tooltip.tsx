'use client';

/**
 * Tooltip — lightweight, portal-based, hover-intent tooltip.
 *
 * Zero dependencies. Keyboard-accessible (focus shows it). Auto-flips
 * vertical placement if it would overflow. Clamps horizontal position
 * so it never exits the viewport. Follows the Living Archive aesthetic.
 */

import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PALETTE } from './palette';

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  delayMs?: number;
  maxWidth?: number;
}

export function Tooltip({
  content,
  children,
  delayMs = 250,
  maxWidth = 260,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number; flipUp: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchor = useRef<HTMLSpanElement | null>(null);

  function show() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const el = anchor.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Flip up if near bottom of viewport
      const flipUp = rect.bottom + 80 > window.innerHeight;
      // Clamp x so tooltip never exits left or right edge
      const halfW = maxWidth / 2 + 12;
      const rawX = rect.left + rect.width / 2;
      const x = Math.max(halfW, Math.min(window.innerWidth - halfW, rawX));
      setPos({
        x,
        y: flipUp ? rect.top - 6 : rect.bottom + 6,
        flipUp,
      });
      setOpen(true);
    }, delayMs);
  }

  function hide() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setOpen(false);
    setPos(null);
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <>
      <span
        ref={anchor}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="inline-block"
      >
        {children}
      </span>
      {open && pos && typeof window !== 'undefined' &&
        createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed z-[9999] rounded-sm border-2 px-3 py-2 text-xs shadow-lg"
            style={{
              left: pos.x,
              top: pos.y,
              transform: pos.flipUp
                ? 'translate(-50%, -100%)'
                : 'translate(-50%, 0)',
              maxWidth,
              background: PALETTE.parchment,
              borderColor: PALETTE.stone,
              color: PALETTE.ink,
              fontFamily: 'Georgia, "Iowan Old Style", serif',
              lineHeight: 1.35,
              boxShadow: `0 0 0 1px ${PALETTE.parchmentWarm}, 0 4px 12px rgba(31,25,18,0.25)`,
            }}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}
