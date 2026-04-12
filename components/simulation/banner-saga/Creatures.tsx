'use client';

/**
 * Creature sprites for The Living Archive.
 *
 * Each of the five halls is a different species. Every creature renders
 * as a distinct SVG silhouette, tinted by archetype color, with its
 * in-world role name floating above on a parchment ribbon. A small
 * vote banner in the creature's paw shows vote state (terracotta FOR,
 * indigo AGAINST, none if not yet voted).
 *
 * All shapes are drawn in a compact 60x80 viewBox so they compose cleanly
 * into the isometric scene.
 */

import type { AgentSnapshot } from '@/lib/browser/worker-protocol';
import { PALETTE, getArchetype, type Archetype } from './palette';
import { getRole } from './roles';

export interface CreatureProps {
  agent: AgentSnapshot;
  x: number;               // iso screen x
  y: number;               // iso screen y
  currentStep: number;
  idx: number;             // for stagger
}

/**
 * Entry point — renders the right species for the agent's archetype,
 * positioned at (x, y) in the scene's SVG coordinate space. Includes
 * name ribbon + vote banner.
 */
export function Creature({ agent, x, y, currentStep, idx }: CreatureProps) {
  const role = getRole(agent.type);
  const archetype = getArchetype(agent.type);
  const hasVote = agent.lastVote !== null;
  const isRecent = hasVote && currentStep - agent.lastVoteStep < 8;
  const flagColor = agent.lastVote === true
    ? PALETTE.voteFor
    : agent.lastVote === false
    ? PALETTE.voteAgainst
    : null;

  // Stagger breathing so creatures don't pulse in unison
  const breathDelay = `${(idx % 9) * -0.7}s`;

  // Name ribbon width scales with name length (rough approximation)
  const ribbonW = Math.max(48, Math.min(120, role.name.length * 5.2));
  const ribbonH = 11;
  const ribbonY = -16;

  return (
    <g transform={`translate(${x} ${y})`}>
      {/* Soft shadow on ground */}
      <ellipse
        cx="0" cy="44" rx="14" ry="3.5"
        fill={PALETTE.ink} opacity="0.25"
      />

      {/* Recent-vote glow */}
      {isRecent && (
        <circle
          cx="0" cy="15" r="26"
          fill={PALETTE.lampBloom} opacity="0.4"
          style={{ filter: 'blur(4px)' }}
        />
      )}

      {/* The creature body — animated by CSS breathing */}
      <g className="creature-breath" style={{ animationDelay: breathDelay, transformOrigin: '0 40px' }}>
        <CreatureBody archetype={archetype} />
        {/* Vote banner in the paw */}
        {flagColor && <VoteFlag color={flagColor} isRecent={isRecent} />}
      </g>

      {/* Always-visible name ribbon */}
      <g transform={`translate(0 ${ribbonY})`}>
        {/* Ribbon shape */}
        <path
          d={`M${-ribbonW/2 - 4} 0 L${-ribbonW/2} ${-ribbonH/2} L${ribbonW/2} ${-ribbonH/2} L${ribbonW/2 + 4} 0 L${ribbonW/2} ${ribbonH/2} L${-ribbonW/2} ${ribbonH/2} Z`}
          fill={PALETTE.parchment}
          stroke={PALETTE.stone}
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
        <text
          x="0" y="0.5"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="6.5"
          fontWeight="600"
          fill={PALETTE.stone}
          style={{ fontFamily: 'Georgia, "Iowan Old Style", serif' }}
        >
          {role.name}
        </text>
      </g>

      {/* Accessible title for hover — native browser tooltip */}
      <title>{`${role.name} (${agent.type}) · ${role.flavor} · ${hasVote ? (agent.lastVote ? 'raised FOR' : 'raised AGAINST') : 'not voted'}`}</title>
    </g>
  );
}

// ═════════════════════════════════════════════════════════════════════════
//   Species dispatch
// ═════════════════════════════════════════════════════════════════════════

function CreatureBody({ archetype }: { archetype: Archetype }) {
  switch (archetype) {
    case 'governance': return <Owl />;
    case 'council': return <Badger />;
    case 'treasury': return <Fox />;
    case 'craft': return <Beaver />;
    case 'passive': return <MothWyrm />;
  }
}

// ═════════════════════════════════════════════════════════════════════════
//   Species — Owl (The Chamber, scholars)
// ═════════════════════════════════════════════════════════════════════════

function Owl() {
  const stroke = PALETTE.ink;
  return (
    <g>
      {/* Robe */}
      <path
        d="M-10 20 L-14 42 L14 42 L10 20 Z"
        fill={PALETTE.fGovernance} stroke={stroke} strokeWidth="1" strokeLinejoin="round"
      />
      {/* Robe collar */}
      <path d="M-10 20 L10 20 L7 24 L-7 24 Z" fill={PALETTE.owlBreast} stroke={stroke} strokeWidth="0.7" />
      {/* Body/breast feathers */}
      <ellipse cx="0" cy="12" rx="12" ry="10" fill={PALETTE.owlBody} stroke={stroke} strokeWidth="1" />
      <path d="M-9 12 Q-6 14 -4 12 Q-2 14 0 12 Q2 14 4 12 Q6 14 9 12" stroke={PALETTE.owlBreast} strokeWidth="0.7" fill="none" />
      <path d="M-8 16 Q-5 18 -3 16 Q-1 18 1 16 Q3 18 5 16 Q7 18 8 16" stroke={PALETTE.owlBreast} strokeWidth="0.7" fill="none" />
      {/* Head */}
      <circle cx="0" cy="-2" r="11" fill={PALETTE.owlBody} stroke={stroke} strokeWidth="1" />
      {/* Ear tufts */}
      <polygon points="-9,-10 -6,-4 -4,-10" fill={PALETTE.owlBody} stroke={stroke} strokeWidth="0.7" strokeLinejoin="round" />
      <polygon points="9,-10 6,-4 4,-10" fill={PALETTE.owlBody} stroke={stroke} strokeWidth="0.7" strokeLinejoin="round" />
      {/* Facial disc */}
      <ellipse cx="0" cy="-1" rx="9" ry="7" fill={PALETTE.owlBreast} opacity="0.7" />
      {/* Eyes — huge */}
      <circle cx="-4" cy="-2" r="3.2" fill={PALETTE.parchment} stroke={stroke} strokeWidth="0.8" />
      <circle cx="4" cy="-2" r="3.2" fill={PALETTE.parchment} stroke={stroke} strokeWidth="0.8" />
      <circle cx="-4" cy="-2" r="2.2" fill={PALETTE.owlEyes} />
      <circle cx="4" cy="-2" r="2.2" fill={PALETTE.owlEyes} />
      <circle cx="-4" cy="-2" r="1" fill={stroke} />
      <circle cx="4" cy="-2" r="1" fill={stroke} />
      {/* Beak */}
      <polygon points="0,1 -1.3,4 1.3,4" fill={PALETTE.gold} stroke={stroke} strokeWidth="0.5" />
      {/* Wing/arm holding the banner */}
      <path d="M11 18 Q15 14 14 10" stroke={stroke} strokeWidth="1" fill={PALETTE.owlBody} />
    </g>
  );
}

// ═════════════════════════════════════════════════════════════════════════
//   Species — Badger (The Long Table, council)
// ═════════════════════════════════════════════════════════════════════════

function Badger() {
  const stroke = PALETTE.ink;
  return (
    <g>
      {/* Body/vest */}
      <path
        d="M-11 18 L-12 42 L12 42 L11 18 Z"
        fill={PALETTE.badgerBody} stroke={stroke} strokeWidth="1" strokeLinejoin="round"
      />
      {/* Vest front + brass buttons */}
      <rect x="-6" y="22" width="12" height="18" fill="#8A6E4A" stroke={stroke} strokeWidth="0.6" />
      <circle cx="0" cy="26" r="0.9" fill={PALETTE.honey} stroke={stroke} strokeWidth="0.3" />
      <circle cx="0" cy="31" r="0.9" fill={PALETTE.honey} stroke={stroke} strokeWidth="0.3" />
      <circle cx="0" cy="36" r="0.9" fill={PALETTE.honey} stroke={stroke} strokeWidth="0.3" />
      {/* Head */}
      <ellipse cx="0" cy="4" rx="12" ry="10" fill={PALETTE.badgerBody} stroke={stroke} strokeWidth="1" />
      {/* Signature stripe — white blaze down the middle */}
      <path d="M-2.5 -6 Q-1 4 -3 14 L3 14 Q1 4 2.5 -6 Z" fill={PALETTE.badgerStripe} stroke={stroke} strokeWidth="0.6" strokeLinejoin="round" />
      {/* Side white stripes */}
      <path d="M-11 0 Q-9 4 -8 10" stroke={PALETTE.badgerStripe} strokeWidth="2" fill="none" />
      <path d="M11 0 Q9 4 8 10" stroke={PALETTE.badgerStripe} strokeWidth="2" fill="none" />
      {/* Eyes — small, determined */}
      <circle cx="-4" cy="2" r="1.4" fill={PALETTE.badgerEyes} />
      <circle cx="4" cy="2" r="1.4" fill={PALETTE.badgerEyes} />
      <circle cx="-4" cy="2" r="0.4" fill={PALETTE.parchment} />
      <circle cx="4" cy="2" r="0.4" fill={PALETTE.parchment} />
      {/* Nose */}
      <ellipse cx="0" cy="8" rx="1.6" ry="1" fill={PALETTE.badgerEyes} />
      {/* Ears — small, round */}
      <circle cx="-9" cy="-5" r="2.2" fill={PALETTE.badgerBody} stroke={stroke} strokeWidth="0.6" />
      <circle cx="9" cy="-5" r="2.2" fill={PALETTE.badgerBody} stroke={stroke} strokeWidth="0.6" />
      {/* Paw out for flag */}
      <circle cx="11" cy="22" r="2" fill={PALETTE.badgerBody} stroke={stroke} strokeWidth="0.7" />
    </g>
  );
}

// ═════════════════════════════════════════════════════════════════════════
//   Species — Fox (The Cambium, treasury)
// ═════════════════════════════════════════════════════════════════════════

function Fox() {
  const stroke = PALETTE.ink;
  return (
    <g>
      {/* Brush tail behind body */}
      <path d="M-12 28 Q-20 32 -18 42 Q-12 40 -10 34"
        fill={PALETTE.foxBody} stroke={stroke} strokeWidth="1" strokeLinejoin="round" />
      <path d="M-18 42 Q-14 44 -10 34" fill={PALETTE.parchment} stroke={stroke} strokeWidth="0.6" strokeLinejoin="round" />
      {/* Merchant coat */}
      <path d="M-10 18 L-12 42 L12 42 L10 18 Z"
        fill={PALETTE.foxBody} stroke={stroke} strokeWidth="1" strokeLinejoin="round" />
      {/* Coat lapels */}
      <path d="M-10 18 L10 18 L3 25 L-3 25 Z" fill={PALETTE.foxBelly} stroke={stroke} strokeWidth="0.7" />
      {/* Belt with buckle */}
      <rect x="-10" y="32" width="20" height="2" fill={PALETTE.ink} />
      <rect x="-1.5" y="31" width="3" height="4" fill={PALETTE.honey} stroke={stroke} strokeWidth="0.4" />
      {/* Head */}
      <path d="M-10 6 Q-11 -2 -7 -5 L0 -9 L7 -5 Q11 -2 10 6 L9 10 L-9 10 Z"
        fill={PALETTE.foxBody} stroke={stroke} strokeWidth="1" strokeLinejoin="round" />
      {/* Face white */}
      <path d="M-4 0 L4 0 L4 10 L0 12 L-4 10 Z" fill={PALETTE.foxBelly} stroke={stroke} strokeWidth="0.5" />
      {/* Snout */}
      <polygon points="0,6 -2.5,14 2.5,14" fill={PALETTE.foxBody} stroke={stroke} strokeWidth="0.6" strokeLinejoin="round" />
      <ellipse cx="0" cy="13.5" rx="1.2" ry="0.8" fill={PALETTE.ink} />
      {/* Ears — tall triangles */}
      <polygon points="-9,-4 -6,-14 -3,-5" fill={PALETTE.foxBody} stroke={stroke} strokeWidth="0.7" strokeLinejoin="round" />
      <polygon points="9,-4 6,-14 3,-5" fill={PALETTE.foxBody} stroke={stroke} strokeWidth="0.7" strokeLinejoin="round" />
      <polygon points="-7.5,-5 -6,-11 -4.5,-6" fill={PALETTE.foxBelly} />
      <polygon points="7.5,-5 6,-11 4.5,-6" fill={PALETTE.foxBelly} />
      {/* Eyes — sharp, angled */}
      <path d="M-5 2 Q-3.5 0.5 -2.5 2.5" stroke={stroke} strokeWidth="0.8" fill={PALETTE.foxEyes} />
      <path d="M5 2 Q3.5 0.5 2.5 2.5" stroke={stroke} strokeWidth="0.8" fill={PALETTE.foxEyes} />
    </g>
  );
}

// ═════════════════════════════════════════════════════════════════════════
//   Species — Beaver (The Workshop, craft)
// ═════════════════════════════════════════════════════════════════════════

function Beaver() {
  const stroke = PALETTE.ink;
  return (
    <g>
      {/* Flat tail */}
      <ellipse cx="14" cy="40" rx="8" ry="3.5" fill={PALETTE.beaverApron} stroke={stroke} strokeWidth="0.8" transform="rotate(20 14 40)" />
      <g transform="rotate(20 14 40)">
        <line x1="8" y1="40" x2="20" y2="40" stroke={stroke} strokeWidth="0.4" opacity="0.6" />
        <line x1="10" y1="37.5" x2="18" y2="42.5" stroke={stroke} strokeWidth="0.4" opacity="0.5" />
        <line x1="10" y1="42.5" x2="18" y2="37.5" stroke={stroke} strokeWidth="0.4" opacity="0.5" />
      </g>
      {/* Body */}
      <path d="M-10 18 L-12 42 L12 42 L10 18 Z"
        fill={PALETTE.beaverBody} stroke={stroke} strokeWidth="1" strokeLinejoin="round" />
      {/* Apron */}
      <path d="M-8 20 L-9 42 L9 42 L8 20 Z"
        fill={PALETTE.beaverApron} stroke={stroke} strokeWidth="0.8" strokeLinejoin="round" />
      {/* Tool loops on apron */}
      <rect x="-6" y="28" width="3" height="5" rx="0.5" fill="#A88048" stroke={stroke} strokeWidth="0.4" />
      <rect x="3" y="28" width="3" height="5" rx="0.5" fill="#A88048" stroke={stroke} strokeWidth="0.4" />
      {/* Head — round with broad snout */}
      <circle cx="0" cy="4" r="11" fill={PALETTE.beaverBody} stroke={stroke} strokeWidth="1" />
      {/* Belly/cheeks */}
      <ellipse cx="0" cy="6" rx="7" ry="5" fill={PALETTE.beaverBelly} />
      {/* Teeth — two front incisors */}
      <rect x="-2" y="10" width="1.8" height="3" fill={PALETTE.parchment} stroke={stroke} strokeWidth="0.3" />
      <rect x="0.2" y="10" width="1.8" height="3" fill={PALETTE.parchment} stroke={stroke} strokeWidth="0.3" />
      {/* Nose */}
      <ellipse cx="0" cy="8" rx="1.4" ry="1" fill={PALETTE.ink} />
      {/* Eyes */}
      <circle cx="-4" cy="3" r="1.2" fill={PALETTE.ink} />
      <circle cx="4" cy="3" r="1.2" fill={PALETTE.ink} />
      {/* Tiny round ears */}
      <circle cx="-9" cy="-3" r="2" fill={PALETTE.beaverBody} stroke={stroke} strokeWidth="0.5" />
      <circle cx="9" cy="-3" r="2" fill={PALETTE.beaverBody} stroke={stroke} strokeWidth="0.5" />
    </g>
  );
}

// ═════════════════════════════════════════════════════════════════════════
//   Species — Moth-wyrm (The Stacks, passive)
// ═════════════════════════════════════════════════════════════════════════

function MothWyrm() {
  const stroke = PALETTE.ink;
  return (
    <g>
      {/* Wings behind — translucent */}
      <ellipse cx="-10" cy="16" rx="10" ry="14" fill={PALETTE.mothWing} opacity="0.55" stroke={stroke} strokeWidth="0.6" transform="rotate(-20 -10 16)" />
      <ellipse cx="10" cy="16" rx="10" ry="14" fill={PALETTE.mothWing} opacity="0.55" stroke={stroke} strokeWidth="0.6" transform="rotate(20 10 16)" />
      {/* Wing spots (eye patterns) */}
      <circle cx="-10" cy="14" r="2" fill={PALETTE.mothEye} opacity="0.8" />
      <circle cx="10" cy="14" r="2" fill={PALETTE.mothEye} opacity="0.8" />
      {/* Robe */}
      <path d="M-8 18 L-10 42 L10 42 L8 18 Z"
        fill={PALETTE.mothBody} stroke={stroke} strokeWidth="1" strokeLinejoin="round" />
      <path d="M-8 18 L8 18 L6 22 L-6 22 Z" fill={PALETTE.parchmentWarm} stroke={stroke} strokeWidth="0.6" />
      {/* Head — fluffy */}
      <circle cx="0" cy="8" r="8" fill={PALETTE.mothBody} stroke={stroke} strokeWidth="1" />
      {/* Fluff */}
      <path d="M-7 4 Q-9 6 -7 8 Q-9 10 -7 12" stroke={PALETTE.parchment} strokeWidth="0.8" fill="none" />
      <path d="M7 4 Q9 6 7 8 Q9 10 7 12" stroke={PALETTE.parchment} strokeWidth="0.8" fill="none" />
      {/* Large compound eyes */}
      <ellipse cx="-3" cy="7" rx="2.2" ry="2.8" fill={PALETTE.mothEye} stroke={stroke} strokeWidth="0.5" />
      <ellipse cx="3" cy="7" rx="2.2" ry="2.8" fill={PALETTE.mothEye} stroke={stroke} strokeWidth="0.5" />
      <ellipse cx="-3" cy="6" rx="0.7" ry="0.9" fill={PALETTE.parchment} />
      <ellipse cx="3" cy="6" rx="0.7" ry="0.9" fill={PALETTE.parchment} />
      {/* Antennae — feathered */}
      <path d="M-3 1 Q-8 -6 -12 -10" stroke={stroke} strokeWidth="1" fill="none" />
      <path d="M3 1 Q8 -6 12 -10" stroke={stroke} strokeWidth="1" fill="none" />
      {[-11, -9, -7].map((x, i) => (
        <line key={i} x1={x - 1.5 - i} y1={-9 + i * 1.5} x2={x + 1 - i} y2={-11 + i * 1.5} stroke={stroke} strokeWidth="0.6" />
      ))}
      {[11, 9, 7].map((x, i) => (
        <line key={i} x1={x + 1.5 + i} y1={-9 + i * 1.5} x2={x - 1 + i} y2={-11 + i * 1.5} stroke={stroke} strokeWidth="0.6" />
      ))}
    </g>
  );
}

// ═════════════════════════════════════════════════════════════════════════
//   VoteFlag — small banner raised in the creature's paw
// ═════════════════════════════════════════════════════════════════════════

function VoteFlag({ color, isRecent }: { color: string; isRecent: boolean }) {
  return (
    <g transform="translate(13 14)">
      {/* Pole */}
      <line x1="0" y1="-4" x2="0" y2="14" stroke={PALETTE.ink} strokeWidth="0.9" />
      <circle cx="0" cy="-4" r="1" fill={PALETTE.gold} stroke={PALETTE.ink} strokeWidth="0.4" />
      {/* Flag cloth with pennant cut */}
      <path
        d="M0 -3 L9 -3 L9 6 L5 4 L0 6 Z"
        fill={color}
        stroke={PALETTE.ink}
        strokeWidth="0.7"
        strokeLinejoin="round"
        style={{
          filter: isRecent ? `drop-shadow(0 0 2px ${PALETTE.lampBloom})` : 'none',
        }}
      />
    </g>
  );
}
