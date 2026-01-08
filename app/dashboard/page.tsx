'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { PriceLineChart } from '@/components/visualizations/PriceLineChart';
import { DAOReport } from '@/components/visualizations/DAOReport';
import { ScenarioCard } from '@/components/visualizations/ScenarioCard';
import { RunSummaryModal } from '@/components/visualizations/RunSummaryModal';
import { useSimulationSocket } from '@/lib/hooks/useSimulationSocket';

// Dynamic imports for heavy visualization components (loaded only when needed)
const NetworkGraph3DWrapper = dynamic(
  () => import('@/components/visualizations/NetworkGraph3DWrapper').then((mod) => mod.NetworkGraph3DWrapper),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] bg-gray-800 rounded-lg flex items-center justify-center animate-pulse">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full border-4 border-gray-700 border-t-blue-500 animate-spin" />
          <p className="text-gray-500 text-sm">Loading 3D network...</p>
        </div>
      </div>
    ),
  }
);

const MemberHeatmap = dynamic(
  () => import('@/components/visualizations/MemberHeatmap').then((mod) => mod.MemberHeatmap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[400px] bg-gray-800 rounded-lg animate-pulse" />
    ),
  }
);

const ChoroplethMap = dynamic(
  () => import('@/components/visualizations/ChoroplethMap').then((mod) => mod.ChoroplethMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[400px] bg-gray-800 rounded-lg animate-pulse" />
    ),
  }
);

const CozyMap = dynamic(
  () => import('@/components/visualizations/CozyMap').then((mod) => mod.CozyMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[300px] bg-gray-800 rounded-lg animate-pulse" />
    ),
  }
);

type OutcomeCause =
  | 'missions_completed'
  | 'treasury_insolvency'
  | 'price_collapse'
  | 'governance_backlog'
  | 'unknown';

type RunHistoryEntry = {
  id: string;
  preset: string;
  steps: number;
  treasury: number;
  score: number;
  seed: string | number;
  when: string;
  outcome?: 'won' | 'lost';
  cause?: OutcomeCause;
  strategy?: string;
};

type OrgStats = {
  totalRuns: number;
  totalSteps: number;
  peakTreasury: number;
  maxShocksInRun: number;
  wins: number;
  losses: number;
};

type OpsLogEntry = {
  label: string;
  value: string | number;
  step?: number;
  severity?: 'info' | 'warning' | 'incident' | 'critical';
};

type SimulationConfig = {
  seed?: number | string;
  [key: string]: any;
};

export default function DashboardPage() {
  const {
    connected,
    running,
    step,
    priceHistory,
    simulationData,
    networkData,
    members,
    proposals,
    tokenLeaderboard,
    influenceLeaderboard,
    marketShocks,
    reset: resetSimulation,
    startSimulation,
    stopSimulation,
    stepSimulation,
  } = useSimulationSocket();
  const socketUrl =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SOCKET_URL) ||
    'http://localhost:8003';

  const [showLabels, setShowLabels] = useState(false);
  const [interactiveNetwork, setInteractiveNetwork] = useState(true);
  const [stepsPerSecond, setStepsPerSecond] = useState(2);
  const [baseline, setBaseline] = useState<null | { treasury: number; proposals: number; members: number }>(null);
  const [selectedPreset, setSelectedPreset] = useState('balanced');
  const [selectedStrategyId, setSelectedStrategyId] = useState('baseline');
  const [showTutorial, setShowTutorial] = useState(true);
  const [completedMissions, setCompletedMissions] = useState<Set<string>>(new Set());
  const [lastCompleted, setLastCompleted] = useState<string | null>(null);
  const [recentShock, setRecentShock] = useState<{ severity: number; step: number } | null>(null);
  const [visualsPaused, setVisualsPaused] = useState(false);
  const [runHistory, setRunHistory] = useState<RunHistoryEntry[]>([]);
  const [orgStats, setOrgStats] = useState<OrgStats | null>(null);
  const [runState, setRunState] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');
  const [showSummary, setShowSummary] = useState(false);
  const [runSummary, setRunSummary] = useState<
    | {
        outcome: 'won' | 'lost';
        steps: number;
        treasury: number;
        preset: string;
        seed?: number | string;
        strategyName?: string;
        outcomeCause?: OutcomeCause;
        missions?: any[];
        log?: OpsLogEntry[];
      }
    | null
  >(null);
  const [runLog, setRunLog] = useState<OpsLogEntry[]>([]);
  const tutorialSteps = [
    'Pick a strategy preset or a daily/weekly challenge to begin.',
    'Press Start (Space) to stream the sim; use Step (F) to advance manually.',
    'Watch missions at the top; finish them to win the run.',
    'Pause visuals if needed; DAO Map + Report show health at a glance.',
    'Avoid failures: keep treasury and price healthy, clear proposal backlog.',
  ];
  const [tutorialStep, setTutorialStep] = useState(0);

  const latest = simulationData.at(-1);

  useEffect(() => {
    if (latest) {
      if (latest.step % 10 === 0) {
        setRunLog((prev) => {
          const price =
            (latest as any)?.dao_token_price?.toFixed?.(2) ??
            (latest as any)?.dao_token_price ??
            0;
          const treasuryValue = Math.round(latest.treasury_balance ?? 0).toLocaleString(
            'en-US',
          );
          const next: OpsLogEntry[] = [
            ...prev,
            {
              label: 'Ops snapshot',
              value: `Price ${price}, treasury ${treasuryValue}`,
              step: latest.step,
              severity: 'info',
            },
          ];
          return next.slice(-30);
        });
      }
    }

    if (!baseline && latest) {
      setBaseline({
        treasury: latest.treasury_balance ?? 0,
        proposals: (latest as any).proposals ?? latest.active_proposals ?? 0,
        members: latest.total_members ?? 0,
      });
    }
  }, [baseline, latest]);

  useEffect(() => {
    if (simulationData.length === 0) {
      setBaseline(null);
    }
  }, [simulationData.length]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('dao-sim-runs');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRunHistory(parsed as RunHistoryEntry[]);
        }
      }

      const storedStats = localStorage.getItem('dao-sim-org-stats');
      if (storedStats) {
        const parsedStats = JSON.parse(storedStats) as OrgStats;
        if (parsedStats && typeof parsedStats === 'object') {
          setOrgStats(parsedStats);
        }
      }
    } catch (err) {
      console.error('Failed to load run history', err);
    }
  }, []);

  useEffect(() => {
    if (marketShocks.length > 0) {
      const latestShock = marketShocks[marketShocks.length - 1];
      setRecentShock(latestShock);
      setRunLog((prev) => {
        const severityLevel: OpsLogEntry['severity'] =
          Math.abs(latestShock.severity) >= 1 ? 'critical' : 'incident';
        const direction = latestShock.severity >= 0 ? 'upside' : 'downside';
        const next: OpsLogEntry[] = [
          ...prev,
          {
            label: 'Risk event: market shock',
            value: `${direction} move, severity ${latestShock.severity.toFixed(2)}`,
            step: latestShock.step,
            severity: severityLevel,
          },
        ];
        return next.slice(-30);
      });
      const timer = setTimeout(() => setRecentShock(null), 3000);
      return () => clearTimeout(timer);
    }
    return;
  }, [marketShocks]);

  const presets = useMemo<
    Array<{
      id: string;
      name: string;
      description: string;
      config: SimulationConfig;
    }>
  >(
    () => [
      {
        id: 'balanced',
        name: 'Balanced',
        description: 'Even mix of devs/investors with moderate shocks',
        config: {
          num_developers: 8,
          num_investors: 6,
          num_proposal_creators: 4,
          num_validators: 4,
          num_passive_members: 8,
          marketShockFrequency: 0.15,
        },
      },
      {
        id: 'validators',
        name: 'Validator-First',
        description: 'More validators and stricter governance',
        config: {
          num_developers: 6,
          num_investors: 4,
          num_validators: 10,
          num_proposal_creators: 3,
          governance_rule: 'supermajority' as const,
          marketShockFrequency: 0.1,
        },
      },
      {
        id: 'growth',
        name: 'Growth Push',
        description: 'More developers and proposal creators, light shocks',
        config: {
          num_developers: 12,
          num_investors: 4,
          num_proposal_creators: 6,
          num_validators: 3,
          marketShockFrequency: 0.05,
        },
      },
    ],
    []
  );

  const presetConfig = useMemo<SimulationConfig>(() => {
    return presets.find((preset) => preset.id === selectedPreset)?.config ?? {};
  }, [presets, selectedPreset]);

  const challenges = useMemo(
    () => [
      {
        id: 'daily',
        name: 'Daily Challenge',
        description: 'Seeded run with steady shocks; aim for +30% treasury in 120 steps.',
        config: {
          seed: 20251112,
          num_developers: 9,
          num_investors: 5,
          num_proposal_creators: 5,
          num_validators: 5,
          marketShockFrequency: 0.12,
        },
      },
      {
        id: 'weekly',
        name: 'Weekly Challenge',
        description: 'Validator-heavy governance; survive 200 steps with minimal shocks.',
        config: {
          seed: 202511,
          num_developers: 7,
          num_investors: 4,
          num_proposal_creators: 4,
          num_validators: 12,
          governance_rule: 'supermajority' as const,
          marketShockFrequency: 0.08,
        },
      },
    ],
    []
  );

  const strategies = useMemo(
    () => [
      {
        id: 'baseline',
        name: 'Baseline',
        description: 'Use the preset configuration as-is.',
        overlay: (config: Record<string, any>) => ({ ...config }),
      },
      {
        id: 'risk_off',
        name: 'Risk-Off Treasury',
        description: 'Lower shock frequency and slightly favor investors/validators.',
        overlay: (config: Record<string, any>) => ({
          ...config,
          marketShockFrequency: (config.marketShockFrequency ?? 0.12) * 0.6,
          num_investors: Math.round((config.num_investors ?? 5) * 1.2),
          num_validators: Math.round((config.num_validators ?? 4) * 1.1),
        }),
      },
      {
        id: 'growth',
        name: 'Growth Mode',
        description: 'Increase builders and proposal creators, tolerate more shocks.',
        overlay: (config: Record<string, any>) => ({
          ...config,
          num_developers: Math.round((config.num_developers ?? 8) * 1.4),
          num_proposal_creators: Math.round((config.num_proposal_creators ?? 4) * 1.5),
          marketShockFrequency: (config.marketShockFrequency ?? 0.08) * 1.3,
        }),
      },
      {
        id: 'validator',
        name: 'Validator Governance',
        description: 'Strengthen validator set and governance thresholds.',
        overlay: (config: Record<string, any>) => ({
          ...config,
          num_validators: Math.round((config.num_validators ?? 6) * 1.6),
          governance_rule: (config.governance_rule as any) ?? 'supermajority',
        }),
      },
      {
        id: 'community_first',
        name: 'Community-First',
        description: 'Broader passive membership and lighter validator focus.',
        overlay: (config: Record<string, any>) => ({
          ...config,
          num_passive_members: Math.round((config.num_passive_members ?? 8) * 1.8),
          num_validators: Math.round((config.num_validators ?? 4) * 0.8),
        }),
      },
    ],
    []
  );

  const selectedStrategy = useMemo(
    () => strategies.find((strategy) => strategy.id === selectedStrategyId) ?? strategies[0],
    [strategies, selectedStrategyId]
  );

  const applyStrategy = useCallback(
    (config: SimulationConfig) => {
      const base = config ?? {};
      if (!selectedStrategy) return base;
      return selectedStrategy.overlay(base);
    },
    [selectedStrategy]
  );

  const recordRun = useCallback(
    (
      label: string,
      override?: {
        steps?: number;
        treasury?: number;
        outcome?: 'won' | 'lost';
        cause?: OutcomeCause;
        strategyName?: string;
      }
    ) => {
      if (!latest) return;
      const stepsValue = override?.steps ?? step;
      const treasuryValue = override?.treasury ?? Math.round(latest.treasury_balance ?? 0);
      const score = Math.max(0, Math.round(treasuryValue + stepsValue * 2));
      const entry: RunHistoryEntry = {
        id: `${Date.now()}`,
        preset: label,
        steps: stepsValue,
        treasury: treasuryValue,
        score,
        seed: (presetConfig as any)?.seed ?? 'N/A',
        when: new Date().toLocaleTimeString(),
        outcome: override?.outcome,
        cause: override?.cause,
        strategy: override?.strategyName ?? selectedStrategy?.name,
      };
      setRunHistory((prev) => {
        const next = [entry, ...prev].slice(0, 10);
        if (typeof window !== 'undefined') {
          localStorage.setItem('dao-sim-runs', JSON.stringify(next));
        }
        return next;
      });
    },
    [latest, step, presetConfig, selectedStrategy]
  );

  const updateOrgStatsFromRun = useCallback(
    (data: { steps: number; treasury: number; shocks: number; outcome: 'won' | 'lost' }) => {
      setOrgStats((prev) => {
        const base: OrgStats = prev ?? {
          totalRuns: 0,
          totalSteps: 0,
          peakTreasury: 0,
          maxShocksInRun: 0,
          wins: 0,
          losses: 0,
        };
        const next: OrgStats = {
          totalRuns: base.totalRuns + 1,
          totalSteps: base.totalSteps + data.steps,
          peakTreasury: Math.max(base.peakTreasury, data.treasury),
          maxShocksInRun: Math.max(base.maxShocksInRun, data.shocks),
          wins: base.wins + (data.outcome === 'won' ? 1 : 0),
          losses: base.losses + (data.outcome === 'lost' ? 1 : 0),
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem('dao-sim-org-stats', JSON.stringify(next));
        }
        return next;
      });
    },
    []
  );

  const missions = useMemo(() => {
    if (!baseline || !latest) {
      return [
        {
          id: 'treasury',
          title: 'Strengthen Treasury',
          description: 'Target +20% treasury balance this run.',
          progress: 0,
          targetLabel: 'Pending',
          currentLabel: '0',
        },
        {
          id: 'proposals',
          title: 'Reduce Backlog',
          description: 'Process at least 3 proposals.',
          progress: 0,
          targetLabel: '3',
          currentLabel: '0',
        },
        {
          id: 'steps',
          title: 'Maintain Operations',
          description: 'Advance 100 steps without failing.',
          progress: 0,
          targetLabel: '100',
          currentLabel: `${step}`,
        },
      ];
    }

    const fmt = (value: number) => value.toLocaleString('en-US');
    const treasuryTarget = baseline.treasury + Math.max(50, baseline.treasury * 0.2);
    const treasuryProgress = (latest.treasury_balance - baseline.treasury) / (treasuryTarget - baseline.treasury || 1);

    const proposalBaseline = baseline.proposals;
    const proposalsTarget = proposalBaseline + 3;
    const proposalsCurrent = (latest as any).proposals ?? latest.active_proposals ?? proposalBaseline;
    const proposalsProgress = (proposalsCurrent - proposalBaseline) / 3;

    const stepTarget = Math.max(100, Math.ceil((step + 1) / 100) * 100);
    const stepProgress = stepTarget === 0 ? 0 : step / stepTarget;

    if (selectedPreset === 'validators') {
      return [
        {
          id: 'treasury',
          title: 'Protect Treasury',
          description: 'Keep treasury comfortably above baseline.',
          progress: treasuryProgress,
          targetLabel: fmt(Math.round(treasuryTarget)),
          currentLabel: fmt(Math.round(latest.treasury_balance ?? 0)),
        },
        {
          id: 'proposals',
          title: 'Avoid Gridlock',
          description: 'Keep open proposals close to baseline.',
          progress: proposalsProgress,
          targetLabel: fmt(proposalsTarget),
          currentLabel: fmt(proposalsCurrent),
        },
        {
          id: 'steps',
          title: 'Sustain Governance',
          description: 'Maintain operations for another 100 steps.',
          progress: stepProgress,
          targetLabel: fmt(stepTarget),
          currentLabel: fmt(step),
        },
      ];
    }

    if (selectedPreset === 'growth') {
      return [
        {
          id: 'treasury',
          title: 'Fund Growth',
          description: 'Grow treasury to support expansion.',
          progress: treasuryProgress,
          targetLabel: fmt(Math.round(treasuryTarget)),
          currentLabel: fmt(Math.round(latest.treasury_balance ?? 0)),
        },
        {
          id: 'proposals',
          title: 'Ship Initiatives',
          description: 'Process 3+ proposals focused on growth.',
          progress: proposalsProgress,
          targetLabel: fmt(proposalsTarget),
          currentLabel: fmt(proposalsCurrent),
        },
        {
          id: 'steps',
          title: 'Sustain Growth Runway',
          description: 'Advance 100 more steps.',
          progress: stepProgress,
          targetLabel: fmt(stepTarget),
          currentLabel: fmt(step),
        },
      ];
    }

    return [
      {
        id: 'treasury',
        title: 'Strengthen Treasury',
        description: 'Reach +20% treasury balance.',
        progress: treasuryProgress,
        targetLabel: fmt(Math.round(treasuryTarget)),
        currentLabel: fmt(Math.round(latest.treasury_balance ?? 0)),
      },
      {
        id: 'proposals',
        title: 'Reduce Backlog',
        description: 'Process 3 proposals this run.',
        progress: proposalsProgress,
        targetLabel: fmt(proposalsTarget),
        currentLabel: fmt(proposalsCurrent),
      },
      {
        id: 'steps',
        title: 'Maintain Operations',
        description: 'Advance 100 more steps.',
        progress: stepProgress,
        targetLabel: fmt(stepTarget),
        currentLabel: fmt(step),
      },
    ];
  }, [baseline, latest, step, selectedPreset]);

  useEffect(() => {
    const nextCompleted = new Set(completedMissions);
    missions.forEach((mission) => {
      if (mission.progress >= 1 && !nextCompleted.has(mission.id)) {
        nextCompleted.add(mission.id);
        setLastCompleted(mission.title);
        setRunLog((prev) => {
          const next: OpsLogEntry[] = [
            ...prev,
            {
              label: 'Objective completed',
              value: mission.title,
              step,
              severity: 'info',
            },
          ];
          return next.slice(-30);
        });
        setTimeout(() => setLastCompleted(null), 3000);
      }
    });
    if (nextCompleted.size !== completedMissions.size) {
      setCompletedMissions(nextCompleted);
    }
  }, [missions, completedMissions, step]);

  useEffect(() => {
    if (!latest || runState === 'won' || runState === 'lost') return;

    const concludeRun = (outcome: 'won' | 'lost', cause: OutcomeCause) => {
      const summary = {
        outcome,
        steps: step,
        treasury: Math.round(latest.treasury_balance ?? 0),
        preset: selectedPreset,
        seed: presetConfig?.seed,
        strategyName: selectedStrategy?.name,
        outcomeCause: cause,
        missions: missions.map((m) => ({
          id: m.id,
          title: m.title,
          achieved: m.progress >= 1,
          currentLabel: m.currentLabel,
          targetLabel: m.targetLabel,
        })),
        log: [
          { label: 'Active proposals', value: (latest as any)?.proposals ?? latest.active_proposals ?? 0 },
          { label: 'Members', value: latest.total_members ?? members.length },
          { label: 'Token price', value: (latest as any)?.dao_token_price ?? 0 },
          { label: 'Shocks seen', value: marketShocks.length },
          ...runLog.slice(-10),
        ],
      };
      setRunState(outcome);
      setRunSummary(summary);
      setShowSummary(true);
      recordRun(selectedPreset, {
        steps: summary.steps,
        treasury: summary.treasury,
        outcome,
        cause,
        strategyName: selectedStrategy?.name,
      });
      updateOrgStatsFromRun({
        steps: summary.steps,
        treasury: summary.treasury,
        shocks: marketShocks.length,
        outcome,
      });
    };

    const allMissionsDone = missions.every((mission) => mission.progress >= 1);
    if (allMissionsDone && missions.length > 0) {
      concludeRun('won', 'missions_completed');
      stopSimulation();
      return;
    }

    const treasuryLow = (latest.treasury_balance ?? 0) <= 0;
    const priceCrash = (latest.dao_token_price ?? 1) <= 0.1;
    const proposalBacklog = ((latest as any)?.proposals ?? latest.active_proposals ?? 0) > 50;

    if (treasuryLow || priceCrash || proposalBacklog) {
      let cause: OutcomeCause = 'unknown';
      const triggers = [treasuryLow, priceCrash, proposalBacklog].filter(Boolean).length;
      if (triggers > 1) {
        cause = 'unknown';
      } else if (treasuryLow) {
        cause = 'treasury_insolvency';
      } else if (priceCrash) {
        cause = 'price_collapse';
      } else if (proposalBacklog) {
        cause = 'governance_backlog';
      }
      concludeRun('lost', cause);
      stopSimulation();
    }
  }, [
    missions,
    latest,
    runState,
    stopSimulation,
    step,
    selectedPreset,
    presetConfig,
    selectedStrategy,
    members.length,
    marketShocks.length,
    runLog,
    recordRun,
    updateOrgStatsFromRun,
  ]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      // Ignore typing inside form fields
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault();
        if (!connected) return;
        if (running) {
          stopSimulation();
        } else {
          startSimulation({ stepsPerSecond, simulationConfig: applyStrategy(presetConfig) });
        }
      }

      if (event.key.toLowerCase() === 'f') {
        if (!connected) return;
        stepSimulation();
      }

      if (event.key.toLowerCase() === 'r') {
        if (!connected) return;
        resetSimulation();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [connected, running, stepsPerSecond, presetConfig, startSimulation, stopSimulation, stepSimulation, resetSimulation, applyStrategy]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {runSummary && (
        <RunSummaryModal
          open={showSummary}
          outcome={runSummary.outcome}
          steps={runSummary.steps}
          treasury={runSummary.treasury}
          preset={runSummary.preset}
          seed={runSummary.seed}
          strategyName={runSummary.strategyName}
          outcomeCause={runSummary.outcomeCause}
          missions={runSummary.missions}
          log={runSummary.log}
          onRetry={() => {
            setShowSummary(false);
            setRunState('idle');
            stopSimulation();
            startSimulation({ stepsPerSecond, simulationConfig: applyStrategy(presetConfig) });
          }}
          onClose={() => setShowSummary(false)}
        />
      )}

      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-lg border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                DAO Simulator Dashboard
              </h1>
              <p className="text-gray-400 mt-1">Real-time governance visualization</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-300">
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <span className={`font-semibold ${running ? 'text-green-400' : 'text-orange-400'}`}>
                  {running ? 'Running' : 'Paused'}
                </span>
                <span className="text-gray-500">|</span>
                <label className="flex items-center gap-1">
                  <span id="speed-label">Speed:</span>
                  <select
                    aria-labelledby="speed-label"
                    aria-describedby="speed-description"
                    className="ml-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={stepsPerSecond}
                    onChange={(event) => setStepsPerSecond(Number(event.target.value))}
                  >
                    {[1, 2, 4, 8].map((value) => (
                      <option key={value} value={value}>
                        {value}x
                      </option>
                    ))}
                  </select>
                  <span id="speed-description" className="sr-only">
                    Simulation speed multiplier. Higher values run faster.
                  </span>
                </label>
              </div>
              <div className="text-sm text-gray-300">
                Step: <span className="font-mono font-bold text-blue-400">{step}</span>
              </div>
              <a
                href="/api/simulation"
                className="px-4 py-2 border border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white rounded-lg transition-colors text-sm"
              >
                API Docs
              </a>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    startSimulation({ stepsPerSecond, simulationConfig: applyStrategy(presetConfig) });
                    setShowTutorial(false);
                    setRunState('playing');
                  }}
                  className="px-5 py-3 text-base font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  disabled={!connected || running}
                >
                  <span>▶️</span>
                  <span>Start (Space)</span>
                </button>
                <button
                  onClick={() => {
                    recordRun(selectedPreset);
                    stopSimulation();
                  }}
                  className="px-5 py-3 text-base font-semibold bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  disabled={!connected || !running}
                >
                  <span>⏸️</span>
                  <span>Stop</span>
                </button>
                <button
                  onClick={stepSimulation}
                  className="px-5 py-3 text-base font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  disabled={!connected}
                >
                  <span>⏩</span>
                  <span>Step Once (F)</span>
                </button>
                <button
                  onClick={resetSimulation}
                  className="px-5 py-3 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  disabled={!connected}
                >
                  <span>🔄</span>
                  <span>Reset (R)</span>
                </button>
              </div>
            <div className="text-xs text-gray-400 flex flex-wrap gap-3 items-center">
              <span>🎮 Hotkeys: Space start/stop, F step, R reset.</span>
              <button
                onClick={() => setVisualsPaused(!visualsPaused)}
                className="underline text-blue-300 hover:text-blue-200"
              >
                {visualsPaused ? 'Resume visuals' : 'Pause heavy visuals'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="max-w-[1920px] mx-auto px-6 py-8 space-y-8">
        {(lastCompleted || recentShock) && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-green-500/10 blur-xl rounded-2xl" />
            <div className="relative p-4 rounded-xl border border-gray-700 bg-gray-800/70 text-sm text-white flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                <p className="font-semibold">
                  {lastCompleted ? `Mission completed: ${lastCompleted}` : recentShock ? `Market shock: severity ${recentShock.severity.toFixed(2)} (step ${recentShock.step})` : ''}
                </p>
              </div>
              <p className="text-xs text-gray-300">
                Celebrate wins and prepare for shocks; adjust speed or strategy as needed.
              </p>
            </div>
          </div>
        )}

        {lastCompleted && (
          <div className="p-3 rounded-lg bg-green-900/40 border border-green-700 text-green-200 text-sm">
            Mission completed: <span className="font-semibold">{lastCompleted}</span>
          </div>
        )}

        {/* Tutorial */}
        {showTutorial && (
          <div className="p-4 rounded-xl bg-blue-900/40 border border-blue-700 text-sm text-blue-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="space-y-1">
              <p className="font-semibold text-blue-50">Quick start</p>
              <p>{tutorialSteps[tutorialStep]}</p>
              <p className="text-xs text-blue-200">Step {tutorialStep + 1} of {tutorialSteps.length}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTutorial(false)}
                className="self-start md:self-center px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs uppercase tracking-wide"
              >
                Skip
              </button>
              <button
                onClick={() => {
                  if (tutorialStep < tutorialSteps.length - 1) {
                    setTutorialStep(tutorialStep + 1);
                  } else {
                    setShowTutorial(false);
                  }
                }}
                className="self-start md:self-center px-3 py-2 bg-blue-700 hover:bg-blue-600 rounded text-white text-xs uppercase tracking-wide"
              >
                {tutorialStep < tutorialSteps.length - 1 ? 'Next' : 'Done'}
              </button>
            </div>
          </div>
        )}

        {/* Scenario / Objectives */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ScenarioCard
            scenarioName={selectedStrategy ? `Live Sandbox – ${selectedStrategy.name}` : 'Live Sandbox'}
            missions={missions}
            step={step}
            status={running ? 'running' : 'paused'}
          />
          <div className="p-4 rounded-xl bg-gray-800/60 border border-gray-700 shadow-lg flex flex-col justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Connection</p>
              <h3 className="text-lg font-semibold text-white">Socket.IO Status</h3>
            </div>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <div>
                  <p className="text-sm text-gray-300">{connected ? 'Connected to simulation stream' : 'Disconnected'}</p>
                  <p className="text-xs text-gray-500">Steps per second: {stepsPerSecond}x</p>
                </div>
              </div>
            <div className="text-xs text-gray-400 space-y-1">
              <p>Use Start/Stop to control the run. Reset clears local progress.</p>
              <p>Goals track this session only. Hotkeys: Space (start/stop), F (step), R (reset).</p>
            </div>
          </div>
        </section>

        {/* Operations Log */}
        {runLog.length > 0 && (
          <section className="w-full">
            <div className="p-4 rounded-xl bg-gray-800/60 border border-gray-700 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-white">Operations Log</h3>
                <span className="text-xs text-gray-400">Most recent {Math.min(runLog.length, 12)} events</span>
              </div>
              <div className="space-y-2 text-sm text-gray-200 max-h-64 overflow-y-auto pr-1">
                {[...runLog]
                  .slice(-12)
                  .sort((a, b) => (a.step ?? 0) - (b.step ?? 0))
                  .map((entry, idx) => (
                    <div
                      key={`${entry.label}-${idx}`}
                      className={`flex items-center justify-between rounded border px-2 py-1 ${
                        entry.severity === 'critical'
                          ? 'border-red-500 bg-red-900/40'
                          : entry.severity === 'incident'
                          ? 'border-amber-500 bg-amber-900/30'
                          : entry.severity === 'warning'
                          ? 'border-yellow-500 bg-yellow-900/30'
                          : 'border-gray-700 bg-gray-900/60'
                      }`}
                    >
                      <div>
                        <p className="text-[11px] text-gray-400">
                          {typeof entry.step === 'number' ? `Step ${entry.step}` : 'Event'}
                        </p>
                        <p className="font-semibold">{entry.label}</p>
                      </div>
                      <p className="text-xs text-gray-200 text-right max-w-xs truncate">{entry.value}</p>
                    </div>
                  ))}
              </div>
            </div>
          </section>
        )}

        {/* Strategy Playbooks */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {strategies.map((strategy) => (
            <button
              key={strategy.id}
              onClick={() => setSelectedStrategyId(strategy.id)}
              className={`p-4 rounded-lg border transition-colors text-left ${
                selectedStrategyId === strategy.id
                  ? 'border-emerald-500 bg-emerald-500/10 text-white'
                  : 'border-gray-700 bg-gray-800/50 text-gray-200 hover:border-emerald-400'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">{strategy.name}</h4>
                {selectedStrategyId === strategy.id && (
                  <span className="text-xs text-emerald-300">Active</span>
                )}
              </div>
              <p className="text-sm text-gray-400">{strategy.description}</p>
            </button>
          ))}
        </section>

        {/* Simulation Presets */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => setSelectedPreset(preset.id)}
              className={`p-4 rounded-lg border transition-colors text-left ${
                selectedPreset === preset.id
                  ? 'border-blue-500 bg-blue-500/10 text-white'
                  : 'border-gray-700 bg-gray-800/50 text-gray-200 hover:border-blue-400'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">{preset.name}</h4>
                {selectedPreset === preset.id && <span className="text-xs text-blue-300">Selected</span>}
              </div>
              <p className="text-sm text-gray-400">{preset.description}</p>
            </button>
          ))}
        </section>

        {/* Challenge Presets */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {challenges.map((challenge) => (
            <div
              key={challenge.id}
              className="p-4 rounded-lg border border-purple-600/50 bg-purple-900/10 text-gray-100 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-purple-300">{challenge.id.toUpperCase()}</p>
                  <h4 className="font-semibold">{challenge.name}</h4>
                </div>
                <button
                  className="px-3 py-2 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                  onClick={() => {
                    setSelectedPreset(challenge.id);
                    startSimulation({ stepsPerSecond, simulationConfig: applyStrategy(challenge.config) });
                    setShowTutorial(false);
                    setRunState('playing');
                  }}
                >
                  Start challenge
                </button>
              </div>
              <p className="text-sm text-gray-300">{challenge.description}</p>
            </div>
          ))}
        </section>

        {/* Map Overlay */}
        <section className="w-full">
          <h3 className="text-lg font-semibold text-white mb-2">DAO Map</h3>
          <CozyMap
            treasury={Math.round(latest?.treasury_balance ?? 0)}
            proposals={(latest as any)?.proposals ?? latest?.active_proposals ?? 0}
            members={members.length}
            shocks={marketShocks.length}
            status={running ? 'running' : 'paused'}
          />
        </section>

        {/* Report Section */}
        <section className="w-full">
          <DAOReport
            simulationData={simulationData}
            tokenLeaderboard={tokenLeaderboard}
            influenceLeaderboard={influenceLeaderboard}
            marketShocks={marketShocks}
            members={members}
            proposals={proposals}
          />
        </section>

        {/* Price Chart - Full Width */}
        <section className={`w-full transition-all ${recentShock ? 'border border-red-500/60 shadow-[0_0_30px_rgba(239,68,68,0.35)] rounded-xl p-1 relative overflow-hidden' : ''}`}>
          {recentShock && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-64 w-64 rounded-full bg-red-500/15 animate-ping" />
            </div>
          )}
          <PriceLineChart
            data={priceHistory}
            title="DAO Token Price History"
            interactive={true}
          />
        </section>

        {/* Network Visualization - Full Width */}
        {!visualsPaused && networkData && networkData.nodes.length > 0 && (
          <section className="w-full relative">
            {recentShock && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-64 w-64 rounded-full bg-red-500/10 animate-ping" />
              </div>
            )}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 relative overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Network Graph - {networkData.nodes.length} nodes, {networkData.edges.length} edges
                </h3>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={showLabels}
                      onChange={(e) => setShowLabels(e.target.checked)}
                      className="rounded"
                    />
                    Show Labels
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={interactiveNetwork}
                      onChange={(e) => setInteractiveNetwork(e.target.checked)}
                      className="rounded"
                    />
                    Interactive
                  </label>
                </div>
              </div>
              <NetworkGraph3DWrapper
                data={networkData}
                interactive={interactiveNetwork}
                showLabels={showLabels}
              />
            </div>
          </section>
        )}
        {visualsPaused && (
          <section className="w-full">
            <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-6 text-gray-300">
              <h3 className="text-lg font-semibold text-white mb-2">Visuals paused</h3>
              <p className="text-sm text-gray-400">Network, heatmaps, and maps are hidden to reduce load. Resume visuals to see them again.</p>
            </div>
          </section>
        )}

        {/* Two Column Layout - Heatmap and Choropleth */}
        {!visualsPaused && members.length > 0 && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className={recentShock ? 'animate-pulse relative overflow-hidden' : ''}>
              {recentShock && <div className="pointer-events-none absolute inset-0 bg-red-500/10 rounded-lg animate-ping" />}
              <MemberHeatmap members={members} />
            </div>
            <div className={recentShock ? 'animate-pulse relative overflow-hidden' : ''}>
              {recentShock && <div className="pointer-events-none absolute inset-0 bg-red-500/10 rounded-lg animate-ping" />}
              <ChoroplethMap members={members} />
            </div>
          </section>
        )}

        {/* Org History & KPIs */}
        {orgStats && (
          <section className="w-full">
            <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">Org History & KPIs</h3>
                <span className="text-xs text-gray-400">
                  Total runs: {orgStats.totalRuns}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-200 mb-3">
                <div className="p-3 rounded border border-gray-700 bg-gray-900/60">
                  <p className="text-xs text-gray-400">Total steps simulated</p>
                  <p className="text-lg font-semibold">
                    {orgStats.totalSteps.toLocaleString('en-US')}
                  </p>
                </div>
                <div className="p-3 rounded border border-gray-700 bg-gray-900/60">
                  <p className="text-xs text-gray-400">Peak treasury</p>
                  <p className="text-lg font-semibold">
                    {orgStats.peakTreasury.toLocaleString('en-US')}
                  </p>
                </div>
                <div className="p-3 rounded border border-gray-700 bg-gray-900/60">
                  <p className="text-xs text-gray-400">Max shocks in a run</p>
                  <p className="text-lg font-semibold">
                    {orgStats.maxShocksInRun.toLocaleString('en-US')}
                  </p>
                </div>
                <div className="p-3 rounded border border-gray-700 bg-gray-900/60">
                  <p className="text-xs text-gray-400">Win rate</p>
                  <p className="text-lg font-semibold">
                    {orgStats.totalRuns > 0
                      ? `${Math.round((orgStats.wins / orgStats.totalRuns) * 100)}%`
                      : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="text-xs text-gray-300">
                <p className="font-semibold mb-1">Milestones</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>
                    {orgStats.totalRuns > 0
                      ? 'First simulation completed.'
                      : 'Run at least one simulation.'}
                  </li>
                  <li>
                    {orgStats.totalSteps >= 500
                      ? 'Sustained operator: 500+ total steps.'
                      : 'Reach 500 total simulated steps.'}
                  </li>
                  <li>
                    {orgStats.peakTreasury >= 10_000
                      ? 'Capitalized: treasury peaked above 10,000.'
                      : 'Grow peak treasury above 10,000.'}
                  </li>
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* Run History */}
        {runHistory.length > 0 && (
          <section className="w-full">
            <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">Run History (session)</h3>
                <span className="text-xs text-gray-400">Last {runHistory.length} runs</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-gray-200">
                {runHistory.map((run) => (
                  <div key={run.id} className="p-3 rounded border border-gray-700 bg-gray-900/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">
                        {run.preset}
                        {run.strategy ? ` · ${run.strategy}` : ''}
                      </span>
                      <span className="text-xs text-gray-500">{run.when}</span>
                    </div>
                    <p className="text-gray-300">Steps: {run.steps}</p>
                    <p className="text-gray-300">Treasury: {run.treasury}</p>
                    <p className="text-gray-400 text-xs">Score: {run.score}</p>
                    {run.outcome && (
                      <p className="text-gray-400 text-xs">
                        Outcome: {run.outcome === 'won' ? 'Objectives met' : 'Run ended'}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <h4 className="text-sm font-semibold text-white mb-2">Leaderboard (session)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-200">
                  {runHistory
                    .slice()
                    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                    .slice(0, 5)
                    .map((run, idx) => (
                      <div key={`${run.id}-lb`} className="p-3 rounded border border-gray-700 bg-gray-900/70 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-400">#{idx + 1} • {run.when}</p>
                          <p className="font-semibold">{run.preset}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-blue-300">Score {run.score}</p>
                          <p className="text-xs text-gray-400">Steps {run.steps}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Empty State */}
        {!connected && simulationData.length === 0 && (
          <section className="w-full h-[400px] flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-6xl">📊</div>
              <h2 className="text-2xl font-bold text-gray-300">Waiting for Simulation Data</h2>
              <p className="text-gray-400">
                Start a simulation to see real-time visualizations
              </p>
              <p className="text-sm text-gray-500">
                Connect to WebSocket at <code className="bg-gray-800 px-2 py-1 rounded">{socketUrl}</code>
              </p>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800/50 backdrop-blur-lg border-t border-gray-700 mt-16">
        <div className="max-w-[1920px] mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm text-gray-400">
            <div>
              <h4 className="font-semibold text-white mb-2">Visualization Types</h4>
              <ul className="space-y-1">
                <li>• Real-time Price Charts</li>
                <li>• 3D Network Graphs</li>
                <li>• Member Heatmaps</li>
                <li>• Geographic Distribution</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Features</h4>
              <ul className="space-y-1">
                <li>• Live WebSocket Updates</li>
                <li>• Interactive 3D Visualizations</li>
                <li>• Comprehensive Reports</li>
                <li>• Leaderboard Tracking</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Technologies</h4>
              <ul className="space-y-1">
                <li>• Next.js 15 + React 19</li>
                <li>• Three.js + React Three Fiber</li>
                <li>• Recharts</li>
                <li>• Socket.IO</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-500">
            <p>Built with vision by incredible technologists and artists</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
