'use client';

import { Html } from '@react-three/drei';
import type { ProposalSnapshot } from '@/lib/browser/worker-protocol';

interface Props {
  proposal: ProposalSnapshot;
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  open: '#06b6d4',
  approved: '#22c55e',
  rejected: '#ef4444',
  expired: '#6b7280',
};

export function ProposalDetail({ proposal, onClose }: Props) {
  const total = proposal.votesFor + proposal.votesAgainst;
  const forPct = total > 0 ? (proposal.votesFor / total) * 100 : 0;
  const againstPct = total > 0 ? 100 - forPct : 0;
  const borderColor = STATUS_COLORS[proposal.status] ?? '#6b7280';

  return (
    <Html
      position={[0, 8, 0]}
      center
      style={{ pointerEvents: 'auto' }}
    >
      <div
        style={{
          background: 'rgba(10, 10, 25, 0.95)',
          border: `2px solid ${borderColor}`,
          borderRadius: 8,
          padding: '12px 16px',
          fontFamily: 'monospace',
          fontSize: 12,
          width: 240,
          color: '#e2e8f0',
          backdropFilter: 'blur(8px)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: 1 }}>
            Proposal Detail
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 14,
              padding: '0 2px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Type + Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 600 }}>{proposal.type}</span>
          <span
            style={{
              color: borderColor,
              textTransform: 'uppercase',
              fontSize: 10,
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: 4,
              backgroundColor: `${borderColor}20`,
            }}
          >
            {proposal.status}
          </span>
        </div>

        {/* Details */}
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, lineHeight: 1.5 }}>
          <div>ID: <span style={{ color: '#cbd5e1' }}>{proposal.id.slice(0, 12)}</span></div>
          <div>Created: <span style={{ color: '#cbd5e1' }}>Step {proposal.creationStep}</span></div>
          {proposal.fundingGoal > 0 && (
            <div>Funding Goal: <span style={{ color: '#cbd5e1' }}>{proposal.fundingGoal.toLocaleString()}</span></div>
          )}
          <div>Total Voters: <span style={{ color: '#cbd5e1' }}>{proposal.totalVoters}</span></div>
        </div>

        {/* Vote bar */}
        {total > 0 ? (
          <>
            <div
              style={{
                height: 8,
                background: '#ef444480',
                borderRadius: 4,
                overflow: 'hidden',
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  width: `${forPct}%`,
                  height: '100%',
                  background: '#22c55e',
                  borderRadius: 4,
                  transition: 'width 0.3s',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8' }}>
              <span style={{ color: '#22c55e' }}>{proposal.votesFor} FOR ({forPct.toFixed(1)}%)</span>
              <span style={{ color: '#ef4444' }}>{proposal.votesAgainst} AGAINST ({againstPct.toFixed(1)}%)</span>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 10, color: '#64748b', textAlign: 'center' }}>No votes yet</div>
        )}
      </div>
    </Html>
  );
}
