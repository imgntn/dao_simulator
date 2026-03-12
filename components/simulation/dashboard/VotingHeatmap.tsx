'use client';

import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import type { AgentSnapshot, ProposalSnapshot } from '@/lib/browser/worker-protocol';

interface Props {
  agents: AgentSnapshot[];
  proposals: ProposalSnapshot[];
}

/** Compute voting agreement matrix between agent types */
function computeAgreementMatrix(agents: AgentSnapshot[]): {
  types: string[];
  matrix: number[][]; // agreement percentage [row][col]
} {
  // Group agents by type, track their lastVote
  const typeVotes = new Map<string, boolean[]>();
  for (const a of agents) {
    if (a.lastVote === null) continue;
    if (!typeVotes.has(a.type)) typeVotes.set(a.type, []);
    typeVotes.get(a.type)!.push(a.lastVote);
  }

  const types = Array.from(typeVotes.keys()).sort();
  const n = types.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0.5));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1;
        continue;
      }
      const votesI = typeVotes.get(types[i])!;
      const votesJ = typeVotes.get(types[j])!;

      // Compare all pairs
      let agree = 0;
      let total = 0;
      for (const vi of votesI) {
        for (const vj of votesJ) {
          total++;
          if (vi === vj) agree++;
        }
      }
      matrix[i][j] = total > 0 ? agree / total : 0.5;
    }
  }

  return { types, matrix };
}

/** Color interpolation: red → gray → green */
function agreementColor(value: number): string {
  if (value < 0.5) {
    const t = value / 0.5;
    const r = Math.round(220 * (1 - t) + 128 * t);
    const g = Math.round(60 * (1 - t) + 128 * t);
    const b = Math.round(60 * (1 - t) + 128 * t);
    return `rgb(${r},${g},${b})`;
  }
  const t = (value - 0.5) / 0.5;
  const r = Math.round(128 * (1 - t) + 34 * t);
  const g = Math.round(128 * (1 - t) + 197 * t);
  const b = Math.round(128 * (1 - t) + 94 * t);
  return `rgb(${r},${g},${b})`;
}

/** Short type name for axes */
function shortName(type: string): string {
  const abbrev: Record<string, string> = {
    Developer: 'Dev',
    Investor: 'Inv',
    Trader: 'Trd',
    AdaptiveInvestor: 'AdInv',
    Speculator: 'Spec',
    ProposalCreator: 'Prop',
    GovernanceExpert: 'GovEx',
    GovernanceWhale: 'GovWh',
    Delegator: 'Del',
    LiquidDelegator: 'LqDel',
    Validator: 'Val',
    ServiceProvider: 'Srv',
    BountyHunter: 'Bnty',
    Artist: 'Art',
    Auditor: 'Aud',
    Regulator: 'Reg',
    Arbitrator: 'Arb',
    RiskManager: 'Risk',
    Whistleblower: 'Wstl',
    ExternalPartner: 'ExtP',
    Collector: 'Coll',
    StakerAgent: 'Stk',
    PassiveMember: 'Pass',
    MarketMaker: 'MM',
    RLTrader: 'RLTr',
  };
  return abbrev[type] ?? type.slice(0, 4);
}

export function VotingHeatmap({ agents, proposals }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number; value: number } | null>(null);

  const { types, matrix } = useMemo(() => computeAgreementMatrix(agents), [agents]);

  const CELL_SIZE = 28;
  const LABEL_WIDTH = 40;
  const size = types.length * CELL_SIZE + LABEL_WIDTH;

  // Draw heatmap to canvas
  useEffect(() => {
    if (!canvasRef.current || types.length === 0) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvasRef.current.width = size * dpr;
    canvasRef.current.height = size * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, size, size);

    // Draw cells
    for (let i = 0; i < types.length; i++) {
      for (let j = 0; j < types.length; j++) {
        ctx.fillStyle = agreementColor(matrix[i][j]);
        ctx.fillRect(
          LABEL_WIDTH + j * CELL_SIZE,
          LABEL_WIDTH + i * CELL_SIZE,
          CELL_SIZE - 1,
          CELL_SIZE - 1
        );
      }
    }

    // Draw labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i < types.length; i++) {
      ctx.fillText(
        shortName(types[i]),
        LABEL_WIDTH - 3,
        LABEL_WIDTH + i * CELL_SIZE + CELL_SIZE / 2 + 3
      );
    }

    ctx.textAlign = 'center';
    for (let j = 0; j < types.length; j++) {
      ctx.save();
      ctx.translate(
        LABEL_WIDTH + j * CELL_SIZE + CELL_SIZE / 2,
        LABEL_WIDTH - 3
      );
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(shortName(types[j]), 0, 0);
      ctx.restore();
    }
  }, [types, matrix, size]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = size / rect.width;
    const scaleY = size / rect.height;
    const x = (e.clientX - rect.left) * scaleX - LABEL_WIDTH;
    const y = (e.clientY - rect.top) * scaleY - LABEL_WIDTH;

    if (x < 0 || y < 0) {
      setHoveredCell(null);
      return;
    }

    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);

    if (row >= 0 && row < types.length && col >= 0 && col < types.length) {
      setHoveredCell({ row, col, value: matrix[row][col] });
    } else {
      setHoveredCell(null);
    }
  }, [types, matrix, size]);

  return (
    <div className="px-4 pb-3 relative">
      {types.length > 0 ? (
        <>
          <canvas
            ref={canvasRef}
            style={{ width: Math.min(size, 320), height: Math.min(size, 320) }}
            className="cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredCell(null)}
          />
          {hoveredCell && (
            <div className="absolute top-2 right-4 bg-[var(--sim-surface)] border border-[var(--sim-border)] rounded px-2 py-1 text-[10px] text-[var(--sim-text-secondary)]">
              {shortName(types[hoveredCell.row])} vs {shortName(types[hoveredCell.col])}: {(hoveredCell.value * 100).toFixed(0)}%
            </div>
          )}
          <div className="flex justify-between text-[9px] text-[var(--sim-text-muted)] mt-1">
            <span>Disagree</span>
            <span>Agree</span>
          </div>
        </>
      ) : (
        <div className="text-[10px] text-[var(--sim-text-muted)] text-center">
          No voting data yet
        </div>
      )}
    </div>
  );
}
