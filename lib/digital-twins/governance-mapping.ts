/**
 * Governance Mapping
 *
 * Maps each digital twin DAO to its real-world governance rule and configuration.
 * Used by the counterfactual governance system to wire real governance rules
 * into calibrated simulations.
 */

import type { GovernanceRuleConfig } from '../utils/governance-plugins';

// =============================================================================
// TYPES
// =============================================================================

export interface GovernanceMappingEntry {
  /** Name matching governance-plugins.ts registry (e.g. 'tokenquorum', 'bicameral') */
  ruleName: string;
  /** Configuration for the primary governance rule */
  ruleConfig?: GovernanceRuleConfig;
  /** Secondary governance layers (e.g., security council, veto mechanisms) */
  secondaryRules?: Array<{
    ruleName: string;
    ruleConfig?: GovernanceRuleConfig;
    appliesTo?: string; // 'emergency' | 'constitutional' | 'veto'
  }>;
}

// =============================================================================
// DAO → GOVERNANCE RULE MAPPING
// =============================================================================

/**
 * Maps each calibrated DAO to its real-world governance mechanism.
 *
 * Sources:
 * - Aave: Governor Bravo, 320k AAVE quorum (~4%), simple majority
 * - Compound: Governor Bravo, 400k COMP quorum (~4%), simple majority
 * - Uniswap: Governor Bravo, 40M UNI quorum (~4%), simple majority
 * - ENS: Governor, ~100k ENS quorum (~1%), simple majority
 * - Arbitrum: Constitutional vs non-constitutional dual quorum
 * - Optimism: Bicameral (Token House + Citizens' House)
 * - Lido: Dual governance with veto/rage-quit (ERC-7265)
 * - MakerDAO: Approval voting for executive proposals
 * - Gitcoin: Governor, ~2.5M GTC quorum (~2.5%)
 * - Nouns: Per-proposal quorum, ~10% of supply
 * - Curve: veCRV gauge voting, ~15% quorum
 * - Balancer: veBAL voting, ~10% quorum
 * - dYdX: Governor, ~10M DYDX quorum (~10%)
 * - SushiSwap: Snapshot-based majority voting
 */
export const GOVERNANCE_MAPPING: Record<string, GovernanceMappingEntry> = {
  aave: {
    ruleName: 'tokenquorum',
    ruleConfig: { quorumPercentage: 0.04, threshold: 0.5 },
  },
  compound: {
    ruleName: 'tokenquorum',
    ruleConfig: { quorumPercentage: 0.04, threshold: 0.5 },
  },
  uniswap: {
    ruleName: 'tokenquorum',
    ruleConfig: { quorumPercentage: 0.04, threshold: 0.5 },
  },
  ens: {
    ruleName: 'tokenquorum',
    ruleConfig: { quorumPercentage: 0.01, threshold: 0.5 },
  },
  arbitrum: {
    ruleName: 'categoryquorum',
    ruleConfig: {
      constitutionalQuorum: 0.045,
      nonConstitutionalQuorum: 0.03,
      threshold: 0.5,
    },
  },
  optimism: {
    ruleName: 'bicameral',
    ruleConfig: {
      citizensHouseVetoEnabled: true,
      vetoThresholdPercent: 0.3,
    },
  },
  lido: {
    ruleName: 'dualgovernance',
    ruleConfig: {
      vetoThreshold: 0.005,
      rageQuitThresholdPercent: 0.15,
    },
  },
  maker: {
    ruleName: 'approvalvoting',
  },
  gitcoin: {
    ruleName: 'quorum',
    ruleConfig: { quorumPercentage: 0.025 },
  },
  nouns: {
    ruleName: 'quorum',
    ruleConfig: { quorumPercentage: 0.10 },
  },
  curve: {
    ruleName: 'quorum',
    ruleConfig: { quorumPercentage: 0.15 },
  },
  balancer: {
    ruleName: 'quorum',
    ruleConfig: { quorumPercentage: 0.10 },
  },
  dydx: {
    ruleName: 'quorum',
    ruleConfig: { quorumPercentage: 0.10 },
  },
  sushiswap: {
    ruleName: 'majority',
  },
};

// =============================================================================
// LOOKUP
// =============================================================================

/**
 * Get the governance mapping for a DAO by its ID.
 * Returns undefined if the DAO has no mapping defined.
 */
export function getGovernanceMapping(daoId: string): GovernanceMappingEntry | undefined {
  return GOVERNANCE_MAPPING[daoId.toLowerCase()];
}

/**
 * Get all mapped DAO IDs.
 */
export function getMappedDaoIds(): string[] {
  return Object.keys(GOVERNANCE_MAPPING);
}
