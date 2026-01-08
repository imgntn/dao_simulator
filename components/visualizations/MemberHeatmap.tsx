'use client';

import { useMemo, useState, useCallback } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import type { DAOMember } from '@/lib/types/visualization';

interface MemberHeatmapProps {
  members: DAOMember[];
  title?: string;
  onMemberSelect?: (member: DAOMember | null) => void;
  isLoading?: boolean;
}

interface HeatmapDataPoint {
  id: string;
  reputation: number;
  tokens: number;
  score: number;
  rawRep: number;
  rawTokens: number;
  quadrant: string;
}

// Color scale for scores (memoized at module level)
const getScoreColor = (score: number): string => {
  const normalized = score / 100;
  // Blue (low) -> Purple (mid) -> Red (high)
  if (normalized < 0.5) {
    const t = normalized * 2;
    const r = Math.floor(100 * t);
    const g = Math.floor(100 * (1 - t * 0.5));
    const b = Math.floor(255 * (1 - t));
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const t = (normalized - 0.5) * 2;
    const r = Math.floor(100 + 155 * t);
    const g = Math.floor(50 * (1 - t));
    const b = Math.floor(128 * (1 - t));
    return `rgb(${r}, ${g}, ${b})`;
  }
};

// Get quadrant label
const getQuadrant = (rep: number, tokens: number): string => {
  if (rep >= 50 && tokens >= 50) return 'High Influence';
  if (rep >= 50 && tokens < 50) return 'High Rep / Low Tokens';
  if (rep < 50 && tokens >= 50) return 'Low Rep / High Tokens';
  return 'Low Influence';
};

// Loading skeleton
function HeatmapSkeleton() {
  return (
    <div className="w-full h-[400px] p-4 bg-gray-800 rounded-lg shadow-lg animate-pulse">
      <div className="h-7 w-64 bg-gray-700 rounded mb-4" />
      <div className="h-[calc(100%-2.5rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full border-4 border-gray-700 border-t-blue-500 animate-spin" />
          <p className="text-gray-500 text-sm">Loading member data...</p>
        </div>
      </div>
    </div>
  );
}

// Empty state
function EmptyState({ title }: { title: string }) {
  return (
    <div className="w-full h-[400px] p-4 bg-gray-800 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4 text-white">{title}</h3>
      <div className="h-[calc(100%-2.5rem)] flex items-center justify-center border-2 border-dashed border-gray-700 rounded-lg">
        <div className="text-center px-4">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <p className="text-gray-400 text-sm">No members to display</p>
          <p className="text-gray-500 text-xs mt-1">Start a simulation to see member data</p>
        </div>
      </div>
    </div>
  );
}

// Color legend component
function ColorLegend() {
  const gradientStops = useMemo(() => {
    const stops = [];
    for (let i = 0; i <= 10; i++) {
      stops.push({ offset: `${i * 10}%`, color: getScoreColor(i * 10) });
    }
    return stops;
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <span>Low</span>
      <div className="w-24 h-3 rounded-sm overflow-hidden flex">
        {gradientStops.map((stop, i) => (
          <div
            key={i}
            className="flex-1 h-full"
            style={{ backgroundColor: stop.color }}
          />
        ))}
      </div>
      <span>High</span>
    </div>
  );
}

// Member detail panel
function MemberDetailPanel({
  data,
  onClose,
}: {
  data: HeatmapDataPoint;
  onClose: () => void;
}) {
  return (
    <div className="absolute top-4 right-4 w-56 bg-gray-900/95 border border-gray-700 rounded-lg p-3 shadow-xl z-10">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-semibold text-white truncate pr-2">{data.id}</h4>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors p-0.5"
          aria-label="Close member details"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Reputation</span>
          <span className="text-white">{data.rawRep.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Tokens</span>
          <span className="text-white">{data.rawTokens.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Score</span>
          <span className="text-blue-400 font-semibold">{data.score.toFixed(1)}</span>
        </div>
        <div className="pt-1 border-t border-gray-700">
          <span
            className="inline-block px-2 py-0.5 rounded-full text-xs"
            style={{ backgroundColor: getScoreColor(data.score) + '33', color: getScoreColor(data.score) }}
          >
            {data.quadrant}
          </span>
        </div>
      </div>
    </div>
  );
}

export function MemberHeatmap({
  members,
  title = 'Member Score: Reputation vs Token Balance',
  onMemberSelect,
  isLoading = false,
}: MemberHeatmapProps) {
  const [selectedMember, setSelectedMember] = useState<HeatmapDataPoint | null>(null);

  const heatmapData = useMemo<HeatmapDataPoint[]>(() => {
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
      const rep100 = normRep * 100;
      const tokens100 = normTokens * 100;

      return {
        id: member.unique_id,
        reputation: rep100,
        tokens: tokens100,
        score: score * 100,
        rawRep: member.reputation,
        rawTokens: member.tokens,
        quadrant: getQuadrant(rep100, tokens100),
      };
    });
  }, [members]);

  // Statistics for the chart
  const stats = useMemo(() => {
    if (heatmapData.length === 0) return null;
    const scores = heatmapData.map(d => d.score);
    return {
      avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      highInfluence: heatmapData.filter(d => d.reputation >= 50 && d.tokens >= 50).length,
      total: heatmapData.length,
    };
  }, [heatmapData]);

  const handlePointClick = useCallback((data: HeatmapDataPoint) => {
    setSelectedMember(prev => prev?.id === data.id ? null : data);
    if (onMemberSelect) {
      const member = members.find(m => m.unique_id === data.id);
      onMemberSelect(member || null);
    }
  }, [members, onMemberSelect]);

  if (isLoading) {
    return <HeatmapSkeleton />;
  }

  if (!members || members.length === 0) {
    return <EmptyState title={title} />;
  }

  return (
    <div
      className="w-full h-[400px] p-4 bg-gray-800 rounded-lg shadow-lg relative"
      role="img"
      aria-label={`Scatter plot showing ${members.length} members by reputation and token balance`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <p className="text-xs text-gray-500">
            Score = 50% Reputation + 50% Tokens (normalized)
          </p>
        </div>
        <ColorLegend />
      </div>

      <div className="h-[calc(100%-3.5rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />

            {/* Quadrant reference lines */}
            <ReferenceLine x={50} stroke="#4B5563" strokeDasharray="5 5" />
            <ReferenceLine y={50} stroke="#4B5563" strokeDasharray="5 5" />

            <XAxis
              type="number"
              dataKey="tokens"
              name="Token Balance"
              domain={[0, 100]}
              label={{
                value: 'Token Balance (normalized 0-100)',
                position: 'insideBottom',
                offset: -10,
                fill: '#9CA3AF',
                fontSize: 12,
              }}
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="reputation"
              name="Reputation"
              domain={[0, 100]}
              label={{
                value: 'Reputation (normalized 0-100)',
                angle: -90,
                position: 'insideLeft',
                fill: '#9CA3AF',
                fontSize: 12,
              }}
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
            />
            <ZAxis type="number" dataKey="score" range={[80, 400]} />

            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as HeatmapDataPoint;
                  return (
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
                      <p className="text-white font-semibold mb-1">{data.id}</p>
                      <div className="space-y-0.5 text-sm">
                        <p className="text-gray-300">
                          Reputation: <span className="text-white">{data.rawRep.toFixed(2)}</span>
                        </p>
                        <p className="text-gray-300">
                          Tokens: <span className="text-white">{data.rawTokens.toFixed(2)}</span>
                        </p>
                        <p className="text-blue-400 font-medium">
                          Score: {data.score.toFixed(1)}
                        </p>
                        <p className="text-gray-400 text-xs">{data.quadrant}</p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Scatter
              data={heatmapData}
              onClick={(data) => handlePointClick(data as unknown as HeatmapDataPoint)}
              style={{ cursor: 'pointer' }}
            >
              {heatmapData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getScoreColor(entry.score)}
                  stroke={selectedMember?.id === entry.id ? '#FBBF24' : 'transparent'}
                  strokeWidth={selectedMember?.id === entry.id ? 2 : 0}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Selected member detail panel */}
      {selectedMember && (
        <MemberDetailPanel
          data={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}

      {/* Quadrant labels */}
      <div className="absolute top-16 left-14 text-[10px] text-gray-500 pointer-events-none">
        High Rep / Low Tokens
      </div>
      <div className="absolute top-16 right-6 text-[10px] text-gray-500 pointer-events-none">
        High Influence
      </div>
      <div className="absolute bottom-12 left-14 text-[10px] text-gray-500 pointer-events-none">
        Low Influence
      </div>
      <div className="absolute bottom-12 right-6 text-[10px] text-gray-500 pointer-events-none">
        Low Rep / High Tokens
      </div>

      {/* Statistics bar */}
      {stats && (
        <div className="absolute bottom-1 left-4 right-4 flex justify-between text-xs text-gray-500">
          <span>{stats.total} members</span>
          <span>Avg score: {stats.avgScore.toFixed(1)}</span>
          <span>{stats.highInfluence} high-influence</span>
        </div>
      )}

      {/* Screen reader summary */}
      <div className="sr-only" role="status">
        Member heatmap showing {members.length} members plotted by reputation and token balance.
        {stats && `Average score: ${stats.avgScore.toFixed(1)}. ${stats.highInfluence} members in high-influence quadrant.`}
        {selectedMember && `Selected member: ${selectedMember.id}, score: ${selectedMember.score.toFixed(1)}.`}
      </div>
    </div>
  );
}
