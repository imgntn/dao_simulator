'use client';

import { useMemo, useState, useCallback } from 'react';
import type { SimulationData, LeaderboardEntry, MarketShock, DAOMember, DAOProposal } from '@/lib/types/visualization';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { messages as m, format } from '@/lib/i18n';

interface DAOReportProps {
  simulationData?: SimulationData[];
  tokenLeaderboard?: LeaderboardEntry[][];
  influenceLeaderboard?: LeaderboardEntry[][];
  marketShocks?: MarketShock[];
  members?: DAOMember[];
  proposals?: DAOProposal[];
  title?: string;
  isLoading?: boolean;
  onStatClick?: (statType: string, value: number) => void;
  onMemberClick?: (memberId: string) => void;
}

// Stat card component
function StatCard({
  label,
  value,
  subValue,
  subValueColor,
  color,
  icon,
  onClick,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  subValueColor?: string;
  color: string;
  icon: string;
  onClick?: () => void;
}) {
  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-900/20', text: 'text-blue-400', border: 'border-blue-500/30' },
    green: { bg: 'bg-green-900/20', text: 'text-green-400', border: 'border-green-500/30' },
    purple: { bg: 'bg-purple-900/20', text: 'text-purple-400', border: 'border-purple-500/30' },
    orange: { bg: 'bg-orange-900/20', text: 'text-orange-400', border: 'border-orange-500/30' },
    pink: { bg: 'bg-pink-900/20', text: 'text-pink-400', border: 'border-pink-500/30' },
  };

  const styles = colorClasses[color] || colorClasses.blue;

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`
        p-4 ${styles.bg} rounded-lg border ${styles.border}
        text-left transition-all duration-200
        ${onClick ? 'hover:scale-[1.02] hover:shadow-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500' : ''}
      `}
      aria-label={`${label}: ${value}${subValue ? `, ${subValue}` : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className={`text-2xl font-bold ${styles.text}`}>{value}</p>
          {subValue && (
            <p className={`text-sm ${subValueColor || 'text-gray-500'}`}>{subValue}</p>
          )}
        </div>
        <svg className={`w-5 h-5 ${styles.text} opacity-50`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
        </svg>
      </div>
    </button>
  );
}

// Leaderboard item component
function LeaderboardItem({
  rank,
  member,
  value,
  color,
  onClick,
}: {
  rank: number;
  member: string;
  value: number;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`
        flex justify-between items-center p-3 bg-gray-700/50 rounded
        transition-all duration-200
        ${onClick ? 'hover:bg-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500' : ''}
      `}
      aria-label={`Rank ${rank}: ${member}, value ${value.toFixed(1)}`}
    >
      <span className="text-white font-medium flex items-center gap-2">
        <span className={`
          w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
          ${rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
            rank === 2 ? 'bg-gray-400/20 text-gray-300' :
            rank === 3 ? 'bg-orange-500/20 text-orange-400' :
            'bg-gray-600/20 text-gray-400'}
        `}>
          {rank}
        </span>
        <span className="truncate max-w-[120px]" title={member}>{member}</span>
      </span>
      <span className={`${color} font-bold`}>
        {value.toFixed(1)}
      </span>
    </button>
  );
}

// Shock item component
function ShockItem({ shock }: { shock: MarketShock }) {
  const isPositive = shock.severity >= 0;
  return (
    <div
      className={`
        flex justify-between items-center p-3 rounded
        ${isPositive ? 'bg-green-900/20 border border-green-500/30' : 'bg-red-900/20 border border-red-500/30'}
      `}
      role="listitem"
    >
      <span className="text-white flex items-center gap-2">
        <svg className={`w-4 h-4 ${isPositive ? 'text-green-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isPositive ? 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' : 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6'} />
        </svg>
        Step {shock.step}
      </span>
      <span className={`font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? '+' : ''}{shock.severity.toFixed(2)}
      </span>
    </div>
  );
}

// Loading skeleton
function ReportSkeleton() {
  return (
    <div className="w-full p-6 bg-gray-800 rounded-lg shadow-lg space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-gray-700 rounded" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-700 rounded-lg" />
        ))}
      </div>
      <div className="h-[300px] bg-gray-700 rounded-lg" />
    </div>
  );
}

// Empty state
function EmptyState({ title }: { title: string }) {
  return (
    <div className="w-full p-6 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>
      <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-gray-700 rounded-lg">
        <div className="text-center px-4">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-gray-400 text-sm">{m.reports.noDataAvailable}</p>
          <p className="text-gray-500 text-xs mt-1">{m.reports.runToGenerate}</p>
        </div>
      </div>
    </div>
  );
}

export function DAOReport({
  simulationData = [],
  tokenLeaderboard = [],
  influenceLeaderboard = [],
  marketShocks = [],
  members = [],
  proposals = [],
  title = 'DAO Simulation Report',
  isLoading = false,
  onStatClick,
  onMemberClick,
}: DAOReportProps) {
  const [showAllShocks, setShowAllShocks] = useState(false);

  const stats = useMemo(() => {
    if (simulationData.length === 0) return null;

    const latest = simulationData[simulationData.length - 1];
    const basePrice = simulationData[0]?.dao_token_price ?? 0;
    const priceChange = simulationData.length > 1 && basePrice !== 0
      ? ((latest.dao_token_price - basePrice) / basePrice) * 100
      : 0;

    // Calculate treasury stats
    const treasuryValues = simulationData.map(d => d.treasury_balance);
    const minTreasury = Math.min(...treasuryValues);
    const maxTreasury = Math.max(...treasuryValues);

    return {
      totalSteps: simulationData.length,
      currentPrice: latest.dao_token_price,
      priceChange,
      treasuryBalance: latest.treasury_balance,
      minTreasury,
      maxTreasury,
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

  const sortedShocks = useMemo(() => {
    return [...marketShocks].sort((a, b) => a.step - b.step);
  }, [marketShocks]);

  const displayedShocks = showAllShocks ? sortedShocks : sortedShocks.slice(0, 5);

  const handleStatClick = useCallback((type: string, value: number) => {
    onStatClick?.(type, value);
  }, [onStatClick]);

  if (isLoading) {
    return <ReportSkeleton />;
  }

  if (simulationData.length === 0) {
    return <EmptyState title={title} />;
  }

  return (
    <div
      className="w-full p-6 bg-gray-800 rounded-lg shadow-lg space-y-6"
      role="region"
      aria-label={title}
    >
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <span className="text-sm text-gray-400">
          {format(m.reports.stepsCompleted, { count: stats?.totalSteps ?? 0 })}
        </span>
      </div>

      {/* Statistics Overview */}
      {stats && (
        <div
          className="grid grid-cols-2 md:grid-cols-3 gap-4"
          role="group"
          aria-label="Simulation statistics"
        >
          <StatCard
            label={m.reports.totalSteps}
            value={stats.totalSteps}
            color="blue"
            icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            onClick={() => handleStatClick('steps', stats.totalSteps)}
          />
          <StatCard
            label={m.reports.currentPrice}
            value={`$${stats.currentPrice.toFixed(2)}`}
            subValue={`${stats.priceChange >= 0 ? m.reports.priceUp : m.reports.priceDown} ${Math.abs(stats.priceChange).toFixed(2)}%`}
            subValueColor={stats.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}
            color="green"
            icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            onClick={() => handleStatClick('price', stats.currentPrice)}
          />
          <StatCard
            label={m.reports.treasury}
            value={`$${stats.treasuryBalance.toFixed(2)}`}
            subValue={`${m.reports.priceRange}: $${stats.minTreasury.toFixed(0)} - $${stats.maxTreasury.toFixed(0)}`}
            color="purple"
            icon="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
            onClick={() => handleStatClick('treasury', stats.treasuryBalance)}
          />
          <StatCard
            label={m.reports.members}
            value={stats.totalMembers}
            color="orange"
            icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            onClick={() => handleStatClick('members', stats.totalMembers)}
          />
          <StatCard
            label={m.reports.activeProposals}
            value={stats.activeProposals}
            subValue={format(m.reports.ofTotal, { total: proposals.length })}
            color="pink"
            icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            onClick={() => handleStatClick('proposals', stats.activeProposals)}
          />
        </div>
      )}

      {/* Treasury History Chart */}
      {simulationData.length > 0 && (
        <div className="w-full">
          <h3 className="text-lg font-semibold mb-2 text-white">{m.reports.treasuryOverTime}</h3>
          <div className="h-[300px]" role="img" aria-label="Area chart showing treasury balance over time">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={simulationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="step"
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF', fontSize: 11 }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem'
                  }}
                  labelStyle={{ color: '#F9FAFB' }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Treasury']}
                  labelFormatter={(label) => `Step ${label}`}
                />
                <Legend />
                {/* Warning threshold line */}
                <ReferenceLine y={5000} stroke="#F59E0B" strokeDasharray="5 5" label={{ value: 'Warning', fill: '#F59E0B', fontSize: 10 }} />
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
        </div>
      )}

      {/* Leaderboards */}
      <div className="grid md:grid-cols-2 gap-6">
        {topTokenHolders.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {m.reports.topTokenHolders}
            </h3>
            <div className="space-y-2" role="list" aria-label="Token holders leaderboard">
              {topTokenHolders.map((entry, idx) => (
                <LeaderboardItem
                  key={idx}
                  rank={idx + 1}
                  member={entry.member}
                  value={entry.value}
                  color="text-blue-400"
                  onClick={() => onMemberClick?.(entry.member)}
                />
              ))}
            </div>
          </div>
        )}

        {topInfluencers.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              {m.reports.mostInfluential}
            </h3>
            <div className="space-y-2" role="list" aria-label="Influence leaderboard">
              {topInfluencers.map((entry, idx) => (
                <LeaderboardItem
                  key={idx}
                  rank={idx + 1}
                  member={entry.member}
                  value={entry.value}
                  color="text-purple-400"
                  onClick={() => onMemberClick?.(entry.member)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Market Shocks */}
      {sortedShocks.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {m.reports.marketShocks} ({sortedShocks.length})
            </h3>
            {sortedShocks.length > 5 && (
              <button
                onClick={() => setShowAllShocks(!showAllShocks)}
                className="text-sm text-blue-400 hover:text-blue-300 focus:outline-none focus:underline"
              >
                {showAllShocks ? m.reports.showLess : format(m.reports.showAll, { count: sortedShocks.length })}
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto" role="list" aria-label="Market shocks">
            {displayedShocks.map((shock, idx) => (
              <ShockItem key={idx} shock={shock} />
            ))}
          </div>
        </div>
      )}

      {/* Screen reader summary */}
      <div className="sr-only" role="status">
        DAO Report: {stats?.totalSteps} steps completed.
        Current price: ${stats?.currentPrice.toFixed(2)}, {(stats?.priceChange ?? 0) >= 0 ? 'up' : 'down'} {Math.abs(stats?.priceChange ?? 0).toFixed(2)}%.
        Treasury: ${stats?.treasuryBalance.toFixed(2)}.
        {members.length} members, {stats?.activeProposals} active proposals.
        {sortedShocks.length} market shocks recorded.
      </div>
    </div>
  );
}
