'use client';

/**
 * The Living Archive — isometric scene.
 *
 * Creatures live in a solarpunk library atrium rendered in 2:1 oblique
 * projection. Every step the creatures update their positions; CSS
 * animations imply walking, vote ceremonies, and book-shelving.
 *
 * Features:
 *  ✓ Isometric atrium: rear wall, tiled floor, bookshelves, lectern, pool, hearth
 *  ✓ 5 species placed by hall, depth-sorted
 *  ✓ Always-visible role-name ribbons (collision-staggered so they don't overlap)
 *  ✓ Vote banner in paw (FOR/AGAINST/none)
 *  ✓ Idle breathing animation (staggered)
 *  ✓ Walking animation when inCeremony or isShelving
 *  ✓ Vote ceremony: creature walks to lectern, raises banner, returns
 *  ✓ Book-shelving: Beavers periodically carry a book to the nearest shelf
 *  ✓ Black Swan rain + storm atmospheric overlay
 *  ✓ Zoom (scroll / pinch / buttons, centered)
 *  ✓ Pan (drag when zoomed in)
 *  ✓ Timeline scrubber (store-connected, hidden in preview mode)
 *  ✓ Creature inspector (click creature → pin detail panel)
 *  ✓ Help button repositioned (absolute, above scrubber)
 *  ✓ Tooltip always-onscreen (horizontal + vertical clamping)
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

// ═════════════════════════════════════════════════════════════════════════
//   Iso projection helpers
// ═════════════════════════════════════════════════════════════════════════

const TILE_W = 80;
const TILE_H = 40;

/** Convert tile coords (column, row) to screen (x, y). 0,0 at back-left corner. */
function iso(tx: number, ty: number): { x: number; y: number } {
  return {
    x: (tx - ty) * (TILE_W / 2),
    y: (tx + ty) * (TILE_H / 2),
  };
}

// ═════════════════════════════════════════════════════════════════════════
//   Scene-wide SVG defs (gradients, patterns, filters)
// ═════════════════════════════════════════════════════════════════════════

function SceneDefs() {
  return (
    <defs>
      <filter id="paper" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="13" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.22  0 0 0 0 0.14  0 0 0 0 0.08  0 0 0 0.12 0" />
        <feComposite in2="SourceGraphic" operator="in" />
      </filter>
      <linearGradient id="wash" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={PALETTE.parchmentWarm} />
        <stop offset="40%" stopColor={PALETTE.parchment} />
        <stop offset="100%" stopColor={PALETTE.parchmentCool} />
      </linearGradient>
      <radialGradient id="sunbeam" cx="50%" cy="0%" r="60%">
        <stop offset="0%" stopColor={PALETTE.lampBloom} stopOpacity="0.55" />
        <stop offset="45%" stopColor={PALETTE.gold} stopOpacity="0.1" />
        <stop offset="80%" stopColor={PALETTE.parchment} stopOpacity="0" />
      </radialGradient>
      <linearGradient id="floorTile" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={PALETTE.parchmentWarm} />
        <stop offset="100%" stopColor={PALETTE.parchmentCool} />
      </linearGradient>
      <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7A4A22" />
        <stop offset="55%" stopColor="#5C381A" />
        <stop offset="100%" stopColor="#3E2410" />
      </linearGradient>
      <linearGradient id="woodFace" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#6A3E1C" />
        <stop offset="100%" stopColor="#3E2410" />
      </linearGradient>
      <radialGradient id="water" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor={PALETTE.gold} stopOpacity="0.55" />
        <stop offset="40%" stopColor={PALETTE.teal} stopOpacity="0.65" />
        <stop offset="100%" stopColor={PALETTE.teal} stopOpacity="0.95" />
      </radialGradient>
      <radialGradient id="ember" cx="50%" cy="60%" r="60%">
        <stop offset="0%" stopColor={PALETTE.lampBloom} />
        <stop offset="40%" stopColor={PALETTE.flame} />
        <stop offset="100%" stopColor={PALETTE.blood} stopOpacity="0.15" />
      </radialGradient>
      <radialGradient id="stainedRose" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={PALETTE.lampBloom} />
        <stop offset="35%" stopColor={PALETTE.honey} />
        <stop offset="65%" stopColor={PALETTE.voteFor} />
        <stop offset="100%" stopColor={PALETTE.voteAgainst} />
      </radialGradient>
      <pattern id="bookspines" x="0" y="0" width="60" height="14" patternUnits="userSpaceOnUse">
        {bookSpines().map((b, i) => (
          <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} fill={b.fill} stroke={PALETTE.ink} strokeWidth="0.3" />
        ))}
      </pattern>
      {/* Rain drop shape */}
      <linearGradient id="rainDrop" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={PALETTE.teal} stopOpacity="0.7" />
        <stop offset="100%" stopColor={PALETTE.voteAgainst} stopOpacity="0.2" />
      </linearGradient>
    </defs>
  );
}

function bookSpines() {
  const spines: Array<{ x: number; y: number; w: number; h: number; fill: string }> = [];
  const colors = ['#7A2E2E', '#3C4A6B', '#5A6F3F', '#7A4A22', '#4B3A5C', '#9B4A2A', '#2F5252', '#C79137'];
  let x = 0;
  let seed = 3;
  const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  while (x < 60) {
    const w = 2.2 + rand() * 3;
    const h = 10 + rand() * 4;
    spines.push({ x, y: 14 - h, w: w - 0.3, h, fill: colors[Math.floor(rand() * colors.length)] });
    x += w;
  }
  return spines;
}

// ═════════════════════════════════════════════════════════════════════════
//   Atrium floor + walls + vines
// ═════════════════════════════════════════════════════════════════════════

function AtriumFloor() {
  const cols = 10;
  const rows = 10;
  const a = iso(0, 0);
  const b = iso(cols, 0);
  const c = iso(cols, rows);
  const d = iso(0, rows);
  return (
    <g>
      <polygon
        points={`${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y} ${d.x},${d.y}`}
        fill="url(#floorTile)"
        stroke={PALETTE.stoneSoft}
        strokeWidth="1.2"
      />
      {Array.from({ length: cols + 1 }).map((_, i) => {
        const p0 = iso(i, 0);
        const p1 = iso(i, rows);
        return <line key={`cv${i}`} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={PALETTE.stoneSoft} strokeWidth="0.4" opacity="0.4" />;
      })}
      {Array.from({ length: rows + 1 }).map((_, i) => {
        const p0 = iso(0, i);
        const p1 = iso(cols, i);
        return <line key={`ch${i}`} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={PALETTE.stoneSoft} strokeWidth="0.4" opacity="0.4" />;
      })}
      {(() => {
        const c2 = iso(5, 5);
        return (
          <g transform={`translate(${c2.x} ${c2.y})`}>
            <circle cx="0" cy="0" r="32" fill="none" stroke={PALETTE.honey} strokeWidth="0.8" opacity="0.4" />
            <circle cx="0" cy="0" r="18" fill="none" stroke={PALETTE.honey} strokeWidth="0.6" opacity="0.5" />
            {Array.from({ length: 8 }).map((_, i) => {
              const a2 = (i / 8) * Math.PI * 2;
              return (
                <line
                  key={i}
                  x1={Math.cos(a2) * 18}
                  y1={Math.sin(a2) * 18 * 0.5}
                  x2={Math.cos(a2) * 32}
                  y2={Math.sin(a2) * 32 * 0.5}
                  stroke={PALETTE.honey} strokeWidth="0.6" opacity="0.45"
                />
              );
            })}
          </g>
        );
      })()}
    </g>
  );
}

function RearWall() {
  const back = iso(0, 0);
  const backRight = iso(10, 0);
  const wallH = 140;
  return (
    <g>
      <rect
        x={back.x}
        y={back.y - wallH}
        width={backRight.x - back.x}
        height={wallH}
        fill={PALETTE.parchmentCool}
        stroke={PALETTE.stoneSoft}
        strokeWidth="1"
      />
      {Array.from({ length: 4 }).map((_, i) => (
        <line
          key={i}
          x1={back.x}
          y1={back.y - wallH + (i + 1) * (wallH / 5)}
          x2={backRight.x}
          y2={back.y - wallH + (i + 1) * (wallH / 5)}
          stroke={PALETTE.stoneSoft} strokeWidth="0.6" opacity="0.55"
        />
      ))}
      {(() => {
        const cx = (back.x + backRight.x) / 2;
        const cy = back.y - wallH + 35;
        return (
          <g>
            <circle cx={cx} cy={cy} r="26" fill="url(#stainedRose)" stroke={PALETTE.stone} strokeWidth="1.5" />
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i / 8) * Math.PI * 2;
              return (
                <line
                  key={i}
                  x1={cx} y1={cy}
                  x2={cx + Math.cos(a) * 26}
                  y2={cy + Math.sin(a) * 26}
                  stroke={PALETTE.stone} strokeWidth="0.9"
                />
              );
            })}
            <circle cx={cx} cy={cy} r="7" fill={PALETTE.honey} stroke={PALETTE.stone} strokeWidth="0.6" />
            <path
              d={`M${cx - 22} ${cy + 18} L${cx + 22} ${cy + 18} L${cx + 40} ${back.y + 10} L${cx - 40} ${back.y + 10} Z`}
              fill={PALETTE.lampBloom}
              opacity="0.22"
            />
          </g>
        );
      })()}
      <path
        d={`M${back.x + 6} ${back.y - wallH + 5} Q${back.x + 4} ${back.y - wallH + 40}, ${back.x + 8} ${back.y - wallH + 80} Q${back.x + 2} ${back.y - 10}, ${back.x + 5} ${back.y + 4}`}
        stroke={PALETTE.mossDeep} strokeWidth="1.6" fill="none" />
      <path
        d={`M${backRight.x - 6} ${back.y - wallH + 5} Q${backRight.x - 4} ${back.y - wallH + 40}, ${backRight.x - 8} ${back.y - wallH + 80} Q${backRight.x - 2} ${back.y - 10}, ${backRight.x - 5} ${back.y + 4}`}
        stroke={PALETTE.mossDeep} strokeWidth="1.6" fill="none" />
      {leafAt(back.x + 5, back.y - wallH + 55)}
      {leafAt(back.x + 8, back.y - wallH + 100)}
      {leafAt(back.x + 4, back.y - 14)}
      {leafAt(backRight.x - 5, back.y - wallH + 55)}
      {leafAt(backRight.x - 8, back.y - wallH + 100)}
      {leafAt(backRight.x - 4, back.y - 14)}
    </g>
  );
}

function leafAt(cx: number, cy: number) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <ellipse cx="-3" cy="0" rx="3.5" ry="1.6" fill={PALETTE.chlorophyll} transform="rotate(20)" />
      <ellipse cx="3" cy="2" rx="3" ry="1.4" fill={PALETTE.moss} transform="rotate(-15)" />
      <ellipse cx="0" cy="-2" rx="2.2" ry="1.1" fill={PALETTE.chlorophyll} transform="rotate(10)" />
    </g>
  );
}

// ═════════════════════════════════════════════════════════════════════════
//   In-scene objects
// ═════════════════════════════════════════════════════════════════════════

function IsoBookshelf({ tx, ty, w = 2 }: { tx: number; ty: number; w?: number }) {
  const base = iso(tx, ty);
  const right = iso(tx + w, ty);
  const back = iso(tx, ty - 0.9);
  const backRight = iso(tx + w, ty - 0.9);
  const height = 60;
  return (
    <g>
      <ellipse cx={(base.x + right.x) / 2} cy={base.y + 6} rx={(right.x - base.x) / 2 + 6} ry="4" fill={PALETTE.ink} opacity="0.2" />
      <polygon
        points={`${right.x},${right.y} ${right.x},${right.y - height} ${backRight.x},${backRight.y - height} ${backRight.x},${backRight.y}`}
        fill="url(#woodFace)" stroke={PALETTE.ink} strokeWidth="0.9"
      />
      <polygon
        points={`${base.x},${base.y - height} ${right.x},${right.y - height} ${backRight.x},${backRight.y - height} ${back.x},${back.y - height}`}
        fill="url(#wood)" stroke={PALETTE.ink} strokeWidth="0.9"
      />
      <polygon
        points={`${base.x},${base.y} ${right.x},${right.y} ${right.x},${right.y - height} ${base.x},${base.y - height}`}
        fill="url(#wood)" stroke={PALETTE.ink} strokeWidth="0.9"
      />
      {[0.78, 0.52, 0.25].map((fr, i) => {
        const shelfY = base.y - height * fr;
        const h = 14;
        return (
          <g key={i}>
            <rect
              x={base.x + 3}
              y={shelfY - h + 1}
              width={right.x - base.x - 6}
              height={h}
              fill="url(#bookspines)"
            />
            <rect
              x={base.x + 2}
              y={shelfY}
              width={right.x - base.x - 4}
              height="2"
              fill="#3B2410" stroke={PALETTE.ink} strokeWidth="0.4"
            />
          </g>
        );
      })}
    </g>
  );
}

function IsoLectern({ tx, ty, proposal, memberCount }: {
  tx: number; ty: number;
  proposal: ProposalSnapshot | null;
  memberCount: number;
}) {
  const base = iso(tx, ty);
  const book = { x: base.x, y: base.y - 44 };
  const total = proposal ? proposal.votesFor + proposal.votesAgainst : 0;
  const forPct = total > 0 && proposal ? proposal.votesFor / total : 0;
  const participation = memberCount > 0 && proposal ? total / memberCount : 0;
  return (
    <g>
      <ellipse cx={base.x} cy={base.y + 4} rx="22" ry="6" fill={PALETTE.ink} opacity="0.25" />
      <polygon
        points={`${base.x - 14},${base.y} ${base.x + 14},${base.y} ${base.x + 10},${base.y - 26} ${base.x - 10},${base.y - 26}`}
        fill="url(#wood)" stroke={PALETTE.ink} strokeWidth="1" strokeLinejoin="round"
      />
      <polygon
        points={`${base.x - 16},${base.y - 28} ${base.x + 16},${base.y - 28} ${base.x + 12},${base.y - 40} ${base.x - 12},${base.y - 40}`}
        fill="url(#woodFace)" stroke={PALETTE.ink} strokeWidth="1"
      />
      {proposal ? (
        <g>
          <polygon
            points={`${book.x - 15},${book.y} ${book.x},${book.y - 2} ${book.x},${book.y - 16} ${book.x - 15},${book.y - 14}`}
            fill={PALETTE.parchment} stroke={PALETTE.stone} strokeWidth="0.8"
          />
          <polygon
            points={`${book.x},${book.y - 2} ${book.x + 15},${book.y} ${book.x + 15},${book.y - 14} ${book.x},${book.y - 16}`}
            fill={PALETTE.parchment} stroke={PALETTE.stone} strokeWidth="0.8"
          />
          <line x1={book.x - 13} y1={book.y - 12} x2={book.x - 2} y2={book.y - 13} stroke={PALETTE.stoneSoft} strokeWidth="0.3" />
          <line x1={book.x - 13} y1={book.y - 9} x2={book.x - 2} y2={book.y - 10} stroke={PALETTE.stoneSoft} strokeWidth="0.3" />
          <line x1={book.x - 13} y1={book.y - 6} x2={book.x - 2} y2={book.y - 7} stroke={PALETTE.stoneSoft} strokeWidth="0.3" />
          <text
            x={book.x - 12}
            y={book.y - 10.5}
            fontSize="8"
            fontWeight="700"
            fill={PALETTE.gold}
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {proposal.type[0]}
          </text>
          <rect x={book.x + 5} y={book.y - 16} width="2" height="16" fill={PALETTE.gold} stroke={PALETTE.ink} strokeWidth="0.3" />
          <g transform={`translate(${base.x} ${base.y + 11})`}>
            <rect x="-20" y="0" width="40" height="3.4" rx="0.5" fill={PALETTE.parchmentWarm} stroke={PALETTE.stone} strokeWidth="0.5" />
            {total > 0 && (
              <>
                <rect x="-20" y="0" width={40 * forPct} height="3.4" rx="0.5" fill={PALETTE.voteFor} />
                <rect x={-20 + 40 * forPct} y="0" width={40 * (1 - forPct)} height="3.4" rx="0.5" fill={PALETTE.voteAgainst} />
              </>
            )}
            <text x="0" y="11" textAnchor="middle" fontSize="5" fill={PALETTE.stoneSoft} style={{ fontFamily: 'Georgia, serif' }}>
              {proposal.type} · {Math.round(participation * 100)}% turnout
            </text>
          </g>
          <title>
            {`${proposal.status.toUpperCase()} · ${proposal.type}\nFOR ${proposal.votesFor} · AGAINST ${proposal.votesAgainst}\nFunds sought: ${proposal.fundingGoal}`}
          </title>
        </g>
      ) : (
        <text x={base.x} y={book.y - 6} textAnchor="middle" fontSize="5" fill={PALETTE.stoneSoft} style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
          the lectern is unset…
        </text>
      )}
    </g>
  );
}

function IsoPool({ tx, ty, treasury }: { tx: number; ty: number; treasury: number }) {
  const c = iso(tx + 1, ty + 1);
  return (
    <g>
      <ellipse cx={c.x} cy={c.y} rx="44" ry="22" fill={PALETTE.stoneSoft} stroke={PALETTE.stone} strokeWidth="1" />
      <ellipse cx={c.x} cy={c.y} rx="40" ry="19" fill="url(#water)" />
      <ellipse cx={c.x} cy={c.y} rx="28" ry="13" fill="none" stroke={PALETTE.parchmentWarm} strokeWidth="0.5" opacity="0.55" />
      <ellipse cx={c.x} cy={c.y} rx="18" ry="8" fill="none" stroke={PALETTE.parchmentWarm} strokeWidth="0.4" opacity="0.5" />
      <ellipse cx={c.x - 12} cy={c.y - 5} rx="6" ry="3" fill="none" stroke={PALETTE.lampBloom} strokeWidth="0.4" opacity="0.7" />
      <circle cx={c.x - 15} cy={c.y - 7} r="1" fill={PALETTE.lampBloom} />
      <circle cx={c.x + 8} cy={c.y + 3} r="0.8" fill={PALETTE.lampBloom} />
      <g transform={`translate(${c.x} ${c.y - 30})`}>
        <rect x="-26" y="-8" width="52" height="14" rx="2" fill={PALETTE.parchment} stroke={PALETTE.stone} strokeWidth="0.8" />
        <text x="0" y="1.5" textAnchor="middle" fontSize="7" fontWeight="700" fill={PALETTE.honey} style={{ fontFamily: 'Georgia, serif' }}>
          ◈ {formatMoney(treasury)}
        </text>
      </g>
      <title>{`The Reflecting Pool — the Archive's treasury: ${formatMoney(treasury)}`}</title>
    </g>
  );
}

function IsoHearth({ tx, ty }: { tx: number; ty: number }) {
  const base = iso(tx, ty);
  return (
    <g>
      <ellipse cx={base.x} cy={base.y + 4} rx="22" ry="5" fill={PALETTE.ink} opacity="0.25" />
      <polygon
        points={`${base.x - 22},${base.y} ${base.x + 22},${base.y} ${base.x + 18},${base.y - 12} ${base.x - 18},${base.y - 12}`}
        fill={PALETTE.stoneSoft} stroke={PALETTE.stone} strokeWidth="0.9"
      />
      <rect x={base.x - 16} y={base.y - 50} width="32" height="40" fill={PALETTE.stoneSoft} stroke={PALETTE.stone} strokeWidth="0.9" />
      <line x1={base.x - 16} y1={base.y - 30} x2={base.x + 16} y2={base.y - 30} stroke={PALETTE.stone} strokeWidth="0.5" opacity="0.6" />
      <line x1={base.x} y1={base.y - 50} x2={base.x} y2={base.y - 30} stroke={PALETTE.stone} strokeWidth="0.5" opacity="0.5" />
      <polygon
        points={`${base.x - 12},${base.y - 10} ${base.x + 12},${base.y - 10} ${base.x + 10},${base.y - 32} ${base.x - 10},${base.y - 32}`}
        fill={PALETTE.ink}
      />
      <ellipse cx={base.x} cy={base.y - 16} rx="10" ry="4" fill="url(#ember)" opacity="0.9" />
      <g className="hearth-flicker" style={{ transformOrigin: `${base.x}px ${base.y - 10}px` }}>
        <path
          d={`M${base.x - 4} ${base.y - 14} Q${base.x - 7} ${base.y - 20} ${base.x - 3} ${base.y - 24} Q${base.x - 1} ${base.y - 22} ${base.x} ${base.y - 26} Q${base.x + 2} ${base.y - 22} ${base.x + 4} ${base.y - 24} Q${base.x + 7} ${base.y - 20} ${base.x + 4} ${base.y - 14} Z`}
          fill={PALETTE.flame} stroke={PALETTE.blood} strokeWidth="0.5"
        />
        <path
          d={`M${base.x - 2} ${base.y - 16} Q${base.x - 3} ${base.y - 20} ${base.x} ${base.y - 22} Q${base.x + 3} ${base.y - 20} ${base.x + 2} ${base.y - 16} Z`}
          fill={PALETTE.lampBloom} opacity="0.9" className="hearth-flicker-inner"
        />
      </g>
      <rect x={base.x - 11} y={base.y - 12} width="22" height="3" fill="#4A2E18" stroke={PALETTE.ink} strokeWidth="0.4" rx="1" />
      <rect x={base.x - 9} y={base.y - 15} width="18" height="2.5" fill="#5A3A22" stroke={PALETTE.ink} strokeWidth="0.4" rx="1" />
      <title>The Hearth — recent events flicker here</title>
    </g>
  );
}

// ═════════════════════════════════════════════════════════════════════════
//   Black Swan rain overlay
// ═════════════════════════════════════════════════════════════════════════

/** Pre-generate stable raindrop data so no jitter between renders. */
const RAIN_DROPS = (() => {
  const drops: Array<{ x: number; delay: number; dur: number; len: number }> = [];
  let s = 77;
  const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < 65; i++) {
    drops.push({
      x: r() * 1100 - 550,
      delay: r() * 2.2,
      dur: 0.35 + r() * 0.25,
      len: 10 + r() * 14,
    });
  }
  return drops;
})();

function RainOverlay({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <g aria-hidden="true">
      {/* Blue-dark tint over scene */}
      <rect x="-520" y="-280" width="1100" height="1100"
        fill={PALETTE.voteAgainst} opacity="0.12"
        className="storm-tint"
      />
      {/* Animated rain lines — angled slightly left */}
      {RAIN_DROPS.map((d, i) => (
        <line
          key={i}
          className="rain-drop"
          x1={d.x} y1="-280"
          x2={d.x - d.len * 0.35} y2={-280 + d.len}
          stroke="url(#rainDrop)"
          strokeWidth="0.8"
          opacity="0.55"
          style={{
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.dur}s`,
          }}
        />
      ))}
      {/* Occasional lightning flash */}
      <rect x="-520" y="-280" width="1100" height="1100"
        fill={PALETTE.parchment} opacity="0"
        className="lightning-flash"
      />
    </g>
  );
}

// ═════════════════════════════════════════════════════════════════════════
//   Creature placement
// ═════════════════════════════════════════════════════════════════════════

const HALL_STATIONS: Record<Archetype, Array<[number, number]>> = {
  governance: [[1.4, 2.6], [2.6, 1.6], [3.6, 2.8], [1.6, 4.0], [2.8, 4.2], [3.8, 5.2]],
  council:    [[6.2, 1.6], [7.4, 2.6], [6.4, 3.8], [7.6, 4.0], [8.6, 2.8]],
  treasury:   [[7.2, 6.4], [8.4, 7.0], [6.2, 7.4], [8.0, 5.8], [6.8, 5.6], [7.8, 8.2]],
  craft:      [[1.4, 6.6], [2.6, 7.4], [1.8, 8.2], [3.4, 6.4], [3.2, 8.2]],
  passive:    [[4.6, 8.4], [5.6, 8.6], [5.2, 7.6]],
};

// Where shelving Beavers walk (nearest shelf front-face tile)
const SHELF_TARGET_TILE: [number, number] = [1.2, 3.6];

// Lectern center tile
const LECTERN_TILE: [number, number] = [4.5, 5.4];

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
    const bucket = grouped[arch];
    const stations = HALL_STATIONS[arch];
    bucket.forEach((agent, i) => {
      let [tx, ty] = stations[i % stations.length];

      // Override position: ceremony (walk to lectern)
      const ceremonyStep = ceremonies.get(agent.id);
      if (ceremonyStep !== undefined) {
        const age = currentStep - ceremonyStep;
        if (age <= 1) {
          // At the lectern
          [tx, ty] = LECTERN_TILE;
          // Small deterministic spread so multiple voters don't pile up
          const jCode = agent.id.charCodeAt(agent.id.length - 1);
          tx += ((jCode % 5) - 2) * 0.3;
          ty += ((jCode % 3) - 1) * 0.2;
        }
        // age === 2 → returning home, use original station (already set)
      }

      // Override position: shelving (walk to bookshelf)
      if (shelving.has(agent.id)) {
        [tx, ty] = SHELF_TARGET_TILE;
        const jCode = agent.id.charCodeAt(0);
        tx += ((jCode % 3) - 1) * 0.2;
        ty += ((jCode % 3) - 1) * 0.15;
      }

      // Small deterministic jitter so creatures aren't perfectly stacked
      const seed = (agent.id.length * 7 + i * 13) % 997;
      const jitterX = ((seed % 7) - 3) * 0.08;
      const jitterY = ((seed % 5) - 2) * 0.06;
      const { x, y } = iso(tx + jitterX, ty + jitterY);
      placements.push({ agent, x, y, ty: ty + jitterY, idx: i });
    });
  }
  return placements;
}

/**
 * Compute vertical ribbon offset for each creature so adjacent labels
 * don't overlap. Returns a Map<agentId, offsetY>. Ribbons are staggered
 * upward when they'd collide.
 */
function computeRibbonOffsets(placements: Placement[]): Map<string, number> {
  const offsets = new Map<string, number>();
  // Sort from top-of-scene to bottom so we process back creatures first
  const sorted = [...placements].sort((a, b) => a.ty - b.ty || a.x - b.x);

  type Placed = { x: number; ribY: number; rw: number; agentId: string };
  const placed: Placed[] = [];

  for (const p of sorted) {
    const rw = Math.max(46, Math.min(110, getRole(p.agent.type).name.length * 5.0));
    let offsetY = 0;

    for (let attempt = 0; attempt < 6; attempt++) {
      let overlaps = false;
      const thisRibY = p.y - 18 + offsetY;
      for (const q of placed) {
        const dx = Math.abs(p.x - q.x);
        const dy = Math.abs(thisRibY - q.ribY);
        // Ribbons overlap when they're close in both x and y
        if (dx < (rw + q.rw) / 2 + 4 && dy < 13) {
          overlaps = true;
          break;
        }
      }
      if (!overlaps) break;
      offsetY -= 14;
    }

    placed.push({ x: p.x, ribY: p.y - 18 + offsetY, rw, agentId: p.agent.id });
    offsets.set(p.agent.id, offsetY);
  }

  return offsets;
}

// ═════════════════════════════════════════════════════════════════════════
//   UI overlays
// ═════════════════════════════════════════════════════════════════════════

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
          background: `rgba(242,232,208,0.88)`,
          borderColor: PALETTE.stone,
          color: PALETTE.ink,
          backdropFilter: 'blur(2px)',
        }}
      >
        <Tooltip content={<>Simulation step — each tick advances the Archive by one period.</>}>
          <Chip label="Step" value={snap.step.toLocaleString()} />
        </Tooltip>
        <Tooltip content={<>Stewards gathered in the Archive.</>}>
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
      <span className="font-bold tabular-nums" style={{ color: PALETTE.ink }}>{value}</span>
    </span>
  );
}

function LegendOverlay() {
  return (
    <div
      className="pointer-events-auto absolute left-3 bottom-[3.5rem] z-20 rounded-sm border px-2.5 py-1.5 text-[10px] sm:left-4"
      style={{
        background: 'rgba(242,232,208,0.88)',
        borderColor: PALETTE.stone,
        color: PALETTE.ink,
        fontFamily: 'Georgia, serif',
        backdropFilter: 'blur(2px)',
      }}
    >
      <Tooltip
        content={
          <div>
            <strong>How to read the scene</strong>
            <div className="mt-1 text-[11px]">
              Each creature is a steward. A small <strong>banner</strong> in their paw shows their vote: terracotta FOR, indigo AGAINST. Click any creature to inspect it.
            </div>
          </div>
        }
      >
        <div className="flex items-center gap-2 cursor-help">
          <span className="inline-flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="7" fill={PALETTE.voteFor} stroke={PALETTE.ink} strokeWidth="0.5" /></svg>
            <span>FOR</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="7" fill={PALETTE.voteAgainst} stroke={PALETTE.ink} strokeWidth="0.5" /></svg>
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
        background: 'rgba(62,53,40,0.88)',
        borderColor: PALETTE.stone,
        color: PALETTE.parchment,
        fontFamily: 'Georgia, serif',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div className="mb-0.5 flex items-center gap-1">
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M5 1 Q3 4 4 6 Q5 4 5 3 Q6 5 6 6 Q7 4 5 1 Z" fill={PALETTE.flame} />
        </svg>
        <span className="text-[9px] uppercase tracking-widest" style={{ color: PALETTE.lampBloom }}>The Fire</span>
      </div>
      {recent.length === 0 ? (
        <div className="italic opacity-60">quiet tonight…</div>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {recent.map((ev, i) => (
            <li key={i} className="truncate">
              <span className="opacity-50 tabular-nums">s{ev.step}</span>{' '}
              <span style={{
                color:
                  ev.type === 'proposal_approved' ? PALETTE.lampBloom :
                  ev.type === 'proposal_rejected' ? '#F08080' :
                  ev.type === 'black_swan' ? '#F08080' :
                  ev.type === 'forum_topic' ? PALETTE.flame :
                  PALETTE.parchment,
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

// ═════════════════════════════════════════════════════════════════════════
//   Zoom controls
// ═════════════════════════════════════════════════════════════════════════

function ZoomControls({ zoom, onZoom }: { zoom: number; onZoom: (z: number) => void }) {
  const btn = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 2,
    background: PALETTE.parchment,
    border: `1.5px solid ${PALETTE.stone}`,
    color: PALETTE.stone,
    cursor: 'pointer',
    fontSize: 14, fontWeight: 700,
    fontFamily: 'Georgia, serif',
    userSelect: 'none' as const,
    transition: 'background 0.1s',
  };
  return (
    <div
      className="absolute right-3 z-30 flex flex-col gap-1"
      style={{ bottom: '9rem' }}
    >
      <button
        type="button"
        style={btn}
        onClick={() => onZoom(Math.min(3.0, zoom + 0.3))}
        title="Zoom in"
        aria-label="Zoom in"
      >
        +
      </button>
      <button
        type="button"
        style={btn}
        onClick={() => onZoom(Math.max(0.4, zoom - 0.3))}
        title="Zoom out"
        aria-label="Zoom out"
      >
        −
      </button>
      {zoom !== 1 && (
        <button
          type="button"
          style={{ ...btn, fontSize: 9, letterSpacing: '0.05em' }}
          onClick={() => onZoom(1)}
          title="Reset zoom"
          aria-label="Reset zoom"
        >
          FIT
        </button>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
//   Timeline scrubber (store-connected, hidden in preview mode)
// ═════════════════════════════════════════════════════════════════════════

function TimelineScrubber() {
  const history = useSimulationStore(s => s.history);
  const viewingStep = useSimulationStore(s => s.viewingStep);
  const setViewingStep = useSimulationStore(s => s.setViewingStep);
  const status = useSimulationStore(s => s.status);
  const pause = useSimulationStore(s => s.pause);
  const start = useSimulationStore(s => s.start);

  if (history.length === 0) return null;

  const maxIdx = history.length - 1;
  const currentIdx = viewingStep !== null
    ? Math.max(0, history.findIndex(h => h.step === viewingStep))
    : maxIdx;
  const isLive = viewingStep === null;
  const isRunning = status === 'running';
  const displayStep = isLive ? (history[maxIdx]?.step ?? 0) : viewingStep;

  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    const idx = parseInt(e.target.value);
    if (idx >= maxIdx) {
      setViewingStep(null); // snap to LIVE
    } else {
      const h = history[idx];
      if (h) setViewingStep(h.step);
    }
  }

  function handleBack() {
    const idx = Math.max(0, currentIdx - 1);
    const h = history[idx];
    if (h) setViewingStep(h.step);
  }

  function handleForward() {
    const idx = currentIdx + 1;
    if (idx >= maxIdx) {
      setViewingStep(null);
    } else {
      const h = history[idx];
      if (h) setViewingStep(h.step);
    }
  }

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-30 flex items-center gap-2 px-3 py-1.5 border-t"
      style={{
        background: 'rgba(242,232,208,0.96)',
        borderColor: PALETTE.stone,
        fontFamily: 'Georgia, serif',
        height: 46,
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Play/pause */}
      <button
        type="button"
        onClick={() => isRunning ? pause() : start()}
        className="flex-shrink-0 flex items-center justify-center rounded border text-sm font-bold"
        style={{
          width: 28, height: 28,
          background: PALETTE.parchmentWarm,
          borderColor: PALETTE.stone,
          color: PALETTE.stone,
        }}
        title={isRunning ? 'Pause' : 'Play'}
        aria-label={isRunning ? 'Pause simulation' : 'Play simulation'}
      >
        {isRunning ? '⏸' : '▶'}
      </button>

      {/* Back one step */}
      <button
        type="button"
        onClick={handleBack}
        disabled={currentIdx <= 0}
        className="flex-shrink-0 flex items-center justify-center rounded border text-xs font-bold disabled:opacity-30"
        style={{ width: 22, height: 28, background: PALETTE.parchmentWarm, borderColor: PALETTE.stone, color: PALETTE.stone }}
        aria-label="Step back"
      >
        ‹
      </button>

      {/* Scrubber range */}
      <input
        type="range"
        min={0}
        max={maxIdx}
        value={currentIdx}
        onChange={handleSlider}
        className="flex-1 min-w-0 h-1.5 cursor-pointer accent-amber-700"
        style={{ accentColor: PALETTE.honey }}
        aria-label="Timeline position"
      />

      {/* Forward one step */}
      <button
        type="button"
        onClick={handleForward}
        disabled={isLive}
        className="flex-shrink-0 flex items-center justify-center rounded border text-xs font-bold disabled:opacity-30"
        style={{ width: 22, height: 28, background: PALETTE.parchmentWarm, borderColor: PALETTE.stone, color: PALETTE.stone }}
        aria-label="Step forward"
      >
        ›
      </button>

      {/* Step label + LIVE indicator */}
      <div className="flex-shrink-0 flex items-center gap-1.5 text-[11px]" style={{ color: PALETTE.stoneSoft, minWidth: '5rem' }}>
        <span className="tabular-nums font-bold" style={{ color: PALETTE.stone }}>
          s{displayStep}
        </span>
        {isLive ? (
          <span
            className="rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider"
            style={{ background: PALETTE.moss, color: PALETTE.parchment }}
          >
            LIVE
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setViewingStep(null)}
            className="rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider hover:opacity-80"
            style={{ background: PALETTE.stoneSoft, color: PALETTE.parchment, border: 'none', cursor: 'pointer' }}
          >
            LIVE ›
          </button>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
//   Creature inspector panel
// ═════════════════════════════════════════════════════════════════════════

function CreatureInspector({
  agent,
  onClose,
  currentStep,
}: {
  agent: AgentSnapshot;
  onClose: () => void;
  currentStep: number;
}) {
  const role = getRole(agent.type);
  const archetype = getArchetype(agent.type);
  const hallName = ARCHETYPE_HALL[archetype];
  const hallColor = ARCHETYPE_COLOR[archetype];

  const hasVote = agent.lastVote !== null;
  const isRecent = hasVote && currentStep - agent.lastVoteStep < 8;

  // Stat bar helper
  function StatBar({ label, value, max = 1, color }: { label: string; value: number; max?: number; color: string }) {
    const pct = Math.min(1, Math.max(0, value / max));
    return (
      <div className="flex items-center gap-2 text-[11px]">
        <span className="w-20 text-right opacity-70" style={{ color: PALETTE.stoneSoft }}>{label}</span>
        <div className="flex-1 rounded-sm overflow-hidden" style={{ background: PALETTE.parchmentWarm, height: 6 }}>
          <div style={{ width: `${pct * 100}%`, height: '100%', background: color, borderRadius: 2 }} />
        </div>
        <span className="w-10 tabular-nums" style={{ color: PALETTE.stone }}>
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
        background: PALETTE.parchment,
        borderColor: PALETTE.stone,
        fontFamily: 'Georgia, serif',
        boxShadow: `-4px 0 16px rgba(31,25,18,0.18)`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-3 py-2"
        style={{ borderColor: PALETTE.stone, background: PALETTE.parchmentWarm }}
      >
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: hallColor }}>
            {hallName}
          </div>
          <div className="text-sm font-bold leading-tight" style={{ color: PALETTE.stone }}>
            {role.name}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold hover:opacity-70"
          style={{ background: PALETTE.parchmentCool, color: PALETTE.stone }}
          aria-label="Close inspector"
        >
          ×
        </button>
      </div>

      {/* Flavor */}
      <div className="px-3 pt-2 pb-1.5 text-[11px] italic leading-snug" style={{ color: PALETTE.stoneSoft }}>
        "{role.flavor}"
      </div>

      {/* Vote status */}
      <div
        className="mx-3 mb-2 rounded-sm border px-2.5 py-1.5 text-xs"
        style={{
          borderColor: hasVote ? (agent.lastVote ? PALETTE.voteFor : PALETTE.voteAgainst) : PALETTE.parchmentWarm,
          background: hasVote ? (agent.lastVote ? `${PALETTE.voteFor}18` : `${PALETTE.voteAgainst}18`) : PALETTE.parchmentWarm,
        }}
      >
        {hasVote ? (
          <span style={{ color: agent.lastVote ? PALETTE.voteFor : PALETTE.voteAgainst }}>
            {agent.lastVote ? '■ Voted FOR' : '■ Voted AGAINST'}
            {isRecent && <span className="ml-1 opacity-70">(just now)</span>}
          </span>
        ) : (
          <span className="opacity-60" style={{ color: PALETTE.stoneSoft }}>○ Not yet voted</span>
        )}
      </div>

      {/* Stats */}
      <div className="flex flex-col gap-1.5 px-3 pb-3">
        <div className="mb-0.5 text-[10px] uppercase tracking-widest opacity-60" style={{ color: PALETTE.stoneSoft }}>
          Vitals
        </div>
        <StatBar label="Tokens" value={agent.tokens} max={20000} color={PALETTE.honey} />
        <StatBar label="Reputation" value={agent.reputation} max={1} color={PALETTE.moss} />
        <StatBar label="Optimism" value={agent.optimism} max={1} color={PALETTE.teal} />
        {(agent.voterFatigue ?? 0) > 0 && (
          <StatBar label="Fatigue" value={agent.voterFatigue ?? 0} max={1} color={PALETTE.blood} />
        )}
        {agent.stakedTokens > 0 && (
          <StatBar label="Staked" value={agent.stakedTokens} max={20000} color={PALETTE.fGovernance} />
        )}

        <div className="mt-2 mb-0.5 text-[10px] uppercase tracking-widest opacity-60" style={{ color: PALETTE.stoneSoft }}>
          Activity
        </div>
        <div className="text-[11px] flex justify-between" style={{ color: PALETTE.stoneSoft }}>
          <span>Votes cast</span>
          <span className="font-bold tabular-nums" style={{ color: PALETTE.stone }}>{agent.totalVotesCast}</span>
        </div>
        <div className="text-[11px] flex justify-between" style={{ color: PALETTE.stoneSoft }}>
          <span>Last vote</span>
          <span className="font-bold tabular-nums" style={{ color: PALETTE.stone }}>
            {hasVote ? `s${agent.lastVoteStep}` : '—'}
          </span>
        </div>
        {agent.delegateTo && (
          <div className="text-[11px] flex justify-between" style={{ color: PALETTE.stoneSoft }}>
            <span>Delegates to</span>
            <span className="font-bold tabular-nums text-right truncate ml-2" style={{ color: PALETTE.stone, maxWidth: '5rem' }}>
              {agent.delegateTo}
            </span>
          </div>
        )}
      </div>

      {/* Agent type chip at bottom */}
      <div className="mt-auto border-t px-3 py-2" style={{ borderColor: PALETTE.parchmentWarm }}>
        <span
          className="rounded-sm border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest"
          style={{ background: `${hallColor}22`, borderColor: hallColor, color: hallColor }}
        >
          {agent.type}
        </span>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
//   Utils
// ═════════════════════════════════════════════════════════════════════════

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

// ═════════════════════════════════════════════════════════════════════════
//   Root
// ═════════════════════════════════════════════════════════════════════════

export interface BannerSagaSceneProps {
  snapshot?: SimulationSnapshot | null;
}

export function BannerSagaScene({ snapshot: snapshotProp }: BannerSagaSceneProps = {}) {
  const liveSnapshot = useActiveSnapshot();
  const snapshot = snapshotProp !== undefined ? snapshotProp : liveSnapshot;
  const isPreview = snapshotProp !== undefined;

  // ── Zoom / pan ──────────────────────────────────────────────────────────
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const lastTouchDist = useRef<number | null>(null);
  const lastTouchPan = useRef<{ cx: number; cy: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setZoom(z => {
      const delta = e.deltaY < 0 ? 1.1 : 0.91;
      return Math.max(0.4, Math.min(3.0, z * delta));
    });
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
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    setPan({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
  }, []);

  const handleMouseUp = useCallback(() => { dragStart.current = null; }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.hypot(dx, dy);
      lastTouchPan.current = {
        cx: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        cy: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scale = dist / lastTouchDist.current;
      setZoom(z => Math.max(0.4, Math.min(3.0, z * scale)));
      lastTouchDist.current = dist;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = null;
    lastTouchPan.current = null;
  }, []);

  // ── Ceremony tracking ───────────────────────────────────────────────────
  // Map<agentId, stepWhenCeremonyStarted>
  const [ceremonies, setCeremonies] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (!snapshot) return;
    const cs = snapshot.step;
    setCeremonies(prev => {
      let changed = false;
      const next = new Map(prev);
      for (const a of snapshot.agents) {
        if (a.lastVoteStep === cs && !next.has(a.id)) {
          next.set(a.id, cs);
          changed = true;
        }
      }
      // Expire after 2 steps
      for (const [id, step] of next) {
        if (cs - step > 2) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [snapshot?.step]);

  // ── Book-shelving (Beavers) ─────────────────────────────────────────────
  const [shelving, setShelving] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!snapshot) return;
    if (snapshot.step % 7 !== 0) return;
    const beavers = snapshot.agents
      .filter(a => getArchetype(a.type) === 'craft')
      .map(a => a.id);
    if (beavers.length === 0) return;
    const idx1 = snapshot.step % beavers.length;
    const idx2 = (snapshot.step + 2) % beavers.length;
    setShelving(new Set([beavers[idx1], beavers[idx2 !== idx1 ? idx2 : (idx1 + 1) % beavers.length]]));
    const t = setTimeout(() => setShelving(new Set()), 1800);
    return () => clearTimeout(t);
  }, [snapshot?.step]);

  // ── Creature inspector ──────────────────────────────────────────────────
  const [inspectedAgentId, setInspectedAgentId] = useState<string | null>(null);
  const inspectedAgent = snapshot?.agents.find(a => a.id === inspectedAgentId) ?? null;

  // Clear inspector if agent disappears
  useEffect(() => {
    if (!inspectedAgentId || !snapshot) return;
    if (!snapshot.agents.find(a => a.id === inspectedAgentId)) {
      setInspectedAgentId(null);
    }
  }, [snapshot, inspectedAgentId]);

  // ── Placement + ribbon offsets ──────────────────────────────────────────
  const placements = useMemo(() => {
    if (!snapshot) return [];
    return placeCreatures(
      snapshot.agents,
      ceremonies,
      shelving,
      snapshot.step,
    ).sort((a, b) => a.ty - b.ty);
  }, [snapshot, ceremonies, shelving]);

  const ribbonOffsets = useMemo(
    () => computeRibbonOffsets(placements),
    [placements]
  );

  // ── Active proposal ─────────────────────────────────────────────────────
  const activeProposal = snapshot
    ? (snapshot.proposals.find(p => p.status === 'open' || p.status === 'voting') ??
       snapshot.proposals[snapshot.proposals.length - 1] ?? null)
    : null;

  // ── Null state ──────────────────────────────────────────────────────────
  if (!snapshot) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: PALETTE.parchment, color: PALETTE.stoneSoft }}>
        <p className="text-sm italic opacity-70" style={{ fontFamily: 'Georgia, serif' }}>The atrium is dark…</p>
      </div>
    );
  }

  const blackSwanActive = snapshot.blackSwan.active;
  const isDragging = zoom > 1;

  return (
    <div
      data-scene="living-archive-iso"
      className="relative h-full w-full overflow-hidden select-none"
      ref={containerRef}
      style={{
        fontFamily: 'Georgia, serif',
        background: PALETTE.parchment,
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
        aria-hidden="false"
        style={{
          position: 'absolute', inset: 0,
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
      >
        {/* Paper wash background */}
        <svg aria-hidden="true" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="wash-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PALETTE.parchmentWarm} />
              <stop offset="40%" stopColor={PALETTE.parchment} />
              <stop offset="100%" stopColor={PALETTE.parchmentCool} />
            </linearGradient>
            <filter id="paper-bg" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="13" />
              <feColorMatrix type="matrix" values="0 0 0 0 0.22  0 0 0 0 0.14  0 0 0 0 0.08  0 0 0 0.12 0" />
              <feComposite in2="SourceGraphic" operator="in" />
            </filter>
          </defs>
          <rect width="100%" height="100%" fill="url(#wash-bg)" />
          <rect width="100%" height="100%" filter="url(#paper-bg)" opacity="0.28" />
        </svg>

        {/* Main isometric scene SVG */}
        <svg
          aria-label="Isometric view of the Living Archive atrium"
          className="absolute inset-0 h-full w-full"
          viewBox="-500 -240 1000 720"
          preserveAspectRatio="xMidYMid meet"
        >
          <SceneDefs />

          <g transform="translate(0 -40)">
            {/* Architecture (back to front) */}
            <RearWall />
            <AtriumFloor />

            <IsoBookshelf tx={0.4} ty={0.6} w={1.4} />
            <IsoBookshelf tx={8.2} ty={0.6} w={1.4} />
            <IsoBookshelf tx={0.4} ty={3.2} w={1.4} />
            <IsoBookshelf tx={8.2} ty={3.2} w={1.4} />

            <IsoLectern tx={5} ty={5} proposal={activeProposal} memberCount={snapshot.memberCount} />

            <IsoPool tx={6.8} ty={8} treasury={snapshot.treasuryFunds} />

            <IsoHearth tx={2} ty={8.2} />

            {/* Creatures — depth-sorted */}
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

            {/* Black Swan rain (topmost in scene so it falls over everything) */}
            <RainOverlay active={blackSwanActive} />
          </g>
        </svg>
      </div>

      {/* HTML overlays — NOT inside the zoom wrapper so they stay crisp */}
      <HeaderOverlay snap={snapshot} />
      <LegendOverlay />
      <FireLog events={snapshot.recentEvents} />

      <ZoomControls zoom={zoom} onZoom={(z) => { setZoom(z); if (z === 1) setPan({ x: 0, y: 0 }); }} />

      {/* Help button — absolute, above scrubber, clear of toolbar */}
      <HelpButton />

      {/* Creature inspector side-panel */}
      {inspectedAgent && (
        <CreatureInspector
          agent={inspectedAgent}
          onClose={() => setInspectedAgentId(null)}
          currentStep={snapshot.step}
        />
      )}

      {/* Timeline scrubber — only in live mode */}
      {!isPreview && <TimelineScrubber />}

      {/* Scene animations */}
      <style jsx global>{`
        /* Idle breathing */
        @keyframes creature-breath-kf {
          0%,100% { transform: translateY(0) scaleY(1); }
          50%      { transform: translateY(-0.7px) scaleY(1.016); }
        }
        .creature-breath {
          animation: creature-breath-kf 3.5s ease-in-out infinite;
          will-change: transform;
        }

        /* Walking bob — plays 3 cycles when triggered */
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

        /* Vote ceremony glow pulse */
        @keyframes ceremony-glow-kf {
          0%,100% { opacity: 0.4; r: 28; }
          50%     { opacity: 0.65; r: 34; }
        }
        .ceremony-glow {
          animation: ceremony-glow-kf 0.7s ease-in-out infinite;
        }

        /* Hearth flicker */
        @keyframes hearth-flicker-kf {
          0%,100% { transform: scaleY(1) translateY(0); opacity: 1; }
          50%     { transform: scaleY(1.08) translateY(-0.5px); opacity: 0.92; }
        }
        .hearth-flicker { animation: hearth-flicker-kf 0.8s ease-in-out infinite; }
        .hearth-flicker-inner { animation: hearth-flicker-kf 0.6s ease-in-out infinite; animation-delay: -0.3s; }

        /* Rain */
        @keyframes rain-fall-kf {
          0%   { transform: translateY(0px);   opacity: 0.6; }
          100% { transform: translateY(750px);  opacity: 0.1; }
        }
        .rain-drop {
          animation: rain-fall-kf 0.5s linear infinite;
        }

        /* Storm tint pulse */
        @keyframes storm-tint-kf {
          0%,100% { opacity: 0.1; }
          50%     { opacity: 0.18; }
        }
        .storm-tint { animation: storm-tint-kf 3s ease-in-out infinite; }

        /* Lightning */
        @keyframes lightning-kf {
          0%,88%,100% { opacity: 0; }
          90%  { opacity: 0.22; }
          92%  { opacity: 0; }
          94%  { opacity: 0.15; }
          96%  { opacity: 0; }
        }
        .lightning-flash { animation: lightning-kf 5s ease-in-out infinite; }

        /* Reduce motion */
        @media (prefers-reduced-motion: reduce) {
          .creature-breath, .creature-walk, .ceremony-glow,
          .hearth-flicker, .hearth-flicker-inner,
          .rain-drop, .storm-tint, .lightning-flash { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
