'use client';

import { useMemo } from 'react';
import type { AgentSnapshot } from '@/lib/browser/worker-protocol';
import { AGENT_TYPE_INFO, TYPE_COLOR_MAP, AGENT_FLOOR_MAP, getDisplayName } from './scene/constants';

interface Props {
  agent: AgentSnapshot;
  onClose: () => void;
}

/** Tiny inline sparkline for token history */
function MiniSparkline({ data, color, width = 120, height = 28 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return <span className="text-[10px] text-[var(--sim-text-muted)]">—</span>;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.8}
      />
    </svg>
  );
}

export function AgentInspector({ agent, onClose }: Props) {
  const color = TYPE_COLOR_MAP[agent.type] ?? '#888';
  const displayName = getDisplayName(agent.type);
  const description = AGENT_TYPE_INFO[agent.type]?.description ?? '';
  const floorId = AGENT_FLOOR_MAP[agent.type] ?? 'F1';

  const stats = useMemo(() => [
    { label: 'Tokens', value: agent.tokens.toFixed(1) },
    { label: 'Reputation', value: agent.reputation.toFixed(2) },
    { label: 'Optimism', value: agent.optimism.toFixed(2) },
    { label: 'Fatigue', value: agent.voterFatigue.toFixed(2) },
    { label: 'Opp. Bias', value: agent.oppositionBias.toFixed(2) },
    { label: 'Staked', value: agent.stakedTokens.toFixed(1) },
    { label: 'Votes Cast', value: agent.totalVotesCast.toString() },
  ], [agent]);

  return (
    <div className="bg-[var(--sim-surface)] border border-[var(--sim-border)] rounded-lg shadow-xl overflow-hidden w-[280px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--sim-border)]" style={{ borderTopColor: color, borderTopWidth: 2 }}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <div>
            <div className="text-sm font-semibold text-[var(--sim-text)]">{displayName}</div>
            <div className="text-[10px] text-[var(--sim-text-muted)]">{floorId} | {agent.id.slice(0, 8)}</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-[var(--sim-text-muted)] hover:text-[var(--sim-text)] text-lg leading-none px-1"
        >
          &times;
        </button>
      </div>

      {/* Description */}
      <div className="px-3 py-1.5 text-[10px] text-[var(--sim-text-muted)] italic border-b border-[var(--sim-border)]">
        {description}
      </div>

      {/* Stats grid */}
      <div className="px-3 py-2 grid grid-cols-2 gap-x-4 gap-y-1 border-b border-[var(--sim-border)]">
        {stats.map(s => (
          <div key={s.label} className="flex justify-between text-xs">
            <span className="text-[var(--sim-text-muted)]">{s.label}</span>
            <span className="font-mono text-[var(--sim-text)]">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Token History Sparkline */}
      <div className="px-3 py-2 border-b border-[var(--sim-border)]">
        <div className="text-[10px] text-[var(--sim-text-muted)] uppercase tracking-wider mb-1">Token History</div>
        <MiniSparkline data={agent.tokenHistory} color={color} />
      </div>

      {/* Delegation */}
      <div className="px-3 py-2 border-b border-[var(--sim-border)]">
        <div className="text-[10px] text-[var(--sim-text-muted)] uppercase tracking-wider mb-1">Delegation</div>
        <div className="text-xs text-[var(--sim-text-secondary)]">
          {agent.delegateTo ? (
            <span>Delegates to <span className="font-mono text-purple-400">{agent.delegateTo.slice(0, 12)}...</span></span>
          ) : (
            <span className="text-[var(--sim-text-muted)]">Independent</span>
          )}
        </div>
      </div>

      {/* Last Vote */}
      <div className="px-3 py-2">
        <div className="text-[10px] text-[var(--sim-text-muted)] uppercase tracking-wider mb-1">Last Vote</div>
        <div className="text-xs">
          {agent.lastVote === null ? (
            <span className="text-[var(--sim-text-muted)]">No votes yet</span>
          ) : (
            <span className={agent.lastVote ? 'text-green-400' : 'text-red-400'}>
              {agent.lastVote ? 'FOR' : 'AGAINST'}
              <span className="text-[var(--sim-text-muted)] ml-1">(step {agent.lastVoteStep})</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
