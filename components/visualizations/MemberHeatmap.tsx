'use client';

import { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { DAOMember } from '@/lib/types/visualization';

interface MemberHeatmapProps {
  members: DAOMember[];
  title?: string;
}

export function MemberHeatmap({ members, title = 'Member Score: Reputation vs Token Balance' }: MemberHeatmapProps) {
  const heatmapData = useMemo(() => {
    if (!members || members.length === 0) return [];

    const repValues = members.map(m => m.reputation);
    const tokenValues = members.map(m => m.tokens);

    const repMin = Math.min(...repValues);
    const repMax = Math.max(...repValues);
    const tokenMin = Math.min(...tokenValues);
    const tokenMax = Math.max(...tokenValues);

    const repRange = repMax - repMin || 1;
    const tokenRange = tokenMax - tokenMin || 1;

    return members.map(member => {
      const normRep = (member.reputation - repMin) / repRange;
      const normTokens = (member.tokens - tokenMin) / tokenRange;
      const score = 0.5 * normRep + 0.5 * normTokens;

      return {
        id: member.unique_id,
        reputation: normRep * 100,
        tokens: normTokens * 100,
        score: score * 100,
        rawRep: member.reputation,
        rawTokens: member.tokens,
      };
    });
  }, [members]);

  const getColor = (score: number) => {
    const normalized = score / 100;
    const r = Math.floor(255 * normalized);
    const b = Math.floor(255 * (1 - normalized));
    return `rgb(${r}, 100, ${b})`;
  };

  if (!members || members.length === 0) {
    return (
      <div className="w-full h-[400px] p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex items-center justify-center">
        <p className="text-gray-500">No members to display</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{title}</h3>
      <div className="h-[calc(100%-2.5rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              type="number"
              dataKey="tokens"
              name="Token Balance"
              label={{ value: 'Token Balance (normalized)', position: 'insideBottom', offset: -10 }}
              stroke="#9CA3AF"
            />
            <YAxis
              type="number"
              dataKey="reputation"
              name="Reputation"
              label={{ value: 'Reputation (normalized)', angle: -90, position: 'insideLeft' }}
              stroke="#9CA3AF"
            />
            <ZAxis type="number" dataKey="score" range={[100, 500]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
                      <p className="text-white font-semibold">{data.id}</p>
                      <p className="text-gray-300">Reputation: {data.rawRep.toFixed(2)}</p>
                      <p className="text-gray-300">Tokens: {data.rawTokens.toFixed(2)}</p>
                      <p className="text-blue-400">Score: {data.score.toFixed(2)}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter data={heatmapData}>
              {heatmapData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.score)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
