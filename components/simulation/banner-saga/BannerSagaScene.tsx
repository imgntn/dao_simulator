'use client';

/**
 * The Living Archive — isometric scene.
 *
 * You're standing at the entrance to a solarpunk library, looking down
 * and into the atrium in 2:1 oblique projection. Creatures move among
 * bookshelves, a central lectern, a reflecting pool, and a stone hearth.
 *
 * All drawn as one big SVG so everything shares a coordinate space and
 * proper z-order (depth-sorted by ty, then by element priority).
 *
 * Scope of this pass:
 *  - Isometric atrium built
 *  - 5 species, 25 creatures placed by hall
 *  - Always-visible role-name ribbons above each creature
 *  - Vote banner in paw (FOR/AGAINST/none)
 *  - Idle breathing animation, staggered
 *  - Overlaid UI: help button, step+pool+token readouts, color key
 *
 * Deferred:
 *  - Walking between stations (next pass)
 *  - Shelving animation (next pass)
 *  - Timeline scrubber (next pass; will wire to store's viewingStep)
 */

import { useMemo } from 'react';
import { useActiveSnapshot } from '@/lib/browser/useActiveSnapshot';
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
  ARCHETYPE_HALL_DESC,
  getArchetype,
  type Archetype,
} from './palette';
import { Tooltip } from './Tooltip';
import { HelpButton } from './HelpButton';
import { Creature } from './Creatures';

// ═════════════════════════════════════════════════════════════════════════
//   Iso projection helpers
// ═════════════════════════════════════════════════════════════════════════

const TILE_W = 80;
const TILE_H = 40;

/** Convert tile coords (column, row) to screen (x, y). 0,0 at atrium center. */
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

      {/* Floor — stone tiles with a subtle warm gradient */}
      <linearGradient id="floorTile" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={PALETTE.parchmentWarm} />
        <stop offset="100%" stopColor={PALETTE.parchmentCool} />
      </linearGradient>

      {/* Wood for shelves / lectern */}
      <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7A4A22" />
        <stop offset="55%" stopColor="#5C381A" />
        <stop offset="100%" stopColor="#3E2410" />
      </linearGradient>
      <linearGradient id="woodFace" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#6A3E1C" />
        <stop offset="100%" stopColor="#3E2410" />
      </linearGradient>

      {/* Water */}
      <radialGradient id="water" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor={PALETTE.gold} stopOpacity="0.55" />
        <stop offset="40%" stopColor={PALETTE.teal} stopOpacity="0.65" />
        <stop offset="100%" stopColor={PALETTE.teal} stopOpacity="0.95" />
      </radialGradient>

      {/* Hearth ember */}
      <radialGradient id="ember" cx="50%" cy="60%" r="60%">
        <stop offset="0%" stopColor={PALETTE.lampBloom} />
        <stop offset="40%" stopColor={PALETTE.flame} />
        <stop offset="100%" stopColor={PALETTE.blood} stopOpacity="0.15" />
      </radialGradient>

      {/* Stained-glass rose */}
      <radialGradient id="stainedRose" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={PALETTE.lampBloom} />
        <stop offset="35%" stopColor={PALETTE.honey} />
        <stop offset="65%" stopColor={PALETTE.voteFor} />
        <stop offset="100%" stopColor={PALETTE.voteAgainst} />
      </radialGradient>

      {/* Book spine colour variations for shelf pattern */}
      <pattern id="bookspines" x="0" y="0" width="60" height="14" patternUnits="userSpaceOnUse">
        {bookSpines().map((b, i) => (
          <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} fill={b.fill} stroke={PALETTE.ink} strokeWidth="0.3" />
        ))}
      </pattern>
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

/** Atrium is a 10x10 tile floor. We draw tile grid for depth cues. */
function AtriumFloor() {
  const cols = 10;
  const rows = 10;
  // Four corners of the floor
  const a = iso(0, 0);
  const b = iso(cols, 0);
  const c = iso(cols, rows);
  const d = iso(0, rows);
  return (
    <g>
      {/* Big floor diamond */}
      <polygon
        points={`${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y} ${d.x},${d.y}`}
        fill="url(#floorTile)"
        stroke={PALETTE.stoneSoft}
        strokeWidth="1.2"
      />
      {/* Tile grid lines — subtle */}
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
      {/* Center medallion — inlaid sunburst */}
      {(() => {
        const c = iso(5, 5);
        return (
          <g transform={`translate(${c.x} ${c.y})`}>
            <circle cx="0" cy="0" r="32" fill="none" stroke={PALETTE.honey} strokeWidth="0.8" opacity="0.4" />
            <circle cx="0" cy="0" r="18" fill="none" stroke={PALETTE.honey} strokeWidth="0.6" opacity="0.5" />
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i / 8) * Math.PI * 2;
              return (
                <line
                  key={i}
                  x1={Math.cos(a) * 18 * 1}
                  y1={Math.sin(a) * 18 * 0.5}
                  x2={Math.cos(a) * 32 * 1}
                  y2={Math.sin(a) * 32 * 0.5}
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

/** Rear wall with stained glass rose */
function RearWall() {
  const back = iso(0, 0);
  const backRight = iso(10, 0);
  const wallH = 140;
  return (
    <g>
      {/* Wall plane — a band above the back edge of the floor */}
      <rect
        x={back.x}
        y={back.y - wallH}
        width={backRight.x - back.x}
        height={wallH}
        fill={PALETTE.parchmentCool}
        stroke={PALETTE.stoneSoft}
        strokeWidth="1"
      />
      {/* Stone courses */}
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

      {/* Stained-glass rose centered high on wall */}
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
            {/* Warm sunbeam pouring down under the rose */}
            <path
              d={`M${cx - 22} ${cy + 18} L${cx + 22} ${cy + 18} L${cx + 40} ${back.y + 10} L${cx - 40} ${back.y + 10} Z`}
              fill={PALETTE.lampBloom}
              opacity="0.22"
            />
          </g>
        );
      })()}

      {/* Hanging vines down wall edges */}
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
//   In-scene objects: bookshelves, lectern, pool, hearth
// ═════════════════════════════════════════════════════════════════════════

/**
 * IsoBookshelf — draws as a 3D-looking object in 2:1 oblique projection.
 * Positioned at tile (tx, ty). Books render inside the front face.
 */
function IsoBookshelf({ tx, ty, w = 2 }: { tx: number; ty: number; w?: number }) {
  const base = iso(tx, ty);
  const right = iso(tx + w, ty);
  const back = iso(tx, ty - 0.9);
  const backRight = iso(tx + w, ty - 0.9);
  const height = 60;

  return (
    <g>
      {/* Shadow under */}
      <ellipse cx={(base.x + right.x) / 2} cy={base.y + 6} rx={(right.x - base.x) / 2 + 6} ry="4" fill={PALETTE.ink} opacity="0.2" />

      {/* Right side panel (wood) */}
      <polygon
        points={`${right.x},${right.y} ${right.x},${right.y - height} ${backRight.x},${backRight.y - height} ${backRight.x},${backRight.y}`}
        fill="url(#woodFace)" stroke={PALETTE.ink} strokeWidth="0.9"
      />
      {/* Top */}
      <polygon
        points={`${base.x},${base.y - height} ${right.x},${right.y - height} ${backRight.x},${backRight.y - height} ${back.x},${back.y - height}`}
        fill="url(#wood)" stroke={PALETTE.ink} strokeWidth="0.9"
      />
      {/* Front face */}
      <polygon
        points={`${base.x},${base.y} ${right.x},${right.y} ${right.x},${right.y - height} ${base.x},${base.y - height}`}
        fill="url(#wood)" stroke={PALETTE.ink} strokeWidth="0.9"
      />
      {/* Shelves with book spines — 3 rows */}
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
            {/* plank */}
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

/** IsoLectern — wooden reading stand in the atrium center */
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
      {/* Shadow */}
      <ellipse cx={base.x} cy={base.y + 4} rx="22" ry="6" fill={PALETTE.ink} opacity="0.25" />
      {/* Base block (wood) */}
      <polygon
        points={`${base.x - 14},${base.y} ${base.x + 14},${base.y} ${base.x + 10},${base.y - 26} ${base.x - 10},${base.y - 26}`}
        fill="url(#wood)" stroke={PALETTE.ink} strokeWidth="1" strokeLinejoin="round"
      />
      {/* Lectern top — angled reading surface */}
      <polygon
        points={`${base.x - 16},${base.y - 28} ${base.x + 16},${base.y - 28} ${base.x + 12},${base.y - 40} ${base.x - 12},${base.y - 40}`}
        fill="url(#woodFace)" stroke={PALETTE.ink} strokeWidth="1"
      />
      {/* Open book on top — two pages */}
      {proposal ? (
        <g>
          {/* Left page */}
          <polygon
            points={`${book.x - 15},${book.y} ${book.x},${book.y - 2} ${book.x},${book.y - 16} ${book.x - 15},${book.y - 14}`}
            fill={PALETTE.parchment} stroke={PALETTE.stone} strokeWidth="0.8"
          />
          {/* Right page */}
          <polygon
            points={`${book.x},${book.y - 2} ${book.x + 15},${book.y} ${book.x + 15},${book.y - 14} ${book.x},${book.y - 16}`}
            fill={PALETTE.parchment} stroke={PALETTE.stone} strokeWidth="0.8"
          />
          {/* Ruled lines on left page */}
          <line x1={book.x - 13} y1={book.y - 12} x2={book.x - 2} y2={book.y - 13} stroke={PALETTE.stoneSoft} strokeWidth="0.3" />
          <line x1={book.x - 13} y1={book.y - 9} x2={book.x - 2} y2={book.y - 10} stroke={PALETTE.stoneSoft} strokeWidth="0.3" />
          <line x1={book.x - 13} y1={book.y - 6} x2={book.x - 2} y2={book.y - 7} stroke={PALETTE.stoneSoft} strokeWidth="0.3" />
          {/* Gold drop-cap */}
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
          {/* Gold ribbon */}
          <rect x={book.x + 5} y={book.y - 16} width="2" height="16" fill={PALETTE.gold} stroke={PALETTE.ink} strokeWidth="0.3" />

          {/* Vote tally beneath */}
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

/** IsoPool — shallow reflecting pool inlaid in the floor */
function IsoPool({ tx, ty, treasury }: { tx: number; ty: number; treasury: number }) {
  const c = iso(tx + 1, ty + 1);
  return (
    <g>
      {/* Pool basin */}
      <ellipse cx={c.x} cy={c.y} rx="44" ry="22" fill={PALETTE.stoneSoft} stroke={PALETTE.stone} strokeWidth="1" />
      <ellipse cx={c.x} cy={c.y} rx="40" ry="19" fill="url(#water)" />
      {/* Ripples */}
      <ellipse cx={c.x} cy={c.y} rx="28" ry="13" fill="none" stroke={PALETTE.parchmentWarm} strokeWidth="0.5" opacity="0.55" />
      <ellipse cx={c.x} cy={c.y} rx="18" ry="8" fill="none" stroke={PALETTE.parchmentWarm} strokeWidth="0.4" opacity="0.5" />
      <ellipse cx={c.x - 12} cy={c.y - 5} rx="6" ry="3" fill="none" stroke={PALETTE.lampBloom} strokeWidth="0.4" opacity="0.7" />
      {/* Glints */}
      <circle cx={c.x - 15} cy={c.y - 7} r="1" fill={PALETTE.lampBloom} />
      <circle cx={c.x + 8} cy={c.y + 3} r="0.8" fill={PALETTE.lampBloom} />
      {/* Treasury readout floating above */}
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

/** IsoHearth — stone fireplace with animated flames */
function IsoHearth({ tx, ty }: { tx: number; ty: number }) {
  const base = iso(tx, ty);
  return (
    <g>
      {/* Shadow */}
      <ellipse cx={base.x} cy={base.y + 4} rx="22" ry="5" fill={PALETTE.ink} opacity="0.25" />
      {/* Hearth stone base */}
      <polygon
        points={`${base.x - 22},${base.y} ${base.x + 22},${base.y} ${base.x + 18},${base.y - 12} ${base.x - 18},${base.y - 12}`}
        fill={PALETTE.stoneSoft} stroke={PALETTE.stone} strokeWidth="0.9"
      />
      {/* Chimney back */}
      <rect x={base.x - 16} y={base.y - 50} width="32" height="40" fill={PALETTE.stoneSoft} stroke={PALETTE.stone} strokeWidth="0.9" />
      {/* Stone block detail */}
      <line x1={base.x - 16} y1={base.y - 30} x2={base.x + 16} y2={base.y - 30} stroke={PALETTE.stone} strokeWidth="0.5" opacity="0.6" />
      <line x1={base.x} y1={base.y - 50} x2={base.x} y2={base.y - 30} stroke={PALETTE.stone} strokeWidth="0.5" opacity="0.5" />
      {/* Fire cavity */}
      <polygon
        points={`${base.x - 12},${base.y - 10} ${base.x + 12},${base.y - 10} ${base.x + 10},${base.y - 32} ${base.x - 10},${base.y - 32}`}
        fill={PALETTE.ink}
      />
      {/* Ember glow */}
      <ellipse cx={base.x} cy={base.y - 16} rx="10" ry="4" fill="url(#ember)" opacity="0.9" />
      {/* Flames */}
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
      {/* Logs */}
      <rect x={base.x - 11} y={base.y - 12} width="22" height="3" fill="#4A2E18" stroke={PALETTE.ink} strokeWidth="0.4" rx="1" />
      <rect x={base.x - 9} y={base.y - 15} width="18" height="2.5" fill="#5A3A22" stroke={PALETTE.ink} strokeWidth="0.4" rx="1" />
      <title>The Hearth — recent events flicker here</title>
    </g>
  );
}

// ═════════════════════════════════════════════════════════════════════════
//   Creature placement across the floor
// ═════════════════════════════════════════════════════════════════════════

/**
 * Each archetype gets a cluster of tile positions distributed across
 * the atrium. Inside each cluster, creatures are placed sequentially.
 * These are hand-tuned so the scene composes well: clusters don't
 * overlap each other or the central objects.
 */
const HALL_STATIONS: Record<Archetype, Array<[number, number]>> = {
  // The Chamber — back-left quarter (near lectern behind)
  governance: [
    [1.4, 2.6], [2.6, 1.6], [3.6, 2.8], [1.6, 4.0], [2.8, 4.2], [3.8, 5.2],
  ],
  // The Long Table — back-right quarter
  council: [
    [6.2, 1.6], [7.4, 2.6], [6.4, 3.8], [7.6, 4.0], [8.6, 2.8],
  ],
  // The Cambium — front-right (treasury / pool zone)
  treasury: [
    [7.2, 6.4], [8.4, 7.0], [6.2, 7.4], [8.0, 5.8], [6.8, 5.6], [7.8, 8.2],
  ],
  // The Workshop — front-left (craft / shelves)
  craft: [
    [1.4, 6.6], [2.6, 7.4], [1.8, 8.2], [3.4, 6.4], [3.2, 8.2],
  ],
  // The Stacks — middle-low (passive, by the pool edge)
  passive: [
    [4.6, 8.4], [5.6, 8.6], [5.2, 7.6],
  ],
};

function placeCreatures(agents: AgentSnapshot[]) {
  const grouped: Record<Archetype, AgentSnapshot[]> = {
    governance: [], treasury: [], craft: [], council: [], passive: [],
  };
  for (const a of agents) grouped[getArchetype(a.type)].push(a);

  const placements: Array<{ agent: AgentSnapshot; x: number; y: number; ty: number; idx: number }> = [];
  for (const arch of ['governance', 'council', 'treasury', 'craft', 'passive'] as Archetype[]) {
    const bucket = grouped[arch];
    const stations = HALL_STATIONS[arch];
    bucket.forEach((agent, i) => {
      const [tx, ty] = stations[i % stations.length];
      // Small deterministic jitter for variation within a station
      const seed = (agent.id.length * 7 + i * 13) % 997;
      const jitterX = ((seed % 7) - 3) * 0.08;
      const jitterY = ((seed % 5) - 2) * 0.06;
      const { x, y } = iso(tx + jitterX, ty + jitterY);
      placements.push({ agent, x, y, ty: ty + jitterY, idx: i });
    });
  }
  return placements;
}

// ═════════════════════════════════════════════════════════════════════════
//   UI overlays — header, help, color key
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
          background: `rgba(242,232,208,0.85)`,
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
              ⚡ {snap.blackSwan.name ?? 'Storm'}
            </span>
          </Tooltip>
        )}
      </div>
      {/* Help button is positioned separately (fixed) so no need to reserve space here */}
    </div>
  );
}

function Chip({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 cursor-help">
      <span className="text-[10px] uppercase tracking-widest opacity-60">{label}</span>
      <span className="font-bold tabular-nums" style={{ color: accent ?? PALETTE.ink }}>{value}</span>
    </span>
  );
}

function LegendOverlay() {
  return (
    <div
      className="pointer-events-auto absolute left-3 bottom-3 z-20 rounded-sm border px-2.5 py-1.5 text-[10px] sm:left-4 sm:bottom-4"
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
              Each creature is a steward. A small <strong>banner</strong> in their paw shows their vote on the open proposal: terracotta FOR, indigo AGAINST, none if they haven't voted.
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
      className="pointer-events-auto absolute right-3 bottom-3 z-20 max-w-[min(320px,50vw)] rounded-sm border px-2.5 py-1.5 text-[11px] sm:right-4 sm:bottom-4"
      style={{
        background: 'rgba(62,53,40,0.85)',
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

  if (!snapshot) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: PALETTE.parchment, color: PALETTE.stoneSoft }}>
        <p className="text-sm italic opacity-70" style={{ fontFamily: 'Georgia, serif' }}>The atrium is dark…</p>
      </div>
    );
  }

  const activeProposal =
    snapshot.proposals.find(p => p.status === 'open' || p.status === 'voting') ??
    snapshot.proposals[snapshot.proposals.length - 1] ??
    null;

  // Depth-sorted creature placements so creatures further back render under closer ones
  const placements = useMemo(
    () => placeCreatures(snapshot.agents).sort((a, b) => a.ty - b.ty),
    [snapshot.agents]
  );

  return (
    <div
      data-scene="living-archive-iso"
      className="relative h-full w-full overflow-hidden"
      style={{ fontFamily: 'Georgia, serif', background: PALETTE.parchment }}
    >
      {/* Paper wash behind everything */}
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <rect width="100%" height="100%" fill="url(#wash)" />
        <rect width="100%" height="100%" fill="url(#sunbeam)" />
        <rect width="100%" height="100%" filter="url(#paper)" opacity="0.32" />
      </svg>

      {/* Main isometric scene */}
      <svg
        aria-label="Isometric view of the Living Archive atrium"
        className="absolute inset-0 h-full w-full"
        viewBox="-500 -240 1000 720"
        preserveAspectRatio="xMidYMid meet"
      >
        <SceneDefs />

        {/* Centered on viewBox */}
        <g transform="translate(0 -40)">
          <RearWall />
          <AtriumFloor />

          {/* Back-row shelves (far corners) — drawn before creatures so they occlude properly */}
          <IsoBookshelf tx={0.4} ty={0.6} w={1.4} />
          <IsoBookshelf tx={8.2} ty={0.6} w={1.4} />
          <IsoBookshelf tx={0.4} ty={3.2} w={1.4} />
          <IsoBookshelf tx={8.2} ty={3.2} w={1.4} />

          {/* Central lectern */}
          <IsoLectern tx={5} ty={5} proposal={activeProposal} memberCount={snapshot.memberCount} />

          {/* Pool front-right */}
          <IsoPool tx={6.8} ty={8} treasury={snapshot.treasuryFunds} />

          {/* Hearth front-left */}
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
            />
          ))}
        </g>
      </svg>

      {/* UI overlays */}
      <HeaderOverlay snap={snapshot} />
      <HelpButton />
      <LegendOverlay />
      <FireLog events={snapshot.recentEvents} />

      {/* Scene animations */}
      <style jsx global>{`
        @keyframes creature-breath-kf {
          0%,100% { transform: translateY(0) scaleY(1); }
          50%     { transform: translateY(-0.6px) scaleY(1.015); }
        }
        .creature-breath {
          animation: creature-breath-kf 3.5s ease-in-out infinite;
          will-change: transform;
        }
        @keyframes hearth-flicker-kf {
          0%,100% { transform: scaleY(1) translateY(0); opacity: 1; }
          50%     { transform: scaleY(1.08) translateY(-0.5px); opacity: 0.92; }
        }
        .hearth-flicker {
          animation: hearth-flicker-kf 0.8s ease-in-out infinite;
        }
        .hearth-flicker-inner {
          animation: hearth-flicker-kf 0.6s ease-in-out infinite;
          animation-delay: -0.3s;
        }
        @media (prefers-reduced-motion: reduce) {
          .creature-breath, .hearth-flicker, .hearth-flicker-inner { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
