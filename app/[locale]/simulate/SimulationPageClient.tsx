'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSimulationStore } from '@/lib/browser/simulation-store';
import { useKeyboardShortcuts } from '@/lib/browser/useKeyboardShortcuts';
import { decodeConfigFromURL } from '@/components/simulation/ShareButton';
import { ControlPanel } from '@/components/simulation/ControlPanel';
import { MetricsDashboard } from '@/components/simulation/dashboard/MetricsDashboard';
import { EventFeed } from '@/components/simulation/dashboard/EventFeed';
import { VotingHeatmap } from '@/components/simulation/dashboard/VotingHeatmap';
import { SimulationCanvas } from '@/components/simulation/SimulationCanvas';
import { TabBar, type SimTab } from '@/components/simulation/TabBar';
import { AgentGuide } from '@/components/simulation/AgentGuide';
import { FloorNav } from '@/components/simulation/FloorNav';
import { DelegationGraph } from '@/components/simulation/dashboard/DelegationGraph';
import { AnnotatedTimeScrubber } from '@/components/simulation/Annotations';
import { ScenarioBuilder } from '@/components/simulation/ScenarioBuilder';
import { ComparisonView } from '@/components/simulation/ComparisonView';
import { HelpOverlay } from '@/components/simulation/HelpOverlay';
import { ResearchPanel } from '@/components/simulation/research/ResearchPanel';
import { MetricAlerts } from '@/components/simulation/MetricAlerts';
import { CustomAgentForm } from '@/components/simulation/CustomAgentForm';
import { AgentInspector } from '@/components/simulation/AgentInspector';
import { BranchView } from '@/components/simulation/BranchView';
import { MultiRunPanel } from '@/components/simulation/MultiRunPanel';
import { ShareButton } from '@/components/simulation/ShareButton';
import { ThemeToggle } from '@/components/simulation/ThemeToggle';
import { Tutorial } from '@/components/simulation/Tutorial';
import { useActiveSnapshot } from '@/lib/browser/useActiveSnapshot';

export default function SimulationPageClient() {
  const { status, error, initialize, dispose, updateConfig, selectDao } = useSimulationStore();
  const snapshot = useActiveSnapshot();
  const initialized = useRef(false);
  const [activeTab, setActiveTab] = useState<SimTab>('interactive');
  const [showHelp, setShowHelp] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // Keyboard shortcuts
  const shortcutCallbacks = useCallback(() => ({
    onToggleHelp: () => setShowHelp(prev => !prev),
  }), []);
  useKeyboardShortcuts(shortcutCallbacks());

  // Get selected agent from snapshot
  const selectedAgent = snapshot?.agents.find(a => a.id === selectedAgentId) ?? null;

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Parse URL params for shared config
    const urlConfig = decodeConfigFromURL();

    // Fetch bundled data and initialize
    Promise.all([
      fetch('/data/calibration-profiles.json').then(r => r.json()),
      fetch('/data/market-timeseries.json').then(r => r.json()),
    ])
      .then(([profiles, market]) => {
        // Apply URL overrides before initialization
        if (urlConfig.daoId) {
          selectDao(urlConfig.daoId);
        }
        const { daoId, ...otherConfig } = urlConfig;
        if (Object.keys(otherConfig).length > 0) {
          updateConfig(otherConfig);
        }
        initialize(profiles, market);
      })
      .catch(err => {
        console.error('Failed to load simulation data:', err);
      });

    return () => {
      dispose();
    };
  }, [initialize, dispose, updateConfig, selectDao]);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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
    <div data-sim-root className="flex flex-col h-screen bg-[var(--sim-bg)] text-[var(--sim-text)] overflow-hidden">
      <div className="flex items-center border-b border-[var(--sim-border)] bg-[var(--sim-bg)]">
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="ml-auto pr-3 flex items-center gap-1.5">
          <ThemeToggle />
          <ShareButton />
          <button
            onClick={() => setShowHelp(true)}
            className="w-7 h-7 rounded-full border border-[var(--sim-border)] text-[var(--sim-text-muted)] hover:text-[var(--sim-accent)] hover:border-[var(--sim-accent)] text-sm font-semibold transition-colors"
            title="Help & Tutorial"
          >
            ?
          </button>
        </div>
      </div>

      {/* Interactive tab — hidden via CSS to keep 3D + worker alive */}
      <div
        className="flex flex-1 min-h-0"
        style={{ display: activeTab === 'interactive' ? 'flex' : 'none' }}
      >
        {/* Left: 3D Scene */}
        <div className="flex-1 relative min-w-0">
          <SimulationCanvas />
          <div className="absolute bottom-0 left-0 right-0" data-tutorial="timeline">
            <AnnotatedTimeScrubber />
            <EventFeed />
          </div>

          {/* Agent Inspector overlay */}
          {selectedAgent && (
            <div className="absolute top-4 right-4 z-40">
              <AgentInspector
                agent={selectedAgent}
                onClose={() => setSelectedAgentId(null)}
              />
            </div>
          )}
        </div>

        {/* Right: Controls + Dashboard */}
        {isMobile ? (
          /* Mobile bottom sheet */
          <div
            className={`fixed bottom-0 left-0 right-0 bg-[var(--sim-bg)] border-t border-[var(--sim-border)] transition-all duration-300 z-30 ${
              sheetExpanded ? 'h-[70vh]' : 'h-[60px]'
            }`}
          >
            {/* Handle */}
            <button
              onClick={() => setSheetExpanded(!sheetExpanded)}
              className="w-full flex justify-center py-2"
            >
              <div className="w-10 h-1 rounded-full bg-[var(--sim-border-strong)]" />
            </button>
            <div className="overflow-y-auto h-full pb-16">
              <div data-tutorial="controls">
                <ControlPanel />
              </div>
              <div data-tutorial="metrics">
                <MetricsDashboard />
              </div>
            </div>
          </div>
        ) : (
          /* Desktop sidebar */
          <div className="w-[420px] flex flex-col border-l border-[var(--sim-border)] overflow-y-auto" data-tutorial="controls">
            <div data-tutorial="transport">
              <ControlPanel />
            </div>
            <FloorNav />
            <AgentGuide />
            <DelegationGraph />
            <ScenarioBuilder />
            <CustomAgentForm />
            <MetricAlerts />
            {snapshot && (
              <VotingHeatmap agents={snapshot.agents} proposals={snapshot.proposals} />
            )}
            <div data-tutorial="metrics">
              <MetricsDashboard />
            </div>
          </div>
        )}
      </div>

      {/* Compare tab */}
      {activeTab === 'compare' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ComparisonView />
        </div>
      )}

      {/* Branch tab */}
      {activeTab === 'branch' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <BranchView />
        </div>
      )}

      {/* Multi-Run tab */}
      {activeTab === 'multirun' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <MultiRunPanel />
        </div>
      )}

      {/* Research tab */}
      {activeTab === 'research' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ResearchPanel />
        </div>
      )}

      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}
      <Tutorial />
    </div>
  );
}
