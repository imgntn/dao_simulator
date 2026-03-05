'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { AgentSnapshot } from '@/lib/browser/worker-protocol';
import { getDisplayName } from '../scene/constants';
import { ChartWrapper } from './TreasuryChart';

const TYPE_COLORS: Record<string, string> = {
  Developer: '#3b82f6',
  Investor: '#10b981',
  Trader: '#f59e0b',
  Delegator: '#8b5cf6',
  LiquidDelegator: '#a78bfa',
  ProposalCreator: '#ec4899',
  Validator: '#06b6d4',
  GovernanceExpert: '#14b8a6',
  GovernanceWhale: '#f43f5e',
  RiskManager: '#84cc16',
  PassiveMember: '#6b7280',
  Speculator: '#eab308',
  StakerAgent: '#22d3ee',
  AdaptiveInvestor: '#34d399',
};

interface Props {
  agents: AgentSnapshot[];
}

export function AgentDistribution({ agents }: Props) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of agents) {
      counts[a.type] = (counts[a.type] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([type, count]) => ({ type: getDisplayName(type), count }))
      .sort((a, b) => b.count - a.count);
  }, [agents]);

  if (data.length === 0) return null;

  return (
    <ChartWrapper title="Agent Types">
      <ResponsiveContainer width="100%" height={Math.max(80, data.length * 20)}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 10 }}>
          <XAxis type="number" tick={{ fontSize: 10 }} stroke="#555" />
          <YAxis
            type="category"
            dataKey="type"
            tick={{ fontSize: 9 }}
            stroke="#555"
            width={110}
          />
          <Tooltip
            contentStyle={{ background: '#111', border: '1px solid #333', fontSize: 11 }}
          />
          <Bar
            dataKey="count"
            fill="#22d3ee"
            radius={[0, 2, 2, 0]}
            barSize={14}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

export { TYPE_COLORS };
