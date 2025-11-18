import { rehydrateSimulation, InMemorySimulationStore } from '@/lib/utils/redis-store';
import { DAOSimulation } from '@/lib/engine/simulation';

describe('rehydrateSimulation', () => {
  it('restores step and basic treasury state from a snapshot', async () => {
    const store = new InMemorySimulationStore();
    const sim = new DAOSimulation({ num_developers: 1, num_investors: 1 });
    sim.step();
    sim.dao.treasury.deposit('DAO_TOKEN', 100, sim.currentStep);

    await store.save('rehydrate_test', sim);
    const snapshot = await store.load('rehydrate_test');
    const snapshotFunds = snapshot?.daoState?.treasuryFunds;

    const restored = rehydrateSimulation(snapshot);
    expect(restored.currentStep).toBe(sim.currentStep);
    expect(restored.dao.treasury.getTokenBalance('DAO_TOKEN')).toBe(snapshotFunds);
  });
});
