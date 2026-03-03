'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { SimulationSnapshot } from '@/lib/browser/worker-protocol';

interface Props {
  history: SimulationSnapshot[];
}

export function TreasuryChart({ history }: Props) {
  const data = useMemo(
    () => history.map(s => ({ step: s.step, value: s.treasuryFunds })),
    [history]
  );

  if (data.length < 2) return null;

  return (
    <ChartWrapper title="Treasury Balance">
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data}>
          <XAxis dataKey="step" tick={{ fontSize: 10 }} stroke="#555" />
          <YAxis tick={{ fontSize: 10 }} stroke="#555" width={50} tickFormatter={formatY} />
          <Tooltip
            contentStyle={{ background: '#111', border: '1px solid #333', fontSize: 11 }}
            labelStyle={{ color: '#888' }}
            formatter={(v: number) => [formatY(v), 'Treasury']}
          />
          <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

function ChartWrapper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 rounded border border-gray-800 p-3">
      <h3 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  );
}

function formatY(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

export { ChartWrapper };
