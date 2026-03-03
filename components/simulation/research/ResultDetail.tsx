'use client';

import { useState, useMemo } from 'react';
import { useResearchStore } from '@/lib/browser/research-store';
import { MetricBarChart } from './MetricBarChart';
import { MetricSummaryTable } from './MetricSummaryTable';
import type { MetricDataPoint } from './MetricBarChart';
import type { MetricRow } from './MetricSummaryTable';

export function ResultDetail() {
  const { selectedResult, selectedResultPath, setView, loading } = useResearchStore();
  const [selectedMetric, setSelectedMetric] = useState<string>('');

  const summary = selectedResult?.summary as {
    experimentName?: string;
    totalRuns?: number;
    totalDurationMs?: number;
    metricsSummary?: Array<{
      sweepValue?: string | number | boolean;
      runCount?: number;
      metrics?: Array<{
        name: string;
        mean: number;
        median: number;
        std: number;
        min: number;
        max: number;
        ci95?: { lower: number; upper: number };
        coefficientOfVariation?: number;
      }>;
    }>;
  } | null;

  const status = selectedResult?.status as {
    state?: string;
    progress?: { percentComplete?: number; completedRuns?: number; totalRuns?: number };
  } | null;

  // Extract available metric names
  const metricNames = useMemo(() => {
    if (!summary?.metricsSummary?.[0]?.metrics) return [];
    return summary.metricsSummary[0].metrics.map(m => m.name);
  }, [summary]);

  // Auto-select first metric
  const activeMetric = selectedMetric || metricNames[0] || '';

  // Build chart data + table rows for the selected metric
  const { chartData, tableRows } = useMemo(() => {
    if (!summary?.metricsSummary || !activeMetric) {
      return { chartData: [] as MetricDataPoint[], tableRows: [] as MetricRow[] };
    }

    const cd: MetricDataPoint[] = [];
    const tr: MetricRow[] = [];

    for (const ms of summary.metricsSummary) {
      const label = String(ms.sweepValue ?? 'baseline');
      const metric = ms.metrics?.find(m => m.name === activeMetric);
      if (!metric) continue;

      const errorHigh = metric.ci95
        ? metric.ci95.upper - metric.mean
        : metric.std;

      cd.push({
        label,
        mean: metric.mean,
        errorLow: metric.ci95 ? metric.mean - metric.ci95.lower : metric.std,
        errorHigh,
      });

      tr.push({
        label,
        mean: metric.mean,
        median: metric.median,
        std: metric.std,
        ci95Lower: metric.ci95?.lower ?? metric.mean - metric.std,
        ci95Upper: metric.ci95?.upper ?? metric.mean + metric.std,
        min: metric.min,
        max: metric.max,
        cv: metric.coefficientOfVariation ?? (metric.mean !== 0 ? metric.std / Math.abs(metric.mean) : 0),
      });
    }

    return { chartData: cd, tableRows: tr };
  }, [summary, activeMetric]);

  if (loading.detail) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400 mr-3" />
        Loading result details...
      </div>
    );
  }

  if (!selectedResult) {
    return (
      <div className="text-center py-12 text-gray-600">
        No result selected.
        <button onClick={() => setView('results')} className="ml-2 text-cyan-400 hover:text-cyan-300">
          Browse results
        </button>
      </div>
    );
  }

  const stateBadge = (state?: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-900/40 text-green-400',
      running: 'bg-cyan-900/40 text-cyan-400',
      failed: 'bg-red-900/40 text-red-400',
    };
    return colors[state ?? ''] ?? 'bg-gray-800 text-gray-400';
  };

  const durationStr = summary?.totalDurationMs
    ? `${(summary.totalDurationMs / 1000).toFixed(1)}s`
    : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setView('results')}
          className="text-gray-500 hover:text-gray-300 text-sm"
        >
          &larr; Back
        </button>
        <h3 className="text-sm font-semibold text-gray-200">
          {summary?.experimentName ?? selectedResultPath ?? 'Result Detail'}
        </h3>
        <span className={`px-2 py-0.5 text-[10px] rounded ${stateBadge(status?.state)}`}>
          {status?.state ?? 'unknown'}
        </span>
        {summary?.totalRuns && (
          <span className="text-xs text-gray-500">{summary.totalRuns} runs</span>
        )}
        {durationStr && (
          <span className="text-xs text-gray-500">{durationStr}</span>
        )}
      </div>

      {/* Metric selector */}
      {metricNames.length > 0 && (
        <div className="mb-4">
          <label className="block text-xs text-gray-400 mb-1">Metric</label>
          <select
            value={activeMetric}
            onChange={e => setSelectedMetric(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 focus:border-cyan-500 focus:outline-none"
          >
            {metricNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Chart + Table */}
      <div className="space-y-4">
        <MetricBarChart data={chartData} metricName={activeMetric} />
        <MetricSummaryTable rows={tableRows} />
      </div>
    </div>
  );
}
