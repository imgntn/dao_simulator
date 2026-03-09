'use client';

import { useTutorialStore } from '@/lib/browser/tutorial-store';

interface Props {
  onClose: () => void;
}

export function HelpOverlay({ onClose }: Props) {
  const startTutorial = useTutorialStore(s => s.start);

  const handleTutorial = () => {
    onClose();
    startTutorial();
  };

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
          {/* Tutorial button */}
          <button
            onClick={handleTutorial}
            className="w-full px-4 py-2 rounded bg-[var(--sim-accent-bold)] hover:bg-[var(--sim-accent-hover)] text-white text-sm font-medium"
          >
            Start Guided Tutorial
          </button>

          <Section title="Getting Started">
            <ul className="list-disc ml-4 space-y-1">
              <li><b>Play / Pause</b> — start or stop the simulation clock</li>
              <li><b>Step</b> — advance exactly one tick while paused</li>
              <li><b>Speed</b> — adjust how fast ticks execute (1&times; &ndash; 60&times;)</li>
              <li><b>Reset</b> — restart with the current settings</li>
              <li><b>Fork</b> — create a branch point for what-if analysis (when paused)</li>
            </ul>
          </Section>

          <Section title="The Building">
            <p>The skyscraper represents the DAO. Each floor houses a different category of agents:</p>
            <ul className="list-disc ml-4 space-y-1">
              <li><b>B1 — Treasury Vault</b> — visualizes DAO funds; pulses on large changes</li>
              <li><b>F1 — Trading Floor</b> — traders, investors, and market makers</li>
              <li><b>F2 — Governance Chamber</b> — proposal creators, voters, and delegates</li>
              <li><b>F3 — Workshop</b> — developers, artists, auditors, and service providers</li>
              <li><b>F4 — Council Room</b> — regulators, arbitrators, and risk managers</li>
              <li><b>F5 — Observatory</b> — collectors, stakers, and passive members</li>
            </ul>
          </Section>

          <Section title="Visual Effects">
            <ul className="list-disc ml-4 space-y-1">
              <li><b>Delegation Beams</b> — purple lines connecting delegating agents to their delegates</li>
              <li><b>Proposal Particles</b> — cyan/green/red bursts on proposal creation/approval/rejection</li>
              <li><b>Treasury Pulse</b> — the vault floor glows on large fund changes</li>
              <li><b>Black Swan Weather</b> — storm clouds, lightning, and rain during crisis events</li>
              <li><b>Agent Trails</b> — fading lines behind moving agents</li>
            </ul>
          </Section>

          <Section title="Analytics">
            <ul className="list-disc ml-4 space-y-1">
              <li><b>Export</b> — download simulation data as CSV, JSON, or events log</li>
              <li><b>Annotations</b> — double-click timeline to add notes at specific steps</li>
              <li><b>Metric Alerts</b> — set threshold alerts for any metric</li>
              <li><b>Trend Lines</b> — toggle regression & moving average overlays on sparklines</li>
              <li><b>Voting Heatmap</b> — visualize voting agreement between agent types</li>
            </ul>
          </Section>

          <Section title="Keyboard Shortcuts">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
              <Shortcut keys="Space" action="Play / Pause" />
              <Shortcut keys="&rarr; / ." action="Step forward" />
              <Shortcut keys="R" action="Reset" />
              <Shortcut keys="1-6" action="Navigate to floor" />
              <Shortcut keys="Esc" action="Deselect / close" />
              <Shortcut keys="L" action="Go to LIVE" />
              <Shortcut keys="?" action="Toggle help" />
            </div>
          </Section>

          <Section title="Controls">
            <ul className="list-disc ml-4 space-y-1">
              <li><b>DAO Preset</b> — switch between calibrated DAOs (Uniswap, Aave, etc.)</li>
              <li><b>Governance Rule</b> — change how proposals are decided</li>
              <li><b>Apply Live</b> — inject governance changes without resetting</li>
              <li><b>Forum</b> — toggle the discussion forum that influences voting</li>
              <li><b>Black Swans</b> — inject market crashes, exploits, or regulatory events</li>
              <li><b>Custom Agent</b> — inject agents with custom parameters</li>
              <li><b>Multi-Run</b> — run N simulations for statistical confidence intervals</li>
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

function Shortcut({ keys, action }: { keys: string; action: string }) {
  return (
    <>
      <span className="text-[var(--sim-accent)]" dangerouslySetInnerHTML={{ __html: keys }} />
      <span className="text-[var(--sim-text-muted)]">{action}</span>
    </>
  );
}
