import { InMemorySimulationStore } from '@/lib/utils/redis-store';
import { DAOSimulation } from '@/lib/engine/simulation';

describe('InMemorySimulationStore', () => {
  it('saves and retrieves simulations with metadata', async () => {
    const store = new InMemorySimulationStore();
    const fakeSimulation = new DAOSimulation({
      num_developers: 1,
      num_investors: 1,
      num_passive_members: 1,
      eventLogging: false,
      marketShockFrequency: 0,
    }) as any;
    fakeSimulation.currentStep = 12;

    await store.save('sim_test', fakeSimulation);
    const list = await store.list();
    expect(list[0]).toMatchObject({ id: 'sim_test', step: 12 });
    expect(list[0].members).toBeGreaterThan(0);

    const loaded = await store.load('sim_test');
    expect(loaded?.simulation).toBe(fakeSimulation);

    const deleted = await store.delete('sim_test');
    expect(deleted).toBe(true);
  });
});
