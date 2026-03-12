'use client';

import { useRef, type ReactNode } from 'react';
import { useLayoutStore } from '@/lib/browser/layout-store';
import { usePanelDragDrop } from './usePanelDragDrop';
import { PanelMenu } from './PanelMenu';

interface SidebarProps {
  /** Map of panel IDs to their rendered content */
  panelContent: Record<string, ReactNode>;
}

export function Sidebar({ panelContent }: SidebarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelOrder = useLayoutStore(s => s.panelOrder);
  const panelVisible = useLayoutStore(s => s.panelVisible);
  const sidebarOpen = useLayoutStore(s => s.sidebarOpen);
  const draggedPanel = useLayoutStore(s => s.draggedPanel);
  const { onDragStart } = usePanelDragDrop(containerRef);

  if (!sidebarOpen) return null;

  const visiblePanels = panelOrder.filter(id => panelVisible[id] !== false && panelContent[id]);

  return (
    <div
      className="flex flex-col border-l border-[var(--sim-border)] overflow-hidden flex-1"
    >
      {/* Sidebar header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--sim-border)] bg-[var(--sim-bg)]">
        <span className="text-[10px] text-[var(--sim-text-dim)] uppercase tracking-wider">Panels</span>
        <PanelMenu />
      </div>

      {/* Scrollable panel container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
      >
        {visiblePanels.map(id => (
          <div
            key={id}
            data-panel-id={id}
            className={draggedPanel === id ? 'opacity-40' : ''}
          >
            {/* Inject drag handle via wrapper */}
            <PanelDragWrapper
              panelId={id}
              onDragStart={onDragStart}
            >
              {panelContent[id]}
            </PanelDragWrapper>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PanelDragWrapperProps {
  panelId: string;
  onDragStart: (panelId: string, e: React.PointerEvent) => void;
  children: ReactNode;
}

function PanelDragWrapper({ children }: PanelDragWrapperProps) {
  // The children already include CollapsiblePanel with drag handle props
  // For now, just render children directly
  return <>{children}</>;
}
