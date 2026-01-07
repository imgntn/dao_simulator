'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { SimulationData, NetworkData, DAOMember, DAOProposal, LeaderboardEntry, MarketShock } from '@/lib/types/visualization';

interface SimulationState {
  connected: boolean;
  step: number;
  running: boolean;
  priceHistory: Array<{ step: number; price: number }>;
  simulationData: SimulationData[];
  networkData: NetworkData | null;
  members: DAOMember[];
  proposals: DAOProposal[];
  tokenLeaderboard: LeaderboardEntry[][];
  influenceLeaderboard: LeaderboardEntry[][];
  marketShocks: MarketShock[];
}

const buildInitialState = (connected: boolean): SimulationState => ({
  connected,
  running: false,
  step: 0,
  priceHistory: [],
  simulationData: [],
  networkData: null,
  members: [],
  proposals: [],
  tokenLeaderboard: [],
  influenceLeaderboard: [],
  marketShocks: [],
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

    const handleSimulationStatus = (data: { running: boolean; step?: number }) => {
      setState(prev => ({
        ...prev,
        running: data.running,
        step: typeof data.step === 'number' ? data.step : prev.step,
      }));
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
    socketInstance.on('leaderboard_update', handleLeaderboardUpdate);
    socketInstance.on('market_shock', handleMarketShock);
    socketInstance.on('simulation_started', handleSimulationStarted);
    socketInstance.on('simulation_stopped', handleSimulationStopped);
    socketInstance.on('simulation_status', handleSimulationStatus);
    socketInstance.on('simulation_reset', handleSimulationReset);

    setSocket(socketInstance);

    // Cleanup: remove all event listeners and disconnect
    return () => {
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
      socketInstance.off('simulation_step', handleSimulationStep);
      socketInstance.off('network_update', handleNetworkUpdate);
      socketInstance.off('members_update', handleMembersUpdate);
      socketInstance.off('proposals_update', handleProposalsUpdate);
      socketInstance.off('leaderboard_update', handleLeaderboardUpdate);
      socketInstance.off('market_shock', handleMarketShock);
      socketInstance.off('simulation_started', handleSimulationStarted);
      socketInstance.off('simulation_stopped', handleSimulationStopped);
      socketInstance.off('simulation_status', handleSimulationStatus);
      socketInstance.off('simulation_reset', handleSimulationReset);
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
    (options?: { stepsPerSecond?: number; simulationConfig?: Record<string, unknown> }) => {
      emit('start_simulation', {
        stepsPerSecond: options?.stepsPerSecond,
        simulationConfig: options?.simulationConfig,
      });
    },
    [emit]
  );

  const stopSimulation = useCallback(() => {
    emit('stop_simulation');
  }, [emit]);

  const stepSimulation = useCallback(() => {
    emit('step_simulation');
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
    stopSimulation,
    stepSimulation,
  };
}
