'use client';

import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import type { AgentSnapshot, ProposalSnapshot } from '@/lib/browser/worker-protocol';
import { getDisplayName } from '../scene/constants';
import { PRETEXT_FONTS, getPretextTextLayout } from '@/lib/ui/pretext';
import { usePretextReady } from '@/lib/ui/usePretextText';

interface Props {
  agents: AgentSnapshot[];
  proposals: ProposalSnapshot[];
}

const CELL_SIZE = 36;
const SIDE_LABEL_MAX_WIDTH = 86;
const TOP_LABEL_MAX_WIDTH = 94;
const SIDE_LABEL_LINE_HEIGHT = 10;
const TOP_LABEL_LINE_HEIGHT = 11;

/** Compute voting agreement matrix between agent types */
function computeAgreementMatrix(agents: AgentSnapshot[]): {
  types: string[];
  matrix: number[][]; // agreement percentage [row][col]
} {
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

/** Color interpolation: red to gray to green */
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

/** Compact fallback label while fonts load */
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

export function VotingHeatmap({ agents, proposals: _proposals }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pretextReady = usePretextReady();
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number; value: number } | null>(null);

  const { types, matrix } = useMemo(() => computeAgreementMatrix(agents), [agents]);
  const gridSize = types.length * CELL_SIZE;

  const labelLayouts = useMemo(() => {
    if (!pretextReady) return [];

    return types.map((type) => {
      const label = getDisplayName(type);
      return {
        type,
        fullLabel: label,
        side: getPretextTextLayout({
          text: label,
          font: PRETEXT_FONTS.simMono10,
          maxWidth: SIDE_LABEL_MAX_WIDTH,
          lineHeight: SIDE_LABEL_LINE_HEIGHT,
          maxLines: 2,
        }),
        top: getPretextTextLayout({
          text: label,
          font: PRETEXT_FONTS.simMono10,
          maxWidth: TOP_LABEL_MAX_WIDTH,
          lineHeight: TOP_LABEL_LINE_HEIGHT,
          maxLines: 2,
        }),
      };
    });
  }, [pretextReady, types]);

  const sideLabelWidth = useMemo(() => {
    const maxMeasured = labelLayouts.reduce((max, layout) => Math.max(max, layout.side.maxLineWidth), 0);
    return Math.max(72, Math.ceil(maxMeasured) + 14);
  }, [labelLayouts]);

  const topLabelHeight = useMemo(() => {
    const maxLabelHeight = labelLayouts.reduce((max, layout) => Math.max(max, layout.top.height), 0);
    return Math.max(44, Math.ceil(maxLabelHeight) + 18);
  }, [labelLayouts]);
  const fullWidth = sideLabelWidth + gridSize;
  const fullHeight = topLabelHeight + gridSize;
  const displayScale = gridSize > 0 ? Math.min(1, 320 / gridSize) : 1;

  useEffect(() => {
    if (!canvasRef.current || types.length === 0) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvasRef.current.width = gridSize * dpr;
    canvasRef.current.height = gridSize * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, gridSize, gridSize);

    for (let i = 0; i < types.length; i++) {
      for (let j = 0; j < types.length; j++) {
        ctx.fillStyle = agreementColor(matrix[i][j]);
        ctx.fillRect(
          j * CELL_SIZE,
          i * CELL_SIZE,
          CELL_SIZE - 1,
          CELL_SIZE - 1
        );
      }
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= types.length; i++) {
      const offset = i * CELL_SIZE + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, offset);
      ctx.lineTo(gridSize, offset);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(offset, 0);
      ctx.lineTo(offset, gridSize);
      ctx.stroke();
    }
  }, [types, matrix, gridSize]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = gridSize / rect.width;
    const scaleY = gridSize / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);

    if (row >= 0 && row < types.length && col >= 0 && col < types.length) {
      setHoveredCell({ row, col, value: matrix[row][col] });
    } else {
      setHoveredCell(null);
    }
  }, [gridSize, matrix, types]);

  return (
    <div className="px-4 pb-3 relative">
      {types.length > 0 ? (
        <>
          <div
            className="relative inline-block"
            style={{ width: fullWidth * displayScale, height: fullHeight * displayScale }}
          >
            <div
              className="relative"
              style={{
                width: fullWidth,
                height: fullHeight,
                transform: `scale(${displayScale})`,
                transformOrigin: 'top left',
              }}
            >
              {types.map((type, i) => {
                const layout = labelLayouts[i];
                const sideText = layout?.side.displayText ?? shortName(type);

                return (
                  <div
                    key={`${type}-side`}
                    className="absolute flex items-center justify-end pr-2 text-right font-mono text-[9px] leading-tight text-[var(--sim-text-muted)]"
                    style={{
                      top: topLabelHeight + i * CELL_SIZE,
                      left: 0,
                      width: sideLabelWidth,
                      height: CELL_SIZE,
                      whiteSpace: 'pre-line',
                    }}
                    title={layout?.side.truncated ? layout.fullLabel : undefined}
                  >
                    {sideText}
                  </div>
                );
              })}

              {types.map((type, j) => {
                const layout = labelLayouts[j];
                const topText = layout?.top.displayText ?? shortName(type);

                return (
                  <div
                    key={`${type}-top`}
                    className="absolute font-mono text-[9px] leading-tight text-[var(--sim-text-muted)]"
                    style={{
                      left: sideLabelWidth + j * CELL_SIZE + CELL_SIZE / 2,
                      top: topLabelHeight - 4,
                      width: TOP_LABEL_MAX_WIDTH,
                      transform: 'translate(-50%, -100%) rotate(-45deg)',
                      transformOrigin: 'bottom center',
                      textAlign: 'center',
                      whiteSpace: 'pre-line',
                    }}
                    title={layout?.top.truncated ? layout.fullLabel : undefined}
                  >
                    {topText}
                  </div>
                );
              })}

              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute',
                  left: sideLabelWidth,
                  top: topLabelHeight,
                  width: gridSize,
                  height: gridSize,
                }}
                className="cursor-crosshair"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredCell(null)}
              />
            </div>
          </div>

          {hoveredCell && (
            <div className="absolute top-2 right-4 bg-[var(--sim-surface)] border border-[var(--sim-border)] rounded px-2 py-1 text-[10px] text-[var(--sim-text-secondary)]">
              {getDisplayName(types[hoveredCell.row])} vs {getDisplayName(types[hoveredCell.col])}: {(hoveredCell.value * 100).toFixed(0)}%
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
