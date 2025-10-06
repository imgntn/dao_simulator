// API Route for simulation data export
// Provides CSV and JSON data export with real-time streaming

import { NextRequest, NextResponse } from 'next/server';
import { createSimulationStore, InMemorySimulationStore } from '@/lib/utils/redis-store';

const simulationStore = createSimulationStore();
const isInMemory = simulationStore instanceof InMemorySimulationStore;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  const format = searchParams.get('format') || 'json';

  if (!id) {
    return NextResponse.json(
      { error: 'Simulation ID required' },
      { status: 400 }
    );
  }

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
function generateCSV(simulation: any, dataCollector: any): string {
  const headers = ['step', 'members', 'proposals', 'projects', 'tokenPrice', 'treasuryFunds'];
  const rows = [headers.join(',')];

  if (dataCollector?.history) {
    for (const snapshot of dataCollector.history) {
      const row = [
        snapshot.step || 0,
        snapshot.memberCount || 0,
        snapshot.proposalCount || 0,
        snapshot.projectCount || 0,
        snapshot.tokenPrice?.toFixed(4) || '0',
        snapshot.treasuryFunds?.toFixed(2) || '0',
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

/**
 * Generate JSON export from simulation data
 */
function generateJSON(simulation: any, dataCollector: any): any {
  if (dataCollector?.history) {
    return {
      id: simulation.id || 'unknown',
      currentStep: simulation.currentStep || 0,
      history: dataCollector.history,
      summary: dataCollector.getLatestStats(),
    };
  }

  return {
    id: simulation.id || 'unknown',
    currentStep: simulation.step || 0,
    daoState: simulation.daoState,
    config: simulation.config,
  };
}
