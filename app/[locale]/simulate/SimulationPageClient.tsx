'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSimulationStore } from '@/lib/browser/simulation-store';
import { useLayoutStore } from '@/lib/browser/layout-store';
import { useBreakpointTier } from '@/components/simulation/panels/useBreakpointTier';
import { useKeyboardShortcuts } from '@/lib/browser/useKeyboardShortcuts';
import { decodeConfigFromURL } from '@/components/simulation/ShareButton';
import { ControlPanel } from '@/components/simulation/ControlPanel';
import { MetricsDashboard } from '@/components/simulation/dashboard/MetricsDashboard';
import { EventFeed } from '@/components/simulation/dashboard/EventFeed';
import { VotingHeatmap } from '@/components/simulation/dashboard/VotingHeatmap';
import { SanctumScene } from '@/components/simulation/sanctum';
import { TabBar, type SimTab } from '@/components/simulation/TabBar';
import { AgentGuide } from '@/components/simulation/AgentGuide';
import { FloorNav } from '@/components/simulation/FloorNav';
import { DelegationGraph } from '@/components/simulation/dashboard/DelegationGraph';
import { ScenarioBuilder } from '@/components/simulation/ScenarioBuilder';
import { ComparisonView } from '@/components/simulation/ComparisonView';
import { HelpOverlay } from '@/components/simulation/HelpOverlay';
import { EvidenceWorkbench } from '@/components/simulation/evidence/EvidenceWorkbench';
import { MetricAlerts } from '@/components/simulation/MetricAlerts';
import { CustomAgentForm } from '@/components/simulation/CustomAgentForm';
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
import { SimulationCommandBar } from '@/components/simulation/SimulationCommandBar';
import { ScenarioPresetWizard } from '@/components/simulation/ScenarioPresetWizard';
import { LiveExplainabilityPanel } from '@/components/simulation/LiveExplainabilityPanel';
import { OutcomeSummary } from '@/components/simulation/OutcomeSummary';
import { useTutorialStore } from '@/lib/browser/tutorial-store';

export default function SimulationPageClient() {
  const status = useSimulationStore(s => s.status);
  const error = useSimulationStore(s => s.error);
  const initialize = useSimulationStore(s => s.initialize);
  const dispose = useSimulationStore(s => s.dispose);
  const updateConfig = useSimulationStore(s => s.updateConfig);
  const selectDao = useSimulationStore(s => s.selectDao);
  const snapshot = useActiveSnapshot();
  const [activeTab, setActiveTab] = useState<SimTab>('interactive');
  const [showHelp, setShowHelp] = useState(false);
  const [showPresetWizard, setShowPresetWizard] = useState(false);
  const [dataLoadAttempt, setDataLoadAttempt] = useState(0);
  const [dataLoadFailure, setDataLoadFailure] = useState<{
    message: string;
    diagnosticId: string;
  } | null>(null);
  const tutorialCompleted = useTutorialStore(s => s.completed);
  const startTutorial = useTutorialStore(s => s.start);
  const dismissTutorial = useTutorialStore(s => s.finish);

  const tier = useBreakpointTier();
  const sidebarWidth = useLayoutStore(s => s.sidebarWidth);

  // Keyboard shortcuts
  const shortcutCallbacks = useCallback(() => ({
    onToggleHelp: () => setShowHelp(prev => !prev),
  }), []);
  useKeyboardShortcuts(shortcutCallbacks());

  useEffect(() => {
    let cancelled = false;
    setDataLoadFailure(null);
    const urlConfig = decodeConfigFromURL();
    const fetchJson = async (url: string) => {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('json')) throw new Error(`${url} returned ${contentType || 'an unknown content type'}`);
      return response.json();
    };
    Promise.all([
      fetchJson('/data/calibration-profiles.json'),
      fetchJson('/data/market-timeseries.json'),
    ])
      .then(([profiles, market]) => {
        if (cancelled) return;
        // Apply URL overrides before initialization
        if (urlConfig.daoId) {
          selectDao(urlConfig.daoId);
        }
        const otherConfig = { ...urlConfig };
        delete otherConfig.daoId;
        if (Object.keys(otherConfig).length > 0) {
          updateConfig(otherConfig);
        }
        initialize(profiles, market);
        if (new URLSearchParams(window.location.search).get('guided') === '1') {
          setShowPresetWizard(true);
        }
      })
      .catch(err => {
        console.error('Failed to load simulation data:', err);
        if (cancelled) return;
        setDataLoadFailure({
          message: err instanceof Error ? err.message : String(err),
          diagnosticId: `sim-data-${Date.now().toString(36)}-${dataLoadAttempt + 1}`,
        });
      });

    return () => {
      cancelled = true;
      dispose();
    };
  }, [initialize, dispose, updateConfig, selectDao, dataLoadAttempt]);

  // Build panel content map for the Sidebar
  const panelContent = useMemo(
    () => buildPanelContent(snapshot, activeTab),
    [snapshot, activeTab]
  );

  // Mobile gets a compact dashboard UI, desktop/tablet gets the full Sanctum scene.
  const isMobile = tier === 'compact' || tier === 'handheld';
  if (dataLoadFailure) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--sim-bg)] text-[var(--sim-text)] p-6">
        <div className="evidence-card p-6 text-center max-w-lg">
          <p className="text-lg font-mono mb-2">Simulation data unavailable</p>
          <p className="text-sm text-[var(--sim-text-muted)]">{dataLoadFailure.message}</p>
          <p className="text-[10px] text-[var(--sim-text-dim)] mt-2 font-mono">Diagnostic: {dataLoadFailure.diagnosticId}</p>
          <button onClick={() => setDataLoadAttempt(value => value + 1)} className="evidence-button mt-4">
            Retry data load
          </button>
        </div>
      </div>
    );
  }

  if (status === 'idle' || status === 'initializing') {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--cave-bg, #040210)' }}>
        <div className="text-center">
          {/* Crystal growth animation */}
          <svg width="48" height="48" viewBox="0 0 48 48" className="mx-auto mb-4 animate-crystal-pulse" aria-hidden="true">
            <polygon points="24,2 30,18 46,18 34,30 38,46 24,36 10,46 14,30 2,18 18,18" fill="none" stroke="var(--cx-sal-g, #40E8FF)" strokeWidth="1.5" opacity="0.7" />
            <polygon points="24,10 28,20 38,20 30,27 33,37 24,31 15,37 18,27 10,20 20,20" fill="var(--cx-sal, #08B8D8)" opacity="0.25" />
          </svg>
          <p className="font-mono text-lg" style={{ color: 'var(--mucha-gold-lt, #E8C050)' }}>Awakening the Sanctum…</p>
          <p className="mt-2 text-sm" style={{ color: 'var(--cx-pass, #7050B8)' }}>Calibrating 14 DAO digital twins</p>
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

  // Mobile: render a compact UI optimized for narrow screens.
  if (isMobile) {
    return (
      <main>
        <MobileSimView onOpenWizard={() => setShowPresetWizard(true)} />
        {showPresetWizard && <ScenarioPresetWizard onClose={() => setShowPresetWizard(false)} />}
      </main>
    );
  }

  return (
    <main
      data-sim-root
      className="sim-layout bg-[var(--sim-bg)] text-[var(--sim-text)]"
    >
      {/* Top bar: tabs + actions */}
      <div className="flex items-center bg-[var(--sim-bg)]" style={{ borderBottom: '1px solid rgba(196,144,32,0.22)' }}>
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

      <SimulationCommandBar onOpenWizard={() => setShowPresetWizard(true)} />

      {/* Main content area */}
      <div
        className="sim-layout-body"
        style={{ '--sidebar-width': activeTab === 'research' ? '0px' : `${sidebarWidth}px` } as React.CSSProperties}
      >
        {/* Interactive scene area */}
        <div className="relative min-w-0 min-h-0 overflow-hidden">
          {/* Sanctum — cave scene with built-in timeline scrubber + event log */}
          <div style={{ display: activeTab === 'interactive' ? 'contents' : 'none' }}>
            <div className="absolute inset-0">
              <SanctumScene />
            </div>
            {!tutorialCompleted && (
              <aside
                className="absolute right-4 top-4 z-40 w-72 rounded border border-[var(--sim-accent)] bg-[var(--sim-surface)] p-3 shadow-xl"
                aria-label="First-run guide"
              >
                <h2 className="text-sm font-semibold">New to the Sanctum?</h2>
                <p className="mt-1 text-[11px] text-[var(--sim-text-muted)]">
                  Take a guided tour of controls, the one-hour simulation clock, agent inspection, metrics, and evidence.
                </p>
                <div className="mt-3 flex gap-2">
                  <button className="evidence-button" onClick={startTutorial}>Start guide</button>
                  <button className="px-2 text-[11px] underline" onClick={dismissTutorial}>Dismiss</button>
                </div>
              </aside>
            )}
            {!snapshot && status === 'paused' && (
              <aside
                className="absolute left-4 top-4 z-30 w-80 rounded border border-[var(--sim-accent)] bg-[var(--sim-surface)] p-4 shadow-xl"
                aria-label="Start your first result"
                data-testid="first-result-prompt"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--sim-accent)]">Start here</p>
                <h2 className="mt-1 text-base font-semibold">Get to a meaningful result in about a minute</h2>
                <p className="mt-1 text-xs leading-relaxed text-[var(--sim-text-muted)]">
                  Pick a governance question, run the recommended scenario, and compare what changed before tuning the model.
                </p>
                <button type="button" className="evidence-button mt-3" data-analytics-event="first_result_prompt_opened" onClick={() => setShowPresetWizard(true)}>
                  Choose a guided question
                </button>
              </aside>
            )}
          </div>

          {/* Non-interactive tabs render as overlays over the scene area */}
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
              <EvidenceWorkbench />
            </div>
          )}
        </div>

        {/* Sidebar (tablet/desktop/ultrawide) */}
        {activeTab !== 'research' && (
          <div className="flex min-h-0" data-tutorial="controls">
            <SidebarResizeHandle />
            <Sidebar panelContent={panelContent} />
          </div>
        )}
      </div>

      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}
      {showPresetWizard && <ScenarioPresetWizard onClose={() => setShowPresetWizard(false)} />}
      <Tutorial />
    </main>
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
    'outcome-summary': (
      <CollapsiblePanel id="outcome-summary" title="Outcome summary">
        <OutcomeSummary />
      </CollapsiblePanel>
    ),
    'floor-nav': <FloorNav />,
    // --- Charts & Metrics ---
    'metrics-dashboard': (
      <CollapsiblePanel id="metrics-dashboard" title="Metrics">
        <div data-tutorial="metrics" className="metrics-grid-container">
          <MetricsDashboard />
        </div>
      </CollapsiblePanel>
    ),
    'voting-heatmap': snapshot ? (
      <CollapsiblePanel id="voting-heatmap" title="Voting Heatmap">
        <VotingHeatmap agents={snapshot.agents} proposals={snapshot.proposals} />
      </CollapsiblePanel>
    ) : null,
    'metric-alerts': (
      <CollapsiblePanel id="metric-alerts" title="Alerts">
        <MetricAlerts />
      </CollapsiblePanel>
    ),
    explainability: (
      <CollapsiblePanel id="explainability" title="Live Explainability">
        <LiveExplainabilityPanel />
      </CollapsiblePanel>
    ),
    'delegation-graph': (
      <CollapsiblePanel id="delegation-graph" title="Delegation Graph">
        <DelegationGraph />
      </CollapsiblePanel>
    ),
    'event-feed': (
      <CollapsiblePanel id="event-feed" title="Event Feed">
        <EventFeed />
      </CollapsiblePanel>
    ),
    // --- Configuration ---
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
    // --- Reference ---
    'agent-guide': (
      <CollapsiblePanel id="agent-guide" title="Agent Guide">
        <AgentGuide />
      </CollapsiblePanel>
    ),
    // Mode-specific panels
    comparison: activeTab === 'compare' ? <ComparisonView /> : null,
    branch: activeTab === 'branch' ? <BranchView /> : null,
    multirun: activeTab === 'multirun' ? <MultiRunPanel /> : null,
    research: activeTab === 'research' ? <EvidenceWorkbench /> : null,
  };
}
