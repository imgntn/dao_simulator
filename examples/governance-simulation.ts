// Governance Simulation Example
// Demonstrates different governance rules and voting behaviors

import { DAOSimulation } from '../lib/engine/simulation';

async function runGovernanceSimulation() {
  console.log('🗳️  Governance Simulation\n');

  const rules = ['majority', 'quorum', 'supermajority'];

  for (const rule of rules) {
    console.log(`\n📜 Testing ${rule.toUpperCase()} rule:`);

    const simulation = new DAOSimulation({
      num_developers: 10,
      num_proposal_creators: 8,
      num_delegators: 10,
      num_liquid_delegators: 5,
      governance_rule: rule,
      comment_probability: 0.7,
    });

    // Run for 50 steps
    simulation.run(50);

    const proposals = simulation.dao.proposals;
    const approved = proposals.filter(p => p.status === 'approved').length;
    const rejected = proposals.filter(p => p.status === 'rejected').length;
    const pending = proposals.filter(p => p.status === 'pending').length;

    console.log(`  Total Proposals: ${proposals.length}`);
    console.log(`  ✅ Approved: ${approved} (${(approved / proposals.length * 100).toFixed(1)}%)`);
    console.log(`  ❌ Rejected: ${rejected} (${(rejected / proposals.length * 100).toFixed(1)}%)`);
    console.log(`  ⏳ Pending: ${pending}`);

    // Delegation analysis
    const delegators = simulation.dao.members.filter(m =>
      m.constructor.name === 'Delegator' || m.constructor.name === 'LiquidDelegator'
    );

    const delegated = delegators.filter((d: any) => d.representative !== undefined).length;

    console.log(`  Delegation Rate: ${(delegated / delegators.length * 100).toFixed(1)}%`);
  }

  console.log('\n✅ Governance comparison complete!');
}

if (typeof window === 'undefined') {
  runGovernanceSimulation().catch(console.error);
}

export { runGovernanceSimulation };
