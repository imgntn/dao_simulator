// API Route for simulation data export
// Provides CSV and JSON data export with real-time streaming

import { NextRequest, NextResponse } from 'next/server';
import { createSimulationStore, InMemorySimulationStore } from '@/lib/utils/redis-store';
import { requireAuth } from '@/lib/auth';
import { validateId, FormatSchema } from '@/lib/validation/schemas';

const simulationStore = createSimulationStore();
const isInMemory = simulationStore instanceof InMemorySimulationStore;

// Type definitions for export data
interface HistorySnapshot {
  step: number;
  memberCount: number;
  proposalCount: number;
  projectCount: number;
  tokenPrice: number;
  treasuryFunds: number;
}

interface DataCollectorLike {
  history?: HistorySnapshot[];
  modelVars?: Array<{
    step?: number;
    numMembers?: number;
    numProposals?: number;
    numProjects?: number;
    price?: number;
  }>;
  getLatestStats?: () => Record<string, unknown>;
}

interface SimulationLike {
  id?: string;
  currentStep?: number;
  step?: number;
  dao?: {
    treasury?: {
      funds?: number;
    };
  };
  daoState?: {
    members?: unknown[];
    proposals?: number;
    projects?: number;
    tokenPrice?: number;
    treasuryFunds?: number;
  };
  config?: Record<string, unknown>;
  dataCollector?: DataCollectorLike;
}

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const searchParams = request.nextUrl.searchParams;

  // Validate ID
  const idValidation = validateId(searchParams.get('id'));
  if (!idValidation.success) {
    return idValidation.response;
  }
  const id = idValidation.data;

  // Validate format
  const formatParam = searchParams.get('format') || 'json';
  const formatResult = FormatSchema.safeParse(formatParam);
  if (!formatResult.success) {
    return NextResponse.json(
      { error: 'Invalid format. Must be "csv" or "json"' },
      { status: 400 }
    );
  }
  const format = formatResult.data;

  // Get simulation data
  let simulationData = null;
  let dataCollector = null;

  if (isInMemory) {
    const sim = (simulationStore as InMemorySimulationStore).getSimulation(id);
    if (sim) {
      simulationData = sim;
      dataCollector = sim.dataCollector;
    }
  } else {
    const data = await simulationStore.load(id);
    if (data) {
      simulationData = data;
    }
  }

  if (!simulationData) {
    return NextResponse.json(
      { error: 'Simulation not found' },
      { status: 404 }
    );
  }

  // Export based on format
  if (format === 'csv') {
    const csv = generateCSV(simulationData, dataCollector);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="simulation_${id}.csv"`,
      },
    });
  }

  // Return JSON data
  const jsonData = generateJSON(simulationData, dataCollector);
  return NextResponse.json(jsonData);
}

/**
 * Generate CSV export from simulation data
 */
function generateCSV(simulation: SimulationLike, dataCollector: DataCollectorLike | null): string {
  const headers = ['step', 'members', 'proposals', 'projects', 'tokenPrice', 'treasuryFunds'];
  const rows = [headers.join(',')];

  const snapshots: HistorySnapshot[] =
    dataCollector?.history?.length
      ? dataCollector.history
      : Array.isArray(dataCollector?.modelVars)
        ? dataCollector.modelVars.map((vars) => ({
            step: vars.step ?? 0,
            memberCount: vars.numMembers ?? 0,
            proposalCount: vars.numProposals ?? 0,
            projectCount: vars.numProjects ?? 0,
            tokenPrice: vars.price ?? 0,
            treasuryFunds: simulation.dao?.treasury?.funds ?? 0,
          }))
        : [];

  if (snapshots.length > 0) {
    for (const snapshot of snapshots) {
      const row = [
        snapshot.step ?? 0,
        snapshot.memberCount ?? 0,
        snapshot.proposalCount ?? 0,
        snapshot.projectCount ?? 0,
        (snapshot.tokenPrice ?? 0).toFixed(4),
        (snapshot.treasuryFunds ?? 0).toFixed(2),
      ];
      rows.push(row.join(','));
    }
  } else {
    // Fallback for stored data
    const row = [
      simulation.step || 0,
      simulation.daoState?.members?.length || 0,
      simulation.daoState?.proposals || 0,
      simulation.daoState?.projects || 0,
      simulation.daoState?.tokenPrice?.toFixed(4) || '0',
      simulation.daoState?.treasuryFunds?.toFixed(2) || '0',
    ];
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

interface ExportData {
  id: string;
  currentStep: number;
  history: HistorySnapshot[];
  summary?: Record<string, unknown>;
  daoState?: SimulationLike['daoState'];
  config?: Record<string, unknown>;
}

/**
 * Generate JSON export from simulation data
 */
function generateJSON(simulation: SimulationLike, dataCollector: DataCollectorLike | null): ExportData {
  const derivedHistory: HistorySnapshot[] =
    dataCollector?.history?.length
      ? dataCollector.history
      : Array.isArray(dataCollector?.modelVars)
        ? dataCollector.modelVars.map((vars) => ({
            step: vars.step ?? 0,
            memberCount: vars.numMembers ?? 0,
            proposalCount: vars.numProposals ?? 0,
            projectCount: vars.numProjects ?? 0,
            tokenPrice: vars.price ?? 0,
            treasuryFunds: simulation.dao?.treasury?.funds ?? 0,
          }))
        : [];

  if (derivedHistory.length > 0) {
    return {
      id: simulation.id || 'unknown',
      currentStep: simulation.currentStep || 0,
      history: derivedHistory,
      summary: dataCollector?.getLatestStats?.(),
    };
  } else {
    return {
      id: simulation.id || 'unknown',
      currentStep: simulation.step || 0,
      daoState: simulation.daoState,
      config: simulation.config,
      history: [],
    };
  }
}
