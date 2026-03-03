'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { SimulationSnapshot } from '@/lib/browser/worker-protocol';
import { ChartWrapper } from './TreasuryChart';

interface Props {
  history: SimulationSnapshot[];
}

export function PriceChart({ history }: Props) {
  const data = useMemo(
    () => history.map(s => ({ step: s.step, price: s.tokenPrice })),
    [history]
  );

  if (data.length < 2) return null;

  return (
    <ChartWrapper title="Token Price">
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data}>
          <XAxis dataKey="step" tick={{ fontSize: 10 }} stroke="#555" />
          <YAxis tick={{ fontSize: 10 }} stroke="#555" width={50} tickFormatter={v => `$${v.toFixed(2)}`} />
          <Tooltip
            contentStyle={{ background: '#111', border: '1px solid #333', fontSize: 11 }}
            labelStyle={{ color: '#888' }}
            formatter={(v: number) => [`$${v.toFixed(4)}`, 'Price']}
          />
          <Line type="monotone" dataKey="price" stroke="#a78bfa" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}
