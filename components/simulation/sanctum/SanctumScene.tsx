'use client';

/**
 * The Living Archive â€” Mucha Ã— Bioluminescent Crystal Cave.
 *
 * A vast underground governance hall inside a crystal cave.
 * Each chamber glows with its own crystal colour: amethyst for
 * Governance, gold for Council, teal for Treasury, aqua for the
 * central Ceremony Hall, amber for the Workshop, and lavender
 * crystal pillars for the Archive Stacks.
 * Art Nouveau Mucha vine borders frame every ledge in gold.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSimulationStore } from '@/lib/browser/simulation-store';
import { useBranchStore } from '@/lib/browser/branch-store';
import type {
  AgentSnapshot,
  ProposalSnapshot,
  SimulationSnapshot,
  SimulationEvent,
} from '@/lib/browser/worker-protocol';
import {
  PALETTE,
  ARCHETYPE_COLOR,
  ARCHETYPE_HALL,
  getArchetype,
} from './palette';
import { getRole } from './roles';
import { Tooltip } from './Tooltip';
import { HelpButton } from './HelpButton';
import { CanvasVisualLayer } from './CanvasVisualLayer';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//   Coordinate constants â€” identical to ship version
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const SL = -440;
const SR =  440;

const A_TOP = -285; const A_BOT = -165;
const B_TOP = -165; const B_BOT = -45;
const C_TOP =  -45; const C_BOT =  85;
const D_TOP =   85; const D_BOT = 195;

const MID = 0;


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//   Cave colour palette
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const CAVE_BG   = '#040210';
const CAVE_MID  = '#0A0422';
const CAVE_WARM = '#120A06';
const CAVE_ROCK = '#1C100A';
const STONE_DK  = '#2A1610';
const STONE_MD  = '#4A2C18';

const CX_GOV    = '#8030E0';
const CX_GOV_G  = '#B068F8';
const CX_COUN   = '#C88018';
const CX_COUN_G = '#F0B830';
const CX_TREA   = '#0898A0';
const CX_TREA_G = '#20D8C0';
const CX_SAL    = '#08B8D8';
const CX_SAL_G  = '#40E8FF';
const CX_CRAF   = '#D86018';
const CX_CRAF_G = '#FF9040';
const CX_PASS   = '#7050B8';
const CX_PASS_G = '#A888E8';
const MG        = '#C49020';
const MG_LT     = '#E8C050';
const ZOOM_MIN   = 0.4;
const ZOOM_MAX   = 5.0;
const SCENE_VISUAL_FPS = 24;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//   Seeded random
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function mkRand(seed: number) {
  let s = seed | 0;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//   SVG defs
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function SceneDefs() {
  return (
    <defs>
      <radialGradient id="caveDepth" cx="50%" cy="40%" r="65%">
        <stop offset="0%" stopColor="#1A0830" />
        <stop offset="55%" stopColor={CAVE_MID} />
        <stop offset="100%" stopColor={CAVE_BG} />
      </radialGradient>

      <radialGradient id="gzGov"  cx="50%" cy="80%" r="70%">
        <stop offset="0%" stopColor={CX_GOV}  stopOpacity="0.20" />
        <stop offset="100%" stopColor={CX_GOV}  stopOpacity="0.0" />
      </radialGradient>
      <radialGradient id="gzCoun" cx="70%" cy="80%" r="70%">
        <stop offset="0%" stopColor={CX_COUN} stopOpacity="0.15" />
        <stop offset="100%" stopColor={CX_COUN} stopOpacity="0.0" />
      </radialGradient>
      <radialGradient id="gzTrea" cx="30%" cy="80%" r="70%">
        <stop offset="0%" stopColor={CX_TREA} stopOpacity="0.15" />
        <stop offset="100%" stopColor={CX_TREA} stopOpacity="0.0" />
      </radialGradient>
      <radialGradient id="gzSal"  cx="50%" cy="50%" r="70%">
        <stop offset="0%" stopColor={CX_SAL}  stopOpacity="0.22" />
        <stop offset="100%" stopColor={CX_SAL}  stopOpacity="0.0" />
      </radialGradient>
      <radialGradient id="gzCraf" cx="70%" cy="30%" r="70%">
        <stop offset="0%" stopColor={CX_CRAF} stopOpacity="0.15" />
        <stop offset="100%" stopColor={CX_CRAF} stopOpacity="0.0" />
      </radialGradient>
      <radialGradient id="gzPass" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor={CX_PASS} stopOpacity="0.15" />
        <stop offset="100%" stopColor={CX_PASS} stopOpacity="0.0" />
      </radialGradient>

      <radialGradient id="altarGlow" cx="50%" cy="55%" r="60%">
        <stop offset="0%" stopColor={CX_SAL_G} stopOpacity="0.60" />
        <stop offset="50%" stopColor={CX_SAL}  stopOpacity="0.22" />
        <stop offset="100%" stopColor={CX_SAL}  stopOpacity="0.0" />
      </radialGradient>

      <radialGradient id="muchaHalo" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stopColor={MG_LT} stopOpacity="0.0"  />
        <stop offset="75%"  stopColor={MG}    stopOpacity="0.25" />
        <stop offset="100%" stopColor={MG}    stopOpacity="0.0"  />
      </radialGradient>

      <linearGradient id="rainDrop" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor={CX_SAL_G} stopOpacity="0.8"  />
        <stop offset="100%" stopColor={CX_GOV}   stopOpacity="0.15" />
      </linearGradient>
      <linearGradient id="proposalQuorum" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={CX_SAL_G} />
        <stop offset="55%" stopColor={MG_LT} />
        <stop offset="100%" stopColor={PALETTE.voteFor} />
      </linearGradient>

      <filter id="softGlow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="5" />
      </filter>
      <filter id="crystalBloom" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="hardGlow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="2.5" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//   Crystal primitives
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function Crystal({
  x, y, h, w, color, dir = 'up', opacity = 1,
}: {
  x: number; y: number; h: number; w: number;
  color: string; dir?: 'up' | 'down'; opacity?: number;
}) {
  const d = dir === 'up' ? -1 : 1;
  const body = [
    [x - w * 0.30, y],
    [x - w * 0.50, y + d * h * 0.30],
    [x - w * 0.36, y + d * h * 0.72],
    [x,            y + d * h],
    [x + w * 0.36, y + d * h * 0.72],
    [x + w * 0.50, y + d * h * 0.30],
    [x + w * 0.30, y],
  ].map(p => p.join(',')).join(' ');

  const highlight = [
    [x - w * 0.30, y],
    [x - w * 0.50, y + d * h * 0.30],
    [x - w * 0.36, y + d * h * 0.72],
    [x,            y + d * h],
    [x - w * 0.08, y + d * h * 0.62],
    [x - w * 0.22, y + d * h * 0.20],
  ].map(p => p.join(',')).join(' ');

  return (
    <g opacity={opacity}>
      <polygon points={body} fill={color} />
      <polygon points={highlight} fill="white" opacity="0.16" />
    </g>
  );
}

function CrystalCluster({
  cx, cy, color, glowColor, seed = 1, scale = 1, dir = 'up',
}: {
  cx: number; cy: number; color: string; glowColor: string;
  seed?: number; scale?: number; dir?: 'up' | 'down';
}) {
  const rand = mkRand(seed);
  const count = 3 + Math.floor(rand() * 3);
  const crystals = Array.from({ length: count }, () => ({
    dx: (rand() - 0.5) * 28 * scale,
    h:  (26 + rand() * 22) * scale,
    w:  (7  + rand() * 9)  * scale,
    op: 0.62 + rand() * 0.38,
  }));

  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={26 * scale} ry={10 * scale}
        fill={glowColor} opacity="0.25" filter="url(#softGlow)" />
      {crystals.map((c, i) => (
        <Crystal key={i}
          x={cx + c.dx} y={cy}
          h={c.h} w={c.w}
          color={color} dir={dir} opacity={c.op}
        />
      ))}
    </g>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//   Mucha Art Nouveau vine
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function MuchaVine({
  x1, x2, y, color = MG, flip = false,
}: {
  x1: number; x2: number; y: number; color?: string; flip?: boolean;
}) {
  const len = x2 - x1;
  const a = flip ? -5 : 5;
  const stem = `M ${x1} ${y} C ${x1 + len * 0.15} ${y + a} ${x1 + len * 0.35} ${y - a} ${x1 + len * 0.5} ${y} S ${x1 + len * 0.85} ${y + a} ${x2} ${y}`;
  const rand = mkRand((Math.abs(x1 + y) % 999) + 1);
  const leafXs = [0.12, 0.28, 0.44, 0.56, 0.72, 0.88].map(f => x1 + len * f);

  return (
    <g opacity="0.72">
      <path d={stem} stroke={color} strokeWidth="0.9" fill="none" />
      {leafXs.map((lx, i) => {
        const up   = i % 2 === 0 ? -1 : 1;
        const ll   = 5 + rand() * 4;
        const ang  = (rand() - 0.5) * 28;
        const rad  = (ang * Math.PI) / 180;
        const tx   = lx + Math.sin(rad) * ll;
        const ty   = y + up * ll + Math.cos(rad) * ll * 0.3;
        return (
          <g key={i}>
            <line x1={lx} y1={y} x2={tx} y2={ty} stroke={color} strokeWidth="0.65" />
            <ellipse cx={tx} cy={ty} rx="2.4" ry="1.3"
              transform={`rotate(${ang + 90}, ${tx}, ${ty})`}
              fill={color} opacity="0.55" />
          </g>
        );
      })}
      {[0.2, 0.5, 0.8].map((f, i) => (
        <circle key={i} cx={x1 + len * f} cy={y + (i % 2 === 0 ? -7 : 7)}
          r="1.7" fill={MG_LT} opacity="0.50" />
      ))}
    </g>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//   Rock ledge
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function RockLedge({
  x1, x2, y, thick = 6, seed = 1, vineColor,
}: {
  x1: number; x2: number; y: number;
  thick?: number; seed?: number; vineColor?: string;
}) {
  const rand = mkRand(seed);
  const steps = 20;
  const len = x2 - x1;
  const top: [number, number][] = Array.from({ length: steps + 1 }, (_, i) => [
    x1 + (i / steps) * len, y + (rand() - 0.5) * 2.8,
  ]);
  const bot: [number, number][] = Array.from({ length: steps + 1 }, (_, i) => [
    x1 + (i / steps) * len, y + thick + (rand() - 0.5) * 1.8,
  ]);
  const pts = [...top, ...[...bot].reverse()].map(p => p.join(',')).join(' ');

  return (
    <g>
      <polygon points={pts} fill={STONE_DK} />
      <polyline points={top.map(p => p.join(',')).join(' ')}
        stroke={STONE_MD} strokeWidth="0.75" fill="none" opacity="0.65" />
      {vineColor && <MuchaVine x1={x1 + 14} x2={x2 - 14} y={y + 1.5} color={vineColor} />}
    </g>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//   Mucha circular halo
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function MuchaHalo({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g opacity="0.52">
      {[1.0, 0.72, 0.46].map((f, i) => (
        <circle key={i} cx={cx} cy={cy} r={r * f}
          fill="none" stroke={MG}
          strokeWidth={i === 0 ? 1.2 : 0.65}
          opacity={0.45 + i * 0.18} />
      ))}
      {Array.from({ length: 12 }).map((_, i) => {
        const ang = (i / 12) * Math.PI * 2;
        return (
          <line key={i}
            x1={cx + Math.cos(ang) * r * 0.48} y1={cy + Math.sin(ang) * r * 0.48}
            x2={cx + Math.cos(ang) * r}         y2={cy + Math.sin(ang) * r}
            stroke={MG_LT} strokeWidth="0.65" opacity="0.42" />
        );
      })}
      <circle cx={cx} cy={cy} r={r} fill="url(#muchaHalo)" />
    </g>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//   Cave background and zone fills
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function CaveBackground() {
  return (
    <g>
      <rect x="-520" y="-340" width="1100" height="730" fill={CAVE_BG} />
      <rect x="-520" y="-340" width="1100" height="730" fill="url(#caveDepth)" opacity="0.65" />
    </g>
  );
}

function CaveZones() {
  return (
    <g>
      <rect x={SL} y={A_TOP} width={SR - SL} height={A_BOT - A_TOP} fill={CAVE_MID} opacity="0.88" />
      <rect x={SL} y={A_TOP} width={SR - SL} height={A_BOT - A_TOP} fill="url(#gzGov)" />

      <rect x={SL}  y={B_TOP} width={MID - SL}  height={B_BOT - B_TOP} fill={CAVE_MID} opacity="0.88" />
      <rect x={SL}  y={B_TOP} width={MID - SL}  height={B_BOT - B_TOP} fill="url(#gzCoun)" />
      <rect x={MID} y={B_TOP} width={SR - MID}  height={B_BOT - B_TOP} fill={CAVE_MID} opacity="0.88" />
      <rect x={MID} y={B_TOP} width={SR - MID}  height={B_BOT - B_TOP} fill="url(#gzTrea)" />

      <rect x={SL} y={C_TOP} width={SR - SL} height={C_BOT - C_TOP} fill={CAVE_MID} opacity="0.88" />
      <rect x={SL} y={C_TOP} width={SR - SL} height={C_BOT - C_TOP} fill="url(#gzSal)" />

      <rect x={SL}  y={D_TOP} width={MID - SL}  height={D_BOT - D_TOP} fill={CAVE_MID} opacity="0.88" />
      <rect x={SL}  y={D_TOP} width={MID - SL}  height={D_BOT - D_TOP} fill="url(#gzCraf)" />
      <rect x={MID} y={D_TOP} width={SR - MID}  height={D_BOT - D_TOP} fill={CAVE_MID} opacity="0.88" />
      <rect x={MID} y={D_TOP} width={SR - MID}  height={D_BOT - D_TOP} fill="url(#gzPass)" />
      <HallIdentityMarks />

      {/* Cave floor */}
      <rect x="-520" y={D_BOT} width="1100" height="200" fill={CAVE_WARM} opacity="0.95" />
      {/* Side walls */}
      <rect x="-520" y={A_TOP} width={SL + 520} height={D_BOT - A_TOP} fill={CAVE_ROCK} />
      <rect x={SR}   y={A_TOP} width="520"       height={D_BOT - A_TOP} fill={CAVE_ROCK} />
    </g>
  );
}

function HallIdentityMarks() {
  const sigils = [
    { x: -360, y: -236, color: CX_GOV_G, label: 'LAW', shape: 'scroll' },
    { x: -360, y: -118, color: CX_COUN_G, label: 'RISK', shape: 'shield' },
    { x:  335, y: -118, color: CX_TREA_G, label: 'FLOW', shape: 'coin' },
    { x: -355, y:  132, color: CX_CRAF_G, label: 'MAKE', shape: 'tool' },
    { x:  330, y:  132, color: CX_PASS_G, label: 'MEM', shape: 'stack' },
  ];

  return (
    <g opacity="0.72">
      {sigils.map(sig => (
        <g key={sig.label} transform={`translate(${sig.x} ${sig.y})`}>
          <circle r="20" fill={sig.color} opacity="0.08" filter="url(#softGlow)" />
          <circle r="15" fill="none" stroke={sig.color} strokeWidth="0.8" opacity="0.55" />
          {sig.shape === 'scroll' && <path d="M-8 -5 H5 Q10 -5 10 0 Q10 5 5 5 H-8 Q-11 5 -11 0 Q-11 -5 -8 -5 Z M-6 -1 H5 M-6 3 H3" stroke={sig.color} strokeWidth="1" fill="none" />}
          {sig.shape === 'shield' && <path d="M0 -10 L9 -6 V2 Q6 9 0 12 Q-6 9 -9 2 V-6 Z" stroke={sig.color} strokeWidth="1" fill="none" />}
          {sig.shape === 'coin' && <g><circle r="9" stroke={sig.color} strokeWidth="1" fill="none" /><path d="M-4 -2 Q0 -5 4 -2 Q0 1 -4 -2 Z M-4 4 Q0 1 4 4" stroke={sig.color} strokeWidth="0.9" fill="none" /></g>}
          {sig.shape === 'tool' && <path d="M-8 7 L7 -8 M4 -11 L10 -5 M-11 4 L-5 10" stroke={sig.color} strokeWidth="1.2" fill="none" />}
          {sig.shape === 'stack' && <path d="M-8 -8 H8 V-4 H-8 Z M-8 -1 H8 V3 H-8 Z M-8 6 H8 V10 H-8 Z" stroke={sig.color} strokeWidth="1" fill="none" />}
          <text x="0" y="27" textAnchor="middle" fontSize="5.5" fontWeight="700" fill={sig.color}
            style={{ fontFamily: 'Georgia, serif', letterSpacing: '0.08em' }}>
            {sig.label}
          </text>
        </g>
      ))}
    </g>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//   Cave structural ledges, ceiling stalactites, pillars
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function CaveLedges() {
  return (
    <g>
      <RockLedge x1={SL} x2={SR} y={A_TOP} thick={5} seed={11} vineColor={CX_GOV} />
      <RockLedge x1={SL} x2={SR} y={A_BOT} thick={5} seed={22} vineColor={MG} />
      <RockLedge x1={SL} x2={SR} y={B_BOT} thick={5} seed={33} vineColor={MG} />
      <RockLedge x1={SL} x2={SR} y={C_BOT} thick={5} seed={44} vineColor={MG} />
      <RockLedge x1={SL} x2={SR} y={D_BOT} thick={5} seed={55} vineColor={CX_CRAF} />

      {/* Vertical dividers â€” crystal pillars at zone B and D mid-splits */}
      <CrystalCluster cx={MID} cy={B_BOT} color={CX_COUN}   glowColor={CX_COUN_G} seed={301} scale={0.85} dir="up"   />
      <CrystalCluster cx={MID} cy={B_TOP} color={CX_TREA}   glowColor={CX_TREA_G} seed={302} scale={0.85} dir="down" />
      <CrystalCluster cx={MID} cy={D_BOT} color={CX_CRAF}   glowColor={CX_CRAF_G} seed={401} scale={0.75} dir="up"   />
      <CrystalCluster cx={MID} cy={D_TOP} color={CX_PASS}   glowColor={CX_PASS_G} seed={402} scale={0.75} dir="down" />
    </g>
  );
}

function CaveCeiling() {
  const stalactites = [
    { cx: -400, scale: 1.0,  color: CX_GOV,  glow: CX_GOV_G,  seed: 101 },
    { cx: -260, scale: 1.2,  color: CX_GOV,  glow: CX_GOV_G,  seed: 103 },
    { cx: -120, scale: 0.9,  color: CX_COUN, glow: CX_COUN_G, seed: 105 },
    { cx:    0, scale: 1.35, color: CX_SAL,  glow: CX_SAL_G,  seed: 107 },
    { cx:  120, scale: 0.9,  color: CX_TREA, glow: CX_TREA_G, seed: 109 },
    { cx:  260, scale: 1.1,  color: CX_GOV,  glow: CX_GOV_G,  seed: 111 },
    { cx:  400, scale: 1.0,  color: CX_GOV,  glow: CX_GOV_G,  seed: 113 },
  ];
  return (
    <g>
      {stalactites.map((s, i) => (
        <CrystalCluster key={i}
          cx={s.cx} cy={A_TOP}
          color={s.color} glowColor={s.glow}
          seed={s.seed} scale={s.scale} dir="down"
        />
      ))}
      <MuchaVine x1={SL + 10} x2={SR - 10} y={A_TOP + 4} color={CX_GOV} />
    </g>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//   Per-hall crystal decorations
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function HallCrystals() {
  return (
    <g>
      {/* Zone A â€” Governance: amethyst columns from floor */}
      {([-390, -280, -150, 0, 150, 280, 390] as number[]).map((x, i) => (
        <CrystalCluster key={`ga${i}`}
          cx={x} cy={A_BOT}
          color={CX_GOV} glowColor={CX_GOV_G}
          seed={200 + i} scale={0.68 + (i % 3) * 0.14}
          dir="up"
        />
      ))}
      <CrystalCluster cx={SL + 8}  cy={A_BOT - 18} color={CX_GOV} glowColor={CX_GOV_G} seed={250} scale={0.55} dir="up" />
      <CrystalCluster cx={SR - 8}  cy={A_BOT - 18} color={CX_GOV} glowColor={CX_GOV_G} seed={251} scale={0.55} dir="up" />

      {/* Zone B-left â€” Council: amber pillars */}
      {([-380, -270, -160, -60] as number[]).map((x, i) => (
        <CrystalCluster key={`gb${i}`}
          cx={x} cy={B_BOT}
          color={CX_COUN} glowColor={CX_COUN_G}
          seed={310 + i} scale={0.62} dir="up"
        />
      ))}

      {/* Zone B-right â€” Treasury: teal spires */}
      {([60, 170, 280, 380] as number[]).map((x, i) => (
        <CrystalCluster key={`tc${i}`}
          cx={x} cy={B_BOT}
          color={CX_TREA} glowColor={CX_TREA_G}
          seed={320 + i} scale={0.62} dir="up"
        />
      ))}

      {/* Zone C â€” Ceremony Hall side formations */}
      <CrystalCluster cx={SL + 18} cy={C_BOT - 22} color={CX_SAL} glowColor={CX_SAL_G} seed={500} scale={0.78} dir="up"   />
      <CrystalCluster cx={SR - 18} cy={C_BOT - 22} color={CX_SAL} glowColor={CX_SAL_G} seed={501} scale={0.78} dir="up"   />
      <CrystalCluster cx={SL + 18} cy={C_TOP + 14} color={CX_SAL} glowColor={CX_SAL_G} seed={502} scale={0.55} dir="down" />
      <CrystalCluster cx={SR - 18} cy={C_TOP + 14} color={CX_SAL} glowColor={CX_SAL_G} seed={503} scale={0.55} dir="down" />

      {/* Zone D-left â€” Craft: amber floor clusters */}
      {([-380, -265, -150, -55] as number[]).map((x, i) => (
        <CrystalCluster key={`df${i}`}
          cx={x} cy={D_BOT}
          color={CX_CRAF} glowColor={CX_CRAF_G}
          seed={410 + i} scale={0.58} dir="up"
        />
      ))}

      {/* Zone D-right â€” Archive Stacks: lavender pillar "shelves" */}
      {([42, 118, 198, 278, 358, 428] as number[]).map((x, i) => (
        <g key={`sp${i}`}>
          <Crystal x={x}      y={D_BOT} h={D_BOT - D_TOP - 12} w={13}
            color={CX_PASS}   dir="up" opacity={0.75 + (i % 3) * 0.07} />
          <Crystal x={x + 10} y={D_BOT} h={(D_BOT - D_TOP - 12) * 0.78} w={9}
            color={CX_PASS_G} dir="up" opacity={0.48} />
          <ellipse cx={x + 5} cy={D_BOT} rx="15" ry="5"
            fill={CX_PASS_G} opacity="0.18" filter="url(#softGlow)" />
        </g>
      ))}
    </g>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//   Crystal altar (ceremony focal point)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function CaveAltar({
  proposal, memberCount, treasury,
}: {
  proposal: ProposalSnapshot | null;
  memberCount: number;
  treasury: number;
}) {
  const cx     = 0;
  const floorY = C_BOT;
  const total  = proposal ? proposal.votesFor + proposal.votesAgainst : 0;
  const forPct = total > 0 && proposal ? proposal.votesFor / total : 0;
  const participation = memberCount > 0 && proposal ? total / memberCount : 0;
  const quorumPct = Math.min(1, participation / 0.2);
  const againstPct = total > 0 && proposal ? proposal.votesAgainst / total : 0;
  const altarH = 58;

  return (
    <g>
      <MuchaHalo cx={cx} cy={C_TOP + 32} r={26} />

      {/* Treasury plaque */}
      <g transform={`translate(-220 ${C_TOP + 22})`}>
        <rect x="-40" y="-11" width="80" height="20" rx="2"
          fill={CAVE_MID} stroke={MG} strokeWidth="0.8" opacity="0.88" />
        <text x="0" y="4" textAnchor="middle" fontSize="7.5" fontWeight="700" fill={MG_LT}
          style={{ fontFamily: 'Georgia, serif' }}>
          {'â—ˆ ' + formatMoney(treasury)}
        </text>
      </g>

      {/* Glow pool */}
      <ellipse cx={cx} cy={floorY} rx="70" ry="20"
        fill={CX_SAL_G} opacity="0.16" filter="url(#softGlow)" />
      <ellipse cx={cx} cy={floorY} rx="95" ry="32"
        fill="url(#altarGlow)" />
      {proposal && (
        <g className={proposal.status === 'voting' || proposal.status === 'open' ? 'proposal-pulse' : undefined}>
          <circle cx={cx} cy={floorY - 42} r="52" fill="none" stroke={CX_SAL_G} strokeWidth="1.2" opacity="0.42" />
          <circle
            cx={cx}
            cy={floorY - 42}
            r="43"
            fill="none"
            stroke={MG_LT}
            strokeWidth="0.8"
            strokeDasharray={`${Math.max(4, quorumPct * 270)} 270`}
            opacity="0.72"
            transform={`rotate(-90 ${cx} ${floorY - 42})`}
          />
        </g>
      )}

      {/* Central altar crystal cluster */}
      <Crystal x={cx}      y={floorY} h={altarH}           w={22} color={CX_SAL}   dir="up" opacity={0.95} />
      <Crystal x={cx - 17} y={floorY} h={altarH * 0.80}    w={16} color={CX_SAL}   dir="up" opacity={0.82} />
      <Crystal x={cx + 17} y={floorY} h={altarH * 0.82}    w={15} color={CX_SAL_G} dir="up" opacity={0.78} />
      <Crystal x={cx - 30} y={floorY} h={altarH * 0.58}    w={11} color={CX_TREA}  dir="up" opacity={0.70} />
      <Crystal x={cx + 30} y={floorY} h={altarH * 0.55}    w={10} color={CX_TREA}  dir="up" opacity={0.68} />
      <Crystal x={cx - 42} y={floorY} h={altarH * 0.38}    w={8}  color={CX_GOV}   dir="up" opacity={0.55} />
      <Crystal x={cx + 42} y={floorY} h={altarH * 0.35}    w={7}  color={CX_GOV}   dir="up" opacity={0.52} />

      {proposal ? (
        <g>
          <g transform={`translate(${cx} ${C_TOP + 9})`}>
            <rect x="-92" y="-15" width="184" height="28" rx="3"
              fill={CAVE_BG} stroke={CX_SAL_G} strokeWidth="0.8" opacity="0.92" />
            <text x="0" y="-4" textAnchor="middle" fontSize="7" fontWeight="700" fill={CX_SAL_G}
              style={{ fontFamily: 'Georgia, serif', letterSpacing: '0.08em' }}>
              ACTIVE PROPOSAL
            </text>
            <text x="0" y="7" textAnchor="middle" fontSize="7.2" fontWeight="700" fill={MG_LT}
              style={{ fontFamily: 'Georgia, serif' }}>
              {proposal.type} Â· s{proposal.creationStep}
            </text>
          </g>
          <polygon
            points={`${cx - 14},${floorY - altarH - 2} ${cx},${floorY - altarH - 4} ${cx},${floorY - altarH - 16} ${cx - 14},${floorY - altarH - 14}`}
            fill="#F0E8D0" stroke={MG} strokeWidth="0.7"
          />
          <polygon
            points={`${cx},${floorY - altarH - 4} ${cx + 14},${floorY - altarH - 2} ${cx + 14},${floorY - altarH - 14} ${cx},${floorY - altarH - 16}`}
            fill="#EDE3CC" stroke={MG} strokeWidth="0.7"
          />
          <text x={cx} y={floorY - altarH - 7} textAnchor="middle" fontSize="8" fontWeight="700"
            fill={CX_SAL} style={{ fontFamily: 'Georgia, serif' }}>
            {proposal.type[0]}
          </text>

          <g transform={`translate(${cx} ${floorY + 6})`}>
            <rect x="-52" y="0" width="104" height="7" rx="2"
              fill={CAVE_MID} stroke={STONE_MD} strokeWidth="0.5" />
            {total > 0 && (
              <>
                <rect x="-52" y="0" width={104 * forPct} height="7" rx="2" fill={PALETTE.voteFor}      />
                <rect x={-52 + 104 * forPct} y="0" width={104 * againstPct} height="7" rx="2" fill={PALETTE.voteAgainst} />
              </>
            )}
            <rect x="-52" y="12" width="104" height="4" rx="1.5" fill={CAVE_MID} stroke={STONE_MD} strokeWidth="0.4" />
            <rect x="-52" y="12" width={104 * quorumPct} height="4" rx="1.5" fill="url(#proposalQuorum)" />
            <text x="0" y="25" textAnchor="middle" fontSize="6" fill={MG}
              style={{ fontFamily: 'Georgia, serif' }}>
              FOR {Math.round(forPct * 100)}% · TURNOUT {Math.round(participation * 100)}% · FUNDS {formatMoney(proposal.fundingGoal)}
            </text>
          </g>
          <title>{`${proposal.status.toUpperCase()} Â· ${proposal.type}\nFOR ${proposal.votesFor} Â· AGAINST ${proposal.votesAgainst}\nFunds: ${formatMoney(proposal.fundingGoal)}`}</title>
        </g>
      ) : (
        <text x={cx} y={floorY - altarH - 8} textAnchor="middle" fontSize="6" fill={MG}
          style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
          the altar awaitsâ€¦
        </text>
      )}
    </g>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//   Room labels
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function RoomLabels() {
  const labels = [
    { x: SL + 10, y: A_TOP + 14, text: 'GOVERNANCE HALL', fill: CX_GOV_G  },
    { x: SL + 10, y: B_TOP + 13, text: 'THE LONG TABLE',  fill: CX_COUN_G },
    { x: MID + 10,y: B_TOP + 13, text: 'THE CAMBIUM',     fill: CX_TREA_G },
    { x: -42,     y: C_TOP + 13, text: 'CEREMONY HALL',   fill: CX_SAL_G  },
    { x: SL + 10, y: D_TOP + 13, text: 'THE WORKSHOP',    fill: CX_CRAF_G },
    { x: MID + 10,y: D_TOP + 13, text: 'THE STACKS',      fill: CX_PASS_G },
  ];
  return (
    <g>
      {labels.map(({ x, y, text, fill }, i) => (
        <text key={i} x={x} y={y} fontSize="7.5" fontWeight="700" fill={fill} opacity="0.62"
          style={{ fontFamily: 'Georgia, "Iowan Old Style", serif', letterSpacing: '0.09em' }}>
          {text}
        </text>
      ))}
    </g>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//   Assembled cave furniture
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function CaveFurniture({
  proposal, memberCount, treasury,
}: {
  proposal: ProposalSnapshot | null;
  memberCount: number;
  treasury: number;
}) {
  return (
    <g>
      <StaticHallCrystals />
      <CaveAltar proposal={proposal} memberCount={memberCount} treasury={treasury} />
    </g>
  );
}

const StaticSceneDefs = memo(SceneDefs);
const StaticCaveBackground = memo(CaveBackground);
const StaticCaveZones = memo(CaveZones);
const StaticCaveLedges = memo(CaveLedges);
const StaticCaveCeiling = memo(CaveCeiling);
const StaticRoomLabels = memo(RoomLabels);
const StaticHallCrystals = memo(HallCrystals);

function getActiveSnapshotFromStore(): SimulationSnapshot | null {
  const state = useSimulationStore.getState();
  if (state.viewingStep === null) return state.snapshot;
  return state.history.find(h => h.step === state.viewingStep) ?? state.snapshot;
}

function useThrottledActiveSnapshot(enabled: boolean, fps: number): SimulationSnapshot | null {
  const [visualSnapshot, setVisualSnapshot] = useState<SimulationSnapshot | null>(() => getActiveSnapshotFromStore());
  const latest = useRef<SimulationSnapshot | null>(visualSnapshot);
  const lastPaint = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    latest.current = getActiveSnapshotFromStore();
    setVisualSnapshot(latest.current);

    const unsubscribe = useSimulationStore.subscribe(() => {
      latest.current = getActiveSnapshotFromStore();
    });

    let raf = 0;
    const frameInterval = 1000 / fps;
    function pump(now: number) {
      if (now - lastPaint.current >= frameInterval) {
        lastPaint.current = now;
        setVisualSnapshot(current => {
          const next = latest.current;
          if (!next || current?.step === next.step) return current;
          return next;
        });
      }
      raf = requestAnimationFrame(pump);
    }
    raf = requestAnimationFrame(pump);

    return () => {
      unsubscribe();
      cancelAnimationFrame(raf);
    };
  }, [enabled, fps]);

  return visualSnapshot;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//   Storm overlay (phosphorescent cave pulse)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//   Creature placement
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//   UI overlays
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function HeaderOverlay({ snap }: { snap: SimulationSnapshot }) {
  const blackSwan = snap.blackSwan.active;
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3"
      style={{ fontFamily: 'Georgia, serif' }}
    >
      <div
        className="pointer-events-auto flex h-8 items-center gap-3 rounded-sm border px-3 text-xs"
        style={{
          background: 'rgba(12,6,28,0.72)',
          borderColor: 'rgba(196,144,32,0.5)',
          color: MG_LT,
          backdropFilter: 'blur(2px)',
          minWidth: 312,
        }}
      >
        <Tooltip content={<>Simulation step â€” each tick advances the Archive by one period.</>}>
          <Chip label="Step" value={snap.step.toLocaleString()} />
        </Tooltip>
        <Tooltip content={<>Stewards gathered in the cave.</>}>
          <Chip label="Stewards" value={snap.memberCount.toString()} />
        </Tooltip>
        <Tooltip content={<>Current token price â€” the Archive's coin of account.</>}>
          <Chip label="Token" value={`$${snap.tokenPrice.toFixed(2)}`} />
        </Tooltip>
        {blackSwan && (
          <Tooltip content={
            <div>
              <strong>{snap.blackSwan.name ?? 'Storm'}</strong>
              <div className="mt-0.5 text-[11px] opacity-80">
                A Black Swan event. Severity {formatPct(snap.blackSwan.severity)}.
              </div>
            </div>
          }>
            <span
              className="inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider animate-pulse"
              style={{ background: PALETTE.blood, color: PALETTE.parchment, borderColor: PALETTE.ink }}
            >
              â›ˆ {snap.blackSwan.name ?? 'Storm'}
            </span>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 cursor-help">
      <span className="text-[10px] uppercase tracking-widest opacity-60">{label}</span>
      <span className="font-bold tabular-nums" style={{ color: MG_LT }}>{value}</span>
    </span>
  );
}

function FireLog({ events }: { events: SimulationEvent[] }) {
  const recent = events.slice(0, 2);
  return (
    <div
      className="pointer-events-auto absolute right-3 bottom-[3.5rem] z-20 rounded-sm border px-2.5 py-1.5 text-[11px] sm:right-4"
      style={{
        width: 300,
        height: 86,
        background: 'rgba(12,6,28,0.72)',
        borderColor: 'rgba(196,144,32,0.42)',
        color: MG_LT,
        fontFamily: 'Georgia, serif',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div className="mb-0.5 flex items-center gap-1">
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M5 1 Q3 4 4 6 Q5 4 5 3 Q6 5 6 6 Q7 4 5 1 Z" fill={CX_SAL_G} />
        </svg>
        <span className="text-[9px] uppercase tracking-widest" style={{ color: CX_SAL_G }}>Cave Chronicle</span>
      </div>
      {recent.length === 0 ? (
        <div className="italic opacity-60">the cave is quietâ€¦</div>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {recent.map((ev, i) => (
            <li key={i} className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-baseline">
              <span className="opacity-50 tabular-nums">s{ev.step}</span>{' '}
              <span className="truncate" style={{
                color:
                  ev.type === 'proposal_approved' ? CX_SAL_G :
                  ev.type === 'proposal_rejected' ? '#F08080' :
                  ev.type === 'black_swan'        ? '#F08080' :
                  ev.type === 'forum_topic'       ? CX_CRAF_G :
                  MG_LT,
              }}>
                {ev.message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PerformanceHud({
  snapshot,
  zoom,
  labelsVisible,
  showDelegations,
  visualStats,
}: {
  snapshot: SimulationSnapshot;
  zoom: number;
  labelsVisible: boolean;
  showDelegations: boolean;
  visualStats: { fullAgents: number; simplifiedAgents: number; culledAgents: number; delegations: number } | null;
}) {
  const [stats, setStats] = useState({ fps: 0, frameMs: 0, simRate: 0 });
  const frameCount = useRef(0);
  const lastFrame = useRef<number | null>(null);
  const lastSample = useRef<number | null>(null);
  const lastStep = useRef(snapshot.step);
  const latestStep = useRef(snapshot.step);

  useEffect(() => {
    latestStep.current = snapshot.step;
  }, [snapshot.step]);

  useEffect(() => {
    let raf = 0;
    function tick(now: number) {
      frameCount.current += 1;
      if (lastFrame.current === null) lastFrame.current = now;
      if (lastSample.current === null) {
        lastSample.current = now;
        lastStep.current = latestStep.current;
      }

      const elapsed = now - lastSample.current;
      if (elapsed >= 500) {
        const fps = frameCount.current / (elapsed / 1000);
        const stepDelta = latestStep.current - lastStep.current;
        setStats({
          fps,
          frameMs: lastFrame.current ? now - lastFrame.current : 0,
          simRate: stepDelta / (elapsed / 1000),
        });
        frameCount.current = 0;
        lastSample.current = now;
        lastStep.current = latestStep.current;
      }
      lastFrame.current = now;
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="pointer-events-none absolute left-3 top-12 z-20 grid grid-cols-2 gap-x-3 gap-y-0.5 rounded-sm border px-2.5 py-1.5 font-mono text-[10px] tabular-nums"
      style={{
        width: 164,
        background: 'rgba(4,2,16,0.72)',
        borderColor: 'rgba(64,232,255,0.35)',
        color: CX_SAL_G,
      }}
    >
      <span className="opacity-60">FPS</span><span className="text-right">{stats.fps.toFixed(0)}</span>
      <span className="opacity-60">Frame</span><span className="text-right">{stats.frameMs.toFixed(1)}ms</span>
      <span className="opacity-60">Sim</span><span className="text-right">{stats.simRate.toFixed(1)} step/s</span>
      <span className="opacity-60">Scene</span><span className="text-right">{snapshot.agents.length} a / {zoom.toFixed(1)}x</span>
      <span className="opacity-60">Draw</span><span className="text-right">{visualStats ? `${visualStats.fullAgents}/${visualStats.simplifiedAgents}` : '--'}</span>
      <span className="opacity-60">Cull</span><span className="text-right">{visualStats ? visualStats.culledAgents : '--'}</span>
      <span className="opacity-60">Layers</span><span className="text-right">{labelsVisible ? 'labels ' : ''}{showDelegations ? 'deleg' : 'base'}</span>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//   Zoom controls
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function ZoomControls({
  zoom,
  onZoom,
  labelsVisible,
  onToggleLabels,
  showDelegations,
  onToggleDelegations,
}: {
  zoom: number;
  onZoom: (z: number) => void;
  labelsVisible: boolean;
  onToggleLabels: () => void;
  showDelegations: boolean;
  onToggleDelegations: () => void;
}) {
  const btn = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 2,
    background: 'rgba(12,6,28,0.88)',
    border: `1.5px solid ${MG}`,
    color: MG_LT,
    cursor: 'pointer',
    fontSize: 14, fontWeight: 700,
    fontFamily: 'Georgia, serif',
    userSelect: 'none' as const,
    transition: 'background 0.1s',
  };
  const miniBtn = { ...btn, width: 42, fontSize: 9, letterSpacing: '0.05em' };
  return (
    <div className="absolute right-3 z-30 flex flex-col gap-1" style={{ bottom: '8.25rem' }} data-ui-interactive>
      <button type="button" style={btn} onClick={() => onZoom(Math.min(ZOOM_MAX, zoom + 0.4))} title="Zoom in"    aria-label="Zoom in">+</button>
      <button type="button" style={btn} onClick={() => onZoom(Math.max(ZOOM_MIN, zoom - 0.4))} title="Zoom out"   aria-label="Zoom out">âˆ’</button>
      {zoom !== 1 && (
        <button type="button" style={{ ...btn, fontSize: 9, letterSpacing: '0.05em' }}
          onClick={() => onZoom(1)} title="Reset zoom" aria-label="Reset zoom">FIT</button>
      )}
      <button
        type="button"
        style={{ ...miniBtn, background: labelsVisible ? 'rgba(64,232,255,0.16)' : 'rgba(12,6,28,0.72)', opacity: labelsVisible ? 1 : 0.78 }}
        onClick={onToggleLabels}
        title="Toggle labels"
        aria-label="Toggle steward labels"
      >
        LAB
      </button>
      <button
        type="button"
        style={{ ...miniBtn, background: showDelegations ? 'rgba(232,192,80,0.16)' : 'rgba(12,6,28,0.72)', opacity: showDelegations ? 1 : 0.78 }}
        onClick={onToggleDelegations}
        title="Toggle delegations"
        aria-label="Toggle delegation overlay"
      >
        DEL
      </button>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//   Timeline scrubber
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function TimelineScrubber() {
  const history        = useSimulationStore(s => s.history);
  const viewingStep    = useSimulationStore(s => s.viewingStep);
  const setViewingStep = useSimulationStore(s => s.setViewingStep);
  const status         = useSimulationStore(s => s.status);
  const pause          = useSimulationStore(s => s.pause);
  const start          = useSimulationStore(s => s.start);
  const annotations    = useSimulationStore(s => s.annotations);
  const branchActive   = useBranchStore(s => s.active);
  const forkStep       = useBranchStore(s => s.forkStep);

  const maxIdx     = Math.max(0, history.length - 1);
  const currentIdx = viewingStep !== null
    ? Math.max(0, history.findIndex(h => h.step === viewingStep))
    : maxIdx;
  const isLive    = viewingStep === null;
  const isRunning = status === 'running';
  const displayStep = isLive ? (history[maxIdx]?.step ?? 0) : viewingStep;
  const minStep = history[0]?.step ?? 0;
  const maxStep = history[maxIdx]?.step ?? minStep;
  const stepSpan = Math.max(1, maxStep - minStep);
  const eventMarkers = useMemo(() => {
    const seen = new Set<string>();
    const markers: Array<SimulationEvent & { sourceStep: number }> = [];
    for (let i = Math.max(0, history.length - 80); i < history.length; i++) {
      const snap = history[i];
      for (const event of snap.recentEvents) {
        const key = `${event.step}:${event.type}:${event.message}`;
        if (seen.has(key)) continue;
        seen.add(key);
        markers.push({ ...event, sourceStep: snap.step });
      }
    }
    return markers.slice(-18);
  }, [history]);
  const currentEvent = useMemo(
    () => eventMarkers.filter(event => event.step <= (displayStep ?? maxStep)).at(-1),
    [displayStep, eventMarkers, maxStep]
  );
  const timelineAnnotations = useMemo(
    () => annotations.filter(a => a.step >= minStep && a.step <= maxStep).slice(-16),
    [annotations, maxStep, minStep]
  );
  const forkPercent = branchActive
    ? Math.min(100, Math.max(0, ((forkStep - minStep) / stepSpan) * 100))
    : null;

  if (history.length === 0) return null;

  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    const idx = parseInt(e.target.value);
    if (idx >= maxIdx) { setViewingStep(null); }
    else { const h = history[idx]; if (h) setViewingStep(h.step); }
  }
  function handleBack() {
    const idx = Math.max(0, currentIdx - 1);
    const h = history[idx]; if (h) setViewingStep(h.step);
  }
  function handleForward() {
    const idx = currentIdx + 1;
    if (idx >= maxIdx) { setViewingStep(null); }
    else { const h = history[idx]; if (h) setViewingStep(h.step); }
  }

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-30 flex items-center gap-2 px-3 py-1.5 border-t"
      style={{
        background: 'rgba(12,6,28,0.96)',
        borderColor: MG,
        fontFamily: 'Georgia, serif',
        height: 46,
        backdropFilter: 'blur(4px)',
      }}
    >
      <button type="button"
        onClick={() => isRunning ? pause() : start()}
        className="flex-shrink-0 flex items-center justify-center rounded border text-sm font-bold"
        style={{ width: 28, height: 28, background: 'rgba(20,10,40,0.9)', borderColor: MG, color: MG_LT }}
        title={isRunning ? 'Pause' : 'Play'}
        aria-label={isRunning ? 'Pause simulation' : 'Play simulation'}
      >
        {isRunning ? 'II' : '>'}
      </button>
      <button type="button" onClick={handleBack} disabled={currentIdx <= 0}
        className="flex-shrink-0 flex items-center justify-center rounded border text-xs font-bold disabled:opacity-30"
        style={{ width: 22, height: 28, background: 'rgba(20,10,40,0.9)', borderColor: MG, color: MG_LT }}
        aria-label="Step back">&lt;</button>
      <div className="relative flex-1 min-w-0 py-3">
        <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full" style={{ background: 'rgba(196,144,32,0.18)' }} />
        {eventMarkers.map((event, idx) => {
          const left = Math.min(100, Math.max(0, ((event.step - minStep) / stepSpan) * 100));
          return (
            <span
              key={`${event.step}-${event.type}-${idx}`}
              className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
              style={{
                left: `${left}%`,
                borderColor: event.type === 'black_swan' ? PALETTE.blood : MG,
                background: event.type === 'black_swan' ? `${PALETTE.blood}cc` : 'rgba(64,232,255,0.75)',
              }}
              title={`s${event.step}: ${event.message}`}
            />
          );
        })}
        {timelineAnnotations.map(annotation => {
          const left = Math.min(100, Math.max(0, ((annotation.step - minStep) / stepSpan) * 100));
          return (
            <span
              key={annotation.id}
              className="absolute top-1/2 h-3 w-1 -translate-x-1/2 -translate-y-1/2 rounded-sm"
              style={{ left: `${left}%`, background: CX_TREA }}
              title={`s${annotation.step}: ${annotation.text}`}
            />
          );
        })}
        {forkPercent !== null && (
          <span
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border"
            style={{ left: `${forkPercent}%`, borderColor: CX_COUN_G, background: 'rgba(232,192,80,0.38)' }}
            title={`Branch forked at s${forkStep}`}
          />
        )}
        <input type="range" min={0} max={maxIdx} value={currentIdx} onChange={handleSlider}
          className="relative z-10 w-full cursor-pointer opacity-80"
          style={{ accentColor: MG }}
          aria-label="Timeline position"
        />
      </div>
      <button type="button" onClick={handleForward} disabled={isLive}
        className="flex-shrink-0 flex items-center justify-center rounded border text-xs font-bold disabled:opacity-30"
        style={{ width: 22, height: 28, background: 'rgba(20,10,40,0.9)', borderColor: MG, color: MG_LT }}
        aria-label="Step forward">&gt;</button>
      <div className="hidden w-44 flex-shrink-0 truncate text-[10px] md:block" style={{ color: MG }}>
        {currentEvent ? `s${currentEvent.step} ${currentEvent.type.replaceAll('_', ' ')}` : 'Replay timeline'}
      </div>
      <div className="flex-shrink-0 flex items-center gap-1.5 text-[11px]" style={{ color: MG, minWidth: '5rem' }}>
        <span className="tabular-nums font-bold" style={{ color: MG_LT }}>s{displayStep}</span>
        {isLive ? (
          <span className="rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider"
            style={{ background: CX_TREA, color: CAVE_BG }}>LIVE</span>
        ) : (
          <button type="button" onClick={() => setViewingStep(null)}
            className="rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider hover:opacity-80"
            style={{ background: MG, color: CAVE_BG, border: 'none', cursor: 'pointer' }}>
            LIVE &gt;
          </button>
        )}
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//   Creature inspector
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function CreatureInspector({
  agent, onClose, currentStep, agents, proposals, onInspectAgent, followedAgentId, onToggleFollow,
}: {
  agent: AgentSnapshot;
  onClose: () => void;
  currentStep: number;
  agents: AgentSnapshot[];
  proposals: ProposalSnapshot[];
  onInspectAgent: (agentId: string) => void;
  followedAgentId: string | null;
  onToggleFollow: (agentId: string) => void;
}) {
  const role      = getRole(agent.type);
  const archetype = getArchetype(agent.type);
  const hallName  = ARCHETYPE_HALL[archetype];
  const hallColor = ARCHETYPE_COLOR[archetype];
  const hasVote   = agent.lastVote !== null;
  const isRecent  = hasVote && currentStep - agent.lastVoteStep < 8;
  const delegators = agents.filter(a => a.delegateTo === agent.id).slice(0, 6);
  const delegateTarget = agent.delegateTo ? agents.find(a => a.id === agent.delegateTo) ?? null : null;
  const activeProposals = proposals
    .filter(p => p.status === 'open' || p.status === 'voting')
    .sort((a, b) => b.creationStep - a.creationStep)
    .slice(0, 3);
  const trend = agent.tokenHistory.length > 1
    ? agent.tokenHistory[agent.tokenHistory.length - 1] - agent.tokenHistory[0]
    : 0;
  const isFollowed = followedAgentId === agent.id;

  function StatBar({ label, value, max = 1, color }: { label: string; value: number; max?: number; color: string }) {
    const pct = Math.min(1, Math.max(0, value / max));
    return (
      <div className="flex items-center gap-2 text-[11px]">
        <span className="w-20 text-right opacity-70" style={{ color: MG }}>{label}</span>
        <div className="flex-1 rounded-sm overflow-hidden" style={{ background: 'rgba(30,15,50,0.8)', height: 6 }}>
          <div style={{ width: `${pct * 100}%`, height: '100%', background: color, borderRadius: 2 }} />
        </div>
        <span className="w-10 tabular-nums" style={{ color: MG_LT }}>
          {value > 1 ? formatMoney(value) : value.toFixed(2)}
        </span>
      </div>
    );
  }

  function TokenSparkline() {
    const values = agent.tokenHistory.length > 1 ? agent.tokenHistory : [agent.tokens, agent.tokens];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1, max - min);
    const points = values.map((value, idx) => {
      const x = values.length === 1 ? 0 : (idx / (values.length - 1)) * 156;
      const y = 34 - ((value - min) / span) * 28;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return (
      <svg width="156" height="40" viewBox="0 0 156 40" aria-label="Token trend" className="mt-1">
        <polyline points={points} fill="none" stroke={trend >= 0 ? CX_TREA_G : PALETTE.blood} strokeWidth="2" />
        <line x1="0" x2="156" y1="35" y2="35" stroke="rgba(196,144,32,0.22)" />
      </svg>
    );
  }

  return (
    <div
      className="absolute right-0 top-0 z-40 flex h-full flex-col border-l overflow-hidden"
      style={{
        width: 208,
        background: 'rgba(8,4,20,0.96)',
        borderColor: MG,
        fontFamily: 'Georgia, serif',
        boxShadow: `-4px 0 16px rgba(0,0,0,0.5)`,
      }}
    >
      <div className="flex items-center justify-between border-b px-3 py-2"
        style={{ borderColor: MG, background: 'rgba(20,10,40,0.9)' }}>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: hallColor }}>{hallName}</div>
          <div className="text-sm font-bold leading-tight" style={{ color: MG_LT }}>{role.name}</div>
        </div>
        <button type="button" onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold hover:opacity-70"
          style={{ background: 'rgba(30,15,50,0.8)', color: MG_LT }}
          aria-label="Close inspector">x</button>
      </div>

      <div className="flex gap-1 border-b px-3 py-2" style={{ borderColor: 'rgba(196,144,32,0.22)' }}>
        <button
          type="button"
          onClick={() => onToggleFollow(agent.id)}
          className="flex-1 rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
          style={{
            borderColor: isFollowed ? hallColor : 'rgba(196,144,32,0.35)',
            background: isFollowed ? `${hallColor}22` : 'rgba(20,10,40,0.65)',
            color: isFollowed ? hallColor : MG,
          }}
        >
          {isFollowed ? 'Following' : 'Follow'}
        </button>
        {delegateTarget && (
          <button
            type="button"
            onClick={() => onInspectAgent(delegateTarget.id)}
            className="flex-1 rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
            style={{ borderColor: 'rgba(196,144,32,0.35)', background: 'rgba(20,10,40,0.65)', color: MG }}
          >
            Delegate
          </button>
        )}
      </div>

      <div className="px-3 pt-2 pb-1.5 text-[11px] italic leading-snug" style={{ color: MG }}>
        "{role.flavor}"
      </div>

      <div className="mx-3 mb-2 rounded-sm border px-2.5 py-1.5 text-xs" style={{
        borderColor: hasVote ? (agent.lastVote ? PALETTE.voteFor : PALETTE.voteAgainst) : 'rgba(196,144,32,0.3)',
        background:  hasVote ? (agent.lastVote ? `${PALETTE.voteFor}18` : `${PALETTE.voteAgainst}18`) : 'rgba(20,10,40,0.5)',
      }}>
        {hasVote ? (
          <span style={{ color: agent.lastVote ? PALETTE.voteFor : PALETTE.voteAgainst }}>
            {agent.lastVote ? 'â–  Voted FOR' : 'â–  Voted AGAINST'}
            {isRecent && <span className="ml-1 opacity-70">(just now)</span>}
          </span>
        ) : (
          <span className="opacity-60" style={{ color: MG }}>â—‹ Not yet voted</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5 px-3 pb-3">
        <div className="mb-0.5 text-[10px] uppercase tracking-widest opacity-60" style={{ color: MG }}>Vitals</div>
        <StatBar label="Tokens"     value={agent.tokens}            max={20000} color={CX_COUN_G} />
        <StatBar label="Reputation" value={agent.reputation}        max={1}     color={CX_TREA_G} />
        <StatBar label="Optimism"   value={agent.optimism}          max={1}     color={CX_SAL_G}  />
        {(agent.voterFatigue ?? 0) > 0 && (
          <StatBar label="Fatigue"  value={agent.voterFatigue ?? 0} max={1}     color={PALETTE.blood} />
        )}
        {agent.stakedTokens > 0 && (
          <StatBar label="Staked"   value={agent.stakedTokens}      max={20000} color={CX_GOV_G}  />
        )}
        <div className="mt-2 mb-0.5 flex items-center justify-between text-[10px] uppercase tracking-widest opacity-60" style={{ color: MG }}>
          <span>Token trend</span>
          <span className="normal-case tracking-normal" style={{ color: trend >= 0 ? CX_TREA_G : PALETTE.blood }}>{trend >= 0 ? '+' : ''}{formatMoney(trend)}</span>
        </div>
        <TokenSparkline />
        <div className="mt-2 mb-0.5 text-[10px] uppercase tracking-widest opacity-60" style={{ color: MG }}>Activity</div>
        <div className="text-[11px] flex justify-between" style={{ color: MG }}>
          <span>Votes cast</span>
          <span className="font-bold tabular-nums" style={{ color: MG_LT }}>{agent.totalVotesCast}</span>
        </div>
        <div className="text-[11px] flex justify-between" style={{ color: MG }}>
          <span>Last vote</span>
          <span className="font-bold tabular-nums" style={{ color: MG_LT }}>{hasVote ? `s${agent.lastVoteStep}` : 'â€”'}</span>
        </div>
        {agent.delegateTo && (
          <div className="text-[11px] flex justify-between" style={{ color: MG }}>
            <span>Delegates to</span>
            <button
              type="button"
              onClick={() => delegateTarget && onInspectAgent(delegateTarget.id)}
              className="font-bold tabular-nums text-right truncate ml-2 hover:underline"
              style={{ color: MG_LT, maxWidth: '5rem' }}
            >
              {agent.delegateTo}
            </button>
          </div>
        )}
        {delegators.length > 0 && (
          <>
            <div className="mt-2 mb-0.5 text-[10px] uppercase tracking-widest opacity-60" style={{ color: MG }}>Delegators</div>
            <div className="flex flex-wrap gap-1">
              {delegators.map(delegator => (
                <button
                  key={delegator.id}
                  type="button"
                  onClick={() => onInspectAgent(delegator.id)}
                  className="max-w-[5.5rem] truncate rounded-sm border px-1.5 py-0.5 text-[10px]"
                  style={{ borderColor: 'rgba(196,144,32,0.35)', color: MG_LT }}
                  title={delegator.id}
                >
                  {delegator.id}
                </button>
              ))}
            </div>
          </>
        )}
        {activeProposals.length > 0 && (
          <>
            <div className="mt-2 mb-0.5 text-[10px] uppercase tracking-widest opacity-60" style={{ color: MG }}>Live proposals</div>
            <div className="space-y-1">
              {activeProposals.map(proposal => {
                const total = Math.max(1, proposal.votesFor + proposal.votesAgainst);
                return (
                  <div key={proposal.id} className="rounded-sm border px-2 py-1" style={{ borderColor: 'rgba(196,144,32,0.25)' }}>
                    <div className="flex justify-between gap-2 text-[10px]" style={{ color: MG }}>
                      <span className="truncate">{proposal.type}</span>
                      <span>s{proposal.creationStep}</span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-sm" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <div style={{ width: `${(proposal.votesFor / total) * 100}%`, height: '100%', background: PALETTE.voteFor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="mt-auto border-t px-3 py-2" style={{ borderColor: 'rgba(196,144,32,0.3)' }}>
        <span className="rounded-sm border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest"
          style={{ background: `${hallColor}22`, borderColor: hallColor, color: hallColor }}>
          {agent.type}
        </span>
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//   Utils
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function formatMoney(n: number): string {
  if (!Number.isFinite(n)) return 'â€”';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n.toFixed(0)}`;
}
function formatPct(n: number): string {
  if (!Number.isFinite(n)) return 'â€”';
  return `${(n * 100).toFixed(0)}%`;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//   Root component
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export interface SanctumSceneProps {
  snapshot?: SimulationSnapshot | null;
}

export function SanctumScene({ snapshot: snapshotProp }: SanctumSceneProps = {}) {
  const isPreview = snapshotProp !== undefined;
  const liveSnapshot = useThrottledActiveSnapshot(!isPreview, SCENE_VISUAL_FPS);
  const targetHall = useSimulationStore(s => s.targetFloor);
  const snapshot  = isPreview ? snapshotProp : liveSnapshot;

  // â”€â”€ Zoom / pan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan]   = useState({ x: 0, y: 0 });
  const [labelsVisible, setLabelsVisible] = useState(false);
  const [showDelegations, setShowDelegations] = useState(false);
  const [visualStats, setVisualStats] = useState<{
    fullAgents: number;
    simplifiedAgents: number;
    culledAgents: number;
    delegations: number;
  } | null>(null);
  const dragStart       = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const lastTouchDist   = useRef<number | null>(null);
  const containerRef    = useRef<HTMLDivElement>(null);
  const pendingPan      = useRef<{ x: number; y: number } | null>(null);
  const panFrame        = useRef<number | null>(null);

  useEffect(() => {
    if (!targetHall) return;
    const hallView: Record<string, { x: number; y: number; z: number }> = {
      market: { x: 180, y: -135, z: 2.15 },
      governance: { x: 0, y: 300, z: 2.15 },
      workshop: { x: 180, y: -300, z: 2.15 },
      council: { x: -180, y: 105, z: 2.15 },
      observatory: { x: -180, y: -300, z: 2.15 },
    };
    const next = hallView[targetHall];
    if (!next) return;
    setZoom(next.z);
    setPan({ x: next.x, y: next.y });
  }, [targetHall]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z * (e.deltaY < 0 ? 1.12 : 0.89))));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('button,input,select,textarea,a,[data-ui-interactive]')) return;
    if (zoom <= 1) return;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragStart.current) return;
    pendingPan.current = {
      x: dragStart.current.px + e.clientX - dragStart.current.mx,
      y: dragStart.current.py + e.clientY - dragStart.current.my,
    };
    if (panFrame.current !== null) return;
    panFrame.current = requestAnimationFrame(() => {
      panFrame.current = null;
      if (pendingPan.current) setPan(pendingPan.current);
    });
  }, []);

  const handleMouseUp = useCallback(() => { dragStart.current = null; }, []);

  useEffect(() => {
    return () => {
      if (panFrame.current !== null) cancelAnimationFrame(panFrame.current);
    };
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.hypot(dx, dy);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      e.preventDefault();
      const dx   = e.touches[0].clientX - e.touches[1].clientX;
      const dy   = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      setZoom(z => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z * dist / lastTouchDist.current!)));
      lastTouchDist.current = dist;
    }
  }, []);

  const handleTouchEnd = useCallback(() => { lastTouchDist.current = null; }, []);

  // â”€â”€ Ceremony tracking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [ceremonies, setCeremonies] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (!snapshot) return;
    const cs = snapshot.step;
    setCeremonies(prev => {
      let changed = false;
      const next = new Map(prev);
      for (const a of snapshot.agents) {
        if (a.lastVoteStep === cs && !next.has(a.id)) { next.set(a.id, cs); changed = true; }
      }
      for (const [id, step] of next) {
        if (cs - step > 2) { next.delete(id); changed = true; }
      }
      return changed ? next : prev;
    });
  }, [snapshot]);

  // â”€â”€ Crystal-shelving (replaces book-shelving) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [shelving, setShelving] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!snapshot) return;
    if (snapshot.step % 7 !== 0) return;
    const beavers = snapshot.agents.filter(a => getArchetype(a.type) === 'craft').map(a => a.id);
    if (beavers.length === 0) return;
    const idx1 = snapshot.step % beavers.length;
    const idx2 = (snapshot.step + 2) % beavers.length;
    setShelving(new Set([beavers[idx1], beavers[idx2 !== idx1 ? idx2 : (idx1 + 1) % beavers.length]]));
    const t = setTimeout(() => setShelving(new Set()), 1800);
    return () => clearTimeout(t);
  }, [snapshot]);

  // â”€â”€ Inspector â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [inspectedAgentId, setInspectedAgentId] = useState<string | null>(null);
  const [followedAgentId, setFollowedAgentId] = useState<string | null>(null);
  const inspectedAgent = snapshot?.agents.find(a => a.id === inspectedAgentId) ?? null;

  useEffect(() => {
    if (!inspectedAgentId || !snapshot) return;
    if (!snapshot.agents.find(a => a.id === inspectedAgentId)) setInspectedAgentId(null);
  }, [snapshot, inspectedAgentId]);

  useEffect(() => {
    if (!followedAgentId || !snapshot) return;
    if (snapshot.agents.find(a => a.id === followedAgentId)) {
      setInspectedAgentId(followedAgentId);
    } else {
      setFollowedAgentId(null);
    }
  }, [followedAgentId, snapshot]);

  const activeProposal = snapshot
    ? (snapshot.proposals.find(p => p.status === 'open' || p.status === 'voting')
       ?? snapshot.proposals[snapshot.proposals.length - 1]
       ?? null)
    : null;

  // â”€â”€ Null state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!snapshot) {
    return (
      <div className="flex h-full items-center justify-center"
        style={{ background: CAVE_BG, color: MG }}>
        <p className="text-sm italic opacity-70" style={{ fontFamily: 'Georgia, serif' }}>
          The cave is silentâ€¦
        </p>
      </div>
    );
  }

  const isDragging = zoom > 1;

  return (
    <div
      data-scene="sanctum"
      className="relative h-full w-full overflow-hidden select-none"
      ref={containerRef}
      style={{
        fontFamily: 'Georgia, serif',
        background: CAVE_BG,
        cursor: isDragging && dragStart.current ? 'grabbing' : isDragging ? 'grab' : 'default',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Zoomable scene wrapper */}
      <div
        style={{
          position: 'absolute', inset: 0,
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
      >
        {/* Main cave scene SVG */}
        <svg
          aria-label="Cross-section of the Living Archive cave â€” crystal chambers of steward halls"
          className="absolute inset-0 h-full w-full"
          viewBox="-500 -320 1000 640"
          preserveAspectRatio="xMidYMid meet"
        >
          <StaticSceneDefs />

          {/* Cave â€” back-to-front render order */}
          <StaticCaveBackground />
          <StaticCaveZones />
          <CaveFurniture
            proposal={activeProposal}
            memberCount={snapshot.memberCount}
            treasury={snapshot.treasuryFunds}
          />
          <StaticCaveLedges />
          <StaticCaveCeiling />
          <StaticRoomLabels />
        </svg>
        <CanvasVisualLayer
          snapshot={snapshot}
          ceremonies={ceremonies}
          shelving={shelving}
          selectedAgentId={inspectedAgentId}
          labelsVisible={labelsVisible}
          showDelegations={showDelegations}
          zoom={zoom}
          pan={pan}
          onInspectAgent={agentId => setInspectedAgentId(id => id === agentId ? null : agentId)}
          onVisualStats={setVisualStats}
        />
      </div>

      {/* HTML overlays â€” outside zoom wrapper so they stay crisp */}
      <HeaderOverlay snap={snapshot} />
      <PerformanceHud
        snapshot={snapshot}
        zoom={zoom}
        labelsVisible={labelsVisible}
        showDelegations={showDelegations}
        visualStats={visualStats}
      />
      <FireLog events={snapshot.recentEvents} />
      <ZoomControls
        zoom={zoom}
        onZoom={z => { setZoom(z); if (z === 1) setPan({ x: 0, y: 0 }); }}
        labelsVisible={labelsVisible}
        onToggleLabels={() => setLabelsVisible(v => !v)}
        showDelegations={showDelegations}
        onToggleDelegations={() => setShowDelegations(v => !v)}
      />
      <HelpButton />

      {inspectedAgent && (
        <CreatureInspector
          agent={inspectedAgent}
          onClose={() => {
            setInspectedAgentId(null);
            setFollowedAgentId(null);
          }}
          currentStep={snapshot.step}
          agents={snapshot.agents}
          proposals={snapshot.proposals}
          onInspectAgent={setInspectedAgentId}
          followedAgentId={followedAgentId}
          onToggleFollow={agentId => setFollowedAgentId(current => current === agentId ? null : agentId)}
        />
      )}

      {!isPreview && <TimelineScrubber />}

      {/* Animations */}
      <style jsx global>{`
        @keyframes creature-breath-kf {
          0%,100% { transform: translateY(0) scaleY(1); }
          50%      { transform: translateY(-0.7px) scaleY(1.016); }
        }
        .creature-breath {
          animation: creature-breath-kf 3.5s ease-in-out infinite;
          will-change: transform;
        }
        @keyframes creature-walk-kf {
          0%   { transform: translateY(0) rotate(0deg) scaleY(1); }
          20%  { transform: translateY(-3px) rotate(-5deg) scaleY(1.02); }
          40%  { transform: translateY(-0.5px) rotate(2deg) scaleY(0.99); }
          60%  { transform: translateY(-3px) rotate(-3deg) scaleY(1.02); }
          80%  { transform: translateY(-1px) rotate(4deg) scaleY(0.99); }
          100% { transform: translateY(0) rotate(0deg) scaleY(1); }
        }
        .creature-walk {
          animation: creature-walk-kf 0.48s ease-in-out 4;
          will-change: transform;
        }
        @keyframes ceremony-glow-kf {
          0%,100% { opacity: 0.4; }
          50%     { opacity: 0.65; }
        }
        .ceremony-glow { animation: ceremony-glow-kf 0.7s ease-in-out infinite; }

        @keyframes proposal-pulse-kf {
          0%,100% { opacity: 0.72; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.035); }
        }
        .proposal-pulse {
          animation: proposal-pulse-kf 2.4s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }

        @keyframes event-pulse-ring-kf {
          0% { opacity: 0.9; transform: scale(0.72); }
          100% { opacity: 0; transform: scale(1.7); }
        }
        .event-pulse-ring {
          animation: event-pulse-ring-kf 1.4s ease-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }

        .delegation-overlay path {
          vector-effect: non-scaling-stroke;
        }

        @keyframes rain-fall-kf {
          0%   { transform: translateY(0px);  opacity: 0.6; }
          100% { transform: translateY(750px); opacity: 0.1; }
        }
        .rain-drop { animation: rain-fall-kf 0.5s linear infinite; }

        @keyframes storm-tint-kf {
          0%,100% { opacity: 0.1; }
          50%     { opacity: 0.18; }
        }
        .storm-tint { animation: storm-tint-kf 3s ease-in-out infinite; }

        @keyframes lightning-kf {
          0%,88%,100% { opacity: 0; }
          90%  { opacity: 0.22; }
          92%  { opacity: 0; }
          94%  { opacity: 0.15; }
          96%  { opacity: 0; }
        }
        .lightning-flash { animation: lightning-kf 5s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .creature-breath, .creature-walk, .ceremony-glow,
          .proposal-pulse, .event-pulse-ring,
          .rain-drop, .storm-tint, .lightning-flash { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
