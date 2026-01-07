'use client';

import { useMemo } from 'react';
import type { SimulationData, LeaderboardEntry, MarketShock, DAOMember, DAOProposal } from '@/lib/types/visualization';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DAOReportProps {
  simulationData?: SimulationData[];
  tokenLeaderboard?: LeaderboardEntry[][];
  influenceLeaderboard?: LeaderboardEntry[][];
  marketShocks?: MarketShock[];
  members?: DAOMember[];
  proposals?: DAOProposal[];
  title?: string;
}

export function DAOReport({
  simulationData = [],
  tokenLeaderboard = [],
  influenceLeaderboard = [],
  marketShocks = [],
  members = [],
  proposals = [],
  title = 'DAO Simulation Report'
}: DAOReportProps) {
  const stats = useMemo(() => {
    if (simulationData.length === 0) return null;

    const latest = simulationData[simulationData.length - 1];
    const basePrice = simulationData[0]?.dao_token_price ?? 0;
    const priceChange = simulationData.length > 1 && basePrice !== 0
      ? ((latest.dao_token_price - basePrice) / basePrice) * 100
      : 0;

    return {
      totalSteps: simulationData.length,
      currentPrice: latest.dao_token_price,
      priceChange,
      treasuryBalance: latest.treasury_balance,
      totalMembers: members.length,
      activeProposals: proposals.filter(
        (p) => p.status === 'active' || p.status === 'open'
      ).length,
    };
  }, [simulationData, members, proposals]);

  const topTokenHolders = useMemo(() => {
    if (tokenLeaderboard.length === 0) return [];
    return tokenLeaderboard[tokenLeaderboard.length - 1]?.slice(0, 5) || [];
  }, [tokenLeaderboard]);

  const topInfluencers = useMemo(() => {
    if (influenceLeaderboard.length === 0) return [];
    return influenceLeaderboard[influenceLeaderboard.length - 1]?.slice(0, 5) || [];
  }, [influenceLeaderboard]);

  return (
    <div className="w-full p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>

      {/* Statistics Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Steps</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalSteps}</p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Current Price</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              ${stats.currentPrice.toFixed(2)}
            </p>
            <p className={`text-sm ${stats.priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.priceChange >= 0 ? 'Up' : 'Down'} {Math.abs(stats.priceChange).toFixed(2)}%
            </p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Treasury</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              ${stats.treasuryBalance.toFixed(2)}
            </p>
          </div>
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Members</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.totalMembers}</p>
          </div>
          <div className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Active Proposals</p>
            <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">{stats.activeProposals}</p>
          </div>
        </div>
      )}

      {/* Treasury History Chart */}
      {simulationData.length > 0 && (
        <div className="w-full h-[300px]">
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Treasury Over Time</h3>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={simulationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="step" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem'
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="treasury_balance"
                stroke="#8B5CF6"
                fill="#8B5CF6"
                fillOpacity={0.6}
                name="Treasury"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Leaderboards */}
      <div className="grid md:grid-cols-2 gap-6">
        {topTokenHolders.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Token Holders</h3>
            <ul className="space-y-2">
              {topTokenHolders.map((entry, idx) => (
                <li
                  key={idx}
                  className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded"
                >
                  <span className="text-gray-900 dark:text-white font-medium">
                    {idx + 1}. {entry.member}
                  </span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">
                    {entry.value.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {topInfluencers.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Most Influential Members</h3>
            <ul className="space-y-2">
              {topInfluencers.map((entry, idx) => (
                <li
                  key={idx}
                  className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded"
                >
                  <span className="text-gray-900 dark:text-white font-medium">
                    {idx + 1}. {entry.member}
                  </span>
                  <span className="text-purple-600 dark:text-purple-400 font-bold">
                    {entry.value.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Market Shocks */}
      {marketShocks.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Market Shocks</h3>
          <ul className="space-y-2">
            {marketShocks.map((shock, idx) => (
              <li
                key={idx}
                className="flex justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded"
              >
                <span className="text-gray-900 dark:text-white">Step {shock.step}</span>
                <span className={`font-bold ${shock.severity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {shock.severity >= 0 ? '+' : ''}{shock.severity.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
