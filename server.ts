#!/usr/bin/env node
/**
 * WebSocket Server for Real-time DAO Simulation Updates
 *
 * This server runs a DAO simulation and broadcasts updates via Socket.IO
 * to connected dashboard clients.
 *
 * Usage:
 *   npx tsx server.ts [--port 8003]
 */

import { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import { DAOSimulation } from './lib/engine/simulation';
import { DAOCity } from './lib/engine/dao-city';
import { createSimulationStore, InMemorySimulationStore, rehydrateSimulation } from './lib/utils/redis-store';
import type { DAOCityConfig, DAOConfig } from './lib/types/dao-city';

const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const portValue = portIndex !== -1 ? args[portIndex + 1] : undefined;
const parsedPort = portValue ? Number.parseInt(portValue, 10) : NaN;
const PORT = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 8003;
if (portIndex !== -1 && !portValue) {
  console.warn('Missing value for --port. Falling back to default 8003.');
} else if (portIndex !== -1 && (!Number.isFinite(parsedPort) || parsedPort <= 0)) {
  console.warn(`Invalid port "${portValue}". Falling back to default 8003.`);
}
const AUTO_START = process.env.AUTO_START_SIMULATION === 'true' || args.includes('--auto-start');
const REHYDRATE_ON_START = process.env.REHYDRATE_ON_START !== 'false';
const SOCKET_SIM_ID = process.env.SOCKET_SIM_ID || 'socket_sim';
const MAX_STEPS_PER_SECOND = 60;

function hashToUnit(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) / 0x7fffffff;
}

function normalizeStepsPerSecond(value: number | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }
  return Math.min(parsed, MAX_STEPS_PER_SECOND);
}

function parseAllowedOrigins(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

function resolveAllowedOrigins(): string[] | '*' {
  const fromEnv = parseAllowedOrigins(process.env.SOCKET_ALLOWED_ORIGINS);
  if (fromEnv.length > 0) {
    return fromEnv;
  }

  const nextAuthUrl = process.env.NEXTAUTH_URL;
  if (nextAuthUrl) {
    try {
      return [new URL(nextAuthUrl).origin];
    } catch (error: any) {
      console.warn(`Invalid NEXTAUTH_URL "${nextAuthUrl}".`, error?.message ?? error);
    }
  }

  return process.env.NODE_ENV === 'development' ? '*' : [];
}

function getSocketApiKey(socket: Socket): string | undefined {
  const authKey = (socket.handshake.auth as { apiKey?: string } | undefined)?.apiKey;
  const queryKey = typeof socket.handshake.query?.apiKey === 'string'
    ? socket.handshake.query.apiKey
    : undefined;
  const headerValue = socket.handshake.headers['x-api-key'];
  const headerKey = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  return authKey || queryKey || headerKey;
}

function isSocketAuthorized(socket: Socket): boolean {
  const requiredApiKey = process.env.API_KEY;
  if (!requiredApiKey && process.env.NODE_ENV === 'development') {
    return true;
  }
  if (!requiredApiKey) {
    return false;
  }
  return getSocketApiKey(socket) === requiredApiKey;
}

console.log('Starting DAO Simulation WebSocket Server...');

const allowedOrigins = resolveAllowedOrigins();
if (Array.isArray(allowedOrigins) && allowedOrigins.length === 0) {
  console.warn('No allowed origins configured. Set SOCKET_ALLOWED_ORIGINS or NEXTAUTH_URL to enable browser access.');
}

const io = new Server(PORT, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins === '*') {
        callback(null, true);
        return;
      }

      if (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST'],
  },
});

let simulation: DAOSimulation | null = null;
let daoCity: DAOCity | null = null;
let simulationMode: 'single' | 'multi' = 'single';
let running = false;
let intervalId: NodeJS.Timeout | null = null;
let eventBusUnsubscribe: (() => void) | null = null;
let cityEventBusUnsubscribe: (() => void) | null = null;
const simulationStore = createSimulationStore();
const persistenceEnabled = !(simulationStore instanceof InMemorySimulationStore);

io.use((socket, next) => {
  if (isSocketAuthorized(socket)) {
    next();
    return;
  }
  console.warn(`Socket auth failed for ${socket.id}`);
  next(new Error('Unauthorized'));
});

function emitSimulationStatus(): void {
  const step = simulationMode === 'multi'
    ? daoCity?.getCurrentStep() ?? 0
    : simulation?.currentStep ?? 0;

  io.emit('simulation_status', {
    running,
    step,
    mode: simulationMode,
    daoCount: simulationMode === 'multi' ? daoCity?.getAllDAOs().length ?? 0 : 1,
  });
}

async function persistSimulation(id: string, instance: DAOSimulation) {
  if (!simulationStore || !instance) return;
  try {
    await simulationStore.save(id, instance);
  } catch (error: any) {
    console.error('Failed to persist simulation:', error?.message ?? error);
  }
}

async function createSimulation(config: any = {}) {
  console.log('Creating new simulation...');

  // Create a diverse simulation with all agent types represented
  const defaultConfig = {
    // Core governance agents
    num_developers: 10,
    num_investors: 5,
    num_proposal_creators: 5,
    num_validators: 5,
    num_passive_members: 10,
    // Delegation agents
    num_delegators: 5,
    num_liquid_delegators: 2,
    // Service & oversight agents
    num_service_providers: 3,
    num_arbitrators: 2,
    num_regulators: 2,
    num_auditors: 2,
    num_external_partners: 2,
    // Economic agents
    num_traders: 2,
    num_adaptive_investors: 2,
    num_speculators: 2,
    num_rl_traders: 2,
    num_market_makers: 2,
    num_risk_managers: 2,
    // Creative & community agents
    num_artists: 2,
    num_collectors: 2,
    num_bounty_hunters: 2,
    num_governance_experts: 2,
    num_whistleblowers: 1,
    // Behavior settings
    comment_probability: 0.5,
    governance_rule: 'majority' as const,
    eventLogging: true,
  };

  simulation = new DAOSimulation({ ...defaultConfig, ...config });
  console.log(`Simulation created with ${simulation.dao.members.length} members`);
  await persistSimulation(SOCKET_SIM_ID, simulation);

  if (eventBusUnsubscribe) {
    eventBusUnsubscribe();
  }

  const shockListener = (data: any) => {
    io.emit('market_shock', {
      step: data.step ?? simulation?.currentStep ?? 0,
      severity: data.severity ?? 0,
      oldPrice: data.oldPrice,
      newPrice: data.newPrice,
    });
  };
  simulation.eventBus.subscribe('market_shock', shockListener);
  eventBusUnsubscribe = () => {
    simulation?.eventBus.unsubscribe('market_shock', shockListener);
  };

  emitSimulationStatus();
  return simulation;
}

/**
 * Create a new multi-DAO city simulation
 */
async function createDAOCity(config?: DAOCityConfig) {
  console.log('Creating new DAO City simulation...');

  daoCity = new DAOCity(config);
  simulationMode = 'multi';

  console.log(`DAO City created with ${daoCity.getAllDAOs().length} DAOs`);

  // Clean up previous event listeners
  if (cityEventBusUnsubscribe) {
    cityEventBusUnsubscribe();
  }

  // Subscribe to city-wide events
  const cityEventBus = daoCity.getEventBus();

  const cityStepListener = (data: any) => {
    io.emit('city_step', {
      step: data.step,
      state: data.state,
      mode: 'multi',
    });
  };
  cityEventBus.subscribe('city_step', cityStepListener);

  const proposalCreatedListener = (data: any) => {
    io.emit('inter_dao_proposal_created', data);
  };
  cityEventBus.subscribe('inter_dao_proposal_created', proposalCreatedListener);

  const transferCompletedListener = (data: any) => {
    io.emit('member_transfer_completed', data);
  };
  cityEventBus.subscribe('member_transfer_completed', transferCompletedListener);

  cityEventBusUnsubscribe = () => {
    cityEventBus.unsubscribe('city_step', cityStepListener);
    cityEventBus.unsubscribe('inter_dao_proposal_created', proposalCreatedListener);
    cityEventBus.unsubscribe('member_transfer_completed', transferCompletedListener);
  };

  emitSimulationStatus();
  return daoCity;
}

/**
 * Broadcast city-wide simulation step
 */
async function broadcastCityStep() {
  if (!daoCity) return;

  try {
    await daoCity.step();

    const state = daoCity.getState();
    const rankings = daoCity.getTokenRankings();
    const networkData = daoCity.getNetworkData();

    // Broadcast city state
    io.emit('city_step', {
      step: state.currentStep,
      daos: state.daos,
      mode: 'multi',
    });

    // Broadcast token rankings
    io.emit('token_rankings', {
      rankings,
      totalMarketCap: state.globalMarketplace.totalMarketCap,
      totalVolume: state.globalMarketplace.totalVolume24h,
    });

    // Broadcast inter-DAO proposals
    io.emit('inter_dao_proposals', {
      proposals: state.interDaoProposals,
      activeCount: state.interDaoProposals.filter(p => p.status === 'open').length,
    });

    // Broadcast network visualization data
    io.emit('city_network_update', networkData);

    // Broadcast per-DAO updates
    for (const dao of daoCity.getAllDAOs()) {
      const members = dao.members.map((m, idx) => {
        const locations = ['North America', 'Europe', 'Asia', 'South America', 'Africa', 'Oceania'];
        return {
          id: m.uniqueId,
          unique_id: m.uniqueId,
          type: m.constructor.name,
          tokens: m.tokens,
          reputation: m.reputation,
          location: locations[idx % locations.length],
          daoId: m.daoId,
          isTransferring: m.isTransferring,
        };
      });

      const proposals = dao.proposals.map(p => ({
        id: p.uniqueId,
        title: (p as any).title || `Proposal ${p.uniqueId}`,
        type: p.type,
        status: p.status,
        votes_for: p.votesFor || 0,
        votes_against: p.votesAgainst || 0,
        creator: p.creator || 'unknown',
      }));

      io.emit(`dao_${dao.daoId}_update`, {
        daoId: dao.daoId,
        state: state.daos.find(d => d.id === dao.daoId),
        members,
        proposals,
        projects: dao.projects,
        guilds: dao.guilds.map(g => ({
          name: g.name,
          members: g.members?.map((m: any) => m.uniqueId || m) || [],
        })),
      });
    }

    // Broadcast bridge activity
    io.emit('bridge_activity', {
      bridges: state.bridges,
      recentTransfers: state.recentTransfers,
    });

  } catch (error: any) {
    console.error('Error in city step:', error?.message ?? error);
    stopSimulation();
  }
}

async function broadcastSimulationStep() {
  if (!simulation) return;

  try {
    await simulation.step();
    void persistSimulation(SOCKET_SIM_ID, simulation);

    const summary = simulation.getSummary();
    const tokenPrice = simulation.dao.treasury.getTokenPrice('DAO_TOKEN');

    // Broadcast simulation step data
    io.emit('simulation_step', {
      step: simulation.currentStep,
      dao_token_price: tokenPrice,
      treasury_balance: simulation.dao.treasury.funds,
      total_members: simulation.dao.members.length,
      active_proposals: simulation.dao.proposals.filter(p => p.status === 'open').length,
      ...summary
    });

    // Broadcast members data
    const members = simulation.dao.members.map((m, idx) => {
      // Generate random locations for visualization
      const locations = ['North America', 'Europe', 'Asia', 'South America', 'Africa', 'Oceania'];
      const location = locations[idx % locations.length];
      const reputation = typeof (m as any).reputation === 'number' ? (m as any).reputation : 0;

      return {
        id: m.uniqueId,
        unique_id: m.uniqueId,
        type: m.constructor.name,
        tokens: m.tokens,
        reputation,
        location
      };
    });
    io.emit('members_update', { members });

    // Broadcast proposals data
    const proposals = simulation.dao.proposals.map((p, idx) => ({
      id: p.uniqueId,
      title: (p as any).title || `Proposal ${p.uniqueId}`,
      type: p.type,
      status: p.status,
      votes_for: p.votesFor || 0,
      votes_against: p.votesAgainst || 0,
      creator: p.creator || `member_${idx}`
    }));
    io.emit('proposals_update', { proposals });

    // Broadcast network data with proper 3D positions
    // Member nodes - arranged in a ring
    const memberNodes = members.map((m, idx) => {
      const angle = (idx / members.length) * Math.PI * 2;
      const radius = 20;
      const height = (hashToUnit(String(m.id)) - 0.5) * 10;

      return {
        id: m.id,
        type: 'member' as const,
        position: [
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        ] as [number, number, number],
        size: Math.log(m.tokens + 1) * 2
      };
    });

    // Proposal nodes - arranged in inner ring above members
    const proposalNodes = proposals.map((p, idx) => {
      const angle = (idx / Math.max(proposals.length, 1)) * Math.PI * 2;
      const radius = 10; // Inner ring
      const height = 5 + (hashToUnit(p.id) * 5); // Above the members

      return {
        id: p.id,
        type: 'proposal' as const,
        position: [
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        ] as [number, number, number],
        size: Math.log((p.votes_for + p.votes_against) + 2) * 1.5
      };
    });

    // Create cluster nodes based on member types
    const membersByType = new Map<string, string[]>();
    simulation.dao.members.forEach(m => {
      const type = m.constructor.name;
      if (!membersByType.has(type)) {
        membersByType.set(type, []);
      }
      membersByType.get(type)!.push(m.uniqueId);
    });

    const clusterNodes: any[] = [];
    let clusterIdx = 0;
    membersByType.forEach((memberIds, type) => {
      if (memberIds.length >= 2) {
        const angle = (clusterIdx / membersByType.size) * Math.PI * 2;
        const radius = 30; // Outer ring for clusters
        clusterNodes.push({
          id: `cluster_${type}`,
          type: 'cluster' as const,
          position: [
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
          ] as [number, number, number],
          size: memberIds.length
        });
        clusterIdx++;
      }
    });

    const networkNodes = [...memberNodes, ...proposalNodes, ...clusterNodes];

    // Create edges
    const networkEdges: any[] = [];

    // Representative edges (member -> representative)
    simulation.dao.members.forEach(m => {
      if ((m as any).representative) {
        networkEdges.push({
          source: m.uniqueId,
          target: (m as any).representative,
          type: 'representative',
          weight: 1
        });
      }
    });

    // Delegation edges (member -> delegatee)
    simulation.dao.members.forEach(m => {
      const delegations = (m as any).delegations;
      if (delegations && typeof delegations === 'object') {
        Object.entries(delegations).forEach(([targetId, weight]) => {
          if (typeof weight === 'number' && weight > 0) {
            networkEdges.push({
              source: m.uniqueId,
              target: targetId,
              type: 'delegation',
              weight
            });
          }
        });
      }
    });

    // Created edges (proposal -> creator)
    proposals.forEach(p => {
      if (p.creator) {
        networkEdges.push({
          source: p.creator,
          target: p.id,
          type: 'created',
          weight: 1
        });
      }
    });

    // Aggregated edges (cluster -> member)
    membersByType.forEach((memberIds, type) => {
      if (memberIds.length >= 2) {
        memberIds.forEach(memberId => {
          networkEdges.push({
            source: `cluster_${type}`,
            target: memberId,
            type: 'aggregated',
            weight: 0.5
          });
        });
      }
    });

    const networkData = {
      nodes: networkNodes,
      edges: networkEdges,
      clusters: Array.from(membersByType.entries()).map(([type, memberIds]) => ({
        id: `cluster_${type}`,
        members: memberIds,
        size: memberIds.length,
        position: [0, 0, 0] as [number, number, number]
      }))
    };
    io.emit('network_update', networkData);

    // Broadcast leaderboards
    const tokenLeaderboard = [...simulation.dao.members]
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 10)
      .map(m => ({
        member: m.uniqueId,
        value: m.tokens
      }));

    const influenceLeaderboard = [...simulation.dao.members]
      .sort((a, b) => ((b as any).reputation || 0) - ((a as any).reputation || 0))
      .slice(0, 10)
      .map(m => ({
        member: m.uniqueId,
        value: (m as any).reputation || 0
      }));

    io.emit('leaderboard_update', {
      token: tokenLeaderboard,
      influence: influenceLeaderboard
    });

    // Broadcast projects data
    const projects = simulation.dao.projects.map(p => ({
      id: p.uniqueId,
      title: (p as any).title || `Project ${p.uniqueId}`,
      status: (p as any).status || 'active',
      progress: (p as any).progress || 0,
      fundingGoal: (p as any).fundingGoal || 0,
      currentFunding: (p as any).currentFunding || 0,
      duration: (p as any).duration || 0,
      startTime: (p as any).startTime || 0,
      members: (p as any).members || [],
      skills: (p as any).skills || []
    }));
    io.emit('projects_update', { projects });

    // Broadcast guilds data
    const guilds = simulation.dao.guilds.map(g => ({
      name: g.name,
      members: g.members?.map((m: any) => m.uniqueId || m) || [],
      treasury: (g as any).treasury || 0,
      reputation: (g as any).reputation || 0,
      creator: (g as any).creator?.uniqueId || null
    }));
    io.emit('guilds_update', { guilds });

    // Broadcast disputes data
    const disputesList = simulation.dao.disputes;
    const disputes = disputesList.map((d, idx) => ({
      id: (d as any).uniqueId || (d as any).id || `dispute_${idx}`,
      parties: (d as any).parties || [],
      description: (d as any).description || '',
      importance: (d as any).importance || 0,
      resolved: (d as any).resolved || false,
      relatedProject: (d as any).relatedProject || null
    }));
    io.emit('disputes_update', { disputes });

    // Broadcast violations data
    const violationsList = simulation.dao.violations;
    const violations = violationsList.map((v, idx) => ({
      id: (v as any).uniqueId || (v as any).id || `violation_${idx}`,
      violator: (v as any).violator?.uniqueId || (v as any).violator || '',
      description: (v as any).description || '',
      penalty: (v as any).penalty || 0,
      detected: (v as any).detected || false
    }));
    io.emit('violations_update', { violations });

    // Broadcast data collector stats (gini, metrics, event counts)
    const latestStats = simulation.dataCollector.getLatestStats();
    const eventCounts: Record<string, number> = {};
    simulation.dataCollector.eventCounts.forEach((count, event) => {
      eventCounts[event] = count;
    });

    io.emit('metrics_update', {
      gini: latestStats?.gini || 0,
      reputationGini: latestStats?.repGini || 0,
      avgTokens: latestStats?.avgTokens || 0,
      numProjects: latestStats?.numProjects || simulation.dao.projects.length,
      numMembers: latestStats?.numMembers || simulation.dao.members.length,
      eventCounts
    });

  } catch (error: any) {
    console.error('Error in simulation step:', error?.message ?? error);
    stopSimulation();
  }
}

function startSimulation(stepsPerSecond: number = 1, mode: 'single' | 'multi' = 'single') {
  if (running) {
    console.log('Simulation already running');
    return;
  }

  // Initialize appropriate simulation mode
  if (mode === 'multi') {
    if (!daoCity) {
      createDAOCity();
    }
    simulationMode = 'multi';
  } else {
    if (!simulation) {
      createSimulation();
    }
    simulationMode = 'single';
  }

  const safeStepsPerSecond = normalizeStepsPerSecond(stepsPerSecond);
  if (stepsPerSecond !== undefined && safeStepsPerSecond !== stepsPerSecond) {
    console.warn(`Invalid stepsPerSecond "${stepsPerSecond}". Using ${safeStepsPerSecond}.`);
  }
  console.log(`Starting ${mode} simulation at ${safeStepsPerSecond} steps/second`);
  running = true;

  const interval = 1000 / safeStepsPerSecond;
  const stepFn = mode === 'multi' ? broadcastCityStep : broadcastSimulationStep;
  intervalId = setInterval(stepFn, interval);
  emitSimulationStatus();
}

function stopSimulation() {
  if (!running) {
    console.log('Simulation not running');
    return;
  }

  console.log('Stopping simulation');
  running = false;

  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  emitSimulationStatus();
}

function resetSimulation() {
  stopSimulation();
  simulation = null;
  daoCity = null;
  simulationMode = 'single';

  if (eventBusUnsubscribe) {
    eventBusUnsubscribe();
    eventBusUnsubscribe = null;
  }
  if (cityEventBusUnsubscribe) {
    cityEventBusUnsubscribe();
    cityEventBusUnsubscribe = null;
  }

  console.log('Simulation reset');
  emitSimulationStatus();
  if (persistenceEnabled) {
    void simulationStore.delete(SOCKET_SIM_ID);
  }
}

async function rehydrateSimulationFromStore(): Promise<boolean> {
  if (!REHYDRATE_ON_START) return false;

  try {
    const snapshot = await simulationStore.load(SOCKET_SIM_ID);
    if (!snapshot) {
      return false;
    }

    simulation = rehydrateSimulation(snapshot);
    console.log(`Rehydrated simulation ${SOCKET_SIM_ID} at step ${simulation.currentStep}`);
    emitSimulationStatus();
    return true;
  } catch (error: any) {
    console.error('Failed to rehydrate simulation:', error?.message ?? error);
    return false;
  }
}

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.emit('simulation_status', {
    running,
    step: simulation?.currentStep ?? 0,
  });

  socket.on('start_simulation', async (config: any = {}) => {
    console.log('Received start_simulation command');
    const mode = config.mode === 'multi' ? 'multi' : 'single';

    if (mode === 'multi') {
      if (!daoCity) {
        await createDAOCity(config.cityConfig);
      }
    } else {
      if (!simulation) {
        await createSimulation(config.simulationConfig);
      }
    }

    startSimulation(config.stepsPerSecond, mode);
    io.emit('simulation_started', { success: true, mode });
  });

  socket.on('start_city_simulation', async (config: any = {}) => {
    console.log('Received start_city_simulation command');
    if (!daoCity) {
      await createDAOCity(config.cityConfig);
    }
    startSimulation(config.stepsPerSecond || 2, 'multi');
    io.emit('simulation_started', { success: true, mode: 'multi' });
  });

  socket.on('stop_simulation', () => {
    console.log('Received stop_simulation command');
    stopSimulation();
    io.emit('simulation_stopped', { success: true });
  });

  socket.on('reset_simulation', () => {
    console.log('Received reset_simulation command');
    resetSimulation();
    io.emit('simulation_reset', { success: true });
  });

  socket.on('step_simulation', async (config: any = {}) => {
    const mode = config?.mode || simulationMode;

    if (mode === 'multi') {
      if (!daoCity) {
        await createDAOCity();
      }
      simulationMode = 'multi';
      broadcastCityStep();
    } else {
      if (!simulation) {
        await createSimulation();
      }
      simulationMode = 'single';
      broadcastSimulationStep();
    }
  });

  socket.on('get_token_rankings', () => {
    if (daoCity) {
      const rankings = daoCity.getTokenRankings();
      const state = daoCity.getState();
      socket.emit('token_rankings', {
        rankings,
        totalMarketCap: state.globalMarketplace.totalMarketCap,
        totalVolume: state.globalMarketplace.totalVolume24h,
      });
    }
  });

  socket.on('get_city_state', () => {
    if (daoCity) {
      socket.emit('city_state', daoCity.getState());
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Graceful shutdown handler
let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  // Stop simulation loop
  if (running) {
    stopSimulation();
  }

  // Persist final state if we have a simulation
  if (simulation && persistenceEnabled) {
    console.log('Persisting final simulation state...');
    await persistSimulation(SOCKET_SIM_ID, simulation);
  }

  // Notify all connected clients
  io.emit('server_shutdown', { message: 'Server is shutting down' });

  // Close all socket connections gracefully
  console.log('Closing client connections...');
  io.close((err) => {
    if (err) {
      console.error('Error closing Socket.IO server:', err);
    }
    console.log('Socket.IO server closed');
    process.exit(0);
  });

  // Force exit after 5 seconds if graceful shutdown hangs
  setTimeout(() => {
    console.error('Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 5000);
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Bootstrap: try to rehydrate, then auto-start if requested
(async () => {
  const restored = await rehydrateSimulationFromStore();

  if (AUTO_START) {
    if (!restored) {
      await createSimulation();
    }
    startSimulation(2); // 2 steps per second
  } else if (!restored) {
    console.log('Auto-start disabled. Awaiting start_simulation command.');
  }

  console.log(`WebSocket server running on port ${PORT}`);
  console.log(`Dashboard should connect to: http://localhost:${PORT}`);
  console.log(`\nCommands available via Socket.IO:`);
  console.log(`   - start_simulation`);
  console.log(`   - stop_simulation`);
  console.log(`   - reset_simulation`);
  console.log(`   - step_simulation`);
  console.log(`\nPress Ctrl+C to gracefully shutdown`);
})();
