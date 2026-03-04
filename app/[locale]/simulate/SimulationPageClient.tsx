'use client';

import { useEffect, useRef, useState } from 'react';
import { useSimulationStore } from '@/lib/browser/simulation-store';
import { ControlPanel } from '@/components/simulation/ControlPanel';
import { MetricsDashboard } from '@/components/simulation/dashboard/MetricsDashboard';
import { EventFeed } from '@/components/simulation/dashboard/EventFeed';
import { SimulationCanvas } from '@/components/simulation/SimulationCanvas';
import { TabBar, type SimTab } from '@/components/simulation/TabBar';
import { ResearchPanel } from '@/components/simulation/research/ResearchPanel';

export default function SimulationPageClient() {
  const { status, error, initialize, dispose } = useSimulationStore();
  const initialized = useRef(false);
  const [activeTab, setActiveTab] = useState<SimTab>('interactive');

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Fetch bundled data and initialize
    Promise.all([
      fetch('/data/calibration-profiles.json').then(r => r.json()),
      fetch('/data/market-timeseries.json').then(r => r.json()),
    ])
      .then(([profiles, market]) => {
        initialize(profiles, market);
      })
      .catch(err => {
        console.error('Failed to load simulation data:', err);
      });

    return () => {
      dispose();
    };
  }, [initialize, dispose]);

  if (status === 'idle' || status === 'initializing') {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--sim-bg)] text-[var(--sim-text-secondary)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--sim-accent)] mx-auto mb-4" />
          <p className="text-lg font-mono">Initializing simulation engine...</p>
          <p className="text-sm text-[var(--sim-text-muted)] mt-2">Loading calibration data for 14 DAOs</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--sim-bg)] text-red-400">
        <div className="text-center max-w-lg">
          <p className="text-lg font-mono mb-2">Simulation Error</p>
          <p className="text-sm text-[var(--sim-text-muted)]">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-[var(--sim-border)] rounded hover:bg-[var(--sim-surface-hover)] text-[var(--sim-text-secondary)]"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--sim-bg)] text-[var(--sim-text)] overflow-hidden">
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Interactive tab — hidden via CSS to keep 3D + worker alive */}
      <div
        className="flex flex-1 min-h-0"
        style={{ display: activeTab === 'interactive' ? 'flex' : 'none' }}
      >
        {/* Left: 3D Scene */}
        <div className="flex-1 relative min-w-0">
          <SimulationCanvas />
          <EventFeed className="absolute bottom-0 left-0 right-0" />
        </div>

        {/* Right: Controls + Dashboard */}
        <div className="w-[420px] flex flex-col border-l border-[var(--sim-border)] overflow-y-auto">
          <ControlPanel />
          <MetricsDashboard />
        </div>
      </div>

      {/* Research tab */}
      {activeTab === 'research' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ResearchPanel />
        </div>
      )}
    </div>
  );
}
