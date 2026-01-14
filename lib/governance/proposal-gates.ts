/**
 * Proposal Gates - Threshold Enforcement for Proposals
 *
 * Implements proposal threshold requirements like minimum delegation
 * percentages for temperature checks and token amounts for on-chain proposals.
 */

import type { EventBus } from '../utils/event-bus';

// =============================================================================
// TYPES
// =============================================================================

export type GateType =
  | 'delegation_percent'   // Min % of votable supply delegated
  | 'token_amount'         // Min tokens held/delegated
  | 'reputation_score'     // Min reputation
  | 'proposal_count'       // Min previous proposals
  | 'membership_duration'; // Min time as member

export type ProposalStageGate =
  | 'temperature_check'
  | 'on_chain'
  | 'execution';

export interface ProposalGate {
  id: string;
  gateType: GateType;
  stage: ProposalStageGate;
  threshold: number;
  description: string;
  enabled: boolean;
}

export interface GateCheckResult {
  gateId: string;
  passed: boolean;
  currentValue: number;
  threshold: number;
  message: string;
}

export interface ProposalGatesConfig {
  gates: ProposalGate[];
  totalVotableSupply: number;
}

// =============================================================================
// PROPOSAL GATES CONTROLLER
// =============================================================================

export class ProposalGatesController {
  private gates: Map<string, ProposalGate> = new Map();
  private gateCounter: number = 0;
  private eventBus: EventBus | null = null;

  totalVotableSupply: number = 0;

  constructor(config?: Partial<ProposalGatesConfig>) {
    this.totalVotableSupply = config?.totalVotableSupply ?? 0;

    // Add configured gates
    if (config?.gates) {
      for (const gate of config.gates) {
        this.addGate(gate);
      }
    }
  }

  /**
   * Set event bus
   */
  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Update total votable supply
   */
  updateTotalVotableSupply(supply: number): void {
    this.totalVotableSupply = supply;
  }

  /**
   * Add a new gate
   */
  addGate(gate: Omit<ProposalGate, 'id'> & { id?: string }): ProposalGate {
    const gateId = gate.id || `gate_${++this.gateCounter}`;
    const fullGate: ProposalGate = {
      ...gate,
      id: gateId,
    };

    this.gates.set(gateId, fullGate);
    return fullGate;
  }

  /**
   * Remove a gate
   */
  removeGate(gateId: string): boolean {
    return this.gates.delete(gateId);
  }

  /**
   * Enable/disable a gate
   */
  setGateEnabled(gateId: string, enabled: boolean): boolean {
    const gate = this.gates.get(gateId);
    if (!gate) return false;
    gate.enabled = enabled;
    return true;
  }

  /**
   * Check if a proposer passes all gates for a stage
   */
  checkGates(
    proposerId: string,
    stage: ProposalStageGate,
    values: {
      delegatedTokens?: number;
      tokensHeld?: number;
      reputation?: number;
      proposalCount?: number;
      memberSinceStep?: number;
      currentStep?: number;
    }
  ): { passed: boolean; results: GateCheckResult[] } {
    const results: GateCheckResult[] = [];
    let allPassed = true;

    // Get gates for this stage
    const stageGates = Array.from(this.gates.values())
      .filter(g => g.stage === stage && g.enabled);

    for (const gate of stageGates) {
      const result = this.checkSingleGate(gate, values);
      results.push(result);

      if (!result.passed) {
        allPassed = false;
      }
    }

    // Emit event if any gate failed
    if (!allPassed) {
      this.emit('proposal_gate_blocked', {
        proposerId,
        stage,
        failedGates: results.filter(r => !r.passed).map(r => ({
          gateId: r.gateId,
          threshold: r.threshold,
          currentValue: r.currentValue,
        })),
      });
    }

    return { passed: allPassed, results };
  }

  /**
   * Check a single gate
   */
  private checkSingleGate(
    gate: ProposalGate,
    values: {
      delegatedTokens?: number;
      tokensHeld?: number;
      reputation?: number;
      proposalCount?: number;
      memberSinceStep?: number;
      currentStep?: number;
    }
  ): GateCheckResult {
    let currentValue = 0;
    let passed = false;

    switch (gate.gateType) {
      case 'delegation_percent': {
        const delegated = values.delegatedTokens ?? 0;
        currentValue = this.totalVotableSupply > 0
          ? (delegated / this.totalVotableSupply) * 100
          : 0;
        passed = currentValue >= gate.threshold;
        break;
      }

      case 'token_amount': {
        currentValue = values.delegatedTokens ?? values.tokensHeld ?? 0;
        passed = currentValue >= gate.threshold;
        break;
      }

      case 'reputation_score': {
        currentValue = values.reputation ?? 0;
        passed = currentValue >= gate.threshold;
        break;
      }

      case 'proposal_count': {
        currentValue = values.proposalCount ?? 0;
        passed = currentValue >= gate.threshold;
        break;
      }

      case 'membership_duration': {
        if (values.memberSinceStep !== undefined && values.currentStep !== undefined) {
          currentValue = values.currentStep - values.memberSinceStep;
        }
        passed = currentValue >= gate.threshold;
        break;
      }
    }

    return {
      gateId: gate.id,
      passed,
      currentValue,
      threshold: gate.threshold,
      message: passed
        ? `Gate passed: ${gate.description}`
        : `Gate failed: ${gate.description} (${currentValue.toFixed(2)} < ${gate.threshold})`,
    };
  }

  /**
   * Get gates for a stage
   */
  getGatesForStage(stage: ProposalStageGate): ProposalGate[] {
    return Array.from(this.gates.values())
      .filter(g => g.stage === stage);
  }

  /**
   * Get all gates
   */
  getAllGates(): ProposalGate[] {
    return Array.from(this.gates.values());
  }

  /**
   * Get gate by ID
   */
  getGate(gateId: string): ProposalGate | undefined {
    return this.gates.get(gateId);
  }

  /**
   * Calculate required tokens for a delegation percentage gate
   */
  getRequiredTokensForPercent(percent: number): number {
    return (percent / 100) * this.totalVotableSupply;
  }

  /**
   * Emit event
   */
  private emit(event: string, data: Record<string, unknown>): void {
    if (this.eventBus) {
      this.eventBus.publish(event, data as { step: number; [key: string]: unknown });
    }
  }

  /**
   * Serialize to plain object
   */
  toDict(): unknown {
    return {
      gateCounter: this.gateCounter,
      totalVotableSupply: this.totalVotableSupply,
      gates: Array.from(this.gates.values()),
    };
  }

  /**
   * Restore from serialized data
   */
  static fromDict(data: any): ProposalGatesController {
    const controller = new ProposalGatesController();
    controller.gateCounter = data.gateCounter || 0;
    controller.totalVotableSupply = data.totalVotableSupply || 0;

    if (data.gates) {
      for (const gate of data.gates) {
        controller.gates.set(gate.id, gate);
      }
    }

    return controller;
  }
}

/**
 * Factory function for Arbitrum proposal gates
 */
export function createArbitrumProposalGates(): ProposalGatesController {
  return new ProposalGatesController({
    gates: [
      {
        id: 'arb_temp_check_gate',
        gateType: 'delegation_percent',
        stage: 'temperature_check',
        threshold: 0.01,  // 0.01% of votable supply
        description: '0.01% of votable tokens delegated for temperature check',
        enabled: true,
      },
      {
        id: 'arb_on_chain_gate',
        gateType: 'token_amount',
        stage: 'on_chain',
        threshold: 1000000,  // 1M ARB
        description: '1,000,000 ARB delegated for on-chain proposal',
        enabled: true,
      },
    ],
  });
}

/**
 * Factory function for Uniswap proposal gates
 */
export function createUniswapProposalGates(): ProposalGatesController {
  return new ProposalGatesController({
    gates: [
      {
        id: 'uni_temp_check_gate',
        gateType: 'delegation_percent',
        stage: 'temperature_check',
        threshold: 0.0025,  // 0.0025% (~25K UNI)
        description: '25,000 UNI delegated for temperature check',
        enabled: true,
      },
      {
        id: 'uni_on_chain_gate',
        gateType: 'token_amount',
        stage: 'on_chain',
        threshold: 2500000,  // 2.5M UNI
        description: '2,500,000 UNI delegated for on-chain proposal',
        enabled: true,
      },
    ],
  });
}

/**
 * Factory function for Compound proposal gates
 */
export function createCompoundProposalGates(): ProposalGatesController {
  return new ProposalGatesController({
    gates: [
      {
        id: 'comp_on_chain_gate',
        gateType: 'token_amount',
        stage: 'on_chain',
        threshold: 25000,  // 25K COMP
        description: '25,000 COMP delegated for on-chain proposal',
        enabled: true,
      },
    ],
  });
}

/**
 * Factory function for Aave proposal gates
 */
export function createAaveProposalGates(): ProposalGatesController {
  return new ProposalGatesController({
    gates: [
      {
        id: 'aave_on_chain_gate',
        gateType: 'token_amount',
        stage: 'on_chain',
        threshold: 80000,  // 80K AAVE
        description: '80,000 AAVE for on-chain proposal',
        enabled: true,
      },
    ],
  });
}
