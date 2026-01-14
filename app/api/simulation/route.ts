// Next.js API Route for DAO Simulation
// Provides REST endpoints for simulation control

import { NextRequest, NextResponse } from 'next/server';
import { DAOSimulation } from '@/lib/engine/simulation';
import { createSimulationStore, InMemorySimulationStore, rehydrateSimulation } from '@/lib/utils/redis-store';
import { requireAuth } from '@/lib/auth';
import {
  CreateSimulationRequestSchema,
  StepSimulationRequestSchema,
  validateRequest,
  validateId,
} from '@/lib/validation/schemas';

// Create simulation store (Redis in production, in-memory for dev)
const simulationStore = createSimulationStore();
const isInMemoryStore = simulationStore instanceof InMemorySimulationStore;
const simulations = isInMemoryStore
  ? simulationStore
  : (typeof (simulationStore as InMemorySimulationStore).getSimulation === 'function'
    ? (simulationStore as InMemorySimulationStore)
    : null);

// Keep live simulation instances in-process so stepping works even when Redis is enabled
// Each entry has a lastAccessed timestamp for TTL-based cleanup
interface LiveSimEntry {
  simulation: DAOSimulation;
  lastAccessed: number;
}

const liveSimulations = new Map<string, LiveSimEntry>();

// TTL for simulation instances (30 minutes)
const SIMULATION_TTL_MS = 30 * 60 * 1000;
// Cleanup interval (5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
// Maximum concurrent simulations
const MAX_SIMULATIONS = 100;

// Simple lock mechanism to prevent race conditions on simulation access
const simulationLocks = new Set<string>();

async function withSimulationLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
  // Wait for any existing operation on this simulation to complete
  const maxWait = 5000; // 5 second timeout
  const start = Date.now();

  while (simulationLocks.has(id)) {
    if (Date.now() - start > maxWait) {
      throw new Error('Timeout waiting for simulation lock');
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  simulationLocks.add(id);
  try {
    return await fn();
  } finally {
    simulationLocks.delete(id);
  }
}

// Cleanup stale simulations periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [id, entry] of liveSimulations.entries()) {
      if (now - entry.lastAccessed > SIMULATION_TTL_MS) {
        liveSimulations.delete(id);
      }
    }
  }, CLEANUP_INTERVAL_MS);
}

const getLiveSimulation = (id: string): DAOSimulation | null => {
  const entry = liveSimulations.get(id);
  if (entry) {
    entry.lastAccessed = Date.now();
    return entry.simulation;
  }
  return simulations ? simulations.getSimulation(id) : null;
};

const trackSimulation = (id: string, simulation: DAOSimulation) => {
  // Enforce max simulations limit - remove oldest if at capacity
  if (liveSimulations.size >= MAX_SIMULATIONS && !liveSimulations.has(id)) {
    let oldestId: string | null = null;
    let oldestTime = Infinity;
    for (const [entryId, entry] of liveSimulations.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestId = entryId;
      }
    }
    if (oldestId) {
      liveSimulations.delete(oldestId);
    }
  }

  liveSimulations.set(id, {
    simulation,
    lastAccessed: Date.now(),
  });
};

/**
 * GET /api/simulation
 * List all active simulations or get a specific simulation state
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (id) {
    const liveSimulation = getLiveSimulation(id);
    if (liveSimulation) {
      return NextResponse.json({
        id,
        summary: liveSimulation.getSummary(),
        step: liveSimulation.currentStep,
      });
    }

    const data = await simulationStore.load(id);
    if (!data) {
      return NextResponse.json(
        { error: 'Simulation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id,
      step: data.step,
      summary: data.daoState ?? ((data.simulation as DAOSimulation | undefined)?.getSummary?.() ?? null),
    });
  }

  // List all simulations
  const list = await simulationStore.list();
  return NextResponse.json({ simulations: list });
}

/**
 * POST /api/simulation
 * Create a new simulation
 */
export async function POST(request: NextRequest) {
  // Check authentication
  const authError = await requireAuth(request);
  if (authError) return authError;

  // Validate request body
  const validation = await validateRequest(request, CreateSimulationRequestSchema);
  if (!validation.success) {
    return validation.response;
  }

  try {
    const config = validation.data;
    const id = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const simulation = new DAOSimulation(config);

    // Save to store
    trackSimulation(id, simulation);
    await simulationStore.save(id, simulation);

    return NextResponse.json({
      id,
      message: 'Simulation created successfully',
      summary: simulation.getSummary(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create simulation';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}

/**
 * PUT /api/simulation
 * Step simulation forward or run multiple steps
 */
export async function PUT(request: NextRequest) {
  // Check authentication
  const authError = await requireAuth(request);
  if (authError) return authError;

  // Validate request body
  const validation = await validateRequest(request, StepSimulationRequestSchema);
  if (!validation.success) {
    return validation.response;
  }

  const { id, action, steps } = validation.data;

  try {
    // Use lock to prevent race conditions with concurrent requests
    return await withSimulationLock(id, async () => {
      let simulation = getLiveSimulation(id);
      if (!simulation && !isInMemoryStore) {
        const snapshot = await simulationStore.load(id);
        if (snapshot) {
          simulation = rehydrateSimulation(snapshot);
          trackSimulation(id, simulation);
        }
      }

      if (!simulation) {
        return NextResponse.json(
          { error: 'Simulation not found or not active in this process' },
          { status: 404 }
        );
      }

      switch (action) {
        case 'step':
          await simulation.step();
          break;

        case 'run': {
          const numSteps = steps || 10;
          await simulation.run(numSteps);
          break;
        }
      }

      // Update stored state
      trackSimulation(id, simulation);
      await simulationStore.save(id, simulation);

      return NextResponse.json({
        id,
        summary: simulation.getSummary(),
      });
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to step simulation';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/simulation
 * Delete a simulation
 */
export async function DELETE(request: NextRequest) {
  // Check authentication
  const authError = await requireAuth(request);
  if (authError) return authError;

  const searchParams = request.nextUrl.searchParams;
  const idValidation = validateId(searchParams.get('id'));
  if (!idValidation.success) {
    return idValidation.response;
  }
  const id = idValidation.data;

  const deleted = await simulationStore.delete(id);
  liveSimulations.delete(id);

  if (!deleted) {
    return NextResponse.json(
      { error: 'Simulation not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: 'Simulation deleted successfully' });
}
