// Next.js API Route for DAO Simulation
// Provides REST endpoints for simulation control

import { NextRequest, NextResponse } from 'next/server';
import { DAOSimulation } from '@/lib/engine/simulation';
import { createSimulationStore, InMemorySimulationStore } from '@/lib/utils/redis-store';
import { requireAuth } from '@/lib/auth';

// Create simulation store (Redis in production, in-memory for dev)
const simulationStore = createSimulationStore();

// Legacy in-memory fallback
const isInMemory = simulationStore instanceof InMemorySimulationStore;
const simulations = isInMemory ? (simulationStore as InMemorySimulationStore) : null;

// Keep live simulation instances in-process so stepping works even when Redis is enabled
const liveSimulations = new Map<string, DAOSimulation>();

const getLiveSimulation = (id: string): DAOSimulation | null => {
  return liveSimulations.get(id) || (isInMemory && simulations ? simulations.getSimulation(id) : null);
};

const trackSimulation = (id: string, simulation: DAOSimulation) => {
  liveSimulations.set(id, simulation);
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
      summary: data.daoState ?? data.simulation?.getSummary?.() ?? null,
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

  try {
    const config = await request.json();
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
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create simulation' },
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

  try {
    const { id, action, steps } = await request.json();

    const simulation = getLiveSimulation(id);
    if (!simulation) {
      return NextResponse.json(
        { error: 'Simulation not found or not active in this process' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'step':
        simulation.step();
        break;

      case 'run':
        const numSteps = steps || 10;
        simulation.run(numSteps);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Update stored state
    trackSimulation(id, simulation);
    await simulationStore.save(id, simulation);

    return NextResponse.json({
      id,
      summary: simulation.getSummary(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to step simulation' },
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
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Simulation ID required' },
      { status: 400 }
    );
  }

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
