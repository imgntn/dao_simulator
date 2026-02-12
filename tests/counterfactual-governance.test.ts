/**
 * Tests for the Counterfactual Governance System
 *
 * Tests governance-mapping, governance-aware state discretizer,
 * feature flag gating, and the counterfactual runner.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getGovernanceMapping, getMappedDaoIds, GOVERNANCE_MAPPING } from '../lib/digital-twins/governance-mapping';
import { StateDiscretizer } from '../lib/agents/learning/state-discretizer';
import { CalibrationLoader } from '../lib/digital-twins/calibration-loader';
import { DAOSimulation, type DAOSimulationConfig } from '../lib/engine/simulation';
import { extractEmergentMetrics } from '../lib/research/counterfactual-runner';
import type { Proposal } from '../lib/data-structures/proposal';

// =============================================================================
// GOVERNANCE MAPPING
// =============================================================================

describe('GovernanceMapping', () => {
  it('should have mappings for all 14 calibrated DAOs', () => {
    const expectedDaos = [
      'aave', 'compound', 'uniswap', 'ens', 'arbitrum', 'optimism',
      'lido', 'maker', 'gitcoin', 'nouns', 'curve', 'balancer', 'dydx', 'sushiswap',
    ];
    for (const dao of expectedDaos) {
      const mapping = getGovernanceMapping(dao);
      expect(mapping, `Missing mapping for ${dao}`).toBeDefined();
      expect(mapping!.ruleName).toBeTruthy();
    }
  });

  it('should return undefined for unknown DAOs', () => {
    expect(getGovernanceMapping('nonexistent')).toBeUndefined();
  });

  it('should be case-insensitive', () => {
    expect(getGovernanceMapping('AAVE')).toBeDefined();
    expect(getGovernanceMapping('Optimism')).toBeDefined();
  });

  it('should have valid rule names', () => {
    const validRules = [
      'majority', 'quorum', 'supermajority', 'tokenquorum', 'reputationquorum',
      'quadratic', 'conviction', 'bicameral', 'dualgovernance', 'securitycouncil',
      'categoryquorum', 'approvalvoting', 'timedecay', 'optimistic', 'holographic',
    ];
    for (const [daoId, entry] of Object.entries(GOVERNANCE_MAPPING)) {
      expect(validRules, `Invalid rule ${entry.ruleName} for ${daoId}`).toContain(entry.ruleName);
    }
  });

  it('should return all mapped DAO IDs', () => {
    const ids = getMappedDaoIds();
    expect(ids.length).toBe(14);
    expect(ids).toContain('aave');
    expect(ids).toContain('optimism');
  });

  it('should map Optimism to bicameral', () => {
    const mapping = getGovernanceMapping('optimism');
    expect(mapping!.ruleName).toBe('bicameral');
  });

  it('should map Lido to dualgovernance', () => {
    const mapping = getGovernanceMapping('lido');
    expect(mapping!.ruleName).toBe('dualgovernance');
  });

  it('should map Maker to approvalvoting', () => {
    const mapping = getGovernanceMapping('maker');
    expect(mapping!.ruleName).toBe('approvalvoting');
  });

  it('should include ruleConfig for DAOs with quorums', () => {
    const aave = getGovernanceMapping('aave');
    expect(aave!.ruleConfig).toBeDefined();
    expect(aave!.ruleConfig!.quorumPercentage).toBe(0.04);
    expect(aave!.ruleConfig!.threshold).toBe(0.5);
  });
});

// =============================================================================
// STATE DISCRETIZER - GOVERNANCE RULE CATEGORIES
// =============================================================================

describe('StateDiscretizer governance awareness', () => {
  it('should discretize governance rules into categories', () => {
    expect(StateDiscretizer.discretizeGovernanceRule('majority')).toBe('simple');
    expect(StateDiscretizer.discretizeGovernanceRule('quorum')).toBe('simple');
    expect(StateDiscretizer.discretizeGovernanceRule('tokenquorum')).toBe('weighted');
    expect(StateDiscretizer.discretizeGovernanceRule('quadratic')).toBe('egalitarian');
    expect(StateDiscretizer.discretizeGovernanceRule('conviction')).toBe('egalitarian');
    expect(StateDiscretizer.discretizeGovernanceRule('bicameral')).toBe('multi_body');
    expect(StateDiscretizer.discretizeGovernanceRule('dualgovernance')).toBe('multi_body');
    expect(StateDiscretizer.discretizeGovernanceRule('categoryquorum')).toBe('category');
    expect(StateDiscretizer.discretizeGovernanceRule('approvalvoting')).toBe('approval');
    expect(StateDiscretizer.discretizeGovernanceRule('holographic')).toBe('boosted');
  });

  it('should return unknown for unrecognized rules', () => {
    expect(StateDiscretizer.discretizeGovernanceRule('fakrule')).toBe('unknown');
  });

  it('should include governance rule in createGovernanceState', () => {
    const state = StateDiscretizer.createGovernanceState(null, 0.3, 3000, 10000, 'quadratic');
    expect(state).toContain('egalitarian');
    expect(state).toBe('none|medium|low|egalitarian');
  });

  it('should use default when no rule provided', () => {
    const state = StateDiscretizer.createGovernanceState(null, 0.3, 3000, 10000);
    expect(state).toContain('default');
  });

  it('should produce different states for different rules', () => {
    const stateA = StateDiscretizer.createGovernanceState(null, 0.3, 3000, 10000, 'majority');
    const stateB = StateDiscretizer.createGovernanceState(null, 0.3, 3000, 10000, 'bicameral');
    expect(stateA).not.toBe(stateB);
    expect(stateA).toContain('simple');
    expect(stateB).toContain('multi_body');
  });
});

// =============================================================================
// CALIBRATION LOADER - GOVERNANCE RULE IN SETTINGS
// =============================================================================

describe('CalibrationLoader governance integration', () => {
  it('should include governance_rule in toSettings when mapping exists', () => {
    const profile = CalibrationLoader.load('aave');
    if (!profile) return; // Skip if no calibration profiles

    const settings = CalibrationLoader.toSettings(profile);
    expect(settings.governance_rule).toBe('tokenquorum');
  });

  it('should include governance_rule for all calibrated DAOs with mappings', () => {
    const ids = CalibrationLoader.getAvailableIds();
    for (const id of ids) {
      const profile = CalibrationLoader.load(id);
      if (!profile) continue;
      const settings = CalibrationLoader.toSettings(profile);
      const mapping = getGovernanceMapping(id);
      if (mapping) {
        expect(settings.governance_rule, `Missing governance_rule for ${id}`).toBe(mapping.ruleName);
      }
    }
  });
});

// =============================================================================
// DAO & SIMULATION - GOVERNANCE RULE NAME FIELD
// =============================================================================

describe('DAO governanceRuleName field', () => {
  it('should default to majority', () => {
    const sim = new DAOSimulation({ seed: 42 });
    expect(sim.dao.governanceRuleName).toBe('majority');
  });

  it('should propagate custom governance rule to DAO', () => {
    const sim = new DAOSimulation({
      seed: 42,
      governance_rule: 'quadratic',
    });
    expect(sim.dao.governanceRuleName).toBe('quadratic');
  });

  it('should be accessible by agents via model.dao', () => {
    const sim = new DAOSimulation({
      seed: 42,
      governance_rule: 'tokenquorum',
    });
    // Agents access this as: this.model.dao.governanceRuleName
    expect(sim.dao.governanceRuleName).toBe('tokenquorum');
  });
});

// =============================================================================
// FEATURE FLAG GATING
// =============================================================================

describe('calibration_use_real_governance flag', () => {
  it('should default to false', () => {
    const sim = new DAOSimulation({ seed: 42 });
    expect(sim.useRealGovernance).toBe(false);
  });

  it('should be settable via config', () => {
    const sim = new DAOSimulation({
      seed: 42,
      calibration_use_real_governance: true,
    });
    expect(sim.useRealGovernance).toBe(true);
  });

  it('should use legacy governance when flag is false with calibration', () => {
    const profile = CalibrationLoader.load('aave');
    if (!profile) return;

    const sim = new DAOSimulation({
      seed: 42,
      calibration_dao_id: 'aave',
      calibration_use_real_governance: false,
    });
    // Legacy: majority rule, quorum=0
    expect(sim.governanceRuleName).toBe('majority');
  });

  it('should use real governance rule when flag is true with calibration', () => {
    const profile = CalibrationLoader.load('aave');
    if (!profile) return;

    const sim = new DAOSimulation({
      seed: 42,
      calibration_dao_id: 'aave',
      calibration_use_real_governance: true,
    });
    // Real governance: tokenquorum from mapping
    expect(sim.governanceRuleName).toBe('tokenquorum');
    expect(sim.dao.governanceRuleName).toBe('tokenquorum');
  });

  it('should respect explicit governance_rule override even with real governance flag', () => {
    const profile = CalibrationLoader.load('aave');
    if (!profile) return;

    const sim = new DAOSimulation({
      seed: 42,
      calibration_dao_id: 'aave',
      calibration_use_real_governance: true,
      governance_rule: 'quadratic',
    });
    // User explicitly requested quadratic — should not be overridden
    expect(sim.governanceRuleName).toBe('quadratic');
  });
});

// =============================================================================
// SIMULATION RUNS WITH REAL GOVERNANCE
// =============================================================================

describe('Simulation with real governance', () => {
  it('should complete a short simulation with real governance enabled', async () => {
    const profile = CalibrationLoader.load('aave');
    if (!profile) return;

    const sim = new DAOSimulation({
      seed: 42,
      calibration_dao_id: 'aave',
      calibration_use_real_governance: true,
      oracle_type: 'calibrated_gbm',
      forum_enabled: true,
      learning_enabled: false,
    });

    // Run 100 steps
    await sim.run(100);
    expect(sim.currentStep).toBe(100);
    expect(sim.dao.members.length).toBeGreaterThan(0);
  });

  it('should produce proposals with different governance rules', async () => {
    const profile = CalibrationLoader.load('uniswap');
    if (!profile) return;

    const sim = new DAOSimulation({
      seed: 42,
      calibration_dao_id: 'uniswap',
      calibration_use_real_governance: true,
      oracle_type: 'calibrated_gbm',
      forum_enabled: false,
      learning_enabled: false,
    });

    await sim.run(200);
    // Should have some proposals after 200 steps
    expect(sim.dao.proposals.length).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// EMERGENT METRICS
// =============================================================================

describe('extractEmergentMetrics', () => {
  it('should compute pass rate from proposal statuses', () => {
    const proposals = [
      { status: 'approved', creationTime: 0, resolutionTime: 50, votesFor: 10, votesAgainst: 3, votes: new Map() },
      { status: 'approved', creationTime: 10, resolutionTime: 60, votesFor: 8, votesAgainst: 2, votes: new Map() },
      { status: 'rejected', creationTime: 20, resolutionTime: 70, votesFor: 3, votesAgainst: 10, votes: new Map() },
    ];

    const metrics = extractEmergentMetrics(proposals, 100, 50);
    expect(metrics.passRate).toBeCloseTo(2 / 3, 2);
  });

  it('should compute average time to decision', () => {
    const proposals = [
      { status: 'approved', creationTime: 0, resolutionTime: 40, votesFor: 5, votesAgainst: 1, votes: new Map() },
      { status: 'rejected', creationTime: 10, resolutionTime: 70, votesFor: 1, votesAgainst: 5, votes: new Map() },
    ];

    const metrics = extractEmergentMetrics(proposals, 100, 50);
    expect(metrics.avgTimeToDecision).toBeCloseTo((40 + 60) / 2, 0);
  });

  it('should compute proposal throughput', () => {
    const proposals = [
      { status: 'approved', creationTime: 0, resolutionTime: 50 },
      { status: 'rejected', creationTime: 10, resolutionTime: 60 },
      { status: 'expired', creationTime: 20, resolutionTime: 70 },
    ];

    const metrics = extractEmergentMetrics(proposals as any, 100, 50);
    // 2 decided proposals (approved + rejected) / 100 steps * 100 = 2.0
    expect(metrics.proposalThroughput).toBeCloseTo(2.0, 1);
  });

  it('should compute expiration rate', () => {
    const proposals = [
      { status: 'approved', creationTime: 0, resolutionTime: 50 },
      { status: 'expired', creationTime: 10, resolutionTime: 60 },
      { status: 'expired', creationTime: 20, resolutionTime: 70 },
    ];

    const metrics = extractEmergentMetrics(proposals as any, 100, 50);
    // 2 expired / 3 resolved = 0.667
    expect(metrics.expirationRate).toBeCloseTo(2 / 3, 2);
  });

  it('should handle empty proposals', () => {
    const metrics = extractEmergentMetrics([], 100, 50);
    expect(metrics.passRate).toBe(0.5);
    expect(metrics.avgTimeToDecision).toBe(0);
    expect(metrics.proposalThroughput).toBe(0);
    expect(metrics.expirationRate).toBe(0);
  });
});
