'use client';

import { useCallback, useRef } from 'react';
import { useLayoutStore } from '@/lib/browser/layout-store';

export function SidebarResizeHandle() {
  const setSidebarWidth = useLayoutStore(s => s.setSidebarWidth);
  const dragging = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;

    const onMove = (ev: PointerEvent) => {
      if (!dragging.current) return;
      // Sidebar is on the right, so width = viewport width - mouse X
      const newWidth = window.innerWidth - ev.clientX;
      setSidebarWidth(newWidth);
    };

    const onUp = () => {
      dragging.current = false;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }, [setSidebarWidth]);

  return (
    <div
      className="w-1.5 hover:w-2 bg-transparent hover:bg-[var(--sim-accent)]/30 cursor-col-resize transition-all flex-shrink-0 active:bg-[var(--sim-accent)]/50 relative flex items-center justify-center"
      onPointerDown={onPointerDown}
      title="Drag to resize sidebar"
    >
      <span className="flex flex-col gap-1 pointer-events-none">
        <span className="block w-1 h-1 rounded-full bg-[var(--sim-text-dim)]/50" />
        <span className="block w-1 h-1 rounded-full bg-[var(--sim-text-dim)]/50" />
        <span className="block w-1 h-1 rounded-full bg-[var(--sim-text-dim)]/50" />
      </span>
    </div>
  );
}
