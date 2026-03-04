'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ErrorBar } from 'recharts';

interface MetricDataPoint {
  label: string;
  mean: number;
  errorLow: number;
  errorHigh: number;
}

interface Props {
  data: MetricDataPoint[];
  metricName: string;
}

export function MetricBarChart({ data, metricName }: Props) {
  if (data.length === 0) return null;

  return (
    <div className="bg-[var(--sim-surface)] rounded border border-[var(--sim-border)] p-3">
      <h3 className="text-[10px] text-[var(--sim-text-muted)] uppercase tracking-wider mb-2">
        {metricName}
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#666' }}
            stroke="#555"
            angle={-30}
            textAnchor="end"
            height={50}
          />
          <YAxis tick={{ fontSize: 10, fill: '#666' }} stroke="#555" width={60} />
          <Tooltip
            contentStyle={{ background: '#111', border: '1px solid #333', fontSize: 11 }}
            labelStyle={{ color: '#888' }}
            formatter={(value: number) => [value.toFixed(4), metricName]}
          />
          <Bar dataKey="mean" fill="#22d3ee" radius={[2, 2, 0, 0]}>
            <ErrorBar dataKey="errorHigh" width={4} strokeWidth={1} stroke="#67e8f9" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export type { MetricDataPoint };
