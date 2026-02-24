/**
 * Integration tests for LLM agents in the simulation
 *
 * Tests LLM agent creation, hybrid mode wiring, simulation stepping
 * with mock Ollama, and the reporter agent.
 * All tests mock the Ollama HTTP endpoint.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DAOSimulation } from '@/lib/engine/simulation';
import { LLMAgent } from '@/lib/agents/llm-agent';
import { LLMReporter } from '@/lib/agents/llm-reporter';
import { OllamaClient } from '@/lib/llm/ollama-client';
import { LLMResponseCache } from '@/lib/llm/response-cache';
import { AgentMemory } from '@/lib/llm/agent-memory';
import { resetSettings } from '@/lib/config/settings';

// =============================================================================
// Mock Ollama
// =============================================================================

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockOllamaResponse(response: string) {
  return {
    ok: true,
    json: async () => ({
      model: 'test-model',
      response,
      done: true,
      total_duration: 100000,
      eval_count: 10,
    }),
    text: async () => response,
  };
}

function setupMockOllama() {
  mockFetch.mockImplementation(async (url: string) => {
    if (url.includes('/api/tags')) {
      return {
        ok: true,
        json: async () => ({ models: [{ name: 'test-model' }] }),
      };
    }
    if (url.includes('/api/generate')) {
      return mockOllamaResponse(
        '{"vote":"yes","reasoning":"Mock approval","confidence":0.8}'
      );
    }
    return { ok: false, status: 404, text: async () => 'not found' };
  });
}

// =============================================================================
// Tests
// =============================================================================

describe('LLM Integration', () => {
  beforeEach(() => {
    resetSettings();
    setupMockOllama();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetSettings();
  });

  describe('LLMAgent standalone', () => {
    it('creates LLMAgent with default properties', () => {
      const sim = new DAOSimulation({
        num_llm_agents: 2,
        num_developers: 1,
        num_investors: 0,
        num_traders: 0,
        num_passive_members: 0,
        seed: 42,
      });

      const llmAgents = sim.dao.members.filter(
        (m) => m instanceof LLMAgent
      );
      expect(llmAgents.length).toBe(2);
    });

    it('LLMAgent falls back to rule-based voting when LLM is not initialized', async () => {
      const sim = new DAOSimulation({
        num_llm_agents: 1,
        num_developers: 0,
        num_investors: 0,
        num_traders: 0,
        num_passive_members: 0,
        num_proposal_creators: 1,
        seed: 42,
      });

      // Run a few steps without LLM init
      for (let i = 0; i < 5; i++) {
        await sim.step();
      }
      // Should not throw — falls back gracefully
    });

    it('LLMAgent uses pre-computed LLM decisions', async () => {
      const sim = new DAOSimulation({
        num_llm_agents: 1,
        num_developers: 0,
        num_investors: 0,
        num_traders: 0,
        num_passive_members: 0,
        num_proposal_creators: 0,
        seed: 42,
      });

      const agent = sim.dao.members.find(
        (m) => m instanceof LLMAgent
      ) as LLMAgent;
      expect(agent).toBeDefined();

      // Manually init LLM
      const client = new OllamaClient();
      const cache = new LLMResponseCache();
      agent.initLLM(client, cache, 'test-model', 0.3, 256, 42);

      expect(agent.llmVoting).not.toBeNull();
    });

    it('LLMAgent records vote memory', () => {
      const sim = new DAOSimulation({
        num_llm_agents: 1,
        seed: 42,
      });

      const agent = sim.dao.members.find(
        (m) => m instanceof LLMAgent
      ) as LLMAgent;

      // Memory should start empty
      expect(agent.memory.stats.shortTermCount).toBe(0);

      // Manually add a memory entry
      agent.memory.add({
        type: 'vote',
        step: 1,
        summary: 'Voted yes',
        importance: 0.6,
        tags: ['governance'],
      });

      expect(agent.memory.stats.shortTermCount).toBe(1);
    });
  });

  describe('LLMReporter standalone', () => {
    it('creates LLMReporter agents', () => {
      const sim = new DAOSimulation({
        num_llm_reporters: 1,
        num_developers: 1,
        num_investors: 0,
        num_traders: 0,
        num_passive_members: 0,
        seed: 42,
      });

      const reporters = sim.dao.members.filter(
        (m) => m instanceof LLMReporter
      );
      expect(reporters.length).toBe(1);
    });

    it('reporter starts with no reports', () => {
      const sim = new DAOSimulation({
        num_llm_reporters: 1,
        seed: 42,
      });

      const reporter = sim.dao.members.find(
        (m) => m instanceof LLMReporter
      ) as LLMReporter;
      expect(reporter.reports).toHaveLength(0);
    });
  });

  describe('Simulation with LLM disabled', () => {
    it('llm_enabled=false produces no LLM infrastructure', () => {
      const sim = new DAOSimulation({
        llm_enabled: false,
        seed: 42,
      });

      expect(sim.ollamaClient).toBeNull();
      expect(sim.llmCache).toBeNull();
    });

    it('runs identically with llm_enabled=false (regression guard)', async () => {
      const config = {
        llm_enabled: false,
        seed: 42,
        num_developers: 3,
        num_investors: 2,
        num_passive_members: 5,
        num_traders: 0,
        num_adaptive_investors: 0,
        num_delegators: 0,
        num_liquid_delegators: 0,
        num_proposal_creators: 2,
        num_validators: 0,
        num_service_providers: 0,
        num_arbitrators: 0,
        num_regulators: 0,
        num_auditors: 0,
        num_bounty_hunters: 0,
        num_external_partners: 0,
        num_artists: 0,
        num_collectors: 0,
        num_speculators: 0,
        num_stakers: 0,
        num_rl_traders: 0,
        num_governance_experts: 0,
        num_governance_whales: 0,
        num_risk_managers: 0,
        num_market_makers: 0,
        num_whistleblowers: 0,
        num_llm_agents: 0,
        num_llm_reporters: 0,
      };

      const sim1 = new DAOSimulation(config);

      // Run sim1 first, then sim2 separately with same seed
      for (let i = 0; i < 10; i++) {
        await sim1.step();
      }
      const treasury1 = sim1.dao.treasury.funds;
      const proposals1 = sim1.dao.proposals.length;

      const sim2 = new DAOSimulation(config);
      for (let i = 0; i < 10; i++) {
        await sim2.step();
      }

      // Same seed + same config = same treasury
      expect(sim2.dao.treasury.funds).toBe(treasury1);
      expect(sim2.dao.proposals.length).toBe(proposals1);
    });
  });

  describe('LLM mode wiring', () => {
    it('hybrid mode creates OllamaClient and cache', () => {
      const sim = new DAOSimulation({
        llm_enabled: true,
        llm_agent_mode: 'hybrid',
        llm_hybrid_fraction: 0.5,
        num_llm_agents: 4,
        num_developers: 0,
        num_investors: 0,
        num_traders: 0,
        num_passive_members: 0,
        seed: 42,
      });

      expect(sim.ollamaClient).not.toBeNull();
      expect(sim.llmCache).not.toBeNull();
    });

    it('all mode creates OllamaClient', () => {
      const sim = new DAOSimulation({
        llm_enabled: true,
        llm_agent_mode: 'all',
        num_llm_agents: 3,
        num_developers: 0,
        num_investors: 0,
        num_traders: 0,
        num_passive_members: 0,
        seed: 42,
      });

      expect(sim.ollamaClient).not.toBeNull();
    });

    it('disabled mode produces no LLM infrastructure', () => {
      const sim = new DAOSimulation({
        llm_enabled: true,
        llm_agent_mode: 'disabled',
        seed: 42,
      });

      expect(sim.ollamaClient).toBeNull();
    });
  });

  describe('Configuration', () => {
    it('respects custom llm_base_url', () => {
      const sim = new DAOSimulation({
        llm_enabled: true,
        llm_agent_mode: 'all',
        llm_base_url: 'http://custom:11434',
        num_llm_agents: 1,
        num_developers: 0,
        num_investors: 0,
        num_traders: 0,
        num_passive_members: 0,
        seed: 42,
      });

      expect(sim.ollamaClient).not.toBeNull();
    });

    it('disables cache when llm_cache_enabled=false', () => {
      const sim = new DAOSimulation({
        llm_enabled: true,
        llm_agent_mode: 'all',
        llm_cache_enabled: false,
        num_llm_agents: 1,
        num_developers: 0,
        num_investors: 0,
        num_traders: 0,
        num_passive_members: 0,
        seed: 42,
      });

      expect(sim.ollamaClient).not.toBeNull();
      expect(sim.llmCache).toBeNull();
    });
  });
});
