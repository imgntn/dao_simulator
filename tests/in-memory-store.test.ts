import { InMemorySimulationStore, parseSimulationSnapshot } from '@/lib/utils/redis-store';
import { DAOSimulation } from '@/lib/engine/simulation';

describe('InMemorySimulationStore', () => {
  it('saves and retrieves simulations with metadata', async () => {
    const store = new InMemorySimulationStore();
    const fakeSimulation = new DAOSimulation({
      num_developers: 1,
      num_investors: 1,
      num_passive_members: 1,
      eventLogging: false,
      market_shock_frequency: 0,
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

describe('parseSimulationSnapshot', () => {
  const validSnapshot = {
    id: 'sim_123',
    step: 4,
    config: {
      numDevelopers: 1,
      numInvestors: 1,
      numTraders: 1,
      governanceRule: 'majority',
      tokenEmissionRate: 0.01,
      tokenBurnRate: 0.001,
      stakingInterestRate: 0.02,
      marketShockFrequency: 0,
      seed: 123,
    },
    daoState: {
      name: 'Test DAO',
      members: [{ uniqueId: 'member_1', tokens: 10, reputation: 5 }],
      proposals: 1,
      projects: 2,
      treasuryFunds: 1000,
      tokenPrice: 1.25,
    },
    timestamp: 123456,
  };

  it('accepts valid persisted snapshots', () => {
    expect(parseSimulationSnapshot(validSnapshot)).toEqual(validSnapshot);
  });

  it('rejects malformed persisted snapshots', () => {
    expect(parseSimulationSnapshot({ ...validSnapshot, step: -1 })).toBeNull();
    expect(parseSimulationSnapshot({ ...validSnapshot, config: { governanceRule: 'majority' } })).toBeNull();
    expect(parseSimulationSnapshot({
      ...validSnapshot,
      daoState: {
        ...validSnapshot.daoState,
        members: [{ uniqueId: 'member_1', tokens: '10', reputation: 5 }],
      },
    })).toBeNull();
  });
});
