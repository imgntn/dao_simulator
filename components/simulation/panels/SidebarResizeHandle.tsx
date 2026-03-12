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
      className="w-1 hover:w-1.5 bg-transparent hover:bg-[var(--sim-accent)]/30 cursor-col-resize transition-all flex-shrink-0 active:bg-[var(--sim-accent)]/50"
      onPointerDown={onPointerDown}
      title="Drag to resize sidebar"
    />
  );
}
