'use client';

/**
 * HelpButton — floating "?" that opens a modal glossary.
 *
 * Renders as absolute-positioned within its container (not fixed)
 * so it doesn't float over page-level chrome like preview toolbars
 * or the main simulation tab bar. Place it inside a relative container.
 *
 * Explains the in-world metaphor (The Living Archive) alongside what
 * the sim is actually doing (DAO governance). Also lists lantern states,
 * the five halls, and every agent role.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PALETTE, ARCHETYPE_HALL, ARCHETYPE_HALL_DESC, type Archetype } from './palette';
import { AGENT_ROLES } from './roles';

export interface HelpButtonProps {
  /** Extra CSS class for positioning overrides. Default: bottom-right above scrubber. */
  className?: string;
}

export function HelpButton({ className }: HelpButtonProps = {}) {
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
        className={
          className ??
          'absolute right-3 z-40 flex h-9 w-9 items-center justify-center rounded-full border-2 text-base font-bold shadow-md transition hover:scale-105 sm:right-4 sm:h-10 sm:w-10'
        }
        style={{
          bottom: '4.5rem',   /* sits above the ~52px timeline scrubber */
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
                Each <strong>creature</strong> is a steward of the Archive. A small <strong>banner</strong> in their paw shows their vote: terracotta FOR, slate AGAINST. The central <strong>lectern</strong> holds the open proposal. The <strong>pool</strong> is the treasury. The <strong>fire</strong> at bottom-right is the event feed. Scroll or pinch to zoom; drag to pan. Click any creature to inspect it.
              </p>
            </Section>

            <Section title="Lantern (vote) states">
              <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                <LanternKey state="unlit"   label="No banner"    desc="This steward has not yet voted on the open proposal." />
                <LanternKey state="for"     label="Banner FOR"   desc="Voted in favour. Banner glows terracotta." />
                <LanternKey state="against" label="Banner AGAINST" desc="Voted against. Banner glows slate indigo." />
                <LanternKey state="recent"  label="Just voted"   desc="Recently voted (within 8 steps). A warm halo surrounds them." />
              </ul>
            </Section>

            <Section title="Ceremonies">
              <p>When a steward casts their vote they walk to the <strong>lectern</strong>, raise their banner, and return. Watch for the glow. Beavers periodically carry books to the shelves — you may catch them mid-shelve.</p>
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
                Each in-world role maps to a specific behaviour in the simulation. Click any creature to inspect it.
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
                <li>Scroll or pinch to zoom; drag to pan when zoomed.</li>
                <li>Click any creature to pin its detail panel.</li>
                <li>Hover any chip or element for a tooltip.</li>
                <li>Tap a steward on touch devices to inspect them.</li>
                <li>Use the timeline scrubber at the bottom to step through history.</li>
                <li>A storm badge in the header + rain in the scene = Black Swan active.</li>
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
  const lit = state !== 'unlit';

  return (
    <li className="flex items-start gap-3 rounded-sm border px-3 py-2" style={{ borderColor: PALETTE.parchmentWarm, background: PALETTE.parchmentWarm }}>
      <svg width="24" height="20" viewBox="0 0 24 20" aria-hidden="true" className="flex-shrink-0 mt-0.5">
        {/* Mini banner */}
        <line x1="4" y1="2" x2="4" y2="18" stroke={PALETTE.stone} strokeWidth="1" />
        <path
          d={lit ? `M4 3 L18 3 L18 12 L11 10 L4 12 Z` : `M4 3 L16 3 L16 12 L4 12 Z`}
          fill={lit ? color : PALETTE.voteGlass}
          stroke={PALETTE.stone}
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
        <circle cx="4" cy="2" r="1.5" fill={PALETTE.honey} stroke={PALETTE.stone} strokeWidth="0.4" />
      </svg>
      <div className="flex flex-col">
        <span className="text-xs font-bold" style={{ color: PALETTE.stone }}>{label}</span>
        <span className="text-xs opacity-80" style={{ color: PALETTE.ink }}>{desc}</span>
      </div>
    </li>
  );
}
