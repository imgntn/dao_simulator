'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSimulationStore } from '@/lib/browser/simulation-store';
import { useLayoutStore } from '@/lib/browser/layout-store';
import { useBreakpointTier } from '@/components/simulation/panels/useBreakpointTier';
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
import { FeedbackButton } from '@/components/simulation/FeedbackForm';
import { Tutorial } from '@/components/simulation/Tutorial';
import { useActiveSnapshot } from '@/lib/browser/useActiveSnapshot';
import { Sidebar } from '@/components/simulation/panels/Sidebar';
import { MobileSimView } from '@/components/simulation/MobileSimView';
import { SidebarResizeHandle } from '@/components/simulation/panels/SidebarResizeHandle';
import { CollapsiblePanel } from '@/components/simulation/panels/CollapsiblePanel';

export default function SimulationPageClient() {
  const { status, error, initialize, dispose, updateConfig, selectDao } = useSimulationStore();
  const snapshot = useActiveSnapshot();
  const initialized = useRef(false);
  const [activeTab, setActiveTab] = useState<SimTab>('interactive');
  const [showHelp, setShowHelp] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const tier = useBreakpointTier();
  const sidebarWidth = useLayoutStore(s => s.sidebarWidth);

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

  // Build panel content map for the Sidebar
  const panelContent = buildPanelContent(snapshot, activeTab);

  // Mobile gets a 2D-only UI, desktop/tablet gets full 3D
  const isMobile = tier === 'compact' || tier === 'handheld';
  const useSidebar = !isMobile;

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

  // Mobile: render 2D-only UI (no canvas, no 3D)
  if (isMobile) {
    return <MobileSimView />;
  }

  return (
    <div
      data-sim-root
      className="sim-layout bg-[var(--sim-bg)] text-[var(--sim-text)]"
    >
      {/* Top bar: tabs + actions */}
      <div className="flex items-center border-b border-[var(--sim-border)] bg-[var(--sim-bg)]">
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="ml-auto pr-3 flex items-center gap-1.5">
          <ThemeToggle />
          <ShareButton />
          <FeedbackButton />
          <button
            onClick={() => setShowHelp(true)}
            className="w-7 h-7 rounded-full border border-[var(--sim-border)] text-[var(--sim-text-muted)] hover:text-[var(--sim-accent)] hover:border-[var(--sim-accent)] text-sm font-semibold transition-colors"
            title="Help & Tutorial"
          >
            ?
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div
        className="sim-layout-body"
        style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
      >
        {/* 3D Canvas — always visible regardless of active tab */}
        <div className="relative min-w-0 min-h-0 overflow-hidden">
          {/* Canvas stays mounted, other tabs overlay it */}
          <div style={{ display: activeTab === 'interactive' ? 'contents' : 'none' }}>
            <div className="absolute inset-0">
              <SimulationCanvas />
            </div>
            <div className="absolute bottom-0 left-0 right-0 z-10" data-tutorial="timeline">
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

          {/* Non-interactive tabs render as overlay over canvas area */}
          {activeTab === 'compare' && (
            <div className="absolute inset-0 overflow-y-auto bg-[var(--sim-bg)]">
              <ComparisonView />
            </div>
          )}
          {activeTab === 'branch' && (
            <div className="absolute inset-0 overflow-y-auto bg-[var(--sim-bg)]">
              <BranchView />
            </div>
          )}
          {activeTab === 'multirun' && (
            <div className="absolute inset-0 overflow-y-auto bg-[var(--sim-bg)]">
              <MultiRunPanel />
            </div>
          )}
          {activeTab === 'research' && (
            <div className="absolute inset-0 overflow-y-auto bg-[var(--sim-bg)]">
              <ResearchPanel />
            </div>
          )}
        </div>

        {/* Sidebar (tablet/desktop/ultrawide) */}
        <div className="flex min-h-0">
          <SidebarResizeHandle />
          <Sidebar panelContent={panelContent} />
        </div>
      </div>

      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}
      <Tutorial />
    </div>
  );
}

/** Build a record mapping panel IDs to their rendered JSX */
function buildPanelContent(
  snapshot: ReturnType<typeof useActiveSnapshot>,
  activeTab: SimTab
): Record<string, React.ReactNode> {
  return {
    transport: (
      <div data-tutorial="transport">
        <ControlPanel />
      </div>
    ),
    'floor-nav': <FloorNav />,
    'agent-guide': (
      <CollapsiblePanel id="agent-guide" title="Agent Guide">
        <AgentGuide />
      </CollapsiblePanel>
    ),
    'delegation-graph': (
      <CollapsiblePanel id="delegation-graph" title="Delegation Graph">
        <DelegationGraph />
      </CollapsiblePanel>
    ),
    'scenario-builder': (
      <CollapsiblePanel id="scenario-builder" title="Scenario Builder">
        <ScenarioBuilder />
      </CollapsiblePanel>
    ),
    'custom-agent': (
      <CollapsiblePanel id="custom-agent" title="Custom Agent">
        <CustomAgentForm />
      </CollapsiblePanel>
    ),
    'metric-alerts': (
      <CollapsiblePanel id="metric-alerts" title="Alerts">
        <MetricAlerts />
      </CollapsiblePanel>
    ),
    'voting-heatmap': snapshot ? (
      <CollapsiblePanel id="voting-heatmap" title="Voting Heatmap">
        <VotingHeatmap agents={snapshot.agents} proposals={snapshot.proposals} />
      </CollapsiblePanel>
    ) : null,
    'metrics-dashboard': (
      <CollapsiblePanel id="metrics-dashboard" title="Metrics Dashboard">
        <div data-tutorial="metrics" className="metrics-grid-container">
          <MetricsDashboard />
        </div>
      </CollapsiblePanel>
    ),
    // Mode-specific panels
    comparison: activeTab === 'compare' ? <ComparisonView /> : null,
    branch: activeTab === 'branch' ? <BranchView /> : null,
    multirun: activeTab === 'multirun' ? <MultiRunPanel /> : null,
    research: activeTab === 'research' ? <ResearchPanel /> : null,
  };
}
