'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { PriceLineChart } from '@/components/visualizations/PriceLineChart';
import { DAOReport } from '@/components/visualizations/DAOReport';
import { ScenarioCard } from '@/components/visualizations/ScenarioCard';
import { RunSummaryModal } from '@/components/visualizations/RunSummaryModal';
import { TokenTracker } from '@/components/visualizations/TokenTracker';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { useSimulationSocket } from '@/lib/hooks/useSimulationSocket';
import { generateDAOIdentity, generateMemberIdentity, type DAOIdentity } from '@/lib/utils/name-generator';
import { messages as m, format } from '@/lib/i18n';
import { GlossaryModal } from '@/components/designer/GlossaryModal';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { InfoTooltip } from '@/components/designer/Tooltip';
import { useTooltipSettings } from '@/lib/contexts/TooltipSettingsContext';
import { useAppSettings } from '@/lib/contexts/AppSettingsContext';

// Dynamic imports for heavy visualization components (loaded only when needed)
const NetworkGraph3DWrapper = dynamic(
  () => import('@/components/visualizations/NetworkGraph3DWrapper').then((mod) => mod.NetworkGraph3DWrapper),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[clamp(320px,60vh,560px)] bg-gray-800 rounded-lg flex items-center justify-center animate-pulse">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full border-4 border-gray-700 border-t-blue-500 animate-spin" />
          <p className="text-gray-500 text-sm">{m.networkGraph.loading}</p>
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
      <div className="w-full h-[clamp(240px,45vh,420px)] bg-gray-800 rounded-lg animate-pulse" />
    ),
  }
);

const ChoroplethMap = dynamic(
  () => import('@/components/visualizations/ChoroplethMap').then((mod) => mod.ChoroplethMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[clamp(240px,45vh,420px)] bg-gray-800 rounded-lg animate-pulse" />
    ),
  }
);

const CozyMap = dynamic(
  () => import('@/components/visualizations/CozyMap').then((mod) => mod.CozyMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[clamp(220px,40vh,360px)] bg-gray-800 rounded-lg animate-pulse" />
    ),
  }
);

const DAOTowerWrapper = dynamic(
  () => import('@/components/visualizations/DAOTowerWrapper').then((mod) => mod.DAOTowerWrapper),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[clamp(320px,60vh,560px)] bg-gray-800 rounded-lg flex items-center justify-center animate-pulse">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full border-4 border-gray-700 border-t-pink-500 animate-spin" />
          <p className="text-gray-500 text-sm">{m.daoTower.loading}</p>
        </div>
      </div>
    ),
  }
);

const DAOCity3D = dynamic(
  () => import('@/components/visualizations/DAOCity3D'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[clamp(320px,60vh,560px)] bg-gray-800 rounded-lg flex items-center justify-center animate-pulse">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full border-4 border-gray-700 border-t-green-500 animate-spin" />
          <p className="text-gray-500 text-sm">{m.daoCity.title}...</p>
        </div>
      </div>
    ),
  }
);

const TokenRankingBoard = dynamic(
  () => import('@/components/visualizations/TokenRankingBoard'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[clamp(220px,40vh,360px)] bg-gray-800 rounded-lg animate-pulse" />
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
    mode,
    priceHistory,
    simulationData,
    networkData,
    members,
    proposals,
    tokenLeaderboard,
    influenceLeaderboard,
    marketShocks,
    city,
    reset: resetSimulation,
    startSimulation,
    startCitySimulation,
    stopSimulation,
    stepSimulation,
  } = useSimulationSocket();
  const socketUrl =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SOCKET_URL) ||
    'http://localhost:8003';

  const [showLabels, setShowLabels] = useState(false);
  const [interactiveNetwork, setInteractiveNetwork] = useState(true);
  const [stepsPerSecond, setStepsPerSecond] = useState(2);
  const [viewMode, setViewMode] = useState<'single' | 'city'>('single');
  const [selectedDaoId, setSelectedDaoId] = useState<string | null>(null);
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
  const disableRunSummary =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DISABLE_RUN_SUMMARY === 'true';
  const [runLog, setRunLog] = useState<OpsLogEntry[]>([]);
  const [daoIdentity] = useState<DAOIdentity>(() => generateDAOIdentity(42)); // Consistent seed
  const [navCollapsed, setNavCollapsed] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | '3d' | 'charts' | 'strategy' | 'reports'>('overview');
  const [showQuickJump, setShowQuickJump] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [overviewPanel, setOverviewPanel] = useState<'map' | 'ops'>('map');
  const [threeDPanel, setThreeDPanel] = useState<'tower' | 'city' | 'network'>('tower');
  const [chartsPanel, setChartsPanel] = useState<'price' | 'heatmap' | 'geo'>('price');
  const [reportPanel, setReportPanel] = useState<'report' | 'history' | 'runs'>('report');
  const [show3DPanel, setShow3DPanel] = useState(true);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { settings: tooltipSettings, toggleTooltips } = useTooltipSettings();
  const { settings: appSettings, updateSettings: updateAppSettings } = useAppSettings();
  const tutorialSteps = m.tutorial.steps;
  const [tutorialStep, setTutorialStep] = useState(0);
  const navSections = useMemo(
    () => [
      { id: 'overview', label: 'Overview', icon: 'OV', shortcut: 'O', tab: 'overview' as const },
      { id: '3d', label: '3D', icon: '3D', shortcut: 'D', tab: '3d' as const },
      { id: 'charts', label: 'Charts', icon: 'CH', shortcut: 'C', tab: 'charts' as const },
      { id: 'strategy', label: 'Strategy', icon: 'ST', shortcut: 'S', tab: 'strategy' as const },
      { id: 'reports', label: 'Reports', icon: 'RP', shortcut: 'R', tab: 'reports' as const },
    ],
    []
  );

  const latest = simulationData.at(-1);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const panelClass = 'rounded-lg border border-gray-700 bg-gray-800/60 p-4 shadow-lg';
  const chartHeightClass = 'h-[clamp(240px,45vh,420px)]';
  const threeDHeightClass = 'h-[clamp(320px,60vh,560px)]';

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 768) {
      setShow3DPanel(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'city' && threeDPanel === 'tower') {
      setThreeDPanel('city');
    }
  }, [viewMode, threeDPanel]);

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

  // Transform members to tower format - assign floors based on reputation and activities based on behavior
  const towerMembers = useMemo(() => {
    if (members.length === 0) return [];

    // Sort by reputation to assign floors
    const sorted = [...members].sort((a, b) => (b.reputation || 0) - (a.reputation || 0));
    const maxRep = sorted[0]?.reputation || 1;

    type TowerActivity = 'voting' | 'proposing' | 'discussing' | 'coding' | 'reviewing' | 'resting' | 'trading' | 'chatting';

    return sorted.map((member) => {
      // Assign floor based on reputation percentile (0-5)
      const repRatio = (member.reputation || 0) / maxRep;
      const floor = Math.min(5, Math.floor(repRatio * 6));

      // Derive activity from member properties
      let activity: TowerActivity = 'chatting';
      if (member.delegations && Object.keys(member.delegations).length > 0) {
        activity = 'voting';
      } else if (member.representative) {
        activity = 'discussing';
      } else if ((member.tokens || 0) > 100) {
        activity = 'trading';
      } else if ((member.reputation || 0) > maxRep * 0.8) {
        activity = 'reviewing';
      } else if ((member.reputation || 0) > maxRep * 0.5) {
        activity = 'proposing';
      } else if (floor === 5) {
        activity = 'resting';
      }

      // Generate cute name for member
      const identity = generateMemberIdentity(member.unique_id, 42);

      return {
        id: member.unique_id,
        name: `${identity.avatar} ${identity.handle}`,
        activity,
        floor,
        reputation: member.reputation,
        tokens: member.tokens,
      };
    });
  }, [members]);

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
    if (disableRunSummary || !latest || runState === 'won' || runState === 'lost') return;

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
    disableRunSummary,
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
          if (viewMode === 'city') {
            startCitySimulation({ stepsPerSecond });
          } else {
            startSimulation({ stepsPerSecond, simulationConfig: applyStrategy(presetConfig) });
          }
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
  }, [connected, running, stepsPerSecond, presetConfig, startSimulation, startCitySimulation, stopSimulation, stepSimulation, resetSimulation, applyStrategy, viewMode]);

  return (
    <div className="min-h-screen min-h-[100svh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col overflow-hidden">

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
      <header className="bg-gray-800/70 backdrop-blur border-b border-gray-700 shrink-0">
        <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-4 pl-4 md:pl-16">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-[220px]">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                {daoIdentity.name}
              </h1>
              <p className="text-gray-400 mt-1 text-sm flex items-center gap-2">
                <span>{daoIdentity.tokenSymbol}</span>
                <span className="text-gray-600">|</span>
                <span className="italic">&quot;{daoIdentity.motto}&quot;</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span>{connected ? m.common.connected : m.common.disconnected}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${running ? 'text-green-400' : 'text-orange-400'}`}>
                  {running ? m.common.running : m.common.paused}
                </span>
                <span className="text-gray-500">|</span>
                <label className="flex items-center gap-1">
                  <span id="speed-label">{m.header.speed}</span>
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
                    {m.a11y.simulationSpeedMultiplier}
                  </span>
                </label>
              </div>
              <div>
                {format(m.header.step, { step })}
              </div>
              <a
                href="/api/simulation"
                className="px-3 py-2 border border-purple-500 text-purple-300 hover:bg-purple-500 hover:text-white rounded-lg transition-colors text-xs"
              >
                {m.header.apiDocs}
              </a>
              <Link
                href="/designer"
                className="px-3 py-2 border border-blue-500 text-blue-300 hover:bg-blue-500 hover:text-white rounded-lg transition-colors text-xs"
              >
                DAO Designer
              </Link>
              <button
                onClick={() => setGlossaryOpen(true)}
                className="px-3 py-2 border border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white rounded-lg transition-colors text-xs flex items-center gap-1"
              >
                <span>📚</span>
                <span className="hidden sm:inline">Glossary</span>
              </button>
              <button
                onClick={toggleTooltips}
                className={`px-3 py-2 rounded-lg transition-colors text-xs flex items-center gap-1 ${
                  tooltipSettings.enabled
                    ? 'bg-blue-600/20 border border-blue-500 text-blue-300'
                    : 'border border-gray-600 text-gray-400'
                }`}
                title={`Tooltips ${tooltipSettings.enabled ? 'On' : 'Off'} (Ctrl+Shift+T)`}
              >
                <span>💬</span>
                <span className="hidden sm:inline">{tooltipSettings.enabled ? 'Tips On' : 'Tips Off'}</span>
              </button>
              <button
                onClick={() => setSettingsOpen(true)}
                className="px-3 py-2 border border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white rounded-lg transition-colors text-xs"
                title="Settings (Ctrl+,)"
              >
                ⚙️
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center">
              <button
                onClick={() => setViewMode('single')}
                className={`px-3 py-2 rounded-l-lg text-xs font-semibold transition-colors ${
                  viewMode === 'single'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {m.controls.singleDao}
              </button>
              <button
                onClick={() => setViewMode('city')}
                className={`px-3 py-2 rounded-r-lg text-xs font-semibold transition-colors ${
                  viewMode === 'city'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {m.controls.daoCity}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  if (viewMode === 'city') {
                    startCitySimulation({ stepsPerSecond });
                  } else {
                    startSimulation({ stepsPerSecond, simulationConfig: applyStrategy(presetConfig) });
                  }
                  setShowTutorial(false);
                  setRunState('playing');
                }}
                className="px-4 py-2 min-h-[40px] text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                disabled={!connected || running}
              >
                {viewMode === 'city' ? m.controls.startCity : m.controls.start}
              </button>
              <button
                onClick={() => {
                  recordRun(selectedPreset);
                  stopSimulation();
                }}
                className="px-4 py-2 min-h-[40px] text-sm font-semibold bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50"
                disabled={!connected || !running}
              >
                {m.controls.stop}
              </button>
              <button
                onClick={() => stepSimulation(viewMode === 'city' ? 'multi' : 'single')}
                className="px-4 py-2 min-h-[40px] text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                disabled={!connected}
              >
                {m.controls.stepButton}
              </button>
              <button
                onClick={resetSimulation}
                className="px-4 py-2 min-h-[40px] text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                disabled={!connected}
              >
                {m.controls.reset}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
              <span>{m.header.hotkeys}</span>
              <button
                onClick={() => setVisualsPaused(!visualsPaused)}
                className={`px-2.5 py-1 rounded border ${
                  visualsPaused
                    ? 'border-amber-400/60 text-amber-300 bg-amber-500/10'
                    : 'border-gray-700 text-gray-300 bg-gray-900/40'
                }`}
              >
                {visualsPaused ? m.controls.visualsPaused : m.controls.visualsLive}
              </button>
              <button
                onClick={() => setShowQuickJump((prev) => !prev)}
                className={`px-2.5 py-1 rounded border ${
                  showQuickJump
                    ? 'border-blue-400/60 text-blue-300 bg-blue-500/10'
                    : 'border-gray-700 text-gray-300 bg-gray-900/40'
                }`}
              >
                {showQuickJump ? m.controls.quickJumpOn : m.controls.quickJumpOff}
              </button>
              <button
                onClick={() => setShowSidebar((prev) => !prev)}
                className={`px-2.5 py-1 rounded border ${
                  showSidebar
                    ? 'border-gray-500 text-gray-300 bg-gray-900/40'
                    : 'border-gray-700 text-gray-500 bg-gray-900/20'
                }`}
              >
                {showSidebar ? m.controls.sidebarOn : m.controls.sidebarOff}
              </button>
            </div>
          </div>
        </div>
      </header>
      {/* Navigation sidebar */}
      <DashboardNav
        sections={navSections}
        collapsed={navCollapsed}
        onToggleCollapse={() => setNavCollapsed(!navCollapsed)}
        currentTab={activeTab}
        onTabChange={setActiveTab}
        showQuickJump={showQuickJump}
        quickJumpMode="inline"
        showSidebar={showSidebar}
        scrollContainerRef={scrollContainerRef}
      />

      <div className="shrink-0 border-b border-gray-700 bg-gray-900/70">
        <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-2 pl-4 md:pl-16">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'overview' as const, label: m.tabs.overview, icon: 'OV' },
              { id: '3d' as const, label: m.tabs.view3d, icon: '3D' },
              { id: 'charts' as const, label: m.tabs.charts, icon: 'CH' },
              { id: 'strategy' as const, label: m.tabs.strategy, icon: 'ST' },
              { id: 'reports' as const, label: m.tabs.reports, icon: 'RP' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Dashboard */}
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-auto max-w-[1920px] mx-auto px-4 md:px-6 pb-6 pt-4 pl-4 md:pl-16 space-y-4">
        {/* Notifications */}
        {(lastCompleted || recentShock) && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-green-500/10 blur-xl rounded-2xl" />
            <div className="relative p-4 rounded-xl border border-gray-700 bg-gray-800/70 text-sm text-white flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                <p className="font-semibold">
                  {lastCompleted ? format(m.notifications.missionCompleted, { name: lastCompleted }) : recentShock ? format(m.notifications.marketShockAlert, { severity: recentShock.severity.toFixed(2), step: recentShock.step }) : ''}
                </p>
              </div>
              <p className="text-xs text-gray-300">
                {m.notifications.celebrateMessage}
              </p>
            </div>
          </div>
        )}

        {/* Tutorial - Only show on overview tab */}
        {showTutorial && activeTab === 'overview' && (
          <div
            data-testid="tutorial-banner"
            className="p-4 rounded-xl bg-blue-900/40 border border-blue-700 text-sm text-blue-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
          >
            <div className="space-y-1">
              <p className="font-semibold text-blue-50">{m.tutorial.title}</p>
              <p>{tutorialSteps[tutorialStep]}</p>
              <p className="text-xs text-blue-200">{format(m.tutorial.stepOf, { current: tutorialStep + 1, total: tutorialSteps.length })}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTutorial(false)}
                className="self-start md:self-center px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs uppercase tracking-wide"
              >
                {m.common.skip}
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
                {tutorialStep < tutorialSteps.length - 1 ? m.common.next : m.common.done}
              </button>
            </div>
          </div>
        )}

        {/* ==================== OVERVIEW TAB ==================== */}
        {activeTab === 'overview' && (
          <section id="section-overview" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6 min-h-0">
              <div className="flex flex-col gap-4 min-h-0">
                <section id="section-missions" className="scroll-mt-12">
                  <ScenarioCard
                    scenarioName={selectedStrategy ? `${daoIdentity.name} - ${selectedStrategy.name}` : daoIdentity.name}
                    missions={missions}
                    step={step}
                    status={running ? 'running' : 'paused'}
                  />
                </section>

                <div className={`${panelClass} flex flex-col min-h-0`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-200">
                      {overviewPanel === 'map' ? m.panels.daoMap : m.opsLog.title}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setOverviewPanel('map')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors ${
                          overviewPanel === 'map'
                            ? 'border-blue-500/60 text-blue-300 bg-blue-500/10'
                            : 'border-gray-700 text-gray-400 bg-gray-900/40 hover:text-white'
                        }`}
                      >
                        {m.panels.daoMap}
                      </button>
                      <button
                        onClick={() => setOverviewPanel('ops')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors ${
                          overviewPanel === 'ops'
                            ? 'border-blue-500/60 text-blue-300 bg-blue-500/10'
                            : 'border-gray-700 text-gray-400 bg-gray-900/40 hover:text-white'
                        }`}
                      >
                        {m.panels.opsLog}
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-auto pr-1">
                    {overviewPanel === 'map' ? (
                      visualsPaused ? (
                        <div className="h-full flex items-center justify-center text-sm text-gray-400">
                          {m.states.mapPaused}
                        </div>
                      ) : (
                        <CozyMap
                          treasury={Math.round(latest?.treasury_balance ?? 0)}
                          proposals={(latest as any)?.proposals ?? latest?.active_proposals ?? 0}
                          members={members.length}
                          shocks={marketShocks.length}
                          status={running ? 'running' : 'paused'}
                        />
                      )
                    ) : runLog.length > 0 ? (
                      <div className="space-y-2 text-sm text-gray-200">
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
                    ) : (
                      <p className="text-sm text-gray-500">{m.states.noOpsLogged}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 min-h-0">
                <section id="section-token" className="scroll-mt-12">
                  <TokenTracker
                    daoIdentity={daoIdentity}
                    currentPrice={latest?.dao_token_price ?? 1}
                    priceHistory={priceHistory}
                    treasury={latest?.treasury_balance ?? 0}
                    holders={members.length}
                  />
                </section>

                <section id="section-tower" className={`${panelClass} flex flex-col min-h-0`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-white">{m.daoTower.title}</h3>
                    <button
                      onClick={() => {
                        setActiveTab('3d');
                        setThreeDPanel('tower');
                        setShow3DPanel(true);
                      }}
                      className="text-xs text-blue-300 hover:text-blue-200"
                    >
                      {m.daoTower.open3d}
                    </button>
                  </div>
                  <div className="flex-1 min-h-0">
                    {visualsPaused ? (
                      <div className="h-full flex items-center justify-center text-sm text-gray-400">
                        {format(m.states.visualsPaused, { feature: 'tower' })}
                      </div>
                    ) : towerMembers.length > 0 ? (
                      <DAOTowerWrapper
                        members={towerMembers}
                        totalFloors={6}
                        title={`${daoIdentity.name} HQ`}
                        heightClassName={threeDHeightClass}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-gray-400">
                        {m.view3d.startToPopulateTower}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </section>
        )}
        {/* ==================== 3D VIEW TAB ==================== */}
        {activeTab === '3d' && (
          <section id="section-3d" className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'tower' as const, label: m.panels.tower },
                { id: 'city' as const, label: m.panels.city },
                { id: 'network' as const, label: m.panels.network },
              ].map((panel) => (
                <button
                  key={panel.id}
                  onClick={() => setThreeDPanel(panel.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    threeDPanel === panel.id
                      ? 'border-blue-500/60 text-blue-300 bg-blue-500/10'
                      : 'border-gray-700 text-gray-400 bg-gray-900/40 hover:text-white'
                  }`}
                >
                  {panel.label}
                </button>
              ))}
              <button
                onClick={() => setShow3DPanel((prev) => !prev)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  show3DPanel
                    ? 'border-emerald-500/60 text-emerald-300 bg-emerald-500/10'
                    : 'border-gray-700 text-gray-400 bg-gray-900/40 hover:text-white'
                }`}
              >
                {show3DPanel ? m.view3d.hide3d : m.view3d.show3d}
              </button>
            </div>

            {!show3DPanel ? (
              <div className={`${panelClass} text-center text-sm text-gray-300`}>
                <p className="mb-2">{m.view3d.hidden3dMessage}</p>
                <button
                  onClick={() => setShow3DPanel(true)}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white"
                >
                  {m.view3d.show3dView}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 min-h-0">
                <div className={`${panelClass} overflow-hidden relative`}>
                  {visualsPaused ? (
                    <div className="h-full flex items-center justify-center text-sm text-gray-400">
                      {m.view3d.visualsPausedMessage}
                    </div>
                  ) : threeDPanel === 'tower' ? (
                    towerMembers.length > 0 ? (
                      <DAOTowerWrapper
                        members={towerMembers}
                        totalFloors={6}
                        title={`${daoIdentity.name} HQ`}
                        heightClassName={threeDHeightClass}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-gray-400">
                        {m.view3d.startToPopulateTower}
                      </div>
                    )
                  ) : threeDPanel === 'city' ? (
                    <div className={`w-full ${threeDHeightClass} bg-gray-900 rounded-lg overflow-hidden`}>
                      {city.cityNetworkData ? (
                        <DAOCity3D
                          data={city.cityNetworkData}
                          onDaoSelect={setSelectedDaoId}
                          selectedDaoId={selectedDaoId}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <div className="text-center">
                            <p className="text-lg mb-2">{m.daoCity.title}</p>
                            <p className="text-sm">{m.view3d.startCitySimulation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {recentShock && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="h-64 w-64 rounded-full bg-red-500/10 animate-ping" />
                        </div>
                      )}
                      {networkData && networkData.nodes.length > 0 ? (
                        <NetworkGraph3DWrapper
                          data={networkData}
                          interactive={interactiveNetwork}
                          showLabels={showLabels}
                          heightClassName={threeDHeightClass}
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center text-sm text-gray-400">
                          {m.view3d.startToSeeNetwork}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex flex-col gap-4 min-h-0">
                  {threeDPanel === 'network' && (
                    <div className={panelClass}>
                      <h3 className="text-sm font-semibold text-white mb-3">{m.view3d.networkControls}</h3>
                      <div className="space-y-2 text-sm text-gray-200">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={showLabels}
                            onChange={(e) => setShowLabels(e.target.checked)}
                            className="rounded"
                          />
                          {m.view3d.showLabels}
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={interactiveNetwork}
                            onChange={(e) => setInteractiveNetwork(e.target.checked)}
                            className="rounded"
                          />
                          {m.view3d.interactiveControls}
                        </label>
                        <div className="pt-2 text-xs text-gray-400">
                          {format(m.view3d.nodes, { count: networkData?.nodes.length ?? 0 })} | {format(m.view3d.edges, { count: networkData?.edges.length ?? 0 })}
                        </div>
                      </div>
                    </div>
                  )}

                  {threeDPanel === 'tower' && (
                    <div className={panelClass}>
                      <h3 className="text-sm font-semibold text-white mb-3">{m.view3d.towerSnapshot}</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-200">
                        <div className="p-2 rounded border border-gray-700 bg-gray-900/50">
                          <p className="text-xs text-gray-400">{m.reports.members}</p>
                          <p className="text-lg font-semibold">{members.length}</p>
                        </div>
                        <div className="p-2 rounded border border-gray-700 bg-gray-900/50">
                          <p className="text-xs text-gray-400">{m.view3d.proposals}</p>
                          <p className="text-lg font-semibold">{proposals.length}</p>
                        </div>
                        <div className="p-2 rounded border border-gray-700 bg-gray-900/50">
                          <p className="text-xs text-gray-400">{m.reports.treasury}</p>
                          <p className="text-lg font-semibold">
                            {Math.round(latest?.treasury_balance ?? 0).toLocaleString('en-US')}
                          </p>
                        </div>
                        <div className="p-2 rounded border border-gray-700 bg-gray-900/50">
                          <p className="text-xs text-gray-400">{m.view3d.shocks}</p>
                          <p className="text-lg font-semibold">{marketShocks.length}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {threeDPanel === 'city' && (
                    <>
                      <div className={`${panelClass} flex-1 min-h-0 overflow-auto`}>
                        <TokenRankingBoard
                          rankings={city.tokenRankings}
                          totalMarketCap={city.totalMarketCap}
                          totalVolume={city.totalVolume}
                          onTokenSelect={(symbol) => {
                            const dao = city.daos.find(d => d.tokenSymbol === symbol);
                            if (dao) setSelectedDaoId(dao.id);
                          }}
                          compact
                        />
                      </div>
                      <div className={`${panelClass} max-h-[220px] overflow-auto`}>
                        <h3 className="text-sm font-semibold text-white mb-2">{m.view3d.interDaoProposals}</h3>
                        {city.interDaoProposals.length > 0 ? (
                          <div className="space-y-2">
                            {city.interDaoProposals.slice(0, 6).map((proposal) => (
                              <div
                                key={proposal.uniqueId}
                                className="p-2 rounded border border-gray-700 bg-gray-900/60"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] uppercase text-gray-500">
                                    {proposal.proposalType}
                                  </span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded ${
                                    proposal.status === 'open' ? 'bg-blue-500/20 text-blue-400' :
                                    proposal.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                    proposal.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                    'bg-purple-500/20 text-purple-400'
                                  }`}>
                                    {proposal.status}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-white">{proposal.title}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {proposal.participatingDaos.join(' + ')}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">{m.view3d.noInterDaoProposals}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
        {/* ==================== CHARTS TAB ==================== */}
        {activeTab === 'charts' && (
          <section id="section-charts" className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'price' as const, label: m.panels.price },
                { id: 'heatmap' as const, label: m.panels.heatmap },
                { id: 'geo' as const, label: m.panels.geo },
              ].map((panel) => (
                <button
                  key={panel.id}
                  onClick={() => setChartsPanel(panel.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    chartsPanel === panel.id
                      ? 'border-blue-500/60 text-blue-300 bg-blue-500/10'
                      : 'border-gray-700 text-gray-400 bg-gray-900/40 hover:text-white'
                  }`}
                >
                  {panel.label}
                </button>
              ))}
            </div>

            {chartsPanel === 'price' && (
              <section id="section-price" className={`w-full transition-all ${recentShock ? 'border border-red-500/60 shadow-[0_0_30px_rgba(239,68,68,0.35)] rounded-xl p-1 relative overflow-hidden' : ''}`}>
                {recentShock && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-64 w-64 rounded-full bg-red-500/15 animate-ping" />
                  </div>
                )}
                <PriceLineChart
                  data={priceHistory}
                  title={m.charts.priceHistory}
                  interactive
                  heightClassName={chartHeightClass}
                />
              </section>
            )}

            {chartsPanel === 'heatmap' && (
              <section id="section-heatmap" className="w-full">
                {visualsPaused ? (
                  <div className={`${panelClass} text-sm text-gray-400`}>
                    {m.charts.heatmapPaused}
                  </div>
                ) : members.length > 0 ? (
                  <MemberHeatmap members={members} heightClassName={chartHeightClass} />
                ) : (
                  <div className={`${panelClass} text-sm text-gray-500`}>
                    {format(m.charts.startToSee, { feature: 'member data' })}
                  </div>
                )}
              </section>
            )}

            {chartsPanel === 'geo' && (
              <section className="w-full">
                {visualsPaused ? (
                  <div className={`${panelClass} text-sm text-gray-400`}>
                    {m.charts.geoPaused}
                  </div>
                ) : members.length > 0 ? (
                  <ChoroplethMap members={members} heightClassName={chartHeightClass} />
                ) : (
                  <div className={`${panelClass} text-sm text-gray-500`}>
                    {format(m.charts.startToSee, { feature: 'geographic distribution' })}
                  </div>
                )}
              </section>
            )}
          </section>
        )}
        {/* ==================== STRATEGY TAB ==================== */}
        {activeTab === 'strategy' && (
          <section id="section-strategy" className="space-y-6">
            {/* Strategy Playbooks */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold text-white">{m.strategies.playbooks}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <span className="text-xs text-emerald-300">{m.common.active}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{strategy.description}</p>
                  </button>
                ))}
              </div>
            </section>

            {/* Simulation Presets */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold text-white">{m.presets.title}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      {selectedPreset === preset.id && <span className="text-xs text-blue-300">{m.common.selected}</span>}
                    </div>
                    <p className="text-sm text-gray-400">{preset.description}</p>
                  </button>
                ))}
              </div>
            </section>

            {/* Challenge Presets */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold text-white">{m.challenges.title}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        {m.challenges.startChallenge}
                      </button>
                    </div>
                    <p className="text-sm text-gray-300">{challenge.description}</p>
                  </div>
                ))}
              </div>
            </section>
          </section>
        )}
        {/* ==================== REPORTS TAB ==================== */}
        {activeTab === 'reports' && (
          <section id="section-reports" className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'report' as const, label: m.panels.daoReport },
                { id: 'history' as const, label: m.panels.orgHistory },
                { id: 'runs' as const, label: m.panels.runHistory },
              ].map((panel) => (
                <button
                  key={panel.id}
                  onClick={() => setReportPanel(panel.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    reportPanel === panel.id
                      ? 'border-blue-500/60 text-blue-300 bg-blue-500/10'
                      : 'border-gray-700 text-gray-400 bg-gray-900/40 hover:text-white'
                  }`}
                >
                  {panel.label}
                </button>
              ))}
            </div>

            {reportPanel === 'report' && (
              <div className={`${panelClass} max-h-[calc(100vh-320px)] overflow-auto`}>
                <DAOReport
                  simulationData={simulationData}
                  tokenLeaderboard={tokenLeaderboard}
                  influenceLeaderboard={influenceLeaderboard}
                  marketShocks={marketShocks}
                  members={members}
                  proposals={proposals}
                />
              </div>
            )}

            {reportPanel === 'history' && (
              <div className={`${panelClass} max-h-[calc(100vh-320px)] overflow-auto`}>
                {orgStats ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-white">{m.orgHistory.title}</h3>
                      <span className="text-xs text-gray-400">{format(m.orgHistory.totalRuns, { count: orgStats.totalRuns })}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-200 mb-3">
                      <div className="p-3 rounded border border-gray-700 bg-gray-900/60">
                        <p className="text-xs text-gray-400">{m.orgHistory.totalStepsSimulated}</p>
                        <p className="text-lg font-semibold">
                          {orgStats.totalSteps.toLocaleString('en-US')}
                        </p>
                      </div>
                      <div className="p-3 rounded border border-gray-700 bg-gray-900/60">
                        <p className="text-xs text-gray-400">{m.orgHistory.peakTreasury}</p>
                        <p className="text-lg font-semibold">
                          {orgStats.peakTreasury.toLocaleString('en-US')}
                        </p>
                      </div>
                      <div className="p-3 rounded border border-gray-700 bg-gray-900/60">
                        <p className="text-xs text-gray-400">{m.orgHistory.maxShocksInRun}</p>
                        <p className="text-lg font-semibold">
                          {orgStats.maxShocksInRun.toLocaleString('en-US')}
                        </p>
                      </div>
                      <div className="p-3 rounded border border-gray-700 bg-gray-900/60">
                        <p className="text-xs text-gray-400">{m.orgHistory.winRate}</p>
                        <p className="text-lg font-semibold">
                          {orgStats.totalRuns > 0
                            ? `${Math.round((orgStats.wins / orgStats.totalRuns) * 100)}%`
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-300">
                      <p className="font-semibold mb-1">{m.orgHistory.milestones}</p>
                      <ul className="space-y-1 list-disc list-inside">
                        <li>
                          {orgStats.totalRuns > 0
                            ? m.orgHistory.firstSimCompleted
                            : m.orgHistory.runAtLeastOne}
                        </li>
                        <li>
                          {orgStats.totalSteps >= 500
                            ? m.orgHistory.sustainedOperator
                            : m.orgHistory.reach500Steps}
                        </li>
                        <li>
                          {orgStats.peakTreasury >= 10_000
                            ? m.orgHistory.capitalized
                            : m.orgHistory.growPeakTreasury}
                        </li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">{m.orgHistory.noHistory}</p>
                )}
              </div>
            )}

            {reportPanel === 'runs' && (
              <div className={`${panelClass} max-h-[calc(100vh-320px)] overflow-auto`}>
                {runHistory.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-white">{m.runHistorySection.title}</h3>
                      <span className="text-xs text-gray-400">{format(m.runHistorySection.lastRuns, { count: runHistory.length })}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-gray-200">
                      {runHistory.map((run) => (
                        <div key={run.id} className="p-3 rounded border border-gray-700 bg-gray-900/50">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold">
                              {run.preset}
                              {run.strategy ? ` - ${run.strategy}` : ''}
                            </span>
                            <span className="text-xs text-gray-500">{run.when}</span>
                          </div>
                          <p className="text-gray-300">Steps: {run.steps}</p>
                          <p className="text-gray-300">Treasury: {run.treasury}</p>
                          <p className="text-gray-400 text-xs">Score: {run.score}</p>
                          {run.outcome && (
                            <p className="text-gray-400 text-xs">
                              {m.runSummary.outcome}: {run.outcome === 'won' ? m.runHistorySection.outcomeWon : m.runHistorySection.outcomeLost}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-white mb-2">{m.runHistorySection.leaderboard}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-200">
                        {runHistory
                          .slice()
                          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                          .slice(0, 5)
                          .map((run, idx) => (
                            <div key={`${run.id}-lb`} className="p-3 rounded border border-gray-700 bg-gray-900/70 flex items-center justify-between">
                              <div>
                                <p className="text-xs text-gray-400">#{idx + 1} - {run.when}</p>
                                <p className="font-semibold">{run.preset}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-blue-300">{m.runHistorySection.score} {run.score}</p>
                                <p className="text-xs text-gray-400">{m.runHistorySection.steps} {run.steps}</p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">{m.runHistorySection.noRunsRecorded}</p>
                )}
              </div>
            )}
          </section>
        )}
        {/* Empty State */}
        {!connected && simulationData.length === 0 && (
          <section className="w-full h-[clamp(280px,50vh,420px)] flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-4xl text-gray-400">DAO</div>
              <h2 className="text-2xl font-bold text-gray-300">{m.states.waitingForData}</h2>
              <p className="text-gray-400">
                {m.states.startSimulation}
              </p>
              <p className="text-sm text-gray-500">
                {format(m.states.connectToWebSocket, { url: '' })} <code className="bg-gray-800 px-2 py-1 rounded">{socketUrl}</code>
              </p>
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-900/70 border-t border-gray-800 shrink-0">
        <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-3 text-xs text-gray-500 flex flex-wrap items-center justify-between gap-2">
          <span>{m.footer.brand}</span>
          <span>{m.footer.stack}</span>
          <span>{m.footer.tagline}</span>
        </div>
      </footer>

      {/* Glossary Modal */}
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />

      {/* Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
