'use client';

import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useLayoutStore } from '@/lib/browser/layout-store';
import { PRETEXT_FONTS } from '@/lib/ui/pretext';
import { usePretextText } from '@/lib/ui/usePretextText';

interface CollapsiblePanelProps {
  id: string;
  title: string;
  badge?: string | number;
  children: ReactNode;
  dragHandleProps?: Record<string, unknown>;
  defaultMaxHeight?: number;
}

export function CollapsiblePanel({ id, title, badge, children, dragHandleProps, defaultMaxHeight = 300 }: CollapsiblePanelProps) {
  const collapsed = useLayoutStore(s => s.panelCollapsed[id] ?? false);
  const toggleCollapsed = useLayoutStore(s => s.togglePanelCollapsed);
  const titleText = usePretextText<HTMLSpanElement>({
    text: title,
    font: PRETEXT_FONTS.body12,
    lineHeight: 14,
    maxLines: 1,
  });

  const [maxHeight, setMaxHeight] = useState(defaultMaxHeight);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const handleResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;
    startY.current = e.clientY;
    startHeight.current = maxHeight;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [maxHeight]);

  const handleResizeMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const delta = e.clientY - startY.current;
    setMaxHeight(Math.max(80, startHeight.current + delta));
  }, []);

  const handleResizeEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    if (maxHeight !== defaultMaxHeight) {
      try {
        const stored = JSON.parse(localStorage.getItem('dao-sim-panel-heights') ?? '{}');
        stored[id] = maxHeight;
        localStorage.setItem('dao-sim-panel-heights', JSON.stringify(stored));
      } catch {
        // Ignore storage write failures.
      }
    }
  }, [maxHeight, id, defaultMaxHeight]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('dao-sim-panel-heights') ?? '{}');
      if (stored[id]) setMaxHeight(stored[id]);
    } catch {
      // Ignore storage read failures.
    }
  }, [id]);

  return (
    <div className="border-b border-[var(--sim-border)]" data-panel-id={id}>
      <button
        onClick={() => toggleCollapsed(id)}
        className="flex items-center justify-between w-full px-4 py-2 text-xs text-[var(--sim-text-muted)] hover:text-[var(--sim-text-secondary)] transition-colors group"
      >
        <span className="flex items-center gap-1.5 min-w-0 flex-1">
          {dragHandleProps && (
            <span
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing text-[var(--sim-text-dim)] hover:text-[var(--sim-text-muted)] select-none"
              onClick={e => e.stopPropagation()}
            >
              ::
            </span>
          )}
          <span
            ref={titleText.ref}
            className={`uppercase tracking-wider font-medium min-w-0 flex-1 text-left ${titleText.ready ? '' : 'truncate'}`}
            style={titleText.ready ? { whiteSpace: 'pre-line' } : undefined}
            title={titleText.truncated ? title : undefined}
          >
            {titleText.displayText}
          </span>
          {badge !== undefined && badge !== '' && (
            <span className="bg-[var(--sim-accent-bg)] text-[var(--sim-accent)] px-1.5 rounded-full text-[10px] flex-shrink-0">
              {badge}
            </span>
          )}
        </span>
        <span
          className="text-sm transition-transform flex-shrink-0"
          style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}
        >
          v
        </span>
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-200"
        style={{ gridTemplateRows: collapsed ? '0fr' : '1fr', transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' }}
      >
        <div className="overflow-hidden">
          <div
            className="overflow-y-auto"
            style={{ maxHeight: collapsed ? 0 : maxHeight }}
          >
            {children}
          </div>

          {!collapsed && (
            <div
              className="h-2 cursor-ns-resize flex items-center justify-center hover:bg-[var(--sim-surface-hover,rgba(255,255,255,0.03))] transition-colors"
              onPointerDown={handleResizeStart}
              onPointerMove={handleResizeMove}
              onPointerUp={handleResizeEnd}
              onPointerCancel={handleResizeEnd}
              title="Drag to resize panel"
            >
              <div className="w-8 h-0.5 rounded-full bg-[var(--sim-border-strong)] opacity-50" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
