'use client';

/**
 * The Living Archive — Mucha × Bioluminescent Crystal Cave.
 *
 * A vast underground governance hall inside a crystal cave.
 * Each chamber glows with its own crystal colour: amethyst for
 * Governance, gold for Council, teal for Treasury, aqua for the
 * central Ceremony Hall, amber for the Workshop, and lavender
 * crystal pillars for the Archive Stacks.
 * Art Nouveau Mucha vine borders frame every ledge in gold.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useActiveSnapshot } from '@/lib/browser/useActiveSnapshot';
import { useSimulationStore } from '@/lib/browser/simulation-store';
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
  type Archetype,
} from './palette';
import { getRole } from './roles';
import { Tooltip } from './Tooltip';
import { HelpButton } from './HelpButton';
import { Creature } from './Creatures';

// ═══════════════════════════════════════════════════════════════════
//   Coordinate constants — identical to ship version
// ═══════════════════════════════════════════════════════════════════

const SL = -440;
const SR =  440;

const A_TOP = -285; const A_BOT = -165;
const B_TOP = -165; const B_BOT = -45;
const C_TOP =  -45; const C_BOT =  85;
const D_TOP =   85; const D_BOT = 195;

const HULL_TOP = D_BOT;
const HULL_BOT = 238;

const MID = 0;

const CY_A = A_BOT - 42;
const CY_B = B_BOT - 42;
const CY_C = C_BOT - 42;
const CY_D = D_BOT - 42;

const LECTERN_POS: [number, number]      = [0, CY_C];
const SHELF_TARGET_POS: [number, number] = [340, CY_D];

const ROOM_STATIONS: Record<Archetype, Array<[number, number]>> = {
  governance: [
    [-390, CY_A], [-310, CY_A], [-230, CY_A], [-150, CY_A], [-70, CY_A],
    [  10, CY_A], [  90, CY_A], [ 170, CY_A], [ 250, CY_A], [ 330, CY_A],
    [ 410, CY_A], [-350, CY_A], [ 130, CY_A],
  ],
  council: [
    [-415, CY_B], [-345, CY_B], [-275, CY_B], [-205, CY_B], [-135, CY_B],
    [ -65, CY_B], [ -25, CY_B], [-380, CY_B], [-170, CY_B],
  ],
  treasury: [
    [  25, CY_B], [  95, CY_B], [ 165, CY_B], [ 235, CY_B], [ 305, CY_B],
    [ 375, CY_B], [  60, CY_B], [ 200, CY_B], [ 340, CY_B],
  ],
  craft: [
    [-415, CY_D], [-345, CY_D], [-275, CY_D], [-205, CY_D], [-135, CY_D],
    [ -65, CY_D], [ -25, CY_D], [-380, CY_D], [-170, CY_D],
  ],
  passive: [
    [  25, CY_D], [ 105, CY_D], [ 185, CY_D], [ 265, CY_D], [ 345, CY_D],
    [ 415, CY_D], [  65, CY_D], [ 225, CY_D], [ 385, CY_D],
  ],
};

// ═══════════════════════════════════════════════════════════════════
//   Cave colour palette
// ═══════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════
//   Seeded random
// ═══════════════════════════════════════════════════════════════════

function mkRand(seed: number) {
  let s = seed | 0;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

// ═══════════════════════════════════════════════════════════════════
//   SVG defs
// ═══════════════════════════════════════════════════════════════════

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

      <filter id="softGlow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="5" />
      </filter>
      <filter id="crystalBloom" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
  );
}

// ═══════════════════════════════════════════════════════════════════
//   Crystal primitives
// ═══════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════
//   Mucha Art Nouveau vine
// ═══════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════
//   Rock ledge
// ═══════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════
//   Mucha circular halo
// ═══════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════
//   Cave background and zone fills
// ═══════════════════════════════════════════════════════════════════

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

      {/* Cave floor */}
      <rect x="-520" y={D_BOT} width="1100" height="200" fill={CAVE_WARM} opacity="0.95" />
      {/* Side walls */}
      <rect x="-520" y={A_TOP} width={SL + 520} height={D_BOT - A_TOP} fill={CAVE_ROCK} />
      <rect x={SR}   y={A_TOP} width="520"       height={D_BOT - A_TOP} fill={CAVE_ROCK} />
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════════
//   Cave structural ledges, ceiling stalactites, pillars
// ═══════════════════════════════════════════════════════════════════

function CaveLedges() {
  return (
    <g>
      <RockLedge x1={SL} x2={SR} y={A_TOP} thick={5} seed={11} vineColor={CX_GOV} />
      <RockLedge x1={SL} x2={SR} y={A_BOT} thick={5} seed={22} vineColor={MG} />
      <RockLedge x1={SL} x2={SR} y={B_BOT} thick={5} seed={33} vineColor={MG} />
      <RockLedge x1={SL} x2={SR} y={C_BOT} thick={5} seed={44} vineColor={MG} />
      <RockLedge x1={SL} x2={SR} y={D_BOT} thick={5} seed={55} vineColor={CX_CRAF} />

      {/* Vertical dividers — crystal pillars at zone B and D mid-splits */}
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

// ═══════════════════════════════════════════════════════════════════
//   Per-hall crystal decorations
// ═══════════════════════════════════════════════════════════════════

function HallCrystals() {
  return (
    <g>
      {/* Zone A — Governance: amethyst columns from floor */}
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

      {/* Zone B-left — Council: amber pillars */}
      {([-380, -270, -160, -60] as number[]).map((x, i) => (
        <CrystalCluster key={`gb${i}`}
          cx={x} cy={B_BOT}
          color={CX_COUN} glowColor={CX_COUN_G}
          seed={310 + i} scale={0.62} dir="up"
        />
      ))}

      {/* Zone B-right — Treasury: teal spires */}
      {([60, 170, 280, 380] as number[]).map((x, i) => (
        <CrystalCluster key={`tc${i}`}
          cx={x} cy={B_BOT}
          color={CX_TREA} glowColor={CX_TREA_G}
          seed={320 + i} scale={0.62} dir="up"
        />
      ))}

      {/* Zone C — Ceremony Hall side formations */}
      <CrystalCluster cx={SL + 18} cy={C_BOT - 22} color={CX_SAL} glowColor={CX_SAL_G} seed={500} scale={0.78} dir="up"   />
      <CrystalCluster cx={SR - 18} cy={C_BOT - 22} color={CX_SAL} glowColor={CX_SAL_G} seed={501} scale={0.78} dir="up"   />
      <CrystalCluster cx={SL + 18} cy={C_TOP + 14} color={CX_SAL} glowColor={CX_SAL_G} seed={502} scale={0.55} dir="down" />
      <CrystalCluster cx={SR - 18} cy={C_TOP + 14} color={CX_SAL} glowColor={CX_SAL_G} seed={503} scale={0.55} dir="down" />

      {/* Zone D-left — Craft: amber floor clusters */}
      {([-380, -265, -150, -55] as number[]).map((x, i) => (
        <CrystalCluster key={`df${i}`}
          cx={x} cy={D_BOT}
          color={CX_CRAF} glowColor={CX_CRAF_G}
          seed={410 + i} scale={0.58} dir="up"
        />
      ))}

      {/* Zone D-right — Archive Stacks: lavender pillar "shelves" */}
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

// ═══════════════════════════════════════════════════════════════════
//   Crystal altar (ceremony focal point)
// ═══════════════════════════════════════════════════════════════════

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
          {'◈ ' + formatMoney(treasury)}
        </text>
      </g>

      {/* Glow pool */}
      <ellipse cx={cx} cy={floorY} rx="70" ry="20"
        fill={CX_SAL_G} opacity="0.16" filter="url(#softGlow)" />
      <ellipse cx={cx} cy={floorY} rx="95" ry="32"
        fill="url(#altarGlow)" />

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
            <rect x="-34" y="0" width="68" height="5" rx="1.5"
              fill={CAVE_MID} stroke={STONE_MD} strokeWidth="0.5" />
            {total > 0 && (
              <>
                <rect x="-34"            y="0" width={68 * forPct}       height="5" rx="1.5" fill={PALETTE.voteFor}      />
                <rect x={-34 + 68 * forPct} y="0" width={68 * (1 - forPct)} height="5" rx="1.5" fill={PALETTE.voteAgainst} />
              </>
            )}
            <text x="0" y="16" textAnchor="middle" fontSize="5.5" fill={MG}
              style={{ fontFamily: 'Georgia, serif' }}>
              {proposal.type} · {Math.round(participation * 100)}% turnout
            </text>
          </g>
          <title>{`${proposal.status.toUpperCase()} · ${proposal.type}\nFOR ${proposal.votesFor} · AGAINST ${proposal.votesAgainst}\nFunds: ${formatMoney(proposal.fundingGoal)}`}</title>
        </g>
      ) : (
        <text x={cx} y={floorY - altarH - 8} textAnchor="middle" fontSize="6" fill={MG}
          style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
          the altar awaits…
        </text>
      )}
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════════
//   Room labels
// ═══════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════
//   Assembled cave furniture
// ═══════════════════════════════════════════════════════════════════

function CaveFurniture({
  proposal, memberCount, treasury,
}: {
  proposal: ProposalSnapshot | null;
  memberCount: number;
  treasury: number;
}) {
  return (
    <g>
      <HallCrystals />
      <CaveAltar proposal={proposal} memberCount={memberCount} treasury={treasury} />
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════════
//   Storm overlay (phosphorescent cave pulse)
// ═══════════════════════════════════════════════════════════════════

const RAIN_DROPS = (() => {
  const drops: Array<{ x: number; delay: number; dur: number; len: number }> = [];
  let s = 77;
  const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < 65; i++) {
    drops.push({ x: r() * 1100 - 550, delay: r() * 2.2, dur: 0.35 + r() * 0.25, len: 10 + r() * 14 });
  }
  return drops;
})();

function RainOverlay({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <g aria-hidden="true">
      <rect x="-520" y="-320" width="1100" height="700"
        fill={CX_GOV} opacity="0.14" className="storm-tint" />
      {RAIN_DROPS.map((d, i) => (
        <line key={i} className="rain-drop"
          x1={d.x} y1="-320"
          x2={d.x - d.len * 0.35} y2={-320 + d.len}
          stroke="url(#rainDrop)" strokeWidth="0.8" opacity="0.55"
          style={{ animationDelay: `${d.delay}s`, animationDuration: `${d.dur}s` }}
        />
      ))}
      <rect x="-520" y="-320" width="1100" height="700"
        fill={CX_SAL_G} opacity="0" className="lightning-flash" />
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════════
//   Creature placement
// ═══════════════════════════════════════════════════════════════════

interface Placement {
  agent: AgentSnapshot;
  x: number;
  y: number;
  ty: number;
  idx: number;
}

function placeCreatures(
  agents: AgentSnapshot[],
  ceremonies: Map<string, number>,
  shelving: Set<string>,
  currentStep: number,
): Placement[] {
  const grouped: Record<Archetype, AgentSnapshot[]> = {
    governance: [], treasury: [], craft: [], council: [], passive: [],
  };
  for (const a of agents) grouped[getArchetype(a.type)].push(a);

  const placements: Placement[] = [];
  for (const arch of ['governance', 'council', 'treasury', 'craft', 'passive'] as Archetype[]) {
    const bucket   = grouped[arch];
    const stations = ROOM_STATIONS[arch];
    bucket.forEach((agent, i) => {
      let [x, y] = stations[i % stations.length];

      const ceremonyStep = ceremonies.get(agent.id);
      if (ceremonyStep !== undefined && currentStep - ceremonyStep <= 1) {
        const [lx, ly] = LECTERN_POS;
        const jCode = agent.id.charCodeAt(agent.id.length - 1);
        x = lx + ((jCode % 9) - 4) * 30;
        y = ly + ((jCode % 3) - 1) * 10;
      }

      if (shelving.has(agent.id)) {
        const [sx, sy] = SHELF_TARGET_POS;
        const jCode = agent.id.charCodeAt(0);
        x = sx + ((jCode % 5) - 2) * 18;
        y = sy + ((jCode % 3) - 1) * 5;
      }

      const seed    = (agent.id.length * 7 + i * 13) % 997;
      const jitterX = ((seed % 7) - 3) * 5;
      const jitterY = ((seed % 5) - 2) * 3;
      placements.push({ agent, x: x + jitterX, y: y + jitterY, ty: y + jitterY, idx: i });
    });
  }
  return placements;
}

function computeRibbonOffsets(placements: Placement[]): Map<string, number> {
  const offsets = new Map<string, number>();
  const sorted  = [...placements].sort((a, b) => a.ty - b.ty || a.x - b.x);

  type Placed = { x: number; ribY: number; rw: number; agentId: string };
  const placed: Placed[] = [];

  for (const p of sorted) {
    const rw = Math.max(46, Math.min(110, getRole(p.agent.type).name.length * 5.0));
    let offsetY = 0;
    for (let attempt = 0; attempt < 6; attempt++) {
      let overlaps  = false;
      const thisRibY = p.y - 18 + offsetY;
      for (const q of placed) {
        const dx = Math.abs(p.x - q.x);
        const dy = Math.abs(thisRibY - q.ribY);
        if (dx < (rw + q.rw) / 2 + 4 && dy < 13) { overlaps = true; break; }
      }
      if (!overlaps) break;
      offsetY -= 14;
    }
    placed.push({ x: p.x, ribY: p.y - 18 + offsetY, rw, agentId: p.agent.id });
    offsets.set(p.agent.id, offsetY);
  }
  return offsets;
}

// ═══════════════════════════════════════════════════════════════════
//   UI overlays
// ═══════════════════════════════════════════════════════════════════

function HeaderOverlay({ snap }: { snap: SimulationSnapshot }) {
  const blackSwan = snap.blackSwan.active;
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-4"
      style={{ fontFamily: 'Georgia, serif' }}
    >
      <div
        className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-sm border px-3 py-1.5 text-xs sm:text-sm"
        style={{
          background: 'rgba(12,6,28,0.88)',
          borderColor: MG,
          color: MG_LT,
          backdropFilter: 'blur(2px)',
        }}
      >
        <Tooltip content={<>Simulation step — each tick advances the Archive by one period.</>}>
          <Chip label="Step" value={snap.step.toLocaleString()} />
        </Tooltip>
        <Tooltip content={<>Stewards gathered in the cave.</>}>
          <Chip label="Stewards" value={snap.memberCount.toString()} />
        </Tooltip>
        <Tooltip content={<>Current token price — the Archive's coin of account.</>}>
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
              ⛈ {snap.blackSwan.name ?? 'Storm'}
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

function LegendOverlay() {
  return (
    <div
      className="pointer-events-auto absolute left-3 bottom-[3.5rem] z-20 rounded-sm border px-2.5 py-1.5 text-[10px] sm:left-4"
      style={{
        background: 'rgba(12,6,28,0.88)',
        borderColor: MG,
        color: MG_LT,
        fontFamily: 'Georgia, serif',
        backdropFilter: 'blur(2px)',
      }}
    >
      <Tooltip
        content={
          <div>
            <strong>How to read the scene</strong>
            <div className="mt-1 text-[11px]">
              Each creature is a steward. A small <strong>banner</strong> in their paw shows their vote:
              terracotta FOR, indigo AGAINST. Click any creature to inspect it.
            </div>
          </div>
        }
      >
        <div className="flex items-center gap-2 cursor-help">
          <span className="inline-flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect x="1" y="1" width="8" height="7" fill={PALETTE.voteFor} stroke={MG} strokeWidth="0.5" />
            </svg>
            <span>FOR</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect x="1" y="1" width="8" height="7" fill={PALETTE.voteAgainst} stroke={MG} strokeWidth="0.5" />
            </svg>
            <span>AGAINST</span>
          </span>
          <span className="opacity-75">· no flag = unvoted</span>
        </div>
      </Tooltip>
    </div>
  );
}

function FireLog({ events }: { events: SimulationEvent[] }) {
  const recent = events.slice(0, 3);
  return (
    <div
      className="pointer-events-auto absolute right-3 bottom-[3.5rem] z-20 max-w-[min(300px,46vw)] rounded-sm border px-2.5 py-1.5 text-[11px] sm:right-4"
      style={{
        background: 'rgba(12,6,28,0.88)',
        borderColor: MG,
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
        <div className="italic opacity-60">the cave is quiet…</div>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {recent.map((ev, i) => (
            <li key={i} className="truncate">
              <span className="opacity-50 tabular-nums">s{ev.step}</span>{' '}
              <span style={{
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

// ═══════════════════════════════════════════════════════════════════
//   Zoom controls
// ═══════════════════════════════════════════════════════════════════

function ZoomControls({ zoom, onZoom }: { zoom: number; onZoom: (z: number) => void }) {
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
  return (
    <div className="absolute right-3 z-30 flex flex-col gap-1" style={{ bottom: '9rem' }}>
      <button type="button" style={btn} onClick={() => onZoom(Math.min(3.0, zoom + 0.3))} title="Zoom in"    aria-label="Zoom in">+</button>
      <button type="button" style={btn} onClick={() => onZoom(Math.max(0.4, zoom - 0.3))} title="Zoom out"   aria-label="Zoom out">−</button>
      {zoom !== 1 && (
        <button type="button" style={{ ...btn, fontSize: 9, letterSpacing: '0.05em' }}
          onClick={() => onZoom(1)} title="Reset zoom" aria-label="Reset zoom">FIT</button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//   Timeline scrubber
// ═══════════════════════════════════════════════════════════════════

function TimelineScrubber() {
  const history        = useSimulationStore(s => s.history);
  const viewingStep    = useSimulationStore(s => s.viewingStep);
  const setViewingStep = useSimulationStore(s => s.setViewingStep);
  const status         = useSimulationStore(s => s.status);
  const pause          = useSimulationStore(s => s.pause);
  const start          = useSimulationStore(s => s.start);

  if (history.length === 0) return null;

  const maxIdx     = history.length - 1;
  const currentIdx = viewingStep !== null
    ? Math.max(0, history.findIndex(h => h.step === viewingStep))
    : maxIdx;
  const isLive    = viewingStep === null;
  const isRunning = status === 'running';
  const displayStep = isLive ? (history[maxIdx]?.step ?? 0) : viewingStep;

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
        {isRunning ? '⏸' : '▶'}
      </button>
      <button type="button" onClick={handleBack} disabled={currentIdx <= 0}
        className="flex-shrink-0 flex items-center justify-center rounded border text-xs font-bold disabled:opacity-30"
        style={{ width: 22, height: 28, background: 'rgba(20,10,40,0.9)', borderColor: MG, color: MG_LT }}
        aria-label="Step back">‹</button>
      <input type="range" min={0} max={maxIdx} value={currentIdx} onChange={handleSlider}
        className="flex-1 min-w-0 h-1.5 cursor-pointer"
        style={{ accentColor: MG }}
        aria-label="Timeline position"
      />
      <button type="button" onClick={handleForward} disabled={isLive}
        className="flex-shrink-0 flex items-center justify-center rounded border text-xs font-bold disabled:opacity-30"
        style={{ width: 22, height: 28, background: 'rgba(20,10,40,0.9)', borderColor: MG, color: MG_LT }}
        aria-label="Step forward">›</button>
      <div className="flex-shrink-0 flex items-center gap-1.5 text-[11px]" style={{ color: MG, minWidth: '5rem' }}>
        <span className="tabular-nums font-bold" style={{ color: MG_LT }}>s{displayStep}</span>
        {isLive ? (
          <span className="rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider"
            style={{ background: CX_TREA, color: CAVE_BG }}>LIVE</span>
        ) : (
          <button type="button" onClick={() => setViewingStep(null)}
            className="rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider hover:opacity-80"
            style={{ background: MG, color: CAVE_BG, border: 'none', cursor: 'pointer' }}>
            LIVE ›
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//   Creature inspector
// ═══════════════════════════════════════════════════════════════════

function CreatureInspector({
  agent, onClose, currentStep,
}: {
  agent: AgentSnapshot;
  onClose: () => void;
  currentStep: number;
}) {
  const role      = getRole(agent.type);
  const archetype = getArchetype(agent.type);
  const hallName  = ARCHETYPE_HALL[archetype];
  const hallColor = ARCHETYPE_COLOR[archetype];
  const hasVote   = agent.lastVote !== null;
  const isRecent  = hasVote && currentStep - agent.lastVoteStep < 8;

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
          aria-label="Close inspector">×</button>
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
            {agent.lastVote ? '■ Voted FOR' : '■ Voted AGAINST'}
            {isRecent && <span className="ml-1 opacity-70">(just now)</span>}
          </span>
        ) : (
          <span className="opacity-60" style={{ color: MG }}>○ Not yet voted</span>
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
        <div className="mt-2 mb-0.5 text-[10px] uppercase tracking-widest opacity-60" style={{ color: MG }}>Activity</div>
        <div className="text-[11px] flex justify-between" style={{ color: MG }}>
          <span>Votes cast</span>
          <span className="font-bold tabular-nums" style={{ color: MG_LT }}>{agent.totalVotesCast}</span>
        </div>
        <div className="text-[11px] flex justify-between" style={{ color: MG }}>
          <span>Last vote</span>
          <span className="font-bold tabular-nums" style={{ color: MG_LT }}>{hasVote ? `s${agent.lastVoteStep}` : '—'}</span>
        </div>
        {agent.delegateTo && (
          <div className="text-[11px] flex justify-between" style={{ color: MG }}>
            <span>Delegates to</span>
            <span className="font-bold tabular-nums text-right truncate ml-2"
              style={{ color: MG_LT, maxWidth: '5rem' }}>{agent.delegateTo}</span>
          </div>
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

// ═══════════════════════════════════════════════════════════════════
//   Utils
// ═══════════════════════════════════════════════════════════════════

function formatMoney(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n.toFixed(0)}`;
}
function formatPct(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(0)}%`;
}

// ═══════════════════════════════════════════════════════════════════
//   Root component
// ═══════════════════════════════════════════════════════════════════

export interface SanctumSceneProps {
  snapshot?: SimulationSnapshot | null;
}

export function SanctumScene({ snapshot: snapshotProp }: SanctumSceneProps = {}) {
  const liveSnapshot = useActiveSnapshot();
  const snapshot  = snapshotProp !== undefined ? snapshotProp : liveSnapshot;
  const isPreview = snapshotProp !== undefined;

  // ── Zoom / pan ─────────────────────────────────────────────────
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan]   = useState({ x: 0, y: 0 });
  const dragStart       = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const lastTouchDist   = useRef<number | null>(null);
  const containerRef    = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.4, Math.min(3.0, z * (e.deltaY < 0 ? 1.1 : 0.91))));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragStart.current) return;
    setPan({ x: dragStart.current.px + e.clientX - dragStart.current.mx, y: dragStart.current.py + e.clientY - dragStart.current.my });
  }, []);

  const handleMouseUp = useCallback(() => { dragStart.current = null; }, []);

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
      setZoom(z => Math.max(0.4, Math.min(3.0, z * dist / lastTouchDist.current!)));
      lastTouchDist.current = dist;
    }
  }, []);

  const handleTouchEnd = useCallback(() => { lastTouchDist.current = null; }, []);

  // ── Ceremony tracking ──────────────────────────────────────────
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
  }, [snapshot?.step]);

  // ── Crystal-shelving (replaces book-shelving) ──────────────────
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
  }, [snapshot?.step]);

  // ── Inspector ──────────────────────────────────────────────────
  const [inspectedAgentId, setInspectedAgentId] = useState<string | null>(null);
  const inspectedAgent = snapshot?.agents.find(a => a.id === inspectedAgentId) ?? null;

  useEffect(() => {
    if (!inspectedAgentId || !snapshot) return;
    if (!snapshot.agents.find(a => a.id === inspectedAgentId)) setInspectedAgentId(null);
  }, [snapshot, inspectedAgentId]);

  // ── Placement ──────────────────────────────────────────────────
  const placements = useMemo(() => {
    if (!snapshot) return [];
    return placeCreatures(snapshot.agents, ceremonies, shelving, snapshot.step)
      .sort((a, b) => a.ty - b.ty);
  }, [snapshot, ceremonies, shelving]);

  const ribbonOffsets = useMemo(() => computeRibbonOffsets(placements), [placements]);

  const activeProposal = snapshot
    ? (snapshot.proposals.find(p => p.status === 'open' || p.status === 'voting')
       ?? snapshot.proposals[snapshot.proposals.length - 1]
       ?? null)
    : null;

  // ── Null state ─────────────────────────────────────────────────
  if (!snapshot) {
    return (
      <div className="flex h-full items-center justify-center"
        style={{ background: CAVE_BG, color: MG }}>
        <p className="text-sm italic opacity-70" style={{ fontFamily: 'Georgia, serif' }}>
          The cave is silent…
        </p>
      </div>
    );
  }

  const blackSwanActive = snapshot.blackSwan.active;
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
          aria-label="Cross-section of the Living Archive cave — crystal chambers of steward halls"
          className="absolute inset-0 h-full w-full"
          viewBox="-500 -320 1000 640"
          preserveAspectRatio="xMidYMid meet"
        >
          <SceneDefs />

          {/* Cave — back-to-front render order */}
          <CaveBackground />
          <CaveZones />
          <CaveFurniture
            proposal={activeProposal}
            memberCount={snapshot.memberCount}
            treasury={snapshot.treasuryFunds}
          />
          <CaveLedges />
          <CaveCeiling />
          <RoomLabels />

          {/* Creatures — depth sorted */}
          {placements.map(({ agent, x, y, idx }) => (
            <Creature
              key={agent.id}
              agent={agent}
              x={x}
              y={y}
              currentStep={snapshot.step}
              idx={idx}
              ribbonOffsetY={ribbonOffsets.get(agent.id) ?? 0}
              onInspect={() => setInspectedAgentId(id => id === agent.id ? null : agent.id)}
              inCeremony={ceremonies.has(agent.id)}
              isShelving={shelving.has(agent.id)}
              highlighted={agent.id === inspectedAgentId}
            />
          ))}

          <RainOverlay active={blackSwanActive} />
        </svg>
      </div>

      {/* HTML overlays — outside zoom wrapper so they stay crisp */}
      <HeaderOverlay snap={snapshot} />
      <LegendOverlay />
      <FireLog events={snapshot.recentEvents} />
      <ZoomControls zoom={zoom} onZoom={z => { setZoom(z); if (z === 1) setPan({ x: 0, y: 0 }); }} />
      <HelpButton />

      {inspectedAgent && (
        <CreatureInspector
          agent={inspectedAgent}
          onClose={() => setInspectedAgentId(null)}
          currentStep={snapshot.step}
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
          .rain-drop, .storm-tint, .lightning-flash { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
