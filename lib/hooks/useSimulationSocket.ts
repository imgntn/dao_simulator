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

export function useSimulationSocket(url: string = 'http://localhost:8003') {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<SimulationState>(() => buildInitialState(false));

  useEffect(() => {
    const socketInstance = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    const setConnection = (connectedValue: boolean) => {
      setState(prev => ({ ...prev, connected: connectedValue }));
    };

    socketInstance.on('connect', () => setConnection(true));
    socketInstance.on('disconnect', () => setConnection(false));

    socketInstance.on('simulation_step', (data: any) => {
      setState(prev => {
        const newSimData: SimulationData = {
          step: data.step || prev.step + 1,
          dao_token_price: data.dao_token_price || 0,
          treasury_balance: data.treasury_balance || 0,
          total_members: data.total_members || 0,
          active_proposals: data.active_proposals || 0,
          ...data,
        };

        const newPriceHistory = [
          ...prev.priceHistory,
          { step: newSimData.step, price: newSimData.dao_token_price },
        ];

        return {
          ...prev,
          step: newSimData.step,
          priceHistory: newPriceHistory,
          simulationData: [...prev.simulationData, newSimData],
        };
      });
    });

    socketInstance.on('network_update', (data: NetworkData) => {
      setState(prev => ({ ...prev, networkData: data }));
    });

    socketInstance.on('members_update', (data: { members: DAOMember[] }) => {
      setState(prev => ({ ...prev, members: data.members }));
    });

    socketInstance.on('proposals_update', (data: { proposals: DAOProposal[] }) => {
      setState(prev => ({ ...prev, proposals: data.proposals }));
    });

    socketInstance.on('leaderboard_update', (data: any) => {
      setState(prev => ({
        ...prev,
        tokenLeaderboard: data.token ? [...prev.tokenLeaderboard, data.token] : prev.tokenLeaderboard,
        influenceLeaderboard: data.influence ? [...prev.influenceLeaderboard, data.influence] : prev.influenceLeaderboard,
      }));
    });

    socketInstance.on('market_shock', (data: MarketShock) => {
      setState(prev => ({
        ...prev,
        marketShocks: [...prev.marketShocks, data],
      }));
    });

    socketInstance.on('simulation_started', () => {
      setState(prev => ({ ...prev, running: true }));
    });

    socketInstance.on('simulation_stopped', () => {
      setState(prev => ({ ...prev, running: false }));
    });

    socketInstance.on('simulation_status', (data: { running: boolean; step?: number }) => {
      setState(prev => ({
        ...prev,
        running: data.running,
        step: typeof data.step === 'number' ? data.step : prev.step,
      }));
    });

    socketInstance.on('simulation_reset', () => {
      setState(prev => buildInitialState(prev.connected));
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [url]);

  const resetLocalState = useCallback((connected: boolean, running: boolean) => {
    const next = buildInitialState(connected);
    next.running = running;
    setState(next);
  }, []);

  const emit = useCallback(
    (event: string, payload?: any) => {
      if (socket) {
        socket.emit(event, payload);
      }
    },
    [socket]
  );

  const startSimulation = useCallback(
    (options?: { stepsPerSecond?: number; simulationConfig?: Record<string, any> }) => {
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
