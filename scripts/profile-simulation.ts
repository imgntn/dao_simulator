#!/usr/bin/env node
/**
 * Simulation Profiler
 *
 * Runs a simulation with detailed timing instrumentation to identify bottlenecks.
 * Usage: npx tsx scripts/profile-simulation.ts [steps] [members]
 */

import { DAOSimulation } from '../lib/engine/simulation';
import { performance } from 'perf_hooks';

interface TimingStats {
  count: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
}

class Profiler {
  private timings = new Map<string, TimingStats>();
  private startTimes = new Map<string, number>();

  start(label: string): void {
    this.startTimes.set(label, performance.now());
  }

  end(label: string): void {
    const startTime = this.startTimes.get(label);
    if (startTime === undefined) return;

    const elapsed = performance.now() - startTime;
    const existing = this.timings.get(label) || { count: 0, totalMs: 0, minMs: Infinity, maxMs: 0 };

    this.timings.set(label, {
      count: existing.count + 1,
      totalMs: existing.totalMs + elapsed,
      minMs: Math.min(existing.minMs, elapsed),
      maxMs: Math.max(existing.maxMs, elapsed),
    });

    this.startTimes.delete(label);
  }

  getReport(): { label: string; stats: TimingStats; avgMs: number; pct: number }[] {
    const total = Array.from(this.timings.values()).reduce((sum, s) => sum + s.totalMs, 0);

    return Array.from(this.timings.entries())
      .map(([label, stats]) => ({
        label,
        stats,
        avgMs: stats.totalMs / stats.count,
        pct: (stats.totalMs / total) * 100,
      }))
      .sort((a, b) => b.stats.totalMs - a.stats.totalMs);
  }
}

async function profileSimulation(steps: number, numMembers: number) {
  console.log(`\n=== Simulation Profiler ===`);
  console.log(`Steps: ${steps}, Members: ${numMembers}\n`);

  const profiler = new Profiler();

  // Create simulation with profiling wrapper
  profiler.start('initialization');
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
  profiler.end('initialization');

  // Detailed step profiling
  const stepTimings = {
    schedulerStep: 0,
    resolveProposals: 0,
    dataCollect: 0,
    treasuryPolicy: 0,
    participationPolicy: 0,
    governanceProcessor: 0,
    other: 0,
  };

  // Wrap key methods for profiling
  const originalResolve = sim.resolveBasicProposals.bind(sim);
  const originalCollect = sim.dataCollector.collect.bind(sim.dataCollector);

  // Run simulation with timing
  console.log('Running simulation...\n');
  profiler.start('total_simulation');

  for (let i = 0; i < steps; i++) {
    profiler.start('step_total');

    // Time scheduler step (agent actions)
    const schedStart = performance.now();
    const schedResult = sim.schedule.step();
    if (schedResult instanceof Promise) {
      await schedResult;
    }
    stepTimings.schedulerStep += performance.now() - schedStart;

    // Time proposal resolution
    const resolveStart = performance.now();
    originalResolve();
    stepTimings.resolveProposals += performance.now() - resolveStart;

    // Time data collection
    const collectStart = performance.now();
    originalCollect(sim.dao);
    stepTimings.dataCollect += performance.now() - collectStart;

    // Complete the step
    sim.currentStep++;
    sim.dao.currentStep = sim.currentStep;

    profiler.end('step_total');

    // Progress update
    if ((i + 1) % 100 === 0 || i === steps - 1) {
      process.stdout.write(`\rStep ${i + 1}/${steps}`);
    }
  }

  profiler.end('total_simulation');
  console.log('\n');

  // Calculate percentages
  const totalStepTime = Object.values(stepTimings).reduce((a, b) => a + b, 0);

  console.log('=== Step Breakdown ===');
  console.log(`${'Component'.padEnd(25)} ${'Time (ms)'.padStart(12)} ${'%'.padStart(8)} ${'Per Step (ms)'.padStart(15)}`);
  console.log('-'.repeat(65));

  const sortedTimings = Object.entries(stepTimings).sort((a, b) => b[1] - a[1]);
  for (const [name, time] of sortedTimings) {
    const pct = (time / totalStepTime) * 100;
    const perStep = time / steps;
    console.log(`${name.padEnd(25)} ${time.toFixed(2).padStart(12)} ${pct.toFixed(1).padStart(7)}% ${perStep.toFixed(3).padStart(14)}`);
  }
  console.log('-'.repeat(65));
  console.log(`${'TOTAL'.padEnd(25)} ${totalStepTime.toFixed(2).padStart(12)} ${'100.0%'.padStart(8)} ${(totalStepTime / steps).toFixed(3).padStart(14)}`);

  // Memory stats
  const memUsage = process.memoryUsage();
  console.log('\n=== Memory Usage ===');
  console.log(`Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);

  // DAO stats
  console.log('\n=== Simulation Stats ===');
  console.log(`Members: ${sim.dao.members.length}`);
  console.log(`Proposals created: ${sim.dao.proposals.length}`);
  console.log(`Open proposals: ${sim.dao.proposals.filter(p => p.status === 'open').length}`);
  console.log(`Treasury: ${sim.dao.treasury.funds.toFixed(2)}`);

  // Per-step timing
  const avgStepMs = totalStepTime / steps;
  const estimatedRuns2000Steps = (avgStepMs * 2000) / 1000; // seconds per run
  console.log('\n=== Performance Estimates ===');
  console.log(`Average step time: ${avgStepMs.toFixed(3)} ms`);
  console.log(`Estimated time per 2000-step run: ${estimatedRuns2000Steps.toFixed(2)} seconds`);
  console.log(`Estimated runs/second: ${(1 / estimatedRuns2000Steps).toFixed(2)}`);
  console.log(`With 8 workers: ${(8 / estimatedRuns2000Steps).toFixed(2)} runs/second`);

  // Identify bottleneck
  const [topBottleneck] = sortedTimings;
  console.log(`\n=== Primary Bottleneck ===`);
  console.log(`${topBottleneck[0]}: ${((topBottleneck[1] / totalStepTime) * 100).toFixed(1)}% of step time`);

  if (topBottleneck[0] === 'schedulerStep') {
    console.log('\nThe scheduler (agent step execution) is the bottleneck.');
    console.log('Optimization options:');
    console.log('  1. Reduce agent complexity (simplify step() methods)');
    console.log('  2. Skip inactive agents');
    console.log('  3. Batch similar operations');
    console.log('  4. Consider GPU acceleration for agent decisions');
  } else if (topBottleneck[0] === 'dataCollect') {
    console.log('\nData collection is the bottleneck.');
    console.log('Optimization options:');
    console.log('  1. Reduce collection frequency');
    console.log('  2. Skip expensive metrics (Gini, rankings)');
    console.log('  3. Use sampling instead of full calculation');
  } else if (topBottleneck[0] === 'resolveProposals') {
    console.log('\nProposal resolution is the bottleneck.');
    console.log('Optimization options:');
    console.log('  1. Index proposals by status');
    console.log('  2. Cache voting power calculations');
    console.log('  3. Batch proposal state updates');
  }
}

// Parse args
const args = process.argv.slice(2);
const steps = parseInt(args[0]) || 500;
const members = parseInt(args[1]) || 200;

profileSimulation(steps, members).catch(console.error);
