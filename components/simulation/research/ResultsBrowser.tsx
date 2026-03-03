'use client';

import { useEffect } from 'react';
import { useResearchStore } from '@/lib/browser/research-store';

export function ResultsBrowser() {
  const { results, loading, fetchResults, fetchResultDetail } = useResearchStore();

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const stateBadge = (state: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-900/40 text-green-400',
      running: 'bg-cyan-900/40 text-cyan-400',
      failed: 'bg-red-900/40 text-red-400',
      unknown: 'bg-gray-800 text-gray-400',
    };
    return colors[state] ?? 'bg-gray-800 text-gray-400';
  };

  if (loading.results) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400 mr-3" />
        Loading results...
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12 text-gray-600">
        No results found. Run an experiment to get started.
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded border border-gray-800 overflow-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="text-[10px] uppercase text-gray-500 border-b border-gray-800">
            <th className="text-left py-2 px-3">Name</th>
            <th className="text-left py-2 px-3">State</th>
            <th className="text-left py-2 px-3">Progress</th>
            <th className="text-left py-2 px-3">Runs</th>
            <th className="text-left py-2 px-3">Last Updated</th>
          </tr>
        </thead>
        <tbody>
          {results.map(result => (
            <tr
              key={result.id}
              onClick={() => result.hasSummary && fetchResultDetail(result.path)}
              className={`border-b border-gray-800/50 ${
                result.hasSummary
                  ? 'cursor-pointer hover:bg-gray-800/50'
                  : 'opacity-60'
              }`}
            >
              <td className="py-2 px-3 text-gray-200">{result.path}</td>
              <td className="py-2 px-3">
                <span className={`px-2 py-0.5 text-[10px] rounded ${stateBadge(result.state)}`}>
                  {result.state}
                </span>
              </td>
              <td className="py-2 px-3 text-gray-400">
                {result.progress !== null ? (
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full"
                        style={{ width: `${Math.min(result.progress, 100)}%` }}
                      />
                    </div>
                    <span>{result.progress.toFixed(1)}%</span>
                  </div>
                ) : '-'}
              </td>
              <td className="py-2 px-3 text-gray-400">
                {result.completedRuns !== null
                  ? `${result.completedRuns}/${result.totalRuns ?? '?'}`
                  : '-'}
              </td>
              <td className="py-2 px-3 text-gray-500">
                {result.lastUpdate ?? '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
