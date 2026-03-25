'use client';

import { useRef, useCallback, useEffect, useState, type ReactNode } from 'react';
import type { BreakpointTier } from './useBreakpointTier';

interface MobileDrawerProps {
  tier: BreakpointTier;
  children: ReactNode;
}

type SnapPoint = 'collapsed' | 'half' | 'full';

const SNAP_HEIGHTS: Record<SnapPoint, string> = {
  collapsed: '60px',
  half: '50vh',
  full: '90vh',
};

export function MobileDrawer({ tier, children }: MobileDrawerProps) {
  const [snap, setSnap] = useState<SnapPoint>('collapsed');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // For handheld: right-side drawer
  if (tier === 'handheld') {
    return (
      <>
        {/* Toggle button */}
        {!drawerOpen && (
          <button
            onClick={() => setDrawerOpen(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-30 bg-[var(--sim-surface)] border border-r-0 border-[var(--sim-border)] rounded-l px-1 py-3 text-[var(--sim-text-muted)] hover:text-[var(--sim-accent)]"
          >
            ◀
          </button>
        )}

        {/* Backdrop */}
        {drawerOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-30"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {/* Drawer */}
        <div
          className={`fixed top-0 right-0 h-full w-[380px] max-w-[85vw] bg-[var(--sim-bg)] border-l border-[var(--sim-border)] z-40 overflow-y-auto transition-transform duration-300 pb-[env(safe-area-inset-bottom)] ${
            drawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--sim-border)]">
            <span className="text-xs text-[var(--sim-text-muted)] uppercase tracking-wider">Panels</span>
            <button
              onClick={() => setDrawerOpen(false)}
              className="text-[var(--sim-text-muted)] hover:text-[var(--sim-text)] text-sm"
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      </>
    );
  }

  // For compact: bottom sheet with snap points
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    const el = containerRef.current;
    if (el) dragStartHeight.current = el.getBoundingClientRect().height;
    setIsDragging(true);

    const onMove = (ev: PointerEvent) => {
      const delta = dragStartY.current - ev.clientY;
      const newHeight = dragStartHeight.current + delta;
      if (containerRef.current) {
        containerRef.current.style.height = `${Math.max(60, newHeight)}px`;
        containerRef.current.style.transition = 'none';
      }
    };

    const onUp = (ev: PointerEvent) => {
      const delta = dragStartY.current - ev.clientY;
      if (containerRef.current) {
        containerRef.current.style.transition = '';
      }
      setIsDragging(false);

      // Determine snap point from swipe direction & threshold
      if (delta > 80) {
        setSnap(prev => prev === 'collapsed' ? 'half' : 'full');
      } else if (delta < -80) {
        setSnap(prev => prev === 'full' ? 'half' : 'collapsed');
      }
      // Reset inline height so CSS takes over
      if (containerRef.current) {
        containerRef.current.style.height = '';
      }

      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSnap('collapsed');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed bottom-0 left-0 right-0 bg-[var(--sim-bg)] border-t border-[var(--sim-border)] z-30 transition-[height] duration-300 ease-out pb-[env(safe-area-inset-bottom)]"
      style={{ height: SNAP_HEIGHTS[snap] }}
    >
      {/* Drag handle */}
      <div
        className={`flex justify-center py-2 cursor-grab active:cursor-grabbing touch-none transition-colors duration-150 ${isDragging ? 'bg-[var(--sim-surface-hover)]' : ''}`}
        onPointerDown={onPointerDown}
      >
        <div className={`w-10 h-1 rounded-full transition-colors duration-150 ${isDragging ? 'bg-[var(--sim-accent)]' : 'bg-[var(--sim-border-strong)]'}`} />
      </div>

      {/* Content */}
      <div className="overflow-y-auto h-[calc(100%-28px)] overscroll-contain">
        {children}
      </div>
    </div>
  );
}
