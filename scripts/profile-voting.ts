#!/usr/bin/env node
/**
 * Deep profiler for voteOnRandomProposal
 * Identifies which operations inside voting are slowest
 */

import { DAOSimulation } from '../lib/engine/simulation';
import { DAOMember } from '../lib/agents/base';
import { DelegationResolver } from '../lib/delegation/delegation-resolver';
import { performance } from 'perf_hooks';

async function profileVoting(steps: number, numMembers: number) {
  console.log(`\n=== Voting Operation Profiler ===`);
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

  // Timing accumulators
  const timings = {
    fatigueUpdate: 0,
    earlyExitCheck: 0,
    getOpenProposals: 0,
    proposalFiltering: 0,
    reminderFiltering: 0,
    votingProbability: 0,
    actualVoting: 0,
    delegationResolution: 0,
    voteRecording: 0,
    fatigueApplication: 0,
    cleanupOperations: 0,
    total: 0,
  };
  let callCount = 0;
  let earlyExitCount = 0;
  let voteCastCount = 0;

  // Instrument the voting method
  const originalVote = DAOMember.prototype.voteOnRandomProposal;
  const originalResolve = DelegationResolver.resolveVotingPower;

  // Track delegation resolution time
  let delegationTime = 0;
  (DelegationResolver as any).resolveVotingPower = function(member: DAOMember) {
    const start = performance.now();
    const result = originalResolve.call(this, member);
    delegationTime += performance.now() - start;
    return result;
  };

  (DAOMember.prototype as any).voteOnRandomProposal = function(this: DAOMember) {
    const totalStart = performance.now();
    callCount++;

    if (!this.model.dao) return;

    // Time fatigue update
    let start = performance.now();
    this.updateVoterFatigue();
    timings.fatigueUpdate += performance.now() - start;

    // Time early exit check
    start = performance.now();
    const effectiveProb = this.getEffectiveVotingProbability();
    timings.earlyExitCheck += performance.now() - start;

    if (effectiveProb < 0.001) {
      earlyExitCount++;
      timings.total += performance.now() - totalStart;
      return;
    }

    // Time getOpenProposals
    start = performance.now();
    const openProposals = this.model.dao.getOpenProposals();
    timings.getOpenProposals += performance.now() - start;

    // Time activeIds creation and cleanup
    start = performance.now();
    const activeIds = new Set(openProposals.map(p => p.uniqueId));
    if (this.proposalsConsidered.size > 0) {
      for (const id of this.proposalsConsidered) {
        if (!activeIds.has(id)) {
          this.proposalsConsidered.delete(id);
          this.proposalsReminded.delete(id);
        }
      }
    }
    if (this.votes.size > activeIds.size * 2) {
      for (const proposalId of this.votes.keys()) {
        if (!activeIds.has(proposalId) &&
            !this.model.dao.proposals.some(p => p.uniqueId === proposalId)) {
          this.votes.delete(proposalId);
          this.comments.delete(proposalId);
        }
      }
    }
    timings.cleanupOperations += performance.now() - start;

    // Time proposal filtering
    start = performance.now();
    const openProps = openProposals.filter(p => {
      const isMultiStage = Array.isArray((p as any).stageConfigs);
      if (isMultiStage) {
        const multiStage = p as any;
        if (!multiStage.isInVotingStage || multiStage.isCurrentStageExpired) {
          return false;
        }
      }
      const inVotingPeriod = this.model.currentStep <= p.creationTime + p.votingPeriod;
      const notYetConsidered = !this.proposalsConsidered.has(p.uniqueId);
      return inVotingPeriod && notYetConsidered;
    });
    timings.proposalFiltering += performance.now() - start;

    // Time reminder filtering
    start = performance.now();
    const reminderProps = openProposals.filter(p => {
      if (!this.proposalsConsidered.has(p.uniqueId)) return false;
      if (this.proposalsReminded.has(p.uniqueId)) return false;
      if (this.votes.has(p.uniqueId)) return false;
      const isMultiStage = Array.isArray((p as any).stageConfigs);
      if (isMultiStage) {
        const multiStage = p as any;
        if (!multiStage.isInVotingStage || !multiStage.currentStageState) {
          return false;
        }
      }
      const stageDuration = isMultiStage && (p as any).currentStageState
        ? (p as any).currentStageState.endStep - (p as any).currentStageState.startStep
        : p.votingPeriod;
      const votingEnd = isMultiStage
        ? (p as any).currentStageState.endStep
        : p.creationTime + p.votingPeriod;
      const remaining = votingEnd - this.model.currentStep;
      const reminderWindow = Math.max(1, Math.floor(stageDuration * 0.2));
      return remaining <= reminderWindow && remaining >= 0;
    });
    timings.reminderFiltering += performance.now() - start;

    if (openProps.length === 0 && reminderProps.length === 0) {
      timings.total += performance.now() - totalStart;
      return;
    }

    let votedCount = 0;

    // Time voting loop
    for (const proposal of openProps) {
      this.proposalsConsidered.add(proposal.uniqueId);

      start = performance.now();
      const prob = (this as any).getProposalVotingProbability(proposal, false);
      timings.votingProbability += performance.now() - start;

      if (Math.random() < prob) {
        start = performance.now();
        delegationTime = 0;
        this.voteOnProposal(proposal);
        timings.actualVoting += performance.now() - start;
        timings.delegationResolution += delegationTime;
        votedCount++;
        voteCastCount++;
      }
    }

    for (const proposal of reminderProps) {
      this.proposalsReminded.add(proposal.uniqueId);

      start = performance.now();
      const prob = (this as any).getProposalVotingProbability(proposal, true);
      timings.votingProbability += performance.now() - start;

      if (Math.random() < prob) {
        start = performance.now();
        delegationTime = 0;
        this.voteOnProposal(proposal);
        timings.actualVoting += performance.now() - start;
        timings.delegationResolution += delegationTime;
        votedCount++;
        voteCastCount++;
      }
    }

    // Time fatigue application
    if (votedCount > 0) {
      start = performance.now();
      for (let i = 0; i < votedCount; i++) {
        (this as any).applyVoteFatigue();
      }
      timings.fatigueApplication += performance.now() - start;
    }

    timings.total += performance.now() - totalStart;
  };

  console.log('Running simulation...\n');
  const totalStart = performance.now();

  for (let i = 0; i < steps; i++) {
    await sim.step();
    if ((i + 1) % 50 === 0) {
      process.stdout.write(`\rStep ${i + 1}/${steps}`);
    }
  }

  const totalTime = performance.now() - totalStart;
  console.log('\n');

  // Restore original methods
  DAOMember.prototype.voteOnRandomProposal = originalVote;
  (DelegationResolver as any).resolveVotingPower = originalResolve;

  // Report
  console.log('=== voteOnRandomProposal Breakdown ===');
  console.log(`Total calls: ${callCount}`);
  console.log(`Early exits (prob < 0.001): ${earlyExitCount} (${((earlyExitCount / callCount) * 100).toFixed(1)}%)`);
  console.log(`Votes cast: ${voteCastCount}`);
  console.log('');

  console.log(`${'Operation'.padEnd(25)} ${'Time (ms)'.padStart(12)} ${'%'.padStart(8)} ${'Per Call (µs)'.padStart(15)}`);
  console.log('-'.repeat(65));

  const sortedTimings = Object.entries(timings)
    .filter(([k]) => k !== 'total')
    .sort((a, b) => b[1] - a[1]);

  for (const [name, time] of sortedTimings) {
    const pct = (time / timings.total) * 100;
    const perCall = (time / callCount) * 1000; // microseconds
    console.log(
      `${name.padEnd(25)} ${time.toFixed(2).padStart(12)} ${pct.toFixed(1).padStart(7)}% ${perCall.toFixed(2).padStart(14)}`
    );
  }
  console.log('-'.repeat(65));
  console.log(`${'TOTAL'.padEnd(25)} ${timings.total.toFixed(2).padStart(12)} ${'100.0%'.padStart(8)} ${((timings.total / callCount) * 1000).toFixed(2).padStart(14)}`);

  console.log('\n=== Key Insights ===');

  const topOp = sortedTimings[0];
  console.log(`1. Top bottleneck: ${topOp[0]} (${((topOp[1] / timings.total) * 100).toFixed(0)}%)`);

  if (timings.delegationResolution > timings.actualVoting * 0.3) {
    console.log(`2. Delegation resolution is ${((timings.delegationResolution / timings.actualVoting) * 100).toFixed(0)}% of actual voting time`);
  }

  if (earlyExitCount / callCount < 0.1) {
    console.log(`3. Early exit optimization has low impact (only ${((earlyExitCount / callCount) * 100).toFixed(0)}% early exits)`);
  }

  console.log(`\nSimulation time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`Proposals: ${sim.dao.proposals.length} (${sim.dao.proposals.filter(p => p.status === 'open').length} open)`);
}

const args = process.argv.slice(2);
const steps = parseInt(args[0]) || 200;
const members = parseInt(args[1]) || 200;

profileVoting(steps, members).catch(console.error);
