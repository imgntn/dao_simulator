'use client';

/**
 * HelpButton — floating "?" that opens a modal glossary.
 *
 * Explains the in-world metaphor (The Living Archive) alongside what
 * the sim is actually doing (DAO governance). Also lists lantern states,
 * the five halls, and every agent role.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PALETTE, ARCHETYPE_HALL, ARCHETYPE_HALL_DESC, type Archetype } from './palette';
import { AGENT_ROLES } from './roles';

export function HelpButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open help and glossary"
        className="fixed right-3 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-full border-2 text-base font-bold shadow-md transition hover:scale-105 sm:right-4 sm:top-4 sm:h-10 sm:w-10"
        style={{
          background: PALETTE.parchment,
          borderColor: PALETTE.stone,
          color: PALETTE.stone,
          fontFamily: 'Georgia, "Iowan Old Style", serif',
        }}
      >
        ?
      </button>
      {open && typeof window !== 'undefined' && createPortal(<HelpModal onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Help and glossary"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
      style={{ background: 'rgba(31,25,18,0.55)' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="relative max-h-full w-full max-w-3xl overflow-hidden rounded-sm border-2 shadow-2xl"
        style={{
          background: PALETTE.parchment,
          borderColor: PALETTE.stone,
          color: PALETTE.ink,
          fontFamily: 'Georgia, "Iowan Old Style", serif',
          boxShadow: `0 0 0 3px ${PALETTE.parchmentWarm}, 0 16px 48px rgba(0,0,0,0.4)`,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close help"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-base font-bold hover:opacity-70"
          style={{ color: PALETTE.stone, background: PALETTE.parchmentWarm }}
        >
          ×
        </button>

        <div className="flex max-h-[85vh] flex-col overflow-hidden">
          <header
            className="border-b-2 px-5 py-4 sm:px-6"
            style={{
              borderColor: PALETTE.stone,
              background: `linear-gradient(to bottom, ${PALETTE.parchmentWarm}, ${PALETTE.parchment})`,
            }}
          >
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: PALETTE.stone }}>
              The Living Archive
            </h1>
            <p className="mt-1 text-xs italic sm:text-sm" style={{ color: PALETTE.stoneSoft }}>
              A solarpunk library where stewards decide together what is kept — a simulator for DAO governance dressed in vines and parchment.
            </p>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6" style={{ background: PALETTE.parchment }}>
            <Section title="What you're looking at">
              <p>
                Each <strong>lantern</strong> belongs to one steward of the Archive. When a proposal comes up, stewards raise their lantern — the glow colour shows their vote. The central <strong>lectern</strong> holds the open proposal. The <strong>pool</strong> in the header is the treasury. The <strong>fire</strong> at the bottom is the feed of recent events. It's meant to fit one screen at any size — nothing to scroll through.
              </p>
            </Section>

            <Section title="Lantern states">
              <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                <LanternKey state="unlit"   label="Unlit"     desc="This steward has not yet voted on the open proposal." />
                <LanternKey state="for"     label="Raised FOR"   desc="Voted in favour. Lamp glows terracotta with a honey halo." />
                <LanternKey state="against" label="Raised AGAINST" desc="Voted against. Lamp glows slate indigo, dimmer." />
                <LanternKey state="recent"  label="Just raised"   desc="Recently voted (within 8 steps). Lamp flares brighter, then settles." />
              </ul>
            </Section>

            <Section title="The five halls">
              <ul className="flex flex-col gap-1.5">
                {(['governance', 'council', 'treasury', 'craft', 'passive'] as Archetype[]).map(a => (
                  <li key={a} className="flex flex-col gap-0.5 rounded-sm border px-3 py-2" style={{ borderColor: PALETTE.parchmentWarm, background: PALETTE.parchmentWarm }}>
                    <span className="text-sm font-bold tracking-wide" style={{ color: PALETTE.stone }}>{ARCHETYPE_HALL[a]}</span>
                    <span className="text-xs" style={{ color: PALETTE.stoneSoft }}>{ARCHETYPE_HALL_DESC[a]}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Who the stewards are">
              <p className="mb-2 text-xs italic" style={{ color: PALETTE.stoneSoft }}>
                Each in-world role maps to a specific behaviour in the simulation. Hover any lantern for the quick version.
              </p>
              <div className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                {Object.entries(AGENT_ROLES).map(([type, role]) => (
                  <div key={type} className="flex gap-2 py-0.5">
                    <span className="min-w-[7rem] font-bold" style={{ color: PALETTE.stone }}>{role.name}</span>
                    <span className="opacity-80" style={{ color: PALETTE.ink }}>{role.realRole}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Quick guide">
              <ul className="list-disc space-y-1 pl-5 text-xs">
                <li>Hover any lantern, scroll-lectern, chip, or event for a tooltip.</li>
                <li>Tap a steward on touch devices to inspect them.</li>
                <li>The pool visibly rises and falls with the treasury.</li>
                <li>A storm badge in the header means a Black Swan event is active.</li>
                <li>Press <kbd style={{ padding: '1px 4px', background: PALETTE.parchmentWarm, border: `1px solid ${PALETTE.stone}`, borderRadius: 2 }}>Esc</kbd> to close this panel.</li>
              </ul>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2
        className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em]"
        style={{ color: PALETTE.fGovernance }}
      >
        {title}
      </h2>
      <div className="text-sm leading-relaxed" style={{ color: PALETTE.ink }}>
        {children}
      </div>
    </section>
  );
}

function LanternKey({ state, label, desc }: {
  state: 'unlit' | 'for' | 'against' | 'recent';
  label: string;
  desc: string;
}) {
  const color =
    state === 'for' ? PALETTE.voteFor :
    state === 'against' ? PALETTE.voteAgainst :
    state === 'recent' ? PALETTE.voteFor :
    PALETTE.voteGlass;
  const glow =
    state === 'for' ? PALETTE.voteForGlow :
    state === 'against' ? PALETTE.voteAgainstGlow :
    state === 'recent' ? PALETTE.lampBloom :
    'transparent';
  const lit = state !== 'unlit';

  return (
    <li className="flex items-start gap-3 rounded-sm border px-3 py-2" style={{ borderColor: PALETTE.parchmentWarm, background: PALETTE.parchmentWarm }}>
      <svg width="28" height="36" viewBox="0 0 28 36" aria-hidden="true" className="flex-shrink-0 mt-0.5">
        <line x1="14" y1="0" x2="14" y2="8" stroke={PALETTE.stone} strokeWidth="1" />
        <circle cx="14" cy="8" r="2" fill={PALETTE.honey} stroke={PALETTE.stone} strokeWidth="0.8" />
        <ellipse
          cx="14"
          cy="22"
          rx="10"
          ry="6"
          fill={state === 'recent' ? PALETTE.lampBloom : 'transparent'}
          opacity={state === 'recent' ? 0.6 : 0}
        />
        <rect
          x="7" y="14" width="14" height="14" rx="2"
          fill={lit ? color : PALETTE.voteGlass}
          stroke={PALETTE.stone}
          strokeWidth="1.2"
          style={{ filter: lit ? `drop-shadow(0 0 4px ${glow})` : 'none' }}
        />
      </svg>
      <div className="flex flex-col">
        <span className="text-xs font-bold" style={{ color: PALETTE.stone }}>{label}</span>
        <span className="text-xs opacity-80" style={{ color: PALETTE.ink }}>{desc}</span>
      </div>
    </li>
  );
}
