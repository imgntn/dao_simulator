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
      <div className="flex items-center justify-center h-screen bg-gray-950 text-gray-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4" />
          <p className="text-lg font-mono">Initializing simulation engine...</p>
          <p className="text-sm text-gray-500 mt-2">Loading calibration data for 14 DAOs</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-red-400">
        <div className="text-center max-w-lg">
          <p className="text-lg font-mono mb-2">Simulation Error</p>
          <p className="text-sm text-gray-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 text-gray-300"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-200 overflow-hidden">
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
        <div className="w-[420px] flex flex-col border-l border-gray-800 overflow-y-auto">
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
