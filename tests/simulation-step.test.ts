import { DAOSimulation } from '@/lib/engine/simulation';

describe('DAOSimulation', () => {
  it('advances step and collects data', () => {
    const simulation = new DAOSimulation({
      num_developers: 1,
      num_investors: 1,
      num_passive_members: 1,
      eventLogging: false,
      marketShockFrequency: 0,
    });

    expect(simulation.currentStep).toBe(0);
    simulation.step();
    const summary = simulation.getSummary();

    expect(simulation.currentStep).toBe(1);
    expect(summary.step).toBe(1);
    expect(simulation.dataCollector.history.length).toBeGreaterThan(0);
  });
});
