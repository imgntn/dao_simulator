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
import { DAOSimulation } from './lib/engine/simulation';

const PORT = process.argv.includes('--port')
  ? parseInt(process.argv[process.argv.indexOf('--port') + 1])
  : 8003;

console.log('🚀 Starting DAO Simulation WebSocket Server...');

const io = new Server(PORT, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

let simulation: DAOSimulation | null = null;
let running = false;
let intervalId: NodeJS.Timeout | null = null;

function createSimulation(config: any = {}) {
  console.log('📊 Creating new simulation...');

  const defaultConfig = {
    num_developers: 10,
    num_investors: 5,
    num_proposal_creators: 5,
    num_validators: 5,
    num_passive_members: 10,
    comment_probability: 0.5,
    governance_rule: 'majority' as const,
    eventLogging: true,
  };

  simulation = new DAOSimulation({ ...defaultConfig, ...config });
  console.log(`✅ Simulation created with ${simulation.dao.members.length} members`);

  return simulation;
}

function broadcastSimulationStep() {
  if (!simulation) return;

  try {
    simulation.step();

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

      return {
        id: m.uniqueId,
        type: m.constructor.name,
        tokens: m.tokens,
        reputation: (m as any).reputation || Math.random() * 100,
        location: location
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
    const networkNodes = members.map((m, idx) => {
      const angle = (idx / members.length) * Math.PI * 2;
      const radius = 20;
      const height = (Math.random() - 0.5) * 10;

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

    // Create edges based on delegations and representatives
    const networkEdges: any[] = [];
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

    const networkData = {
      nodes: networkNodes,
      edges: networkEdges
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

  } catch (error: any) {
    console.error('❌ Error in simulation step:', error.message);
    stopSimulation();
  }
}

function startSimulation(stepsPerSecond: number = 1) {
  if (running) {
    console.log('⚠️  Simulation already running');
    return;
  }

  if (!simulation) {
    createSimulation();
  }

  console.log(`▶️  Starting simulation at ${stepsPerSecond} steps/second`);
  running = true;

  const interval = 1000 / stepsPerSecond;
  intervalId = setInterval(broadcastSimulationStep, interval);
}

function stopSimulation() {
  if (!running) {
    console.log('⚠️  Simulation not running');
    return;
  }

  console.log('⏸️  Stopping simulation');
  running = false;

  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function resetSimulation() {
  stopSimulation();
  simulation = null;
  console.log('🔄 Simulation reset');
}

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('start_simulation', (config: any = {}) => {
    console.log('📡 Received start_simulation command');
    if (!simulation) {
      createSimulation(config.simulationConfig);
    }
    startSimulation(config.stepsPerSecond || 1);
    socket.emit('simulation_started', { success: true });
  });

  socket.on('stop_simulation', () => {
    console.log('📡 Received stop_simulation command');
    stopSimulation();
    socket.emit('simulation_stopped', { success: true });
  });

  socket.on('reset_simulation', () => {
    console.log('📡 Received reset_simulation command');
    resetSimulation();
    socket.emit('simulation_reset', { success: true });
  });

  socket.on('step_simulation', () => {
    if (!simulation) {
      createSimulation();
    }
    broadcastSimulationStep();
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Auto-start simulation on server startup
createSimulation();
startSimulation(2); // 2 steps per second

console.log(`✅ WebSocket server running on port ${PORT}`);
console.log(`📊 Dashboard should connect to: http://localhost:${PORT}`);
console.log(`\n🎮 Commands available via Socket.IO:`);
console.log(`   - start_simulation`);
console.log(`   - stop_simulation`);
console.log(`   - reset_simulation`);
console.log(`   - step_simulation`);
