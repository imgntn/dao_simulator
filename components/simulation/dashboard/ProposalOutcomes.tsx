'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { SimulationSnapshot } from '@/lib/browser/worker-protocol';
import { ChartWrapper } from './TreasuryChart';

const COLORS = {
  Approved: '#22c55e',
  Rejected: '#ef4444',
  Expired: '#6b7280',
  Open: '#3b82f6',
};

interface Props {
  snapshot: SimulationSnapshot;
}

export function ProposalOutcomes({ snapshot }: Props) {
  const data = useMemo(() => {
    const entries = [
      { name: 'Approved', value: snapshot.proposalsApproved },
      { name: 'Rejected', value: snapshot.proposalsRejected },
      { name: 'Expired', value: snapshot.proposalsExpired },
      { name: 'Open', value: snapshot.openProposalCount },
    ].filter(d => d.value > 0);
    return entries;
  }, [snapshot]);

  if (data.length === 0) return null;

  return (
    <ChartWrapper title="Proposal Outcomes">
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={100} height={100}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={40}
              innerRadius={20}
              strokeWidth={0}
            >
              {data.map(entry => (
                <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#111', border: '1px solid #333', fontSize: 11 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-1 text-xs">
          {data.map(d => (
            <div key={d.name} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: COLORS[d.name as keyof typeof COLORS] }}
              />
              <span className="text-gray-400">{d.name}</span>
              <span className="font-mono text-gray-200">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </ChartWrapper>
  );
}
