'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSimulationStore } from '@/lib/browser/simulation-store';

export function ExportButton() {
  const { history, config, annotations } = useSimulationStore();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
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

  const downloadBlob = useCallback((content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }, []);

  const exportCSV = useCallback(() => {
    if (history.length === 0) return;
    const headers = [
      'step', 'tokenPrice', 'treasury', 'members', 'proposals',
      'gini', 'participation', 'approved', 'rejected', 'expired', 'forumTopics'
    ];
    const rows = history.map(s => [
      s.step, s.tokenPrice.toFixed(4), s.treasuryFunds.toFixed(2),
      s.memberCount, s.proposalCount, s.gini.toFixed(4),
      s.avgParticipationRate.toFixed(4), s.proposalsApproved,
      s.proposalsRejected, s.proposalsExpired, s.forumTopics,
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    downloadBlob(csv, `sim-export-${config.daoId}-${Date.now()}.csv`, 'text/csv');
  }, [history, config.daoId, downloadBlob]);

  const exportJSON = useCallback(() => {
    if (history.length === 0) return;
    const data = {
      config,
      annotations,
      snapshots: history.map(s => ({
        step: s.step,
        tokenPrice: s.tokenPrice,
        treasuryFunds: s.treasuryFunds,
        memberCount: s.memberCount,
        proposalCount: s.proposalCount,
        gini: s.gini,
        avgParticipationRate: s.avgParticipationRate,
        proposalsApproved: s.proposalsApproved,
        proposalsRejected: s.proposalsRejected,
        proposalsExpired: s.proposalsExpired,
        forumTopics: s.forumTopics,
        forumPosts: s.forumPosts,
        blackSwanActive: s.blackSwan.active,
      })),
    };
    downloadBlob(JSON.stringify(data, null, 2), `sim-export-${config.daoId}-${Date.now()}.json`, 'application/json');
  }, [history, config, annotations, downloadBlob]);

  const exportEvents = useCallback(() => {
    // Collect all events from history snapshots
    const allEvents: Array<{ step: number; type: string; message: string }> = [];
    const seen = new Set<string>();
    for (const s of history) {
      for (const e of s.recentEvents) {
        const key = `${e.step}-${e.type}-${e.message}`;
        if (!seen.has(key)) {
          seen.add(key);
          allEvents.push(e);
        }
      }
    }
    allEvents.sort((a, b) => a.step - b.step);

    const headers = ['step', 'type', 'message'];
    const rows = allEvents.map(e => [e.step, e.type, `"${e.message.replace(/"/g, '""')}"`].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    downloadBlob(csv, `sim-events-${config.daoId}-${Date.now()}.csv`, 'text/csv');
  }, [history, config.daoId, downloadBlob]);

  if (history.length === 0) return null;

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-2.5 py-1 rounded text-xs font-medium bg-[var(--sim-border)] hover:bg-[var(--sim-surface-hover)] text-[var(--sim-text-muted)] hover:text-[var(--sim-text-secondary)] transition-colors"
        title="Export data"
      >
        Export
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[var(--sim-surface)] border border-[var(--sim-border)] rounded shadow-lg z-50 min-w-[140px]">
          <button
            onClick={exportCSV}
            className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--sim-surface-hover)] text-[var(--sim-text-secondary)]"
          >
            Export CSV
          </button>
          <button
            onClick={exportJSON}
            className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--sim-surface-hover)] text-[var(--sim-text-secondary)]"
          >
            Export JSON
          </button>
          <button
            onClick={exportEvents}
            className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--sim-surface-hover)] text-[var(--sim-text-secondary)]"
          >
            Export Events
          </button>
        </div>
      )}
    </div>
  );
}
