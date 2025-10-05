// Next.js API Route for DAO Simulation
// Provides REST endpoints for simulation control

import { NextRequest, NextResponse } from 'next/server';
import { DAOSimulation } from '@/lib/engine/simulation';

// Store active simulations in memory (use Redis/DB in production)
const simulations = new Map<string, DAOSimulation>();

/**
 * GET /api/simulation
 * List all active simulations or get a specific simulation state
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (id) {
    const simulation = simulations.get(id);
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
  }

  // List all simulations
  const list = Array.from(simulations.entries()).map(([id, sim]) => ({
    id,
    step: sim.currentStep,
    members: sim.dao.members.length,
  }));

  return NextResponse.json({ simulations: list });
}

/**
 * POST /api/simulation
 * Create a new simulation
 */
export async function POST(request: NextRequest) {
  try {
    const config = await request.json();
    const id = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const simulation = new DAOSimulation(config);
    simulations.set(id, simulation);

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
  try {
    const { id, action, steps } = await request.json();

    const simulation = simulations.get(id);
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
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Simulation ID required' },
      { status: 400 }
    );
  }

  const deleted = simulations.delete(id);

  if (!deleted) {
    return NextResponse.json(
      { error: 'Simulation not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: 'Simulation deleted successfully' });
}
