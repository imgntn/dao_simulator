'use client';

import type { ReactNode } from 'react';
import { useLayoutStore } from '@/lib/browser/layout-store';

interface CollapsiblePanelProps {
  id: string;
  title: string;
  badge?: string | number;
  children: ReactNode;
  /** Optional drag handle render — provided by Sidebar */
  dragHandleProps?: Record<string, unknown>;
}

export function CollapsiblePanel({ id, title, badge, children, dragHandleProps }: CollapsiblePanelProps) {
  const collapsed = useLayoutStore(s => s.panelCollapsed[id] ?? false);
  const toggleCollapsed = useLayoutStore(s => s.togglePanelCollapsed);

  return (
    <div className="border-b border-[var(--sim-border)]" data-panel-id={id}>
      {/* Header */}
      <button
        onClick={() => toggleCollapsed(id)}
        className="flex items-center justify-between w-full px-4 py-2 text-xs text-[var(--sim-text-muted)] hover:text-[var(--sim-text-secondary)] transition-colors group"
      >
        <span className="flex items-center gap-1.5">
          {dragHandleProps && (
            <span
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing text-[var(--sim-text-dim)] hover:text-[var(--sim-text-muted)] select-none"
              onClick={e => e.stopPropagation()}
            >
              ⠿
            </span>
          )}
          <span className="uppercase tracking-wider font-medium">{title}</span>
          {badge !== undefined && badge !== '' && (
            <span className="bg-[var(--sim-accent-bg)] text-[var(--sim-accent)] px-1.5 rounded-full text-[10px]">
              {badge}
            </span>
          )}
        </span>
        <span
          className="text-sm transition-transform"
          style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}
        >
          ▼
        </span>
      </button>

      {/* Content with CSS grid animation */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: collapsed ? '0fr' : '1fr' }}
      >
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
