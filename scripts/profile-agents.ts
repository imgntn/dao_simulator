#!/usr/bin/env node
/**
 * Agent Step Profiler
 *
 * Profiles individual agent step() methods to find the slowest operations.
 */

import { DAOSimulation } from '../lib/engine/simulation';
import { DAOMember } from '../lib/agents/base';
import { performance } from 'perf_hooks';

async function profileAgentSteps(steps: number, numMembers: number) {
  console.log(`\n=== Agent Step Profiler ===`);
  console.log(`Steps: ${steps}, Members: ${numMembers}\n`);

  const sim = new DAOSimulation({
    seed: 42,
    num_developers: Math.floor(numMembers * 0.1),
    num_investors: Math.floor(numMembers * 0.1),
    num_traders: Math.floor(numMembers * 0.05),
    num_adaptive_investors: Math.floor(numMembers * 0.05),
    num_delegators: Math.floor(numMembers * 0.1),
    num_liquid_delegators: Math.floor(numMembers * 0.05),
    num_proposal_creators: Math.floor(numMembers * 0.05),
    num_validators: Math.floor(numMembers * 0.05),
    num_service_providers: Math.floor(numMembers * 0.02),
    num_passive_members: Math.floor(numMembers * 0.3),
    num_governance_experts: Math.floor(numMembers * 0.05),
    num_stakers: Math.floor(numMembers * 0.08),
    governance_rule: 'majority',
    governance_config: { quorumPercentage: 0.05 },
    proposal_creation_probability: 0.004,
    voting_activity: 0.25,
  });

  // Track time by agent type
  const agentTimes = new Map<string, { totalMs: number; count: number; callCount: number }>();

  // Track specific operations
  const operationTimes = {
    voteOnRandomProposal: 0,
    createProposal: 0,
    stakeOperations: 0,
    delegationOperations: 0,
    other: 0,
  };
  let operationCounts = {
    voteOnRandomProposal: 0,
    createProposal: 0,
    stakeOperations: 0,
    delegationOperations: 0,
  };

  // Wrap agent step methods
  const originalSteps = new Map<DAOMember, () => void>();
  for (const agent of sim.dao.members) {
    const agentType = agent.constructor.name;
    if (!agentTimes.has(agentType)) {
      agentTimes.set(agentType, { totalMs: 0, count: 0, callCount: 0 });
    }

    const original = agent.step.bind(agent);
    originalSteps.set(agent, original);

    agent.step = function() {
      const start = performance.now();
      original();
      const elapsed = performance.now() - start;
      const stats = agentTimes.get(agentType)!;
      stats.totalMs += elapsed;
      stats.count++;
    };
  }

  // Also track voteOnRandomProposal specifically
  const origVote = DAOMember.prototype.voteOnRandomProposal;
  (DAOMember.prototype as any).voteOnRandomProposal = function(this: DAOMember) {
    const start = performance.now();
    origVote.call(this);
    operationTimes.voteOnRandomProposal += performance.now() - start;
    operationCounts.voteOnRandomProposal++;
  };

  console.log('Running simulation...\n');
  const totalStart = performance.now();

  for (let i = 0; i < steps; i++) {
    await sim.step();
    if ((i + 1) % 100 === 0) {
      process.stdout.write(`\rStep ${i + 1}/${steps}`);
    }
  }

  const totalTime = performance.now() - totalStart;
  console.log('\n');

  // Restore original method
  DAOMember.prototype.voteOnRandomProposal = origVote;

  // Report by agent type
  console.log('=== Time by Agent Type ===');
  console.log(`${'Agent Type'.padEnd(25)} ${'Total (ms)'.padStart(12)} ${'%'.padStart(8)} ${'Calls'.padStart(10)} ${'Avg (ms)'.padStart(12)}`);
  console.log('-'.repeat(70));

  const sortedAgents = Array.from(agentTimes.entries())
    .sort((a, b) => b[1].totalMs - a[1].totalMs);

  const agentTotal = sortedAgents.reduce((sum, [, stats]) => sum + stats.totalMs, 0);

  for (const [type, stats] of sortedAgents) {
    const pct = (stats.totalMs / agentTotal) * 100;
    const avg = stats.totalMs / stats.count;
    console.log(
      `${type.padEnd(25)} ${stats.totalMs.toFixed(2).padStart(12)} ${pct.toFixed(1).padStart(7)}% ${stats.count.toString().padStart(10)} ${avg.toFixed(4).padStart(11)}`
    );
  }
  console.log('-'.repeat(70));
  console.log(`${'TOTAL'.padEnd(25)} ${agentTotal.toFixed(2).padStart(12)} ${'100.0%'.padStart(8)}`);

  // Report voting time
  console.log('\n=== Voting Operation ===');
  console.log(`voteOnRandomProposal: ${operationTimes.voteOnRandomProposal.toFixed(2)} ms (${operationCounts.voteOnRandomProposal} calls)`);
  console.log(`Average per call: ${(operationTimes.voteOnRandomProposal / Math.max(1, operationCounts.voteOnRandomProposal)).toFixed(4)} ms`);
  console.log(`Percentage of agent time: ${((operationTimes.voteOnRandomProposal / agentTotal) * 100).toFixed(1)}%`);

  // DAO stats
  console.log('\n=== Final State ===');
  console.log(`Total simulation time: ${(totalTime / 1000).toFixed(2)} seconds`);
  console.log(`Average step time: ${(totalTime / steps).toFixed(2)} ms`);
  console.log(`Members: ${sim.dao.members.length}`);
  console.log(`Proposals: ${sim.dao.proposals.length}`);
  console.log(`Open proposals: ${sim.dao.proposals.filter(p => p.status === 'open').length}`);

  // Memory
  const mem = process.memoryUsage();
  console.log(`\nHeap: ${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`);

  // Optimization suggestions
  console.log('\n=== Optimization Opportunities ===');

  const topAgent = sortedAgents[0];
  if (topAgent && topAgent[1].totalMs / agentTotal > 0.3) {
    console.log(`1. ${topAgent[0]} takes ${((topAgent[1].totalMs / agentTotal) * 100).toFixed(0)}% of time - optimize its step() method`);
  }

  if (operationTimes.voteOnRandomProposal / agentTotal > 0.5) {
    console.log(`2. voteOnRandomProposal is ${((operationTimes.voteOnRandomProposal / agentTotal) * 100).toFixed(0)}% of time`);
    console.log('   - Consider caching proposal filtering');
    console.log('   - Batch vote probability calculations');
    console.log('   - Skip agents with 0% voting probability');
  }
}

const args = process.argv.slice(2);
const steps = parseInt(args[0]) || 200;
const members = parseInt(args[1]) || 200;

profileAgentSteps(steps, members).catch(console.error);
