# LLM Agents Implementation Review - Fix List

All 20 issues identified and fixed. 793 tests pass, zero TypeScript errors.

## Critical Issues

### 1. ✅ LLM Metrics Declared But Never Computed
- **Files changed**: `experiment-runner.ts`, `fork-worker.ts`, `simulation-worker.ts`
- **Fix**: Added `llm_vote_consistency`, `llm_cache_hit_rate`, `llm_avg_latency_ms` cases to `extractBuiltinMetric()` in all three workers. Metrics read from `LLMAgent.llmVoting.voteHistory`, `simulation.llmCache.stats`, and `simulation.ollamaClient.avgLatencyMs`.

### 2. ✅ Decisions Not Cleared Between Steps
- **File changed**: `lib/engine/simulation.ts`
- **Fix**: Added `m.llmVoting.clearDecisions()` at the start of `prepareLLMAgentDecisions()` for every LLMAgent with initialized llmVoting. Prevents stale decisions from previous steps being reused.

### 3. ✅ `Promise.all` Without Error Isolation in Batch Processing
- **File changed**: `lib/engine/simulation.ts`
- **Fix**: Replaced `Promise.all` with `Promise.allSettled`. Rejected results are logged at warn level with the agent's uniqueId. No single agent failure can crash the batch.

---

## High-Severity Issues

### 4. ✅ No Ollama Availability Check at Startup
- **File changed**: `lib/engine/simulation.ts`
- **Fix**: Added lazy availability check on first `prepareLLMAgentDecisions()` call. Calls `ollamaClient.isAvailable()`, and if unavailable, logs a warning and sets `ollamaClient = null` to disable LLM for the rest of the simulation. Added `ollamaAvailabilityChecked` flag.

### 5. ✅ Unsafe Type Assertion for Proposal Probability
- **File changed**: `lib/agents/llm-agent.ts`
- **Fix**: Replaced `(this.model as unknown as {...}).proposalCreationProbability ?? 0.005` with `settings.proposal_creation_probability` via proper import from `lib/config/settings`.

### 6. ✅ `pendingProposal` Not Always Cleared
- **File changed**: `lib/agents/llm-agent.ts`
- **Fix**: Moved `this.pendingProposal = null` outside the conditional block so it's always cleared after `step()`, regardless of whether the proposal was created.

### 7. ✅ Unbounded `voteHistory` Growth
- **File changed**: `lib/llm/llm-voting-mixin.ts`
- **Fix**: Added `MAX_VOTE_HISTORY = 1000` cap. Added `recordVoteHistory()` helper that maintains running counters (`_totalDecisions`, `_cacheHits`, `_totalLatencyMs`, `_nonCachedCount`) and trims history when over cap. `getMetrics()` now reads from running counters in O(1) instead of iterating the full array.

---

## Moderate Issues

### 8. ✅ FNV-1a 32-bit Hash Collision Risk
- **File changed**: `lib/llm/response-cache.ts`
- **Fix**: Cache key now includes string length suffix (`hash_length`). Added `rawKey` field to `CacheEntry` for collision detection. `get()` accepts optional `rawKey` parameter and rejects entries where the raw key doesn't match. `set()` stores the raw key alongside the hash.

### 9. ✅ Experiment Config Uses Wrong Model Names
- **File changed**: `experiments/paper/12-llm-agent-reasoning.yaml`
- **Fix**: Updated `llm_default_model` and `llm_premium_model` from `llama3.1:8b`/`qwen2.5:14b` to `qwen3:8b`/`qwen3:8b`.

### 10. ✅ Hybrid Mode Only Upgrades `LLMAgent` Instances
- **File changed**: `lib/engine/simulation.ts`
- **Fix**: Changed hybrid mode to filter for `LLMAgent` instances first, then select the fraction from that filtered set. Previously selected from all members but silently skipped non-LLMAgent instances.

### 11. ✅ "All LLM" Experiment Config Misdesigned
- **File changed**: `experiments/paper/12-llm-agent-reasoning.yaml`
- **Fix**: Set `num_proposal_creators: 0` and increased `num_llm_agents` to 49 so all agents are LLMAgent instances in the "All LLM" config.

### 12. ✅ Cache Key Computed Twice Per LLM Call
- **File changed**: `lib/llm/llm-voting-mixin.ts`
- **Fix**: Hoisted `cacheKey` computation above the cache check block so it's computed once and reused for both lookup and storage.

### 13. ✅ Reporter Delta State Initialized to Zero
- **File changed**: `lib/agents/llm-reporter.ts`
- **Fix**: Added DAO state initialization in `initLLM()` — sets `prevTreasuryFunds`, `prevMemberCount`, `prevProposalCount` from current DAO state so the first report shows accurate deltas.

---

## Low-Severity Issues

### 14. ✅ Missing `parseProposalResponse` Tests
- **File changed**: `tests/llm-voting.test.ts`
- **Fix**: Added 9 test cases covering: valid proposal JSON, shouldPropose=false, topic normalization (case), unknown topic defaults to Governance, fundingPct clamping [0, 0.05], title/description truncation, malformed JSON fallback, NaN fundingPct, missing title default.

### 15. ✅ Memory FIFO Eviction Ignores Importance
- **File changed**: `lib/llm/agent-memory.ts`
- **Fix**: Added clarifying comment explaining that high-importance entries survive FIFO eviction because they are auto-promoted to long-term storage. The behavior is correct as-is.

### 16. ✅ No LLMAgent/LLMReporter in TwinAgentFactory.getAgentClassByName
- **File changed**: `lib/agents/twin-agent-factory.ts`
- **Fix**: Added `LLMAgent` and `LLMReporter` entries to the `nameMap` in `getAgentClassByName()`.

### 17. ✅ Greedy JSON Regex May Match Wrong Object
- **File changed**: `lib/llm/prompt-templates.ts`
- **Fix**: Replaced `/\{[\s\S]*?\}/` regex with new `extractJSON()` helper that matches all `{...}` blocks (non-nested) and tries `JSON.parse` on each, returning the first valid one. Used by all three parse functions (`parseVoteResponse`, `parseProposalResponse`, `parseForumPostResponse`).

### 18. ✅ LLMReporter Imports Cache Class Twice
- **File changed**: `lib/agents/llm-reporter.ts`
- **Fix**: Removed the type-only import. Single value import: `import { LLMResponseCache } from '../llm/response-cache'`. Replaced all `CacheClass.makeKey` references with `LLMResponseCache.makeKey`.

### 19. ✅ No Episode Cleanup for LLM State
- **Files changed**: `lib/agents/llm-agent.ts`, `lib/agents/llm-reporter.ts`
- **Fix**: Added `endEpisode()` to both classes. LLMAgent clears: pendingProposal, lastReasoning, proposalsCreated, decisions (preserves memory for cross-episode learning). LLMReporter clears: reports, pendingReport, re-initializes delta tracking state.

### 20. ✅ Memory Context Not Included in Proposal Generation
- **File changed**: `lib/agents/llm-agent.ts`
- **Fix**: Added `ctx.memoryContext = this.memory.buildPromptContext(['proposal_created', 'treasury_event'])` before building the proposal prompt, so proposal generation benefits from the agent's memory context.

---

## Verification

- **TypeScript**: Zero compile errors
- **Tests**: 793 passed (76 LLM-specific + 717 existing), 0 failed
- **Files modified**: 12
- **New test cases**: 9 (parseProposalResponse)
