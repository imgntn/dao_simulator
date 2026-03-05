'use client';

interface Props {
  onClose: () => void;
}

export function HelpOverlay({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-[var(--sim-surface)] border border-[var(--sim-border)] rounded-lg shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[var(--sim-surface)] flex items-center justify-between px-5 py-3 border-b border-[var(--sim-border)]">
          <h2 className="text-base font-semibold text-[var(--sim-text)]">
            DAO Simulator — Help
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--sim-text-muted)] hover:text-[var(--sim-text)] text-lg leading-none px-1"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-5 text-sm text-[var(--sim-text-secondary)] leading-relaxed">
          <Section title="Getting Started">
            <ul className="list-disc ml-4 space-y-1">
              <li><b>Play / Pause</b> — start or stop the simulation clock</li>
              <li><b>Step</b> — advance exactly one tick while paused</li>
              <li><b>Speed</b> — adjust how fast ticks execute (1&times; &ndash; 10&times;)</li>
              <li><b>Reset</b> — restart with the current settings</li>
            </ul>
          </Section>

          <Section title="The Building">
            <p>The skyscraper represents the DAO. Each floor houses a different category of agents:</p>
            <ul className="list-disc ml-4 space-y-1">
              <li><b>B1 — Treasury Vault</b> — visualizes DAO funds; no agents</li>
              <li><b>F1 — Trading Floor</b> — traders, investors, and market makers</li>
              <li><b>F2 — Governance Chamber</b> — proposal creators, voters, and delegates</li>
              <li><b>F3 — Workshop</b> — developers, artists, auditors, and service providers</li>
              <li><b>F4 — Council Room</b> — regulators, arbitrators, and risk managers</li>
              <li><b>F5 — Observatory</b> — collectors, stakers, and passive members</li>
            </ul>
          </Section>

          <Section title="Agents">
            <p>
              Agents are autonomous participants that trade, vote, delegate, and create proposals.
              Each type has distinct behaviors and incentives. Hover over any agent in the 3D scene to
              see its stats; click to pin the tooltip.
            </p>
            <p>
              Open the <b>Agent Guide</b> panel in the sidebar for a full list of types with descriptions.
            </p>
          </Section>

          <Section title="Interacting with the Scene">
            <ul className="list-disc ml-4 space-y-1">
              <li><b>Hover</b> an agent to see a quick stat tooltip</li>
              <li><b>Click</b> an agent to pin its detail panel</li>
              <li><b>Orbit / Zoom</b> — drag to rotate, scroll to zoom</li>
              <li><b>Proposals</b> appear as glowing orbs on F2 (Governance Chamber)</li>
            </ul>
          </Section>

          <Section title="Controls">
            <ul className="list-disc ml-4 space-y-1">
              <li><b>DAO Preset</b> — switch between calibrated DAOs (Uniswap, Aave, etc.)</li>
              <li><b>Governance Rule</b> — change how proposals are decided</li>
              <li><b>Forum</b> — toggle the discussion forum that influences voting</li>
              <li><b>Black Swans</b> — inject market crashes, exploits, or regulatory events</li>
              <li><b>Agent Count</b> — adjust total number of agents in the simulation</li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--sim-text)] mb-1.5">{title}</h3>
      {children}
    </div>
  );
}
