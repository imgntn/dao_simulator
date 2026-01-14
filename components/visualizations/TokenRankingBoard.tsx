'use client';

import { memo, useMemo } from 'react';
import type { TokenRanking } from '@/lib/types/dao-city';

interface TokenRankingBoardProps {
  rankings: TokenRanking[];
  totalMarketCap: number;
  totalVolume: number;
  onTokenSelect?: (tokenSymbol: string) => void;
  selectedToken?: string;
  compact?: boolean;
}

// Price change indicator
function PriceChange({ percent }: { percent: number }) {
  const isPositive = percent >= 0;
  const color = isPositive ? 'text-green-400' : 'text-red-400';
  const icon = isPositive ? '^' : 'v';

  return (
    <span className={`${color} font-mono text-sm`}>
      {icon} {Math.abs(percent).toFixed(2)}%
    </span>
  );
}

// Rank badge
function RankBadge({ rank }: { rank: number }) {
  const colors = {
    1: 'bg-yellow-500 text-yellow-900',
    2: 'bg-gray-300 text-gray-800',
    3: 'bg-amber-600 text-amber-100',
  };

  const defaultColor = 'bg-gray-700 text-gray-300';
  const colorClass = colors[rank as keyof typeof colors] || defaultColor;

  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${colorClass}`}>
      {rank}
    </span>
  );
}

// Individual token row
const TokenRow = memo(function TokenRow({
  token,
  onSelect,
  isSelected,
  compact,
}: {
  token: TokenRanking;
  onSelect?: () => void;
  isSelected: boolean;
  compact?: boolean;
}) {
  return (
    <tr
      className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer ${
        isSelected ? 'bg-gray-800' : ''
      }`}
      onClick={onSelect}
    >
      <td className="py-3 px-2">
        <RankBadge rank={token.rank} />
      </td>
      <td className="py-3 px-2">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: token.color }}
          />
          <div>
            <span className="font-bold text-white">${token.tokenSymbol}</span>
            {!compact && (
              <p className="text-xs text-gray-500">{token.daoName}</p>
            )}
          </div>
        </div>
      </td>
      <td className="py-3 px-2 text-right font-mono text-white">
        ${token.currentPrice.toFixed(4)}
      </td>
      <td className="py-3 px-2 text-right">
        <PriceChange percent={token.priceChangePercent} />
      </td>
      {!compact && (
        <>
          <td className="py-3 px-2 text-right text-gray-400 font-mono">
            {token.volume24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </td>
          <td className="py-3 px-2 text-right text-gray-400 font-mono">
            ${token.marketCap.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </td>
        </>
      )}
    </tr>
  );
});

// Sparkline chart for price history (simplified)
function MiniChart({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 60;
      const y = 20 - ((v - min) / range) * 18;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width="60" height="24" className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Summary stats
function MarketSummary({ totalMarketCap, totalVolume }: { totalMarketCap: number; totalVolume: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-800/50 rounded-lg mb-4">
      <div>
        <p className="text-xs text-gray-500 uppercase">Total Market Cap</p>
        <p className="text-xl font-bold text-green-400">
          ${totalMarketCap.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase">24h Volume</p>
        <p className="text-xl font-bold text-blue-400">
          ${totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </p>
      </div>
    </div>
  );
}

// Main component
export default function TokenRankingBoard({
  rankings,
  totalMarketCap,
  totalVolume,
  onTokenSelect,
  selectedToken,
  compact = false,
}: TokenRankingBoardProps) {
  // Sort rankings by rank
  const sortedRankings = useMemo(() => {
    return [...rankings].sort((a, b) => a.rank - b.rank);
  }, [rankings]);

  if (rankings.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-400 rounded-lg p-8">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <p className="text-sm">No token data available</p>
          <p className="text-xs text-gray-500 mt-1">Start the city simulation to see rankings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-bold text-white">Token Rankings</h2>
        <p className="text-sm text-gray-500">Real-time DAO token prices</p>
      </div>

      {/* Summary */}
      {!compact && (
        <div className="p-4">
          <MarketSummary totalMarketCap={totalMarketCap} totalVolume={totalVolume} />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
              <th className="py-2 px-2 text-left">#</th>
              <th className="py-2 px-2 text-left">Token</th>
              <th className="py-2 px-2 text-right">Price</th>
              <th className="py-2 px-2 text-right">24h</th>
              {!compact && (
                <>
                  <th className="py-2 px-2 text-right">Volume</th>
                  <th className="py-2 px-2 text-right">Market Cap</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedRankings.map(token => (
              <TokenRow
                key={token.tokenSymbol}
                token={token}
                onSelect={() => onTokenSelect?.(token.tokenSymbol)}
                isSelected={selectedToken === token.tokenSymbol}
                compact={compact}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {!compact && (
        <div className="p-3 border-t border-gray-800 text-center">
          <p className="text-xs text-gray-500">
            {rankings.length} tokens tracked
          </p>
        </div>
      )}
    </div>
  );
}

// Compact version for sidebars
export function TokenRankingCompact({
  rankings,
  onTokenSelect,
  selectedToken,
}: {
  rankings: TokenRanking[];
  onTokenSelect?: (tokenSymbol: string) => void;
  selectedToken?: string;
}) {
  const topThree = useMemo(() => {
    return [...rankings]
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 3);
  }, [rankings]);

  if (topThree.length === 0) {
    return (
      <div className="text-center text-gray-500 text-sm py-4">
        No rankings available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {topThree.map(token => (
        <div
          key={token.tokenSymbol}
          className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
            selectedToken === token.tokenSymbol
              ? 'bg-gray-700'
              : 'hover:bg-gray-800'
          }`}
          onClick={() => onTokenSelect?.(token.tokenSymbol)}
        >
          <div className="flex items-center gap-2">
            <RankBadge rank={token.rank} />
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: token.color }}
            />
            <span className="font-medium text-white">${token.tokenSymbol}</span>
          </div>
          <div className="text-right">
            <p className="text-white font-mono text-sm">
              ${token.currentPrice.toFixed(4)}
            </p>
            <PriceChange percent={token.priceChangePercent} />
          </div>
        </div>
      ))}
    </div>
  );
}
