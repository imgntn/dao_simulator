'use client';

import { useMemo } from 'react';
import type { DAOIdentity } from '@/lib/utils/name-generator';
import { messages as m } from '@/lib/i18n';

interface TokenTrackerProps {
  daoIdentity: DAOIdentity;
  currentPrice: number;
  priceHistory: Array<{ step: number; price: number }>;
  treasury: number;
  totalSupply?: number;
  holders?: number;
  marketCap?: number;
}

// Mini sparkline component
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const height = 24;
  const width = 60;

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TokenTracker({
  daoIdentity,
  currentPrice,
  priceHistory,
  treasury,
  totalSupply = 1000000,
  holders,
  marketCap,
}: TokenTrackerProps) {
  // Calculate stats
  const stats = useMemo(() => {
    if (priceHistory.length < 2) {
      return {
        change24h: 0,
        changePercent: 0,
        high: currentPrice,
        low: currentPrice,
        sparklineData: [currentPrice],
        trend: 'stable' as const,
      };
    }

    const prices = priceHistory.map(p => p.price);
    const recentPrices = prices.slice(-30); // Last 30 data points
    const startPrice = recentPrices[0];
    const change = currentPrice - startPrice;
    const changePercent = startPrice !== 0 ? (change / startPrice) * 100 : 0;

    return {
      change24h: change,
      changePercent,
      high: Math.max(...prices),
      low: Math.min(...prices),
      sparklineData: recentPrices,
      trend: change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'stable' as const,
    };
  }, [priceHistory, currentPrice]);

  const calculatedMarketCap = marketCap ?? (currentPrice * totalSupply);
  const calculatedHolders = holders ?? Math.floor(totalSupply / 1000);

  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    stable: 'text-gray-400',
  };

  const trendBgColors = {
    up: 'bg-green-500/10',
    down: 'bg-red-500/10',
    stable: 'bg-gray-500/10',
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700 p-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
            {daoIdentity.tokenSymbol.replace('$', '').substring(0, 2)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              {daoIdentity.tokenSymbol}
              <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full">
                {m.tokenTracker.daoToken}
              </span>
            </h3>
            <p className="text-xs text-gray-400">{daoIdentity.tokenName}</p>
          </div>
        </div>
        <div className="text-right">
          <Sparkline
            data={stats.sparklineData}
            color={stats.trend === 'up' ? '#4ade80' : stats.trend === 'down' ? '#f87171' : '#9ca3af'}
          />
        </div>
      </div>

      {/* Price Section */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white">
            ${currentPrice.toFixed(4)}
          </span>
          <span className={`text-sm font-medium px-2 py-0.5 rounded ${trendBgColors[stats.trend]} ${trendColors[stats.trend]}`}>
            {stats.trend === 'up' ? '+' : ''}{stats.changePercent.toFixed(2)}%
            {stats.trend === 'up' && <span className="ml-1">↑</span>}
            {stats.trend === 'down' && <span className="ml-1">↓</span>}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {stats.change24h >= 0 ? '+' : ''}{stats.change24h.toFixed(4)} {m.tokenTracker.fromStart}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-800/50 rounded-lg p-2">
          <p className="text-xs text-gray-400">{m.tokenTracker.marketCap}</p>
          <p className="text-sm font-semibold text-white">
            ${calculatedMarketCap >= 1000000
              ? `${(calculatedMarketCap / 1000000).toFixed(2)}M`
              : calculatedMarketCap >= 1000
                ? `${(calculatedMarketCap / 1000).toFixed(1)}K`
                : calculatedMarketCap.toFixed(0)}
          </p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-2">
          <p className="text-xs text-gray-400">{m.reports.treasury}</p>
          <p className="text-sm font-semibold text-white">
            ${treasury >= 1000 ? `${(treasury / 1000).toFixed(1)}K` : treasury.toFixed(0)}
          </p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-2">
          <p className="text-xs text-gray-400">{m.tokenTracker.high24h}</p>
          <p className="text-sm font-semibold text-green-400">${stats.high.toFixed(4)}</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-2">
          <p className="text-xs text-gray-400">{m.tokenTracker.low24h}</p>
          <p className="text-sm font-semibold text-red-400">${stats.low.toFixed(4)}</p>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="flex justify-between text-xs text-gray-400 pt-3 border-t border-gray-700">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>{m.common.live}</span>
        </div>
        <div>{m.tokenTracker.holders}: {calculatedHolders.toLocaleString()}</div>
        <div>{m.tokenTracker.supply}: {(totalSupply / 1000).toFixed(0)}K</div>
      </div>
    </div>
  );
}

export default TokenTracker;
