'use client';

interface MetricRow {
  label: string;
  mean: number;
  median: number;
  std: number;
  ci95Lower: number;
  ci95Upper: number;
  min: number;
  max: number;
  cv: number;
}

interface Props {
  rows: MetricRow[];
}

export function MetricSummaryTable({ rows }: Props) {
  if (rows.length === 0) return null;

  const fmt = (n: number) => {
    if (Math.abs(n) >= 1000) return n.toFixed(1);
    if (Math.abs(n) >= 1) return n.toFixed(3);
    return n.toFixed(4);
  };

  return (
    <div className="bg-[var(--sim-surface)] rounded border border-[var(--sim-border)] overflow-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="text-[10px] uppercase text-[var(--sim-text-muted)] border-b border-[var(--sim-border)]">
            <th className="text-left py-2 px-3">Sweep Value</th>
            <th className="text-right py-2 px-3">Mean</th>
            <th className="text-right py-2 px-3">Median</th>
            <th className="text-right py-2 px-3">Std Dev</th>
            <th className="text-right py-2 px-3">CI 95%</th>
            <th className="text-right py-2 px-3">Min</th>
            <th className="text-right py-2 px-3">Max</th>
            <th className="text-right py-2 px-3">CV</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.label} className="border-b border-[var(--sim-border)]/50 text-[var(--sim-text-secondary)]">
              <td className="py-2 px-3 text-[var(--sim-text)] font-medium">{row.label}</td>
              <td className="py-2 px-3 text-right font-mono">{fmt(row.mean)}</td>
              <td className="py-2 px-3 text-right font-mono">{fmt(row.median)}</td>
              <td className="py-2 px-3 text-right font-mono">{fmt(row.std)}</td>
              <td className="py-2 px-3 text-right font-mono text-[var(--sim-text-muted)]">
                [{fmt(row.ci95Lower)}, {fmt(row.ci95Upper)}]
              </td>
              <td className="py-2 px-3 text-right font-mono">{fmt(row.min)}</td>
              <td className="py-2 px-3 text-right font-mono">{fmt(row.max)}</td>
              <td className="py-2 px-3 text-right font-mono text-[var(--sim-text-muted)]">
                {(row.cv * 100).toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type { MetricRow };
