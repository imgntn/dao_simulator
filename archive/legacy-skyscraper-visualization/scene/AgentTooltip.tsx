'use client';

import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { AgentSnapshot } from '@/lib/browser/worker-protocol';
import { PRETEXT_FONTS } from '@/lib/ui/pretext';
import { usePretextText } from '@/lib/ui/usePretextText';
import { TYPE_COLOR_MAP, getDisplayName } from './constants';

interface Props {
  agent: AgentSnapshot;
  position: THREE.Vector3;
  detailed?: boolean;
  onClose?: () => void;
}

export function AgentTooltip({ agent, position, detailed, onClose }: Props) {
  const color = TYPE_COLOR_MAP[agent.type] ?? '#888';
  const voteLabel =
    agent.lastVote === null ? 'NONE' : agent.lastVote ? 'FOR' : 'AGAINST';
  const voteColor =
    agent.lastVote === null ? '#9ca3af' : agent.lastVote ? '#22c55e' : '#ef4444';
  const titleText = usePretextText<HTMLSpanElement>({
    text: getDisplayName(agent.type),
    font: PRETEXT_FONTS.simSans12,
    lineHeight: 12,
    maxLines: 2,
    width: detailed ? 136 : 116,
  });

  return (
    <Html
      position={[position.x, position.y, position.z]}
      center
      distanceFactor={12}
      style={{ pointerEvents: detailed ? 'auto' : 'none' }}
    >
      <div
        style={{
          background: 'rgba(10, 10, 20, 0.92)',
          border: `1px solid ${color}`,
          borderRadius: 6,
          padding: '8px 12px',
          minWidth: 160,
          fontFamily: '"IBM Plex Mono", "Courier New", Courier, monospace',
          fontSize: 11,
          color: '#e2e8f0',
          lineHeight: 1.5,
          boxShadow: `0 0 12px ${color}40`,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 8,
            marginBottom: 4,
          }}
        >
          <span
            ref={titleText.ref}
            style={{
              color,
              fontWeight: 700,
              fontSize: 12,
              lineHeight: '12px',
              whiteSpace: titleText.ready ? 'pre-line' : undefined,
              display: 'block',
              minWidth: 0,
              flex: 1,
            }}
            title={titleText.truncated ? getDisplayName(agent.type) : undefined}
          >
            {titleText.displayText}
          </span>
          {detailed && onClose && (
            <span
              style={{ cursor: 'pointer', color: '#9ca3af', fontSize: 14, flexShrink: 0 }}
              onClick={onClose}
            >
              x
            </span>
          )}
        </div>

        <div style={{ color: '#94a3b8' }}>
          <Row label="Tokens" value={agent.tokens.toFixed(0)} />
          <Row label="Reputation" value={agent.reputation.toFixed(2)} />
          <Row label="Optimism" value={agent.optimism.toFixed(2)} />
          <Row label="Staked" value={agent.stakedTokens.toFixed(0)} />
          <Row
            label="Last Vote"
            value={voteLabel}
            valueColor={voteColor}
          />
          <Row label="Fatigue" value={agent.voterFatigue.toFixed(2)} />
          {detailed && agent.oppositionBias > 0 && (
            <Row
              label="Opposition"
              value={agent.oppositionBias.toFixed(2)}
              valueColor="#f97316"
            />
          )}
        </div>
      </div>
    </Html>
  );
}

function Row({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span>{label}</span>
      <span style={{ color: valueColor ?? '#e2e8f0', fontWeight: 500 }}>
        {value}
      </span>
    </div>
  );
}
