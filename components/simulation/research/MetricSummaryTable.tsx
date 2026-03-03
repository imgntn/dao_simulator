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
    <div className="bg-gray-900 rounded border border-gray-800 overflow-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="text-[10px] uppercase text-gray-500 border-b border-gray-800">
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
            <tr key={row.label} className="border-b border-gray-800/50 text-gray-300">
              <td className="py-2 px-3 text-gray-200 font-medium">{row.label}</td>
              <td className="py-2 px-3 text-right font-mono">{fmt(row.mean)}</td>
              <td className="py-2 px-3 text-right font-mono">{fmt(row.median)}</td>
              <td className="py-2 px-3 text-right font-mono">{fmt(row.std)}</td>
              <td className="py-2 px-3 text-right font-mono text-gray-500">
                [{fmt(row.ci95Lower)}, {fmt(row.ci95Upper)}]
              </td>
              <td className="py-2 px-3 text-right font-mono">{fmt(row.min)}</td>
              <td className="py-2 px-3 text-right font-mono">{fmt(row.max)}</td>
              <td className="py-2 px-3 text-right font-mono text-gray-500">
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
