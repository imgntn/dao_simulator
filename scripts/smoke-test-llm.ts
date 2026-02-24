/**
 * Smoke test: Run a real simulation with LLM agents hitting Ollama.
 *
 * Usage: npx tsx scripts/smoke-test-llm.ts
 */

import { DAOSimulation } from '../lib/engine/simulation';
import { LLMAgent } from '../lib/agents/llm-agent';
import { LLMReporter } from '../lib/agents/llm-reporter';

async function main() {
  console.log('=== LLM Agent Smoke Test ===\n');

  const sim = new DAOSimulation({
    seed: 42,
    // Small agent counts for quick test
    num_developers: 2,
    num_investors: 1,
    num_traders: 0,
    num_adaptive_investors: 0,
    num_delegators: 1,
    num_liquid_delegators: 0,
    num_proposal_creators: 2,
    num_validators: 1,
    num_service_providers: 0,
    num_arbitrators: 0,
    num_regulators: 0,
    num_auditors: 0,
    num_bounty_hunters: 0,
    num_external_partners: 0,
    num_passive_members: 2,
    num_artists: 0,
    num_collectors: 0,
    num_speculators: 0,
    num_stakers: 0,
    num_rl_traders: 0,
    num_governance_experts: 1,
    num_governance_whales: 0,
    num_risk_managers: 0,
    num_market_makers: 0,
    num_whistleblowers: 0,
    // LLM agents
    num_llm_agents: 3,
    num_llm_reporters: 1,
    // LLM config
    llm_enabled: true,
    llm_agent_mode: 'all',
    llm_base_url: 'http://localhost:11434',
    llm_default_model: 'qwen3:8b',
    llm_premium_model: 'qwen3:8b',
    llm_max_concurrent: 4,
    llm_temperature: 0.3,
    llm_cache_enabled: true,
    llm_max_tokens: 256,
    llm_seed: 42,
    // Disable learning for clean test
    learning_enabled: false,
    forum_enabled: true,
  });

  const totalMembers = sim.dao.members.length;
  const llmAgents = sim.dao.members.filter(m => m instanceof LLMAgent);
  const reporters = sim.dao.members.filter(m => m instanceof LLMReporter);

  console.log(`Total members: ${totalMembers}`);
  console.log(`LLM agents: ${llmAgents.length}`);
  console.log(`LLM reporters: ${reporters.length}`);
  console.log(`Ollama client: ${sim.ollamaClient ? 'initialized' : 'null'}`);
  console.log(`LLM cache: ${sim.llmCache ? 'enabled' : 'disabled'}`);
  console.log();

  // Check which LLM agents are actually initialized
  let llmInitialized = 0;
  for (const agent of llmAgents) {
    if ((agent as LLMAgent).llmVoting) llmInitialized++;
  }
  console.log(`LLM agents with voting initialized: ${llmInitialized}/${llmAgents.length}`);

  // Run 100 steps (enough for proposals + reporter)
  const STEPS = 100;
  console.log(`\nRunning ${STEPS} steps...\n`);

  for (let i = 0; i < STEPS; i++) {
    const stepStart = Date.now();
    await sim.step();
    const stepMs = Date.now() - stepStart;

    const openProposals = sim.dao.proposals.filter(p => p.status === 'open').length;
    const totalProposals = sim.dao.proposals.length;

    if (i % 5 === 0 || i === STEPS - 1) {
      console.log(
        `Step ${i}: ${stepMs}ms | Treasury: ${Math.round(sim.dao.treasury.funds)} | ` +
        `Proposals: ${openProposals} open / ${totalProposals} total | ` +
        `Members: ${sim.dao.members.length}`
      );
    }
  }

  // Check LLM agent activity
  console.log('\n=== LLM Agent Results ===\n');

  for (const agent of llmAgents) {
    const llm = agent as LLMAgent;
    const voteCount = llm.votes.size;
    const memStats = llm.memory.stats;
    const lastReason = llm.lastReasoning || '(none)';

    console.log(
      `${llm.uniqueId}: ${voteCount} votes, ${llm.proposalsCreated} proposals created | ` +
      `Memory: ${memStats.shortTermCount} STM, ${memStats.longTermCount} LTM | ` +
      `Last reasoning: "${lastReason.slice(0, 80)}"`
    );

    // Show vote history if available
    if (llm.llmVoting) {
      const metrics = llm.llmVoting.getMetrics();
      console.log(
        `  LLM metrics: ${metrics.totalDecisions} decisions, ` +
        `${metrics.cacheHits} cache hits, ` +
        `${metrics.avgLatencyMs.toFixed(0)}ms avg latency`
      );
    }
  }

  // Show all proposals
  console.log('\n=== All Proposals ===\n');
  for (const p of sim.dao.proposals) {
    const creatorAgent = sim.dao.members.find(m => m.uniqueId === p.creator);
    const creatorType = creatorAgent?.constructor.name || 'unknown';
    console.log(
      `  "${p.title}" [${p.topic}] by ${creatorType} | ` +
      `${p.votesFor} for / ${p.votesAgainst} against | ` +
      `Status: ${p.status} | Funding: ${Math.round(p.fundingGoal)}`
    );
    if (p.description && p.description.length > 30) {
      console.log(`    Description: ${p.description.slice(0, 120)}`);
    }
  }

  // Check reporter
  console.log('\n=== Reporter Results ===\n');
  for (const agent of reporters) {
    const reporter = agent as LLMReporter;
    console.log(`${reporter.uniqueId}: ${reporter.reports.length} reports`);

    for (const report of reporter.reports) {
      console.log(`  [Step ${report.step}] ${report.headline}`);
      console.log(`    ${report.body.slice(0, 200)}`);
      console.log(`    Topics: ${report.topics.join(', ')} | Sentiment: ${report.sentiment}`);
    }
  }

  // Cache stats
  if (sim.llmCache) {
    const stats = sim.llmCache.stats;
    console.log('\n=== Cache Stats ===');
    console.log(`Hits: ${stats.hits}, Misses: ${stats.misses}, Hit rate: ${(stats.hitRate * 100).toFixed(1)}%, Size: ${stats.size}`);
  }

  // Ollama client stats
  if (sim.ollamaClient) {
    console.log('\n=== Ollama Client Stats ===');
    console.log(`Total requests: ${sim.ollamaClient.totalRequests}`);
    console.log(`Total errors: ${sim.ollamaClient.totalErrors}`);
    console.log(`Avg latency: ${sim.ollamaClient.avgLatencyMs.toFixed(0)}ms`);
  }

  console.log('\n=== Smoke Test Complete ===');
}

main().catch(console.error);
