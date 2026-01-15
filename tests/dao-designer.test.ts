/**
 * DAO Designer Tests
 *
 * Tests for DAO Designer types, templates, and builder.
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_DAO_DESIGNER_CONFIG,
  DEFAULT_GOVERNANCE_FEATURES,
  DEFAULT_VOTING_SYSTEM,
  DEFAULT_PROPOSAL_PROCESS,
  DEFAULT_MEMBER_DISTRIBUTION,
} from '../lib/dao-designer/types';
import type { DAODesignerConfig } from '../lib/dao-designer/types';

import {
  DAO_TEMPLATES,
  TEMPLATE_METADATA,
  getTemplate,
  getTemplateMetadata,
  getTemplateIds,
  getTemplatesByComplexity,
} from '../lib/dao-designer/templates';

import {
  DAOConfigBuilder,
  validateConfig,
  toSimulationConfig,
  getRecommendations,
} from '../lib/dao-designer/builder';

describe('DAO Designer Types', () => {
  describe('DEFAULT_DAO_DESIGNER_CONFIG', () => {
    it('should have valid default configuration', () => {
      expect(DEFAULT_DAO_DESIGNER_CONFIG).toBeDefined();
      expect(DEFAULT_DAO_DESIGNER_CONFIG.name).toBe('My DAO');
      expect(DEFAULT_DAO_DESIGNER_CONFIG.tokenSymbol).toBe('GOV');
      expect(DEFAULT_DAO_DESIGNER_CONFIG.tokenSupply).toBe(10000000);
    });

    it('should have valid voting system defaults', () => {
      expect(DEFAULT_VOTING_SYSTEM.type).toBe('simple_majority');
      expect(DEFAULT_VOTING_SYSTEM.passingThreshold).toBe(0.5);
      expect(DEFAULT_VOTING_SYSTEM.votingPeriodDays).toBe(7);
      expect(DEFAULT_VOTING_SYSTEM.votingPowerModel).toBe('token_weighted');
    });

    it('should have valid proposal process defaults', () => {
      expect(DEFAULT_PROPOSAL_PROCESS.stages.length).toBe(2);
      expect(DEFAULT_PROPOSAL_PROCESS.proposalThreshold).toBe(1000);
    });

    it('should have valid member distribution defaults', () => {
      expect(DEFAULT_MEMBER_DISTRIBUTION.totalMembers).toBe(100);
      const totalPercentage = DEFAULT_MEMBER_DISTRIBUTION.distribution.reduce(
        (sum, d) => sum + d.percentage,
        0
      );
      expect(totalPercentage).toBe(100);
    });

    it('should have all governance features disabled by default', () => {
      const features = DEFAULT_GOVERNANCE_FEATURES;
      expect(features.bicameral).toBe(false);
      expect(features.dualGovernance).toBe(false);
      expect(features.timelockEnabled).toBe(false);
      expect(features.approvalVoting).toBe(false);
      expect(features.convictionVoting).toBe(false);
    });
  });
});

describe('DAO Designer Templates', () => {
  describe('getTemplateIds', () => {
    it('should return all template IDs', () => {
      const ids = getTemplateIds();
      expect(ids).toContain('simple');
      expect(ids).toContain('optimism');
      expect(ids).toContain('makerdao');
      expect(ids).toContain('lido');
      expect(ids).toContain('arbitrum');
      expect(ids).toContain('compound');
      expect(ids).toContain('uniswap');
      expect(ids).toContain('gitcoin');
      expect(ids).toContain('ens');
      expect(ids).toContain('aave');
    });
  });

  describe('getTemplate', () => {
    it('should return template by ID', () => {
      const simple = getTemplate('simple');
      expect(simple).toBeDefined();
      expect(simple?.name).toBe('Simple DAO');
    });

    it('should return undefined for unknown ID', () => {
      const unknown = getTemplate('unknown');
      expect(unknown).toBeUndefined();
    });
  });

  describe('getTemplateMetadata', () => {
    it('should return metadata by ID', () => {
      const meta = getTemplateMetadata('optimism');
      expect(meta).toBeDefined();
      expect(meta?.name).toBe('Optimism-style');
      expect(meta?.complexity).toBe('advanced');
      expect(meta?.features).toContain('Bicameral');
    });
  });

  describe('getTemplatesByComplexity', () => {
    it('should filter by beginner complexity', () => {
      const beginner = getTemplatesByComplexity('beginner');
      expect(beginner.length).toBeGreaterThan(0);
      beginner.forEach((t) => {
        expect(t.metadata.complexity).toBe('beginner');
      });
    });

    it('should filter by advanced complexity', () => {
      const advanced = getTemplatesByComplexity('advanced');
      expect(advanced.length).toBeGreaterThan(0);
      advanced.forEach((t) => {
        expect(t.metadata.complexity).toBe('advanced');
      });
    });
  });

  describe('Template Validity', () => {
    it('all templates should be valid configurations', () => {
      const ids = getTemplateIds();
      ids.forEach((id) => {
        const template = getTemplate(id);
        expect(template).toBeDefined();

        const result = validateConfig(template!);
        // Allow warnings but no errors
        expect(result.errors.length).toBe(0);
      });
    });

    it('all templates should have matching metadata', () => {
      const ids = getTemplateIds();
      ids.forEach((id) => {
        const template = getTemplate(id);
        const meta = getTemplateMetadata(id);
        expect(template).toBeDefined();
        expect(meta).toBeDefined();
        expect(meta?.id).toBe(id);
      });
    });
  });

  describe('Specific Templates', () => {
    it('Optimism template should have bicameral governance', () => {
      const optimism = getTemplate('optimism');
      expect(optimism?.features.bicameral).toBe(true);
      expect(optimism?.features.bicameralConfig?.houses.length).toBe(2);
      expect(optimism?.features.governanceCycles).toBe(true);
      expect(optimism?.features.retroPGF).toBe(true);
    });

    it('MakerDAO template should have approval voting', () => {
      const maker = getTemplate('makerdao');
      expect(maker?.features.approvalVoting).toBe(true);
      expect(maker?.votingSystem.type).toBe('approval');
    });

    it('Lido template should have dual governance', () => {
      const lido = getTemplate('lido');
      expect(lido?.features.dualGovernance).toBe(true);
      expect(lido?.features.easyTrack).toBe(true);
      expect(lido?.features.ragequit).toBe(true);
    });

    it('Arbitrum template should have security council', () => {
      const arb = getTemplate('arbitrum');
      expect(arb?.features.securityCouncil).toBe(true);
      expect(arb?.features.timelockEnabled).toBe(true);
    });
  });
});

describe('DAO Config Builder', () => {
  describe('validateConfig', () => {
    it('should validate default config successfully', () => {
      const result = validateConfig(DEFAULT_DAO_DESIGNER_CONFIG);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject empty name', () => {
      const config = { ...DEFAULT_DAO_DESIGNER_CONFIG, name: '' };
      const result = validateConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'name')).toBe(true);
    });

    it('should reject invalid token symbol', () => {
      const config = { ...DEFAULT_DAO_DESIGNER_CONFIG, tokenSymbol: 'X' };
      const result = validateConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'tokenSymbol')).toBe(true);
    });

    it('should reject negative token supply', () => {
      const config = { ...DEFAULT_DAO_DESIGNER_CONFIG, tokenSupply: -100 };
      const result = validateConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'tokenSupply')).toBe(true);
    });

    it('should reject invalid passing threshold', () => {
      const config: DAODesignerConfig = {
        ...DEFAULT_DAO_DESIGNER_CONFIG,
        votingSystem: { ...DEFAULT_VOTING_SYSTEM, passingThreshold: 1.5 },
      };
      const result = validateConfig(config);
      expect(result.isValid).toBe(false);
    });

    it('should reject member distribution not summing to 100%', () => {
      const config: DAODesignerConfig = {
        ...DEFAULT_DAO_DESIGNER_CONFIG,
        memberDistribution: {
          totalMembers: 100,
          distribution: [
            { archetype: 'passive_holder', percentage: 30 },
            { archetype: 'active_voter', percentage: 20 },
          ],
        },
      };
      const result = validateConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'memberDistribution.distribution')).toBe(true);
    });

    it('should warn about high quorum', () => {
      const config: DAODesignerConfig = {
        ...DEFAULT_DAO_DESIGNER_CONFIG,
        quorumConfig: { type: 'fixed_percent', baseQuorumPercent: 60 },
      };
      const result = validateConfig(config);
      expect(result.warnings.some((w) => w.field === 'quorumConfig.baseQuorumPercent')).toBe(true);
    });

    it('should warn about small DAO', () => {
      const config: DAODesignerConfig = {
        ...DEFAULT_DAO_DESIGNER_CONFIG,
        memberDistribution: { ...DEFAULT_MEMBER_DISTRIBUTION, totalMembers: 5 },
      };
      const result = validateConfig(config);
      expect(
        result.warnings.some((w) => w.field === 'memberDistribution.totalMembers')
      ).toBe(true);
    });
  });

  describe('toSimulationConfig', () => {
    it('should convert default config to simulation config', () => {
      const simConfig = toSimulationConfig(DEFAULT_DAO_DESIGNER_CONFIG);
      expect(simConfig).toBeDefined();
      expect(simConfig.governance_rule).toBe('majority');
    });

    it('should set correct governance rule for supermajority', () => {
      const config: DAODesignerConfig = {
        ...DEFAULT_DAO_DESIGNER_CONFIG,
        votingSystem: { ...DEFAULT_VOTING_SYSTEM, type: 'supermajority' },
      };
      const simConfig = toSimulationConfig(config);
      expect(simConfig.governance_rule).toBe('supermajority');
    });

    it('should set correct governance rule for quadratic', () => {
      const config: DAODesignerConfig = {
        ...DEFAULT_DAO_DESIGNER_CONFIG,
        votingSystem: { ...DEFAULT_VOTING_SYSTEM, type: 'quadratic' },
      };
      const simConfig = toSimulationConfig(config);
      expect(simConfig.governance_rule).toBe('quadratic');
    });

    it('should include agent counts based on member distribution', () => {
      const simConfig = toSimulationConfig(DEFAULT_DAO_DESIGNER_CONFIG);
      // Should have some agents defined
      expect((simConfig as any).num_passive_members).toBeGreaterThan(0);
    });
  });

  describe('getRecommendations', () => {
    it('should return recommendations for small beginner DAO', () => {
      const recommendations = getRecommendations(20, 'beginner');
      expect(recommendations.votingSystem?.votingPeriodDays).toBe(3);
      expect(recommendations.quorumConfig?.baseQuorumPercent).toBe(20);
      expect(recommendations.features?.bicameral).toBe(false);
    });

    it('should return recommendations for medium intermediate DAO', () => {
      const recommendations = getRecommendations(100, 'intermediate');
      expect(recommendations.votingSystem?.votingPeriodDays).toBe(5);
      expect(recommendations.features?.timelockEnabled).toBe(true);
    });

    it('should return recommendations for large advanced DAO', () => {
      const recommendations = getRecommendations(300, 'advanced');
      expect(recommendations.votingSystem?.votingPeriodDays).toBe(7);
      expect(recommendations.quorumConfig?.baseQuorumPercent).toBe(4);
      expect(recommendations.features?.bicameral).toBe(true);
    });
  });

  describe('DAOConfigBuilder', () => {
    const builder = new DAOConfigBuilder();

    it('should calculate proposal duration', () => {
      const stages = [
        { name: 'Discussion', type: 'discussion' as const, durationDays: 3 },
        { name: 'Voting', type: 'voting' as const, durationDays: 7 },
        { name: 'Timelock', type: 'timelock' as const, durationDays: 2 },
      ];
      const duration = builder.calculateProposalDuration(stages);
      expect(duration).toBe(12);
    });

    it('should convert days to steps', () => {
      expect(builder.daysToSteps(1)).toBe(24);
      expect(builder.daysToSteps(7)).toBe(168);
      expect(builder.daysToSteps(1, 12)).toBe(12);
    });

    it('should convert steps to days', () => {
      expect(builder.stepsToDays(24)).toBe(1);
      expect(builder.stepsToDays(168)).toBe(7);
      expect(builder.stepsToDays(12, 12)).toBe(1);
    });
  });
});
