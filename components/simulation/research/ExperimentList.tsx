'use client';

import { useEffect, useState } from 'react';
import { useResearchStore } from '@/lib/browser/research-store';
import { ExperimentCard } from './ExperimentCard';

export function ExperimentList() {
  const { experiments, loading, fetchExperiments, launchExperiment } = useResearchStore();
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  useEffect(() => {
    if (experiments.length === 0) fetchExperiments();
  }, [experiments.length, fetchExperiments]);

  const allTags = [...new Set(experiments.flatMap(e => e.tags))].sort();
  const filtered = tagFilter
    ? experiments.filter(e => e.tags.includes(tagFilter))
    : experiments;

  if (loading.experiments) {
    return (
      <div className="flex items-center justify-center py-12 text-[var(--sim-text-muted)]">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--sim-accent)] mr-3" />
        Loading experiments...
      </div>
    );
  }

  return (
    <div>
      {/* Tag filters */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setTagFilter(null)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              !tagFilter ? 'bg-[var(--sim-accent-bold)] text-white' : 'bg-[var(--sim-border)] text-[var(--sim-text-muted)] hover:bg-[var(--sim-surface-hover)]'
            }`}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                tagFilter === tag ? 'bg-[var(--sim-accent-bold)] text-white' : 'bg-[var(--sim-border)] text-[var(--sim-text-muted)] hover:bg-[var(--sim-surface-hover)]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map(exp => (
          <ExperimentCard key={exp.id} experiment={exp} onRun={launchExperiment} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-[var(--sim-text-dim)] py-8">
          {experiments.length === 0 ? 'No experiment configs found.' : 'No experiments match this filter.'}
        </p>
      )}
    </div>
  );
}
