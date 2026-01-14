'use client';

import { useEffect, useRef, useCallback } from 'react';
import { messages as m } from '@/lib/i18n';

type MissionSummary = { id: string; title: string; achieved: boolean; currentLabel: string; targetLabel: string };
type LogEntry = {
  label: string;
  value: string | number;
  step?: number;
  severity?: 'info' | 'warning' | 'incident' | 'critical';
};

interface RunSummaryModalProps {
  open: boolean;
  outcome: 'won' | 'lost';
  steps: number;
  treasury: number;
  seed?: number | string;
  preset?: string;
  strategyName?: string;
  outcomeCause?: string;
  missions?: MissionSummary[];
  log?: LogEntry[];
  onRetry: () => void;
  onClose: () => void;
}

export function RunSummaryModal({
  open,
  outcome,
  steps,
  treasury,
  seed,
  preset,
  strategyName,
  outcomeCause,
  missions = [],
  log = [],
  onRetry,
  onClose,
}: RunSummaryModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Store the previously focused element when modal opens
  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      // Focus the modal after a brief delay to ensure it's rendered
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 10);
    } else {
      // Return focus to the previously focused element when modal closes
      previousActiveElement.current?.focus();
    }
  }, [open]);

  // Handle Escape key
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }

    // Focus trap
    if (event.key === 'Tab' && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    }
  }, [onClose]);

  // Add keyboard event listeners
  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const score = Math.max(0, Math.round(treasury + steps * 2));
  const tone = outcome === 'won' ? 'text-green-300' : 'text-red-300';

  const title =
    outcome === 'won'
      ? outcomeCause === 'missions_completed'
        ? m.runSummary.objectivesAchieved
        : m.runSummary.runComplete
      : outcomeCause === 'treasury_insolvency'
      ? m.runSummary.treasuryInsolvency
      : outcomeCause === 'price_collapse'
      ? m.runSummary.priceCollapse
      : outcomeCause === 'governance_backlog'
      ? m.runSummary.governanceBacklog
      : m.runSummary.runEnded;

  const subtitle =
    outcome === 'won'
      ? 'All key objectives were met without breaching failure thresholds.'
      : outcomeCause === 'treasury_insolvency'
      ? 'Treasury resources were exhausted; the organization could no longer operate within its constraints.'
      : outcomeCause === 'price_collapse'
      ? 'Token price fell below the minimum health threshold, triggering an operational shutdown.'
      : outcomeCause === 'governance_backlog'
      ? 'Governance throughput could not keep up with demand, and the backlog became unmanageable.'
      : 'One or more health thresholds were breached during this run.';

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
        className="w-full max-w-xl rounded-2xl border border-gray-700 bg-gray-900/95 shadow-2xl p-6 space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500" aria-hidden="true">
              {outcome.toUpperCase()}
            </p>
            <h2 id="modal-title" className="text-2xl font-bold text-white">
              {title}
            </h2>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${tone}`} aria-label={`Score: ${score.toLocaleString('en-US')}`}>
            Score: {score.toLocaleString('en-US')}
          </span>
        </div>

        <p id="modal-description" className="text-xs text-gray-400">
          {subtitle}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm text-gray-200" role="group" aria-label="Run statistics">
          <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-3">
            <p className="text-xs text-gray-400">{m.runSummary.steps}</p>
            <p className="text-lg font-semibold">{steps}</p>
          </div>
          <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-3">
            <p className="text-xs text-gray-400">{m.reports.treasury}</p>
            <p className="text-lg font-semibold">{treasury.toLocaleString('en-US')}</p>
          </div>
          <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-3">
            <p className="text-xs text-gray-400">{m.runSummary.preset}</p>
            <p className="text-lg font-semibold">{preset ?? 'N/A'}</p>
          </div>
          <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-3">
            <p className="text-xs text-gray-400">{m.runSummary.seed}</p>
            <p className="text-lg font-semibold">{seed ?? 'N/A'}</p>
          </div>
          <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-3">
            <p className="text-xs text-gray-400">{m.runSummary.strategy}</p>
            <p className="text-lg font-semibold">{strategyName ?? m.runSummary.defaultStrategy}</p>
          </div>
          {outcomeCause && (
            <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-3">
              <p className="text-xs text-gray-400">{m.runSummary.outcome}</p>
              <p className="text-sm font-semibold capitalize">
                {outcomeCause.replace(/_/g, ' ')}
              </p>
            </div>
          )}
        </div>

        {/* Missions Section */}
        {missions.length > 0 && (
          <div className="space-y-2" role="group" aria-label="Mission results">
            <h3 className="text-sm font-semibold text-white">Missions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {missions.map((mission) => (
                <div
                  key={mission.id}
                  className="rounded-lg border border-gray-700 bg-gray-800/60 p-3 text-sm text-gray-200 flex items-center justify-between"
                  role="listitem"
                >
                  <div>
                    <p className="font-semibold">{mission.title}</p>
                    <p className="text-xs text-gray-400">
                      {mission.currentLabel} / {mission.targetLabel}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      mission.achieved
                        ? 'bg-green-500/20 text-green-300'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                    aria-label={mission.achieved ? m.common.completed : m.common.pending}
                  >
                    {mission.achieved ? m.common.done : m.common.pending}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline Section */}
        {log.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white">{m.runSummary.timeline}</h3>
            <div
              className="space-y-2 text-sm text-gray-200 max-h-64 overflow-y-auto pr-1"
              role="list"
              aria-label="Event timeline"
            >
              {[...log]
                .sort((a, b) => (a.step ?? 0) - (b.step ?? 0))
                .map((entry, idx) => (
                  <div
                    key={`${entry.label}-${idx}`}
                    className={`rounded border p-2 flex items-center justify-between ${
                      entry.severity === 'critical'
                        ? 'border-red-500 bg-red-900/40'
                        : entry.severity === 'incident'
                        ? 'border-amber-500 bg-amber-900/30'
                        : entry.severity === 'warning'
                        ? 'border-yellow-500 bg-yellow-900/30'
                        : 'border-gray-700 bg-gray-800/60'
                    }`}
                    role="listitem"
                  >
                    <div>
                      <p className="text-xs text-gray-400">
                        {typeof entry.step === 'number' ? `Step ${entry.step}` : 'Event'}
                      </p>
                      <p className="font-semibold">{entry.label}</p>
                    </div>
                    <p className="text-right text-gray-200">{entry.value}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2" role="group" aria-label="Modal actions">
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-700 text-gray-200 hover:border-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            {m.common.close}
          </button>
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            {m.runSummary.retryPreset}
          </button>
        </div>
      </div>
    </div>
  );
}
