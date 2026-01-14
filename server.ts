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

import { createServer } from 'http';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import { DAOSimulation } from './lib/engine/simulation';
import { DAOCity } from './lib/engine/dao-city';
import { createSimulationStore, InMemorySimulationStore, rehydrateSimulation } from './lib/utils/redis-store';
import type { DAOCityConfig, DAOConfig } from './lib/types/dao-city';

// Socket event configuration interfaces
interface SimulationConfig {
  num_developers?: number;
  num_investors?: number;
  num_proposal_creators?: number;
  num_validators?: number;
  num_passive_members?: number;
  num_delegators?: number;
  num_liquid_delegators?: number;
  num_service_providers?: number;
  num_arbitrators?: number;
  num_regulators?: number;
  num_auditors?: number;
  num_external_partners?: number;
  num_traders?: number;
  num_adaptive_investors?: number;
  num_speculators?: number;
  num_rl_traders?: number;
  num_market_makers?: number;
  num_risk_managers?: number;
  num_artists?: number;
  num_collectors?: number;
  num_bounty_hunters?: number;
  num_governance_experts?: number;
  num_whistleblowers?: number;
  comment_probability?: number;
  governance_rule?: 'majority' | 'supermajority' | 'quadratic' | 'conviction';
  eventLogging?: boolean;
}

interface StepConfig {
  steps?: number;
  stepsPerSecond?: number;
  mode?: 'single' | 'multi';
}

interface StartSimulationConfig {
  mode?: 'single' | 'multi';
  stepsPerSecond?: number;
  simulationConfig?: SimulationConfig;
  cityConfig?: DAOCityConfig;
}

interface StartCitySimulationConfig {
  cityConfig?: DAOCityConfig;
  stepsPerSecond?: number;
}

// Event data interfaces for type-safe event handling
// These extend the base event shape while adding specific fields
interface MarketShockEventData {
  event: string;
  step: number;
  severity?: number;
  oldPrice?: number;
  newPrice?: number;
  [key: string]: unknown;
}

interface CityStepEventData {
  event: string;
  step: number;
  daos?: Array<{
    name: string;
    token: string;
    memberCount: number;
    treasuryFunds: number;
    projectCount: number;
    tokenPrice: number;
    marketCap: number;
  }>;
  [key: string]: unknown;
}

interface ProposalCreatedEventData {
  event: string;
  step: number;
  proposal?: {
    uniqueId?: string;
    id?: string;
    title?: string;
  };
  [key: string]: unknown;
}

interface TransferCompletedEventData {
  event: string;
  step: number;
  from?: string;
  to?: string;
  amount?: number;
  [key: string]: unknown;
}

// Normalize function input types
interface MemberLike {
  uniqueId?: string;
  id?: string;
}

interface ProjectLike {
  uniqueId?: string;
  id?: string;
  title?: string;
  status?: string;
  progress?: number;
  fundingGoal?: number;
  currentFunding?: number;
  skills?: string[];
  requiredSkills?: string[];
  duration?: number;
  startTime?: number;
  members?: Array<string | MemberLike>;
}

// Network visualization data structures
interface ClusterNode {
  id: string;
  type: 'cluster';
  position: [number, number, number];
  size: number;
}

interface NetworkEdge {
  source: string;
  target: string;
  type: 'representative' | 'delegation' | 'guild' | 'project' | 'vote' | 'created' | 'aggregated';
  weight: number;
}

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
const nodeEnv = process.env.NODE_ENV ?? 'development';
const isDev = nodeEnv !== 'production';

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

function normalizeMemberId(value: string | MemberLike | null | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value.uniqueId === 'string') return value.uniqueId;
  if (typeof value.id === 'string') return value.id;
  return String(value);
}

function normalizeProjectId(value: string | MemberLike | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value.uniqueId === 'string') return value.uniqueId;
  if (typeof value.id === 'string') return value.id;
  return null;
}

function normalizeMemberIds(values: Array<string | MemberLike> | undefined): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map(normalizeMemberId)
    .filter((value) => value.length > 0);
}

function summarizePayload(payload: unknown): string {
  if (payload === null) return 'null';
  if (Array.isArray(payload)) return `array(${payload.length})`;
  if (typeof payload === 'object') {
    const keys = Object.keys(payload as Record<string, unknown>);
    const preview = keys.slice(0, 5).join(', ');
    return `object(${keys.length}${preview ? ` keys: ${preview}` : ''})`;
  }
  return typeof payload;
}

function serializeProject(project: ProjectLike | null | undefined) {
  const skills = Array.isArray(project?.skills)
    ? project.skills
    : Array.isArray(project?.requiredSkills)
      ? project.requiredSkills
      : [];

  return {
    id: project?.uniqueId || project?.id || '',
    title: project?.title || `Project ${project?.uniqueId || project?.id || ''}`,
    status: project?.status || 'active',
    progress: typeof project?.progress === 'number' ? project.progress : 0,
    fundingGoal: project?.fundingGoal || 0,
    currentFunding: project?.currentFunding || 0,
    duration: project?.duration || 0,
    startTime: project?.startTime || 0,
    members: normalizeMemberIds(project?.members),
    skills,
  };
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

  return isDev ? '*' : [];
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
  if (!requiredApiKey && isDev) {
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
  if (!isDev) {
    console.error('FATAL: No allowed origins configured in production.');
    console.error('Set SOCKET_ALLOWED_ORIGINS or NEXTAUTH_URL environment variable.');
    process.exit(1);
  }
  console.warn('No allowed origins configured. Set SOCKET_ALLOWED_ORIGINS or NEXTAUTH_URL to enable browser access.');
}

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  res.statusCode = 404;
  res.end();
});

const io = new Server(httpServer, {
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
let stepInProgress = false;
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

httpServer.listen(PORT);

function emitSafe(event: string, payload: unknown): void {
  try {
    io.emit(event, payload);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`Failed to emit "${event}" (${summarizePayload(payload)})`);
    if (err.stack) {
      console.error(err.stack);
    } else {
      console.error(err);
    }
    throw error;
  }
}

function emitSimulationStatus(): void {
  const step = simulationMode === 'multi'
    ? daoCity?.getCurrentStep() ?? 0
    : simulation?.currentStep ?? 0;

  emitSafe('simulation_status', {
    running,
    step,
    mode: simulationMode,
    daoCount: simulationMode === 'multi' ? daoCity?.getAllDAOs().length ?? 0 : 1,
  });
}

interface PersistenceResult {
  success: boolean;
  error?: string;
}

async function persistSimulation(id: string, instance: DAOSimulation): Promise<PersistenceResult> {
  if (!simulationStore || !instance) {
    return { success: false, error: 'No store or instance provided' };
  }
  try {
    await simulationStore.save(id, instance);
    return { success: true };
  } catch (error: any) {
    const errorMessage = error?.message ?? String(error);
    console.error('Failed to persist simulation:', errorMessage);
    // Emit persistence error to connected clients for visibility
    emitSafe('persistence_error', {
      simulationId: id,
      error: errorMessage,
      timestamp: Date.now()
    });
    return { success: false, error: errorMessage };
  }
}

async function createSimulation(config: SimulationConfig = {}) {
  console.log('Creating new simulation...');

  // Create a diverse simulation with all agent types represented
  const defaultConfig: SimulationConfig = {
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

  const shockListener = (data: MarketShockEventData) => {
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

  const cityStepListener = (data: CityStepEventData) => {
    io.emit('city_step', {
      step: data.step,
      daos: data.daos,
      mode: 'multi',
    });
  };
  cityEventBus.subscribe('city_step', cityStepListener);

  const proposalCreatedListener = (data: ProposalCreatedEventData) => {
    io.emit('inter_dao_proposal_created', data);
  };
  cityEventBus.subscribe('inter_dao_proposal_created', proposalCreatedListener);

  const transferCompletedListener = (data: TransferCompletedEventData) => {
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
  const city = daoCity;
  if (!city) return;

  try {
    await city.step();

    const state = city.getState();
    const rankings = city.getTokenRankings();
    const networkData = city.getNetworkData();

    // Broadcast city state
    emitSafe('city_step', {
      step: state.currentStep,
      daos: state.daos,
      mode: 'multi',
    });

    // Broadcast token rankings
    emitSafe('token_rankings', {
      rankings,
      totalMarketCap: state.globalMarketplace.totalMarketCap,
      totalVolume: state.globalMarketplace.totalVolume24h,
    });

    // Broadcast inter-DAO proposals
    emitSafe('inter_dao_proposals', {
      proposals: state.interDaoProposals,
      activeCount: state.interDaoProposals.filter(p => p.status === 'open').length,
    });

    // Broadcast network visualization data
    emitSafe('city_network_update', networkData);

    // Broadcast per-DAO updates
    for (const dao of city.getAllDAOs()) {
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

      emitSafe(`dao_${dao.daoId}_update`, {
        daoId: dao.daoId,
        state: state.daos.find(d => d.id === dao.daoId),
        members,
        proposals,
        projects: dao.projects.map(serializeProject),
        guilds: dao.guilds.map(g => ({
          name: g.name,
          members: normalizeMemberIds(g.members),
        })),
      });
    }

    // Broadcast bridge activity
    emitSafe('bridge_activity', {
      bridges: state.bridges,
      recentTransfers: state.recentTransfers,
    });

  } catch (error: any) {
    console.error('Error in city step:', error);
    if (error?.stack) {
      console.error(error.stack);
    }
    stopSimulation();
  }
}

async function broadcastSimulationStep() {
  const sim = simulation;
  if (!sim) return;

  try {
    await sim.step();
    void persistSimulation(SOCKET_SIM_ID, sim);

    const summary = sim.getSummary();
    const tokenPrice = sim.dao.treasury.getTokenPrice('DAO_TOKEN');

    // Broadcast simulation step data
    emitSafe('simulation_step', {
      step: sim.currentStep,
      dao_token_price: tokenPrice,
      treasury_balance: sim.dao.treasury.funds,
      total_members: sim.dao.members.length,
      active_proposals: sim.dao.proposals.filter(p => p.status === 'open').length,
      ...summary
    });

    // Broadcast members data
    const members = sim.dao.members.map((m, idx) => {
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
    emitSafe('members_update', { members });

    // Broadcast proposals data
    const proposals = sim.dao.proposals.map((p, idx) => ({
      id: p.uniqueId,
      title: (p as any).title || `Proposal ${p.uniqueId}`,
      type: p.type,
      status: p.status,
      votes_for: p.votesFor || 0,
      votes_against: p.votesAgainst || 0,
      creator: p.creator || `member_${idx}`
    }));
    emitSafe('proposals_update', { proposals });

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
    sim.dao.members.forEach(m => {
      const type = m.constructor.name;
      if (!membersByType.has(type)) {
        membersByType.set(type, []);
      }
      membersByType.get(type)!.push(m.uniqueId);
    });

    const clusterNodes: ClusterNode[] = [];
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
    const networkEdges: NetworkEdge[] = [];

    // Representative edges (member -> representative)
    sim.dao.members.forEach(m => {
      if ((m as any).representative) {
        networkEdges.push({
          source: m.uniqueId,
          target: normalizeMemberId((m as any).representative),
          type: 'representative',
          weight: 1
        });
      }
    });

    // Delegation edges (member -> delegatee)
    sim.dao.members.forEach(m => {
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
    emitSafe('network_update', networkData);

    // Broadcast leaderboards
    const tokenLeaderboard = [...sim.dao.members]
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 10)
      .map(m => ({
        member: m.uniqueId,
        value: m.tokens
      }));

    const influenceLeaderboard = [...sim.dao.members]
      .sort((a, b) => ((b as any).reputation || 0) - ((a as any).reputation || 0))
      .slice(0, 10)
      .map(m => ({
        member: m.uniqueId,
        value: (m as any).reputation || 0
      }));

    emitSafe('leaderboard_update', {
      token: tokenLeaderboard,
      influence: influenceLeaderboard
    });

    // Broadcast projects data
    const projects = sim.dao.projects.map(serializeProject);
    emitSafe('projects_update', { projects });

    // Broadcast guilds data
    const guilds = sim.dao.guilds.map(g => {
      const reputationMap = (g as any).reputation;
      const reputationTotal = reputationMap instanceof Map
        ? Array.from(reputationMap.values()).reduce((sum, value) => sum + (Number(value) || 0), 0)
        : (typeof reputationMap === 'number' ? reputationMap : 0);
      const treasuryBalance = (g as any).treasury?.funds ?? 0;

      return {
        name: g.name,
        members: normalizeMemberIds(g.members),
        treasury: treasuryBalance,
        reputation: reputationTotal,
        creator: normalizeMemberId((g as any).creator) || null
      };
    });
    emitSafe('guilds_update', { guilds });

    // Broadcast disputes data
    const disputesList = sim.dao.disputes;
    const disputes = disputesList.map((d, idx) => ({
      id: (d as any).uniqueId || (d as any).id || `dispute_${idx}`,
      parties: normalizeMemberIds((d as any).parties),
      description: (d as any).description || '',
      importance: (d as any).importance || 0,
      resolved: (d as any).resolved || false,
      relatedProject: normalizeProjectId((d as any).relatedProject)
    }));
    emitSafe('disputes_update', { disputes });

    // Broadcast violations data
    const violationsList = sim.dao.violations;
    const violations = violationsList.map((v, idx) => ({
      id: (v as any).uniqueId || (v as any).id || `violation_${idx}`,
      violator: normalizeMemberId((v as any).violator),
      description: (v as any).description || '',
      penalty: (v as any).penalty || 0,
      detected: (v as any).detected || false
    }));
    emitSafe('violations_update', { violations });

    // Broadcast data collector stats (gini, metrics, event counts)
    const latestStats = sim.dataCollector.getLatestStats();
    const eventCounts: Record<string, number> = {};
    sim.dataCollector.eventCounts.forEach((count, event) => {
      eventCounts[event] = count;
    });

    emitSafe('metrics_update', {
      gini: latestStats?.gini || 0,
      reputationGini: latestStats?.repGini || 0,
      avgTokens: latestStats?.avgTokens || 0,
      numProjects: latestStats?.numProjects || sim.dao.projects.length,
      numMembers: latestStats?.numMembers || sim.dao.members.length,
      eventCounts
    });

  } catch (error: any) {
    console.error('Error in simulation step:', error);
    if (error?.stack) {
      console.error(error.stack);
    }
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
  intervalId = setInterval(() => {
    if (!running || stepInProgress) return;
    stepInProgress = true;
    Promise.resolve(stepFn())
      .catch((error) => {
        console.error('Simulation step failed:', error);
        stopSimulation();
      })
      .finally(() => {
        stepInProgress = false;
      });
  }, interval);
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
  stepInProgress = false;
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

/**
 * Safe handler wrapper that catches errors and emits them to the client
 */
function safeHandler<T extends (...args: any[]) => any>(
  socket: Socket,
  eventName: string,
  handler: T
): (...args: Parameters<T>) => void {
  return async (...args: Parameters<T>) => {
    try {
      await handler(...args);
    } catch (error: any) {
      const errorMessage = error?.message ?? String(error);
      console.error(`Error in ${eventName} handler:`, errorMessage);
      if (error?.stack) {
        console.error(error.stack);
      }
      // Emit error to the specific client
      socket.emit('error', {
        event: eventName,
        error: errorMessage,
        timestamp: Date.now()
      });
    }
  };
}

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.emit('simulation_status', {
    running,
    step: simulation?.currentStep ?? 0,
  });

  socket.on('start_simulation', safeHandler(socket, 'start_simulation', async (config: StartSimulationConfig = {}) => {
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
  }));

  socket.on('start_city_simulation', safeHandler(socket, 'start_city_simulation', async (config: StartCitySimulationConfig = {}) => {
    console.log('Received start_city_simulation command');
    if (!daoCity) {
      await createDAOCity(config.cityConfig);
    }
    startSimulation(config.stepsPerSecond || 2, 'multi');
    io.emit('simulation_started', { success: true, mode: 'multi' });
  }));

  socket.on('stop_simulation', safeHandler(socket, 'stop_simulation', () => {
    console.log('Received stop_simulation command');
    stopSimulation();
    io.emit('simulation_stopped', { success: true });
  }));

  socket.on('reset_simulation', safeHandler(socket, 'reset_simulation', () => {
    console.log('Received reset_simulation command');
    resetSimulation();
    io.emit('simulation_reset', { success: true });
  }));

  socket.on('step_simulation', safeHandler(socket, 'step_simulation', async (config: StepConfig = {}) => {
    if (stepInProgress) {
      console.warn('Step request ignored: step already in progress.');
      return;
    }
    stepInProgress = true;
    const mode = config.mode || simulationMode;

    try {
      if (mode === 'multi') {
        if (!daoCity) {
          await createDAOCity();
        }
        simulationMode = 'multi';
        await broadcastCityStep();
      } else {
        if (!simulation) {
          await createSimulation();
        }
        simulationMode = 'single';
        await broadcastSimulationStep();
      }
    } finally {
      stepInProgress = false;
    }
  }));

  socket.on('get_token_rankings', safeHandler(socket, 'get_token_rankings', () => {
    if (daoCity) {
      const rankings = daoCity.getTokenRankings();
      const state = daoCity.getState();
      socket.emit('token_rankings', {
        rankings,
        totalMarketCap: state.globalMarketplace.totalMarketCap,
        totalVolume: state.globalMarketplace.totalVolume24h,
      });
    }
  }));

  socket.on('get_city_state', safeHandler(socket, 'get_city_state', () => {
    if (daoCity) {
      socket.emit('city_state', daoCity.getState());
    }
  }));

  // ===========================================================================
  // DIGITAL TWIN EVENTS
  // ===========================================================================

  socket.on('get_available_twins', safeHandler(socket, 'get_available_twins', async () => {
    if (daoCity) {
      const twins = await daoCity.getAvailableDigitalTwins();
      socket.emit('available_twins', { twins });
    } else {
      socket.emit('available_twins', { twins: [] });
    }
  }));

  socket.on('load_digital_twins', safeHandler(socket, 'load_digital_twins', async (twinIds: string[]) => {
    if (!daoCity) {
      socket.emit('twins_load_result', {
        success: false,
        error: 'No city simulation running',
        loaded: [],
        failed: twinIds,
      });
      return;
    }

    const result = await daoCity.loadDigitalTwins(twinIds);
    socket.emit('twins_load_result', {
      success: result.failed.length === 0,
      loaded: result.loaded,
      failed: result.failed,
      errors: result.errors,
    });

    // Broadcast updated city state to all clients
    io.emit('city_state', daoCity.getState());
  }));

  socket.on('get_loaded_twins', safeHandler(socket, 'get_loaded_twins', () => {
    if (daoCity) {
      const twins = daoCity.getLoadedDigitalTwins();
      const twinList = Array.from(twins.values()).map(t => ({
        id: t.id,
        name: t.name,
        tokenSymbol: t.tokenSymbol,
        isBicameral: t.isBicameral,
        hasDualGovernance: t.hasDualGovernance,
      }));
      socket.emit('loaded_twins', { twins: twinList });
    } else {
      socket.emit('loaded_twins', { twins: [] });
    }
  }));

  // ===========================================================================
  // PLAYER CONTROL EVENTS
  // ===========================================================================

  socket.on('take_control', safeHandler(socket, 'take_control', (daoId: string) => {
    if (!daoCity) {
      socket.emit('control_result', { success: false, error: 'No city simulation running' });
      return;
    }

    const success = daoCity.takeControl(daoId);
    socket.emit('control_result', {
      success,
      daoId: success ? daoId : null,
      error: success ? null : 'Failed to take control of DAO',
    });

    if (success) {
      io.emit('player_control_changed', { daoId, active: true });
    }
  }));

  socket.on('release_control', safeHandler(socket, 'release_control', () => {
    if (!daoCity) {
      socket.emit('control_result', { success: false, error: 'No city simulation running' });
      return;
    }

    const previousDaoId = daoCity.getPlayerControlledDaoId();
    daoCity.releaseControl();
    socket.emit('control_result', { success: true, daoId: null });

    if (previousDaoId) {
      io.emit('player_control_changed', { daoId: previousDaoId, active: false });
    }
  }));

  socket.on('get_control_state', safeHandler(socket, 'get_control_state', () => {
    if (daoCity) {
      socket.emit('control_state', {
        controlledDaoId: daoCity.getPlayerControlledDaoId(),
        isControlling: daoCity.getPlayerControlledDaoId() !== null,
      });
    } else {
      socket.emit('control_state', { controlledDaoId: null, isControlling: false });
    }
  }));

  socket.on('player_action', safeHandler(socket, 'player_action', (action: {
    type: string;
    params: Record<string, unknown>;
  }) => {
    if (!daoCity) {
      socket.emit('action_result', { success: false, error: 'No city simulation running' });
      return;
    }

    const controlledDaoId = daoCity.getPlayerControlledDaoId();
    if (!controlledDaoId) {
      socket.emit('action_result', { success: false, error: 'Not controlling any DAO' });
      return;
    }

    // For now, emit a simple acknowledgment
    // Full player controller integration can be added later
    socket.emit('action_result', {
      success: true,
      action: action.type,
      daoId: controlledDaoId,
      message: `Action ${action.type} queued`,
    });

    io.emit('player_action_executed', {
      daoId: controlledDaoId,
      action: action.type,
      params: action.params,
    });
  }));

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
