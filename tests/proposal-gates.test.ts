/**
 * Proposal Gates Tests
 *
 * Tests for proposal threshold requirements and enforcement.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ProposalGatesController,
  createArbitrumProposalGates,
  createUniswapProposalGates,
  createCompoundProposalGates,
  createAaveProposalGates,
} from '../lib/governance/proposal-gates';
import { EventBus } from '../lib/utils/event-bus';

describe('ProposalGatesController', () => {
  let controller: ProposalGatesController;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus(false);
    controller = new ProposalGatesController({
      totalVotableSupply: 10000000,  // 10M tokens
    });
    controller.setEventBus(eventBus);
  });

  describe('addGate', () => {
    it('should add a new gate', () => {
      const gate = controller.addGate({
        gateType: 'delegation_percent',
        stage: 'temperature_check',
        threshold: 0.01,
        description: 'Min 0.01% delegation',
        enabled: true,
      });

      expect(gate).toBeDefined();
      expect(gate.id).toBeDefined();
      expect(gate.threshold).toBe(0.01);
    });

    it('should use provided ID if given', () => {
      const gate = controller.addGate({
        id: 'custom_gate',
        gateType: 'token_amount',
        stage: 'on_chain',
        threshold: 1000,
        description: 'Min tokens',
        enabled: true,
      });

      expect(gate.id).toBe('custom_gate');
    });
  });

  describe('removeGate', () => {
    it('should remove existing gate', () => {
      const gate = controller.addGate({
        gateType: 'token_amount',
        stage: 'on_chain',
        threshold: 1000,
        description: 'Test',
        enabled: true,
      });

      const result = controller.removeGate(gate.id);

      expect(result).toBe(true);
      expect(controller.getGate(gate.id)).toBeUndefined();
    });

    it('should return false for non-existent gate', () => {
      const result = controller.removeGate('unknown');
      expect(result).toBe(false);
    });
  });

  describe('setGateEnabled', () => {
    it('should enable/disable gate', () => {
      const gate = controller.addGate({
        gateType: 'token_amount',
        stage: 'on_chain',
        threshold: 1000,
        description: 'Test',
        enabled: true,
      });

      controller.setGateEnabled(gate.id, false);
      expect(controller.getGate(gate.id)?.enabled).toBe(false);

      controller.setGateEnabled(gate.id, true);
      expect(controller.getGate(gate.id)?.enabled).toBe(true);
    });
  });

  describe('checkGates', () => {
    describe('delegation_percent gate', () => {
      beforeEach(() => {
        controller.addGate({
          id: 'delegation_gate',
          gateType: 'delegation_percent',
          stage: 'temperature_check',
          threshold: 0.01,  // 0.01% of 10M = 1000 tokens
          description: 'Min 0.01% delegation',
          enabled: true,
        });
      });

      it('should pass when delegation exceeds threshold', () => {
        const result = controller.checkGates(
          'proposer_1',
          'temperature_check',
          { delegatedTokens: 2000 }  // 0.02%
        );

        expect(result.passed).toBe(true);
        expect(result.results[0].passed).toBe(true);
      });

      it('should fail when delegation below threshold', () => {
        const result = controller.checkGates(
          'proposer_1',
          'temperature_check',
          { delegatedTokens: 500 }  // 0.005%
        );

        expect(result.passed).toBe(false);
      });
    });

    describe('token_amount gate', () => {
      beforeEach(() => {
        controller.addGate({
          id: 'token_gate',
          gateType: 'token_amount',
          stage: 'on_chain',
          threshold: 1000000,  // 1M tokens
          description: 'Min 1M tokens',
          enabled: true,
        });
      });

      it('should pass when tokens exceed threshold', () => {
        const result = controller.checkGates(
          'proposer_1',
          'on_chain',
          { delegatedTokens: 1500000 }
        );

        expect(result.passed).toBe(true);
      });

      it('should fail when tokens below threshold', () => {
        const result = controller.checkGates(
          'proposer_1',
          'on_chain',
          { delegatedTokens: 500000 }
        );

        expect(result.passed).toBe(false);
      });

      it('should use tokensHeld if delegatedTokens not provided', () => {
        const result = controller.checkGates(
          'proposer_1',
          'on_chain',
          { tokensHeld: 1500000 }
        );

        expect(result.passed).toBe(true);
      });
    });

    describe('reputation_score gate', () => {
      beforeEach(() => {
        controller.addGate({
          id: 'reputation_gate',
          gateType: 'reputation_score',
          stage: 'temperature_check',
          threshold: 100,
          description: 'Min 100 reputation',
          enabled: true,
        });
      });

      it('should pass with sufficient reputation', () => {
        const result = controller.checkGates(
          'proposer_1',
          'temperature_check',
          { reputation: 150 }
        );

        expect(result.passed).toBe(true);
      });

      it('should fail with insufficient reputation', () => {
        const result = controller.checkGates(
          'proposer_1',
          'temperature_check',
          { reputation: 50 }
        );

        expect(result.passed).toBe(false);
      });
    });

    describe('proposal_count gate', () => {
      beforeEach(() => {
        controller.addGate({
          id: 'proposal_count_gate',
          gateType: 'proposal_count',
          stage: 'on_chain',
          threshold: 3,
          description: 'Min 3 previous proposals',
          enabled: true,
        });
      });

      it('should pass with sufficient proposals', () => {
        const result = controller.checkGates(
          'proposer_1',
          'on_chain',
          { proposalCount: 5 }
        );

        expect(result.passed).toBe(true);
      });

      it('should fail with insufficient proposals', () => {
        const result = controller.checkGates(
          'proposer_1',
          'on_chain',
          { proposalCount: 1 }
        );

        expect(result.passed).toBe(false);
      });
    });

    describe('membership_duration gate', () => {
      beforeEach(() => {
        controller.addGate({
          id: 'duration_gate',
          gateType: 'membership_duration',
          stage: 'on_chain',
          threshold: 720,  // 30 days
          description: 'Min 30 days membership',
          enabled: true,
        });
      });

      it('should pass with sufficient duration', () => {
        const result = controller.checkGates(
          'proposer_1',
          'on_chain',
          { memberSinceStep: 100, currentStep: 1000 }  // 900 steps
        );

        expect(result.passed).toBe(true);
      });

      it('should fail with insufficient duration', () => {
        const result = controller.checkGates(
          'proposer_1',
          'on_chain',
          { memberSinceStep: 500, currentStep: 700 }  // 200 steps
        );

        expect(result.passed).toBe(false);
      });
    });

    describe('multiple gates', () => {
      beforeEach(() => {
        controller.addGate({
          id: 'delegation_gate',
          gateType: 'delegation_percent',
          stage: 'temperature_check',
          threshold: 0.01,
          description: 'Min delegation',
          enabled: true,
        });
        controller.addGate({
          id: 'reputation_gate',
          gateType: 'reputation_score',
          stage: 'temperature_check',
          threshold: 50,
          description: 'Min reputation',
          enabled: true,
        });
      });

      it('should require all gates to pass', () => {
        const result = controller.checkGates(
          'proposer_1',
          'temperature_check',
          { delegatedTokens: 2000, reputation: 100 }
        );

        expect(result.passed).toBe(true);
        expect(result.results.length).toBe(2);
      });

      it('should fail if any gate fails', () => {
        const result = controller.checkGates(
          'proposer_1',
          'temperature_check',
          { delegatedTokens: 2000, reputation: 30 }  // reputation too low
        );

        expect(result.passed).toBe(false);
        expect(result.results.filter(r => !r.passed).length).toBe(1);
      });
    });

    describe('disabled gates', () => {
      it('should skip disabled gates', () => {
        controller.addGate({
          id: 'disabled_gate',
          gateType: 'token_amount',
          stage: 'on_chain',
          threshold: 1000000000,  // Impossible amount
          description: 'Disabled gate',
          enabled: false,
        });

        const result = controller.checkGates(
          'proposer_1',
          'on_chain',
          { delegatedTokens: 100 }
        );

        // Should pass since gate is disabled
        expect(result.passed).toBe(true);
        expect(result.results.length).toBe(0);
      });
    });

    it('should emit proposal_gate_blocked event on failure', () => {
      const events: unknown[] = [];
      eventBus.subscribe('proposal_gate_blocked', (data) => events.push(data));

      controller.addGate({
        gateType: 'token_amount',
        stage: 'on_chain',
        threshold: 1000000,
        description: 'Test',
        enabled: true,
      });

      controller.checkGates('proposer_1', 'on_chain', { delegatedTokens: 100 });

      expect(events.length).toBe(1);
    });
  });

  describe('getGatesForStage', () => {
    it('should filter gates by stage', () => {
      controller.addGate({
        gateType: 'delegation_percent',
        stage: 'temperature_check',
        threshold: 0.01,
        description: 'Temp check gate',
        enabled: true,
      });
      controller.addGate({
        gateType: 'token_amount',
        stage: 'on_chain',
        threshold: 1000,
        description: 'On-chain gate',
        enabled: true,
      });

      const tempCheckGates = controller.getGatesForStage('temperature_check');
      const onChainGates = controller.getGatesForStage('on_chain');

      expect(tempCheckGates.length).toBe(1);
      expect(onChainGates.length).toBe(1);
    });
  });

  describe('getRequiredTokensForPercent', () => {
    it('should calculate required tokens correctly', () => {
      const tokens = controller.getRequiredTokensForPercent(0.01);
      // 0.01% of 10M = 1000
      expect(tokens).toBe(1000);
    });
  });

  describe('updateTotalVotableSupply', () => {
    it('should update supply and affect calculations', () => {
      controller.updateTotalVotableSupply(20000000);  // 20M

      const tokens = controller.getRequiredTokensForPercent(0.01);
      // 0.01% of 20M = 2000
      expect(tokens).toBe(2000);
    });
  });
});

describe('Factory functions', () => {
  describe('createArbitrumProposalGates', () => {
    it('should create gates with Arbitrum thresholds', () => {
      const controller = createArbitrumProposalGates();
      const gates = controller.getAllGates();

      expect(gates.length).toBe(2);
      expect(gates.find(g => g.id === 'arb_temp_check_gate')).toBeDefined();
      expect(gates.find(g => g.id === 'arb_on_chain_gate')).toBeDefined();
    });
  });

  describe('createUniswapProposalGates', () => {
    it('should create gates with Uniswap thresholds', () => {
      const controller = createUniswapProposalGates();
      const gates = controller.getAllGates();

      expect(gates.length).toBe(2);
      expect(gates.find(g => g.id === 'uni_on_chain_gate')?.threshold).toBe(2500000);
    });
  });

  describe('createCompoundProposalGates', () => {
    it('should create gates with Compound thresholds', () => {
      const controller = createCompoundProposalGates();
      const gates = controller.getAllGates();

      expect(gates.length).toBe(1);
      expect(gates[0].threshold).toBe(25000);  // 25K COMP
    });
  });

  describe('createAaveProposalGates', () => {
    it('should create gates with Aave thresholds', () => {
      const controller = createAaveProposalGates();
      const gates = controller.getAllGates();

      expect(gates.length).toBe(1);
      expect(gates[0].threshold).toBe(80000);  // 80K AAVE
    });
  });
});
