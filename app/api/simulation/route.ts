// Next.js API Route for DAO Simulation
// Provides REST endpoints for simulation control

import { NextRequest, NextResponse } from 'next/server';
import { DAOSimulation } from '@/lib/engine/simulation';
import { createSimulationStore, InMemorySimulationStore, rehydrateSimulation } from '@/lib/utils/redis-store';
import { requireAuth } from '@/lib/auth';
import { InMemoryRateLimiter, getClientIdentifier } from '@/lib/utils/rate-limit';
import { noStoreHeadersFrom } from '@/lib/utils/http-safety';
import {
  CreateSimulationRequestSchema,
  StepSimulationRequestSchema,
  validateRequest,
  validateId,
} from '@/lib/validation/schemas';

// ============================================================================
// Rate Limiting for Simulation Creation
// ============================================================================

/**
 * Rate limiter specifically for simulation creation to prevent DOS attacks
 */
class SimulationRateLimiter {
  // Allow 10 simulations per client per hour in production, more in dev
  private readonly maxAttempts = process.env.NODE_ENV === 'production' ? 10 : 100;
  private readonly windowMs = 60 * 60 * 1000; // 1 hour
  private readonly limiter = new InMemoryRateLimiter(this.maxAttempts, this.windowMs);

  private getClientId(request: NextRequest): string {
    return getClientIdentifier(request, 'sim');
  }

  isRateLimited(request: NextRequest): { limited: boolean; retryAfter?: number } {
    const clientId = this.getClientId(request);
    const result = this.limiter.check(clientId);
    return { limited: result.limited, retryAfter: result.retryAfter };
  }

  recordAttempt(request: NextRequest): void {
    this.limiter.record(this.getClientId(request));
  }
}

// Global rate limiter instance for simulation creation
const simulationRateLimiter = new SimulationRateLimiter();

function jsonResponse(body: unknown, init: ResponseInit = {}): NextResponse {
  return NextResponse.json(body, {
    ...init,
    headers: noStoreHeadersFrom(init.headers),
  });
}

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
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [id, entry] of liveSimulations.entries()) {
      if (now - entry.lastAccessed > SIMULATION_TTL_MS) {
        liveSimulations.delete(id);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  if (typeof (timer as { unref?: () => void }).unref === 'function') {
    (timer as { unref: () => void }).unref();
  }
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
  const authError = await requireAuth(request);
  if (authError) return authError;

  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (id) {
    const liveSimulation = getLiveSimulation(id);
    if (liveSimulation) {
      return jsonResponse({
        id,
        summary: liveSimulation.getSummary(),
        step: liveSimulation.currentStep,
      });
    }

    let data;
    try {
      data = await simulationStore.load(id);
    } catch (error) {
      console.error('[simulation] failed to load simulation:', error);
      return jsonResponse(
        { error: 'Failed to load simulation' },
        { status: 500 }
      );
    }

    if (!data) {
      return jsonResponse(
        { error: 'Simulation not found' },
        { status: 404 }
      );
    }

    return jsonResponse({
      id,
      step: data.step,
      summary: data.daoState ?? ((data.simulation as DAOSimulation | undefined)?.getSummary?.() ?? null),
    });
  }

  // List all simulations
  try {
    const list = await simulationStore.list();
    return jsonResponse({ simulations: list });
  } catch (error) {
    console.error('[simulation] failed to list simulations:', error);
    return jsonResponse(
      { error: 'Failed to load simulations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/simulation
 * Create a new simulation
 */
export async function POST(request: NextRequest) {
  // Check authentication
  const authError = await requireAuth(request);
  if (authError) return authError;

  // Check rate limiting for simulation creation
  const rateLimitResult = simulationRateLimiter.isRateLimited(request);
  if (rateLimitResult.limited) {
    return jsonResponse(
      {
        error: 'Too many simulation creation requests. Please try again later.',
        retryAfter: rateLimitResult.retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 3600),
        },
      }
    );
  }

  // Validate request body
  const validation = await validateRequest(request, CreateSimulationRequestSchema);
  if (!validation.success) {
    return validation.response;
  }

  // Record this creation attempt for rate limiting
  simulationRateLimiter.recordAttempt(request);

  try {
    const config = validation.data;
    const id = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const simulation = new DAOSimulation(config);

    // Save to store
    trackSimulation(id, simulation);
    await simulationStore.save(id, simulation);

    return jsonResponse({
      id,
      message: 'Simulation created successfully',
      summary: simulation.getSummary(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create simulation';
    return jsonResponse(
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
        return jsonResponse(
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

      return jsonResponse({
        id,
        summary: simulation.getSummary(),
      });
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to step simulation';
    return jsonResponse(
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

  let deleted;
  try {
    deleted = await simulationStore.delete(id);
    liveSimulations.delete(id);
  } catch (error) {
    console.error('[simulation] failed to delete simulation:', error);
    return jsonResponse(
      { error: 'Failed to delete simulation' },
      { status: 500 }
    );
  }

  if (!deleted) {
    return jsonResponse(
      { error: 'Simulation not found' },
      { status: 404 }
    );
  }

  return jsonResponse({ message: 'Simulation deleted successfully' });
}
