'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { SimulationData, NetworkData, DAOMember, DAOProposal, LeaderboardEntry, MarketShock } from '@/lib/types/visualization';

interface SimulationState {
  connected: boolean;
  step: number;
  priceHistory: Array<{ step: number; price: number }>;
  simulationData: SimulationData[];
  networkData: NetworkData | null;
  members: DAOMember[];
  proposals: DAOProposal[];
  tokenLeaderboard: LeaderboardEntry[][];
  influenceLeaderboard: LeaderboardEntry[][];
  marketShocks: MarketShock[];
}

export function useSimulationSocket(url: string = 'http://localhost:8003') {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<SimulationState>({
    connected: false,
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

  useEffect(() => {
    const socketInstance = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketInstance.on('connect', () => {
      setState(prev => ({ ...prev, connected: true }));
    });

    socketInstance.on('disconnect', () => {
      setState(prev => ({ ...prev, connected: false }));
    });

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

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [url]);

  const reset = useCallback(() => {
    setState({
      connected: socket?.connected || false,
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
  }, [socket]);

  return { ...state, socket, reset };
}
