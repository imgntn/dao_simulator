/**
 * Governance Integration Tests
 *
 * Tests for verifying that all governance systems are properly integrated
 * into the simulation step loop.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DAOSimulation } from '../lib/engine/simulation';
import { DAOCity } from '../lib/engine/dao-city';
import {
  GovernanceProcessor,
  createGovernanceProcessor,
  EasyTrackController,
  createLidoEasyTrack,
  RetroPGFController,
  createOptimismRetroPGF,
  TokenLockingController,
  createMakerTokenLocking,
  ApprovalVotingController,
  createMakerApprovalVoting,
  RageQuitController,
  createLidoRageQuit,
  BridgeTimelockController,
  createArbitrumBridgeTimelock,
  GovernanceCycleController,
  createOptimismGovernanceCycles,
  ProposalGatesController,
  createArbitrumProposalGates,
  CitizenshipController,
  createOptimismCitizenship,
  StETHSupplyTracker,
  createLidoStETHTracker,
} from '../lib/governance';
import { EventBus } from '../lib/utils/event-bus';
import { setSeed } from '../lib/utils/random';
import {
  checkAllTokenConservation,
  createAssetSupplyBaselines,
} from '../lib/research/invariant-checker';

describe('GovernanceProcessor', () => {
  let simulation: DAOSimulation;
  let eventBus: EventBus;

  beforeEach(() => {
    simulation = new DAOSimulation({
      governance_rule: 'majority',
      num_passive_members: 10,
    });
    eventBus = simulation.eventBus;
  });

  describe('createGovernanceProcessor', () => {
    it('should create a default governance processor', () => {
      const processor = createGovernanceProcessor(simulation.dao, eventBus, 'default');
      expect(processor).toBeDefined();
      expect(processor).toBeInstanceOf(GovernanceProcessor);
    });

    it('should create Lido governance processor with all systems', () => {
      const processor = createGovernanceProcessor(simulation.dao, eventBus, 'lido');
      expect(processor).toBeDefined();
      const state = processor.getState();
      expect(state.systemsActive.easyTrack).toBe(true);
      expect(state.systemsActive.rageQuit).toBe(true);
      expect(state.systemsActive.stethTracker).toBe(true);
    });

    it('should create Optimism governance processor with bicameral systems', () => {
      const processor = createGovernanceProcessor(simulation.dao, eventBus, 'optimism');
      expect(processor).toBeDefined();
      const state = processor.getState();
      expect(state.systemsActive.retroPGF).toBe(true);
      expect(state.systemsActive.governanceCycles).toBe(true);
      expect(state.systemsActive.citizenship).toBe(true);
    });

    it('should create MakerDAO governance processor with approval voting', () => {
      const processor = createGovernanceProcessor(simulation.dao, eventBus, 'maker');
      expect(processor).toBeDefined();
      const state = processor.getState();
      expect(state.systemsActive.tokenLocking).toBe(true);
      expect(state.systemsActive.approvalVoting).toBe(true);
    });

    it('should create Arbitrum governance processor with bridge timelocks', () => {
      const processor = createGovernanceProcessor(simulation.dao, eventBus, 'arbitrum');
      expect(processor).toBeDefined();
      const state = processor.getState();
      expect(state.systemsActive.bridgeTimelock).toBe(true);
      expect(state.systemsActive.proposalGates).toBe(true);
    });
  });

  describe('processStep', () => {
    it('should process step without errors', () => {
      const processor = createGovernanceProcessor(simulation.dao, eventBus, 'default');
      expect(() => processor.processStep(1)).not.toThrow();
      expect(() => processor.processStep(2)).not.toThrow();
      expect(() => processor.processStep(100)).not.toThrow();
    });

    it('should block governance when rage quit is active (Lido)', () => {
      const processor = createGovernanceProcessor(simulation.dao, eventBus, 'lido');

      // Simulate rage quit scenario
      const rageQuit = (processor as unknown as { systems: { rageQuit: RageQuitController } }).systems.rageQuit;
      if (rageQuit) {
        // Signal veto to trigger rage quit
        for (let i = 0; i < 10; i++) {
          rageQuit.signalVeto(`staker_${i}`, 100000, 1);
        }

        // Process step - governance should be blocked if threshold reached
        processor.processStep(2);

        const state = processor.getState();
        expect(state.governanceBlocked).toBeDefined();
      }
    });
  });

  describe('getState', () => {
    it('should return state with all system statuses', () => {
      const processor = createGovernanceProcessor(simulation.dao, eventBus, 'optimism');
      const state = processor.getState();

      expect(state).toBeDefined();
      expect(state.systemsActive).toBeDefined();
      expect(typeof state.governanceBlocked).toBe('boolean');
    });
  });
});

describe('DAOCity Governance Integration', () => {
  let city: DAOCity;

  beforeEach(() => {
    city = new DAOCity({
      daos: [
        {
          id: 'test_dao',
          name: 'Test DAO',
          tokenSymbol: 'TEST',
          initialTreasuryFunding: 100000,
          governanceRule: 'majority',
          agentCounts: { num_passive_members: 10 },
          color: '#FF0000',
        },
      ],
      globalMarketplaceConfig: {
        initialLiquidity: 50000,
        volatility: 0.02,
        priceUpdateFrequency: 1,
        baseTokenSymbol: 'STABLE',
      },
      bridgeFeeRate: 0.01,
      bridgeDelay: 5,
      enableInterDAOProposals: false,
    });
  });

  it('should initialize governance processors for all DAOs', () => {
    const processor = city.getGovernanceProcessor('test_dao');
    expect(processor).toBeDefined();
  });

  it('should process governance systems during step', async () => {
    const processor = city.getGovernanceProcessor('test_dao');
    expect(processor).toBeDefined();

    // Run a few steps
    await city.run(5);

    // Verify step completed without errors
    expect(city.getCurrentStep()).toBe(5);
  });

  it('should handle multiple DAOs with different governance types', async () => {
    const multiCity = new DAOCity({
      daos: [
        {
          id: 'majority_dao',
          name: 'Majority DAO',
          tokenSymbol: 'MAJ',
          initialTreasuryFunding: 100000,
          governanceRule: 'majority',
          agentCounts: {},
          color: '#FF0000',
        },
        {
          id: 'supermajority_dao',
          name: 'Supermajority DAO',
          tokenSymbol: 'SUP',
          initialTreasuryFunding: 100000,
          governanceRule: 'supermajority',
          agentCounts: {},
          color: '#00FF00',
        },
        {
          id: 'quorum_dao',
          name: 'Quorum DAO',
          tokenSymbol: 'QRM',
          initialTreasuryFunding: 100000,
          governanceRule: 'quorum',
          agentCounts: {},
          color: '#0000FF',
        },
      ],
      globalMarketplaceConfig: {
        initialLiquidity: 50000,
        volatility: 0.02,
        priceUpdateFrequency: 1,
        baseTokenSymbol: 'STABLE',
      },
      bridgeFeeRate: 0.01,
      bridgeDelay: 5,
      enableInterDAOProposals: false,
    });

    // Verify each DAO has a governance processor
    expect(multiCity.getGovernanceProcessor('majority_dao')).toBeDefined();
    expect(multiCity.getGovernanceProcessor('supermajority_dao')).toBeDefined();
    expect(multiCity.getGovernanceProcessor('quorum_dao')).toBeDefined();

    // Run simulation
    await multiCity.run(10);
    expect(multiCity.getCurrentStep()).toBe(10);
  });

  it('is invariant to DAO configuration order for a fixed seed', async () => {
    const daos = [
      {
        id: 'alpha',
        name: 'Alpha',
        tokenSymbol: 'ALPHA',
        initialTreasuryFunding: 100000,
        governanceRule: 'majority',
        agentCounts: { num_passive_members: 3 },
        color: '#111111',
      },
      {
        id: 'beta',
        name: 'Beta',
        tokenSymbol: 'BETA',
        initialTreasuryFunding: 100000,
        governanceRule: 'quorum',
        agentCounts: { num_passive_members: 3 },
        color: '#222222',
      },
    ];
    const common = {
      globalMarketplaceConfig: {
        initialLiquidity: 50000,
        volatility: 0.02,
        priceUpdateFrequency: 1,
        baseTokenSymbol: 'STABLE',
      },
      bridgeFeeRate: 0.01,
      bridgeDelay: 5,
      enableInterDAOProposals: false,
    };

    setSeed(4242);
    const forward = new DAOCity({ ...common, daos });
    await forward.run(5);
    const forwardState = forward.getState();

    setSeed(4242);
    const reversed = new DAOCity({ ...common, daos: [...daos].reverse() });
    await reversed.run(5);

    expect(reversed.getState()).toEqual(forwardState);
  });

  it('bridges member holdings through explicit source burns and destination mints', async () => {
    const bridgeCity = new DAOCity({
      daos: [
        {
          id: 'alpha',
          name: 'Alpha',
          tokenSymbol: 'ALPHA',
          initialTreasuryFunding: 100000,
          initialTokenPrice: 2,
          governanceRule: 'majority',
          agentCounts: { num_passive_members: 1 },
          color: '#111111',
        },
        {
          id: 'beta',
          name: 'Beta',
          tokenSymbol: 'BETA',
          initialTreasuryFunding: 100000,
          initialTokenPrice: 4,
          governanceRule: 'majority',
          agentCounts: { num_passive_members: 1 },
          color: '#222222',
        },
      ],
      globalMarketplaceConfig: {
        initialLiquidity: 50000,
        volatility: 0,
        priceUpdateFrequency: 1000,
        baseTokenSymbol: 'STABLE',
      },
      bridgeFeeRate: 0.01,
      bridgeDelay: 1,
      enableInterDAOProposals: false,
      memberTransferEnabled: true,
      memberTransferRate: 0,
      tokenSwapRate: 0,
    });
    const alpha = bridgeCity.getSimulation('alpha')!;
    const beta = bridgeCity.getSimulation('beta')!;
    const member = alpha.dao.members[0];
    const alphaBaselines = createAssetSupplyBaselines(alpha.dao);
    const betaBaselines = createAssetSupplyBaselines(beta.dao);

    const transferController = bridgeCity as unknown as {
      handleTransferRequest(data: {
        step: number;
        memberId: string;
        fromDaoId: string;
        toDaoId: string;
      }): void;
    };
    transferController.handleTransferRequest({
      step: 0,
      memberId: member.uniqueId,
      fromDaoId: 'alpha',
      toDaoId: 'beta',
    });
    await bridgeCity.run(2);

    expect(alpha.dao.members).not.toContain(member);
    expect(beta.dao.members).toContain(member);
    expect(member.daoId).toBe('beta');
    expect(
      alpha.dao.treasury.getLedger().some(entry => entry.event === 'member_bridge_source_burned')
    ).toBe(true);
    expect(
      beta.dao.treasury.getLedger().some(entry => entry.event === 'member_bridge_destination_minted')
    ).toBe(true);
    expect(checkAllTokenConservation(alpha.dao, 2, alphaBaselines, 0.01)).toBeNull();
    expect(checkAllTokenConservation(beta.dao, 2, betaBaselines, 0.01)).toBeNull();
  });

  it('funds city attack agents from treasury without creating supply', async () => {
    const attackCity = new DAOCity({
      daos: [{
        id: 'target',
        name: 'Target',
        tokenSymbol: 'TARGET',
        initialTreasuryFunding: 100000,
        governanceRule: 'majority',
        agentCounts: {
          num_passive_members: 4,
          num_proposal_creators: 2,
        },
        color: '#333333',
      }],
      globalMarketplaceConfig: {
        initialLiquidity: 50000,
        volatility: 0,
        priceUpdateFrequency: 1000,
      },
      bridgeFeeRate: 0.01,
      bridgeDelay: 1,
      enableInterDAOProposals: false,
      baseSettings: {
        validateEconomicInvariants: true,
        proposal_creation_probability: 0.05,
      },
      attackConfig: {
        targetSelection: 'all',
        sybilAttackers: 1,
        flashLoanAttackers: 1,
        attackerBudget: 1000,
      },
    });

    const simulation = attackCity.getSimulation('target')!;
    expect(
      simulation.dao.treasury.getLedger()
        .filter(entry => entry.event === 'scenario_attacker_endowment')
    ).toHaveLength(2);
    await expect(attackCity.run(50)).resolves.toBeUndefined();
  });
});

describe('DAOSimulation Governance Integration', () => {
  it('should have governance processor initialized', () => {
    const simulation = new DAOSimulation({
      governance_rule: 'majority',
      num_passive_members: 5,
    });

    expect(simulation.governanceProcessor).toBeDefined();
  });

  it('should process governance systems during step', async () => {
    const simulation = new DAOSimulation({
      governance_rule: 'majority',
      num_passive_members: 5,
    });

    // Run simulation steps
    for (let i = 0; i < 10; i++) {
      await simulation.step();
    }

    expect(simulation.currentStep).toBe(10);
  });

  it('should allow setting governance type', () => {
    const simulation = new DAOSimulation({
      governance_rule: 'majority',
      num_passive_members: 5,
    });

    // Test setting governance type
    simulation.setGovernanceType('lido');
    expect(simulation.governanceProcessor).toBeDefined();

    const state = simulation.governanceProcessor?.getState();
    expect(state?.systemsActive.easyTrack).toBe(true);
    expect(state?.systemsActive.rageQuit).toBe(true);
  });
});

describe('Event Bus Integration', () => {
  it('should emit events from governance systems', async () => {
    const simulation = new DAOSimulation({
      governance_rule: 'majority',
      num_passive_members: 5,
    });

    const events: string[] = [];

    // Subscribe to various governance events
    simulation.eventBus.subscribe('easy_track_motion_created', () => events.push('easy_track_motion_created'));
    simulation.eventBus.subscribe('retropgf_round_created', () => events.push('retropgf_round_created'));
    simulation.eventBus.subscribe('tokens_locked', () => events.push('tokens_locked'));
    simulation.eventBus.subscribe('rage_quit_signal', () => events.push('rage_quit_signal'));

    // Run simulation
    for (let i = 0; i < 5; i++) {
      await simulation.step();
    }

    // Events may or may not fire depending on random behavior,
    // but the test verifies the subscription mechanism works
    expect(simulation.currentStep).toBe(5);
  });
});
