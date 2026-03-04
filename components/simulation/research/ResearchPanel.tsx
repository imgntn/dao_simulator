'use client';

import { useResearchStore } from '@/lib/browser/research-store';
import type { ResearchView } from '@/lib/browser/research-store';
import { RunningExperiments } from './RunningExperiments';
import { ExperimentList } from './ExperimentList';
import { CustomSweepBuilder } from './CustomSweepBuilder';
import { ResultsBrowser } from './ResultsBrowser';
import { ResultDetail } from './ResultDetail';

const SUB_TABS: { id: ResearchView; label: string }[] = [
  { id: 'list', label: 'Experiments' },
  { id: 'custom', label: 'Custom Sweep' },
  { id: 'results', label: 'Results' },
];

export function ResearchPanel() {
  const { view, setView, runningExperiments, error, clearError } = useResearchStore();

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[var(--sim-accent)] uppercase tracking-wider">
          Research Console
        </h2>
        <p className="text-sm text-[var(--sim-text-muted)] mt-1">
          Run experiments, build parameter sweeps, and browse results
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-800/40 bg-red-950/20 p-3 flex items-center justify-between">
          <span className="text-xs text-red-400">{error}</span>
          <button onClick={clearError} className="text-xs text-red-400 hover:text-red-300 ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Running experiments banner */}
      <RunningExperiments />

      {/* Sub-navigation */}
      {view !== 'detail' && (
        <div className="flex gap-1 mb-6 border-b border-[var(--sim-border)] pb-px">
          {SUB_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`px-3 py-2 text-xs font-medium transition-colors relative ${
                view === tab.id
                  ? 'text-[var(--sim-accent)]'
                  : 'text-[var(--sim-text-muted)] hover:text-[var(--sim-text-secondary)]'
              }`}
            >
              {tab.label}
              {tab.id === 'results' && runningExperiments.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-[var(--sim-accent-bold)] text-white rounded-full">
                  {runningExperiments.length}
                </span>
              )}
              {view === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--sim-accent)]" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {view === 'list' && <ExperimentList />}
      {view === 'custom' && <CustomSweepBuilder />}
      {view === 'results' && <ResultsBrowser />}
      {view === 'detail' && <ResultDetail />}
    </div>
  );
}
