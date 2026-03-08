'use client';

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import type { ProposalSnapshot } from '@/lib/browser/worker-protocol';
import { BUILDING } from './constants';

interface Props {
  proposals: ProposalSnapshot[];
  onSelectProposal?: (proposal: ProposalSnapshot) => void;
}

const STATUS_COLORS: Record<string, string> = {
  open: '#06b6d4',
  approved: '#22c55e',
  rejected: '#ef4444',
  expired: '#6b7280',
};

/** Governance floor (F2) y position */
const BOARD_Y = 4.5;

export function ProposalBoard({ proposals, onSelectProposal }: Props) {
  // Show up to 6 most recent proposals, prioritizing open ones
  const displayed = useMemo(() => {
    const sorted = [...proposals].sort((a, b) => {
      // Open first, then by creation step desc
      if (a.status === 'open' && b.status !== 'open') return -1;
      if (b.status === 'open' && a.status !== 'open') return 1;
      return b.creationStep - a.creationStep;
    });
    return sorted.slice(0, 6);
  }, [proposals]);

  if (displayed.length === 0) return null;

  return (
    <group position={[BUILDING.width / 2 + 0.3, BOARD_Y, 0]}>
      {/* Board backing */}
      <mesh position={[0.5, 0, 0]}>
        <boxGeometry args={[0.05, 2.4, 3.2]} />
        <meshStandardMaterial
          color="#1e1b4b"
          transparent
          opacity={0.8}
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>

      {/* Proposal cards via Html */}
      <Html
        position={[0.6, 0, 0]}
        transform
        rotation={[0, -Math.PI / 2, 0]}
        distanceFactor={5}
        style={{ pointerEvents: onSelectProposal ? 'auto' : 'none' }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            fontFamily: 'monospace',
            fontSize: 9,
            width: 180,
          }}
        >
          <div
            style={{
              color: '#8b5cf6',
              fontWeight: 700,
              fontSize: 10,
              marginBottom: 2,
              textAlign: 'center',
            }}
          >
            PROPOSALS
          </div>
          {displayed.map(p => (
            <ProposalCard
              key={p.id}
              proposal={p}
              onClick={onSelectProposal ? () => onSelectProposal(p) : undefined}
            />
          ))}
        </div>
      </Html>
    </group>
  );
}

function ProposalCard({ proposal, onClick }: { proposal: ProposalSnapshot; onClick?: () => void }) {
  const borderColor = STATUS_COLORS[proposal.status] ?? '#6b7280';
  const total = proposal.votesFor + proposal.votesAgainst;
  const forPct = total > 0 ? (proposal.votesFor / total) * 100 : 0;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'rgba(15, 15, 30, 0.9)',
        border: `1px solid ${borderColor}`,
        borderRadius: 3,
        padding: '3px 5px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-width 0.15s',
      }}
      onMouseEnter={e => {
        if (onClick) (e.currentTarget as HTMLDivElement).style.borderWidth = '2px';
      }}
      onMouseLeave={e => {
        if (onClick) (e.currentTarget as HTMLDivElement).style.borderWidth = '1px';
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
          {proposal.type}
        </span>
        <span
          style={{
            color: borderColor,
            fontSize: 8,
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          {proposal.status}
        </span>
      </div>

      {/* Vote bar */}
      {total > 0 && (
        <div
          style={{
            marginTop: 2,
            height: 4,
            background: '#ef444480',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${forPct}%`,
              height: '100%',
              background: '#22c55e',
              borderRadius: 2,
            }}
          />
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 1,
          color: '#94a3b8',
          fontSize: 8,
        }}
      >
        <span>{proposal.votesFor} for</span>
        <span>{proposal.votesAgainst} against</span>
      </div>
    </div>
  );
}
