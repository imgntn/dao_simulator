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

/**
 * GET /api/simulation
 * List all active simulations or get a specific simulation state
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (id) {
    if (isInMemory && simulations) {
      const simulation = simulations.getSimulation(id);
      if (!simulation) {
        return NextResponse.json(
          { error: 'Simulation not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        id,
        summary: simulation.getSummary(),
        step: simulation.currentStep,
      });
    } else {
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
        summary: data.daoState,
      });
    }
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

    if (!isInMemory || !simulations) {
      return NextResponse.json(
        { error: 'Simulation stepping only supported in-memory mode' },
        { status: 400 }
      );
    }

    const simulation = simulations.getSimulation(id);
    if (!simulation) {
      return NextResponse.json(
        { error: 'Simulation not found' },
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

  if (!deleted) {
    return NextResponse.json(
      { error: 'Simulation not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: 'Simulation deleted successfully' });
}
