'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { SimulationData, NetworkData, DAOMember, DAOProposal, LeaderboardEntry, MarketShock, DAOProject, DAOGuild, DAODispute, DAOViolation, SimulationMetrics } from '@/lib/types/visualization';
import type { DAOState, TokenRanking, InterDAOProposalData, BridgeState, DAOCityNetworkData, MemberTransferRequest } from '@/lib/types/dao-city';

// Multi-DAO city state
interface CityState {
  daos: DAOState[];
  tokenRankings: TokenRanking[];
  interDaoProposals: InterDAOProposalData[];
  bridges: BridgeState[];
  recentTransfers: MemberTransferRequest[];
  cityNetworkData: DAOCityNetworkData | null;
  totalMarketCap: number;
  totalVolume: number;
}

interface SimulationState {
  connected: boolean;
  step: number;
  running: boolean;
  mode: 'single' | 'multi';
  daoCount: number;
  priceHistory: Array<{ step: number; price: number }>;
  simulationData: SimulationData[];
  networkData: NetworkData | null;
  members: DAOMember[];
  proposals: DAOProposal[];
  projects: DAOProject[];
  guilds: DAOGuild[];
  disputes: DAODispute[];
  violations: DAOViolation[];
  metrics: SimulationMetrics | null;
  tokenLeaderboard: LeaderboardEntry[][];
  influenceLeaderboard: LeaderboardEntry[][];
  marketShocks: MarketShock[];
  // Multi-DAO city state
  city: CityState;
}

const buildInitialCityState = (): CityState => ({
  daos: [],
  tokenRankings: [],
  interDaoProposals: [],
  bridges: [],
  recentTransfers: [],
  cityNetworkData: null,
  totalMarketCap: 0,
  totalVolume: 0,
});

const buildInitialState = (connected: boolean): SimulationState => ({
  connected,
  running: false,
  step: 0,
  mode: 'single',
  daoCount: 1,
  priceHistory: [],
  simulationData: [],
  networkData: null,
  members: [],
  proposals: [],
  projects: [],
  guilds: [],
  disputes: [],
  violations: [],
  metrics: null,
  tokenLeaderboard: [],
  influenceLeaderboard: [],
  marketShocks: [],
  city: buildInitialCityState(),
});

const defaultSocketUrl =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SOCKET_URL) ||
  'http://localhost:8003';
const socketApiKey =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SOCKET_API_KEY) ||
  undefined;
const MAX_HISTORY = 600;
const MAX_SIM_DATA = 1200;
const MAX_LEADERBOARD = 120;
const MAX_SHOCKS = 200;

function appendCapped<T>(list: T[], item: T, max: number): T[] {
  if (list.length < max) {
    return [...list, item];
  }
  const next = list.slice(list.length - max + 1);
  next.push(item);
  return next;
}

export function useSimulationSocket(url: string = defaultSocketUrl) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<SimulationState>(() => buildInitialState(false));

  useEffect(() => {
    const socketInstance = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      auth: socketApiKey ? { apiKey: socketApiKey } : undefined,
    });

    // Define all event handlers so they can be properly cleaned up
    const handleConnect = () => {
      setState(prev => ({ ...prev, connected: true }));
    };

    const handleDisconnect = () => {
      setState(prev => ({ ...prev, connected: false }));
    };

    const handleSimulationStep = (data: Partial<SimulationData>) => {
      setState(prev => {
        const newSimData: SimulationData = {
          step: data.step || prev.step + 1,
          dao_token_price: data.dao_token_price || 0,
          treasury_balance: data.treasury_balance || 0,
          total_members: data.total_members || 0,
          active_proposals: data.active_proposals || 0,
          ...data,
        };

        const newPriceHistory = appendCapped(
          prev.priceHistory,
          { step: newSimData.step, price: newSimData.dao_token_price },
          MAX_HISTORY
        );

        return {
          ...prev,
          step: newSimData.step,
          priceHistory: newPriceHistory,
          simulationData: appendCapped(prev.simulationData, newSimData, MAX_SIM_DATA),
        };
      });
    };

    const handleNetworkUpdate = (data: NetworkData) => {
      setState(prev => ({ ...prev, networkData: data }));
    };

    const handleMembersUpdate = (data: { members: DAOMember[] }) => {
      setState(prev => ({ ...prev, members: data.members }));
    };

    const handleProposalsUpdate = (data: { proposals: DAOProposal[] }) => {
      setState(prev => ({ ...prev, proposals: data.proposals }));
    };

    const handleProjectsUpdate = (data: { projects: DAOProject[] }) => {
      setState(prev => ({ ...prev, projects: data.projects }));
    };

    const handleGuildsUpdate = (data: { guilds: DAOGuild[] }) => {
      setState(prev => ({ ...prev, guilds: data.guilds }));
    };

    const handleDisputesUpdate = (data: { disputes: DAODispute[] }) => {
      setState(prev => ({ ...prev, disputes: data.disputes }));
    };

    const handleViolationsUpdate = (data: { violations: DAOViolation[] }) => {
      setState(prev => ({ ...prev, violations: data.violations }));
    };

    const handleMetricsUpdate = (data: SimulationMetrics) => {
      setState(prev => ({ ...prev, metrics: data }));
    };

    const handleLeaderboardUpdate = (data: { token?: LeaderboardEntry[]; influence?: LeaderboardEntry[] }) => {
      setState(prev => ({
        ...prev,
        tokenLeaderboard: data.token
          ? appendCapped(prev.tokenLeaderboard, data.token, MAX_LEADERBOARD)
          : prev.tokenLeaderboard,
        influenceLeaderboard: data.influence
          ? appendCapped(prev.influenceLeaderboard, data.influence, MAX_LEADERBOARD)
          : prev.influenceLeaderboard,
      }));
    };

    const handleMarketShock = (data: MarketShock) => {
      setState(prev => ({
        ...prev,
        marketShocks: appendCapped(prev.marketShocks, data, MAX_SHOCKS),
      }));
    };

    const handleSimulationStarted = () => {
      setState(prev => ({ ...prev, running: true }));
    };

    const handleSimulationStopped = () => {
      setState(prev => ({ ...prev, running: false }));
    };

    const handleSimulationStatus = (data: { running: boolean; step?: number; mode?: 'single' | 'multi'; daoCount?: number }) => {
      setState(prev => ({
        ...prev,
        running: data.running,
        step: typeof data.step === 'number' ? data.step : prev.step,
        mode: data.mode || prev.mode,
        daoCount: data.daoCount ?? prev.daoCount,
      }));
    };

    // Multi-DAO city event handlers
    const handleCityStep = (data: { step: number; daos: DAOState[]; mode: 'multi' }) => {
      setState(prev => ({
        ...prev,
        step: data.step,
        mode: 'multi',
        city: {
          ...prev.city,
          daos: data.daos,
        },
      }));
    };

    const handleTokenRankings = (data: { rankings: TokenRanking[]; totalMarketCap: number; totalVolume: number }) => {
      setState(prev => ({
        ...prev,
        city: {
          ...prev.city,
          tokenRankings: data.rankings,
          totalMarketCap: data.totalMarketCap,
          totalVolume: data.totalVolume,
        },
      }));
    };

    const handleInterDaoProposals = (data: { proposals: InterDAOProposalData[] }) => {
      setState(prev => ({
        ...prev,
        city: {
          ...prev.city,
          interDaoProposals: data.proposals,
        },
      }));
    };

    const handleCityNetworkUpdate = (data: DAOCityNetworkData) => {
      setState(prev => ({
        ...prev,
        city: {
          ...prev.city,
          cityNetworkData: data,
        },
      }));
    };

    const handleBridgeActivity = (data: { bridges: BridgeState[]; recentTransfers: MemberTransferRequest[] }) => {
      setState(prev => ({
        ...prev,
        city: {
          ...prev.city,
          bridges: data.bridges,
          recentTransfers: data.recentTransfers,
        },
      }));
    };

    const handleMemberTransferCompleted = (data: any) => {
      // Could update local state if needed
      console.log('Member transfer completed:', data);
    };

    const handleInterDaoProposalCreated = (data: any) => {
      // Could update local state if needed
      console.log('Inter-DAO proposal created:', data);
    };

    const handleSimulationReset = () => {
      setState(prev => buildInitialState(prev.connected));
    };

    // Register all event listeners
    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);
    socketInstance.on('simulation_step', handleSimulationStep);
    socketInstance.on('network_update', handleNetworkUpdate);
    socketInstance.on('members_update', handleMembersUpdate);
    socketInstance.on('proposals_update', handleProposalsUpdate);
    socketInstance.on('projects_update', handleProjectsUpdate);
    socketInstance.on('guilds_update', handleGuildsUpdate);
    socketInstance.on('disputes_update', handleDisputesUpdate);
    socketInstance.on('violations_update', handleViolationsUpdate);
    socketInstance.on('metrics_update', handleMetricsUpdate);
    socketInstance.on('leaderboard_update', handleLeaderboardUpdate);
    socketInstance.on('market_shock', handleMarketShock);
    socketInstance.on('simulation_started', handleSimulationStarted);
    socketInstance.on('simulation_stopped', handleSimulationStopped);
    socketInstance.on('simulation_status', handleSimulationStatus);
    socketInstance.on('simulation_reset', handleSimulationReset);
    // Multi-DAO city event listeners
    socketInstance.on('city_step', handleCityStep);
    socketInstance.on('token_rankings', handleTokenRankings);
    socketInstance.on('inter_dao_proposals', handleInterDaoProposals);
    socketInstance.on('city_network_update', handleCityNetworkUpdate);
    socketInstance.on('bridge_activity', handleBridgeActivity);
    socketInstance.on('member_transfer_completed', handleMemberTransferCompleted);
    socketInstance.on('inter_dao_proposal_created', handleInterDaoProposalCreated);

    setSocket(socketInstance);

    // Cleanup: remove all event listeners and disconnect
    return () => {
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
      socketInstance.off('simulation_step', handleSimulationStep);
      socketInstance.off('network_update', handleNetworkUpdate);
      socketInstance.off('members_update', handleMembersUpdate);
      socketInstance.off('proposals_update', handleProposalsUpdate);
      socketInstance.off('projects_update', handleProjectsUpdate);
      socketInstance.off('guilds_update', handleGuildsUpdate);
      socketInstance.off('disputes_update', handleDisputesUpdate);
      socketInstance.off('violations_update', handleViolationsUpdate);
      socketInstance.off('metrics_update', handleMetricsUpdate);
      socketInstance.off('leaderboard_update', handleLeaderboardUpdate);
      socketInstance.off('market_shock', handleMarketShock);
      socketInstance.off('simulation_started', handleSimulationStarted);
      socketInstance.off('simulation_stopped', handleSimulationStopped);
      socketInstance.off('simulation_status', handleSimulationStatus);
      socketInstance.off('simulation_reset', handleSimulationReset);
      // Clean up multi-DAO city listeners
      socketInstance.off('city_step', handleCityStep);
      socketInstance.off('token_rankings', handleTokenRankings);
      socketInstance.off('inter_dao_proposals', handleInterDaoProposals);
      socketInstance.off('city_network_update', handleCityNetworkUpdate);
      socketInstance.off('bridge_activity', handleBridgeActivity);
      socketInstance.off('member_transfer_completed', handleMemberTransferCompleted);
      socketInstance.off('inter_dao_proposal_created', handleInterDaoProposalCreated);
      socketInstance.disconnect();
    };
  }, [url]);

  const resetLocalState = useCallback((connected: boolean, running: boolean) => {
    const next = buildInitialState(connected);
    next.running = running;
    setState(next);
  }, []);

  const emit = useCallback(
    (event: string, payload?: Record<string, unknown>) => {
      if (socket) {
        socket.emit(event, payload);
      }
    },
    [socket]
  );

  const startSimulation = useCallback(
    (options?: { stepsPerSecond?: number; simulationConfig?: Record<string, unknown>; mode?: 'single' | 'multi' }) => {
      emit('start_simulation', {
        stepsPerSecond: options?.stepsPerSecond,
        simulationConfig: options?.simulationConfig,
        mode: options?.mode || 'single',
      });
    },
    [emit]
  );

  const startCitySimulation = useCallback(
    (options?: { stepsPerSecond?: number; cityConfig?: Record<string, unknown> }) => {
      emit('start_city_simulation', {
        stepsPerSecond: options?.stepsPerSecond || 2,
        cityConfig: options?.cityConfig,
      });
    },
    [emit]
  );

  const stopSimulation = useCallback(() => {
    emit('stop_simulation');
  }, [emit]);

  const stepSimulation = useCallback((mode?: 'single' | 'multi') => {
    emit('step_simulation', { mode });
  }, [emit]);

  const getTokenRankings = useCallback(() => {
    emit('get_token_rankings');
  }, [emit]);

  const getCityState = useCallback(() => {
    emit('get_city_state');
  }, [emit]);

  const reset = useCallback(() => {
    const connected = socket?.connected || false;
    emit('reset_simulation');
    resetLocalState(connected, false);
  }, [emit, resetLocalState, socket]);

  return {
    ...state,
    socket,
    reset,
    startSimulation,
    startCitySimulation,
    stopSimulation,
    stepSimulation,
    getTokenRankings,
    getCityState,
  };
}
