'use client';

import { useMemo, useState, useCallback } from 'react';

type CozyMapProps = {
  treasury?: number;
  proposals?: number;
  members?: number;
  shocks?: number;
  status?: 'running' | 'paused' | 'won' | 'lost';
  previousTreasury?: number;
  previousProposals?: number;
  previousMembers?: number;
  previousShocks?: number;
  onRoomClick?: (roomId: string) => void;
};

type RoomStateLevel = 'healthy' | 'stressed' | 'critical';

type RoomState = {
  id: string;
  title: string;
  description: string;
  level: RoomStateLevel;
  stateLabel: string;
  metricLabel: string;
  metricValue: string;
  threshold: string;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  icon: string;
};

const baseRooms: Array<{
  id: 'governance' | 'treasury' | 'devhub' | 'market';
  title: string;
  description: string;
  icon: string;
}> = [
  {
    id: 'governance',
    title: 'Governance',
    description: 'Proposals, voting, and decision throughput.',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  },
  {
    id: 'treasury',
    title: 'Treasury',
    description: 'Runway, reserves, and capital allocation.',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    id: 'devhub',
    title: 'Delivery',
    description: 'Builders, contributors, and execution capacity.',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  },
  {
    id: 'market',
    title: 'Market & Risk',
    description: 'Token behaviour, liquidity, and shocks.',
    icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  },
];

const levelStyles: Record<RoomStateLevel, { badge: string; border: string; glow: string }> = {
  healthy: {
    badge: 'bg-green-500/15 text-green-300 border border-green-500/40',
    border: 'border-green-500/30',
    glow: 'shadow-green-500/10',
  },
  stressed: {
    badge: 'bg-amber-500/15 text-amber-300 border border-amber-500/40',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/10',
  },
  critical: {
    badge: 'bg-red-500/20 text-red-300 border border-red-500/60',
    border: 'border-red-500/40',
    glow: 'shadow-red-500/20',
  },
};

const levelIcons: Record<RoomStateLevel, string> = {
  healthy: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  stressed: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  critical: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
};

// Trend indicator component
function TrendIndicator({ trend, value }: { trend: 'up' | 'down' | 'stable'; value: number }) {
  if (trend === 'stable' || value === 0) {
    return (
      <span className="text-gray-500 text-xs flex items-center gap-0.5">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
        stable
      </span>
    );
  }

  const isUp = trend === 'up';
  const color = isUp ? 'text-green-400' : 'text-red-400';

  return (
    <span className={`${color} text-xs flex items-center gap-0.5`}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={isUp ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'}
        />
      </svg>
      {Math.abs(value).toLocaleString()}
    </span>
  );
}

// Room card component
function RoomCard({
  room,
  simStatusLabel,
  isExpanded,
  onClick,
}: {
  room: RoomState;
  simStatusLabel: string;
  isExpanded: boolean;
  onClick: () => void;
}) {
  const styles = levelStyles[room.level];

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left rounded-lg border ${styles.border}
        bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900
        p-4 shadow-lg ${styles.glow}
        transition-all duration-200 hover:scale-[1.02] hover:shadow-xl
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900
        ${isExpanded ? 'ring-2 ring-blue-400' : ''}
      `}
      aria-expanded={isExpanded}
      aria-label={`${room.title} room. Status: ${room.stateLabel}. ${room.metricLabel}: ${room.metricValue}`}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${room.level === 'critical' ? 'bg-red-500/20' : room.level === 'stressed' ? 'bg-amber-500/20' : 'bg-green-500/20'}`}>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={room.icon} />
              </svg>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">{room.id}</p>
              <h4 className="text-lg font-semibold text-white">{room.title}</h4>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`px-2 py-0.5 text-[11px] rounded-full flex items-center gap-1 ${styles.badge}`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={levelIcons[room.level]} />
              </svg>
              {room.stateLabel}
            </span>
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-gray-800 text-gray-300 border border-gray-700">
              {simStatusLabel}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-400">{room.description}</p>

        {/* Metric */}
        <div className="rounded border border-gray-700 bg-gray-800/60 p-2 text-sm text-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">{room.metricLabel}</p>
              <p className="font-semibold text-lg">{room.metricValue}</p>
            </div>
            <TrendIndicator trend={room.trend} value={room.trendValue} />
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="pt-2 border-t border-gray-700 space-y-2 animate-in fade-in duration-200">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Threshold</span>
              <span className="text-gray-300">{room.threshold}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Status level</span>
              <span className={`capitalize ${room.level === 'healthy' ? 'text-green-400' : room.level === 'stressed' ? 'text-amber-400' : 'text-red-400'}`}>
                {room.level}
              </span>
            </div>
          </div>
        )}
      </div>
    </button>
  );
}

export function CozyMap({
  treasury = 0,
  proposals = 0,
  members = 0,
  shocks = 0,
  status = 'paused',
  previousTreasury,
  previousProposals,
  previousMembers,
  previousShocks,
  onRoomClick,
}: CozyMapProps) {
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);

  // Calculate trends
  const getTrend = useCallback((current: number, previous: number | undefined, inverse = false): { trend: 'up' | 'down' | 'stable'; value: number } => {
    if (previous === undefined) return { trend: 'stable', value: 0 };
    const diff = current - previous;
    if (diff === 0) return { trend: 'stable', value: 0 };
    // For some metrics (like proposals/shocks), "up" is bad
    const trend = inverse ? (diff > 0 ? 'down' : 'up') : (diff > 0 ? 'up' : 'down');
    return { trend, value: diff };
  }, []);

  const rooms = useMemo<RoomState[]>(() => {
    return baseRooms.map((room) => {
      if (room.id === 'treasury') {
        let level: RoomStateLevel = 'healthy';
        let stateLabel = 'Strong runway';
        if (treasury <= 0) {
          level = 'critical';
          stateLabel = 'Treasury insolvent';
        } else if (treasury < 5_000) {
          level = 'stressed';
          stateLabel = 'Runway getting thin';
        }
        const { trend, value } = getTrend(treasury, previousTreasury);
        return {
          ...room,
          level,
          stateLabel,
          metricLabel: 'Treasury balance',
          metricValue: treasury.toLocaleString('en-US'),
          threshold: 'Critical below 0, Stressed below 5,000',
          trend,
          trendValue: value,
        };
      }

      if (room.id === 'governance') {
        let level: RoomStateLevel = 'healthy';
        let stateLabel = 'Decisions flowing';
        if (proposals >= 40) {
          level = 'critical';
          stateLabel = 'Governance gridlock';
        } else if (proposals >= 15) {
          level = 'stressed';
          stateLabel = 'Decision backlog building';
        }
        const { trend, value } = getTrend(proposals, previousProposals, true);
        return {
          ...room,
          level,
          stateLabel,
          metricLabel: 'Open proposals',
          metricValue: proposals.toLocaleString('en-US'),
          threshold: 'Critical at 40+, Stressed at 15+',
          trend,
          trendValue: value,
        };
      }

      if (room.id === 'devhub') {
        let level: RoomStateLevel = 'healthy';
        let stateLabel = 'Well-staffed delivery';
        if (members < 8) {
          level = 'critical';
          stateLabel = 'Understaffed, at risk';
        } else if (members < 25) {
          level = 'stressed';
          stateLabel = 'Capacity is constrained';
        }
        const { trend, value } = getTrend(members, previousMembers);
        return {
          ...room,
          level,
          stateLabel,
          metricLabel: 'Active members',
          metricValue: members.toLocaleString('en-US'),
          threshold: 'Critical below 8, Stressed below 25',
          trend,
          trendValue: value,
        };
      }

      // market
      let level: RoomStateLevel = 'healthy';
      let stateLabel = 'Calm market';
      if (shocks >= 8) {
        level = 'critical';
        stateLabel = 'Persistent stress regime';
      } else if (shocks >= 3) {
        level = 'stressed';
        stateLabel = 'Elevated volatility';
      }
      const { trend, value } = getTrend(shocks, previousShocks, true);
      return {
        ...room,
        level,
        stateLabel,
        metricLabel: 'Shocks observed',
        metricValue: shocks.toLocaleString('en-US'),
        threshold: 'Critical at 8+, Stressed at 3+',
        trend,
        trendValue: value,
      };
    });
  }, [treasury, proposals, members, shocks, previousTreasury, previousProposals, previousMembers, previousShocks, getTrend]);

  const simStatusLabel =
    status === 'running' ? 'Simulation running' :
    status === 'won' ? 'Run complete' :
    status === 'lost' ? 'Run failed' :
    'Simulation paused';

  const handleRoomClick = useCallback((roomId: string) => {
    setExpandedRoom(prev => prev === roomId ? null : roomId);
    onRoomClick?.(roomId);
  }, [onRoomClick]);

  // Summary stats
  const healthyCount = rooms.filter(r => r.level === 'healthy').length;
  const stressedCount = rooms.filter(r => r.level === 'stressed').length;
  const criticalCount = rooms.filter(r => r.level === 'critical').length;

  return (
    <div
      className="space-y-3"
      role="region"
      aria-label="DAO health dashboard showing 4 operational areas"
    >
      {/* Summary bar */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-gray-400">Health Overview:</span>
          {healthyCount > 0 && (
            <span className="flex items-center gap-1 text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {healthyCount} healthy
            </span>
          )}
          {stressedCount > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {stressedCount} stressed
            </span>
          )}
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {criticalCount} critical
            </span>
          )}
        </div>
        <span className="text-gray-500">Click cards for details</span>
      </div>

      {/* Room grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            simStatusLabel={simStatusLabel}
            isExpanded={expandedRoom === room.id}
            onClick={() => handleRoomClick(room.id)}
          />
        ))}
      </div>

      {/* Screen reader summary */}
      <div className="sr-only" role="status" aria-live="polite">
        DAO health dashboard: {healthyCount} areas healthy, {stressedCount} stressed, {criticalCount} critical.
        Treasury: {treasury.toLocaleString()}.
        Open proposals: {proposals}.
        Active members: {members}.
        Market shocks: {shocks}.
      </div>
    </div>
  );
}
