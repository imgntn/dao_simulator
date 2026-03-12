'use client';

import { useState, useRef, useEffect } from 'react';
import { useLayoutStore } from '@/lib/browser/layout-store';
import { getAllPanels } from './panel-registry';

export function PanelMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const panelVisible = useLayoutStore(s => s.panelVisible);
  const togglePanelVisible = useLayoutStore(s => s.togglePanelVisible);
  const resetLayout = useLayoutStore(s => s.resetLayout);

  const panels = getAllPanels();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="px-2 py-1 text-xs text-[var(--sim-text-muted)] hover:text-[var(--sim-accent)] transition-colors"
        title="Toggle panels"
      >
        Panels ▾
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[var(--sim-surface)] border border-[var(--sim-border)] rounded shadow-lg z-50 w-48 py-1">
          {panels.map(panel => (
            <label
              key={panel.id}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--sim-text-secondary)] hover:bg-[var(--sim-surface-hover)] cursor-pointer"
            >
              <input
                type="checkbox"
                checked={panelVisible[panel.id] ?? panel.defaultVisible}
                onChange={() => togglePanelVisible(panel.id)}
                className="rounded bg-[var(--sim-border-strong)] border-[var(--sim-border-strong)] text-[var(--sim-accent-hover)] focus:ring-[var(--sim-accent-ring)]"
              />
              <span>{panel.icon} {panel.label}</span>
            </label>
          ))}
          <div className="border-t border-[var(--sim-border)] mt-1 pt-1">
            <button
              onClick={() => { resetLayout(); setOpen(false); }}
              className="w-full px-3 py-1.5 text-xs text-[var(--sim-text-muted)] hover:text-red-400 hover:bg-[var(--sim-surface-hover)] text-left"
            >
              Reset Layout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
