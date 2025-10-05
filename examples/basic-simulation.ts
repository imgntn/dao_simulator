// Basic DAO Simulation Example
// Demonstrates how to use the DAO simulator

import { DAOSimulation } from '../lib/engine/simulation';

async function runBasicSimulation() {
  console.log('🚀 Starting DAO Simulation...\n');

  // Create a new simulation
  const simulation = new DAOSimulation({
    num_developers: 10,
    num_investors: 5,
    num_proposal_creators: 5,
    num_validators: 5,
    num_passive_members: 10,
    comment_probability: 0.5,
    governance_rule: 'majority',
    eventLogging: true,
  });

  console.log(`Initial state:`);
  console.log(`- Members: ${simulation.dao.members.length}`);
  console.log(`- Treasury: ${simulation.dao.treasury.funds.toFixed(2)} DAO_TOKEN`);
  console.log(`- Token Price: ${simulation.dao.treasury.getTokenPrice('DAO_TOKEN').toFixed(2)}\n`);

  // Run simulation for 100 steps
  console.log('Running simulation for 100 steps...\n');

  for (let i = 0; i < 100; i++) {
    simulation.step();

    // Log progress every 10 steps
    if ((i + 1) % 10 === 0) {
      const summary = simulation.getSummary();
      console.log(`Step ${i + 1}:`);
      console.log(`- Members: ${summary.members}`);
      console.log(`- Proposals: ${summary.proposals}`);
      console.log(`- Projects: ${summary.projects}`);
      console.log(`- Token Price: ${summary.tokenPrice.toFixed(2)}`);
      console.log(`- Treasury: ${summary.treasuryFunds.toFixed(2)}\n`);
    }
  }

  // Final summary
  const final = simulation.getSummary();
  console.log('\n📊 Final Summary:');
  console.log(`- Total Steps: ${final.step}`);
  console.log(`- Final Members: ${final.members}`);
  console.log(`- Total Proposals: ${final.proposals}`);
  console.log(`- Total Projects: ${final.projects}`);
  console.log(`- Final Token Price: ${final.tokenPrice.toFixed(2)}`);
  console.log(`- Final Treasury: ${final.treasuryFunds.toFixed(2)}`);

  // Export data
  if (simulation.eventLogger) {
    const summary = simulation.eventLogger.getSummary();
    console.log(`\n📝 Event Log Summary:`);
    console.log(`- Total Events: ${summary.totalEvents}`);
    console.log(`- Event Types: ${summary.eventTypes}`);
    console.log(`- Top Events:`);

    const counts = Object.entries(summary.counts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5);

    counts.forEach(([event, count]) => {
      console.log(`  - ${event}: ${count}`);
    });
  }

  console.log('\n✅ Simulation complete!');

  return simulation;
}

// Run if executed directly
if (typeof window === 'undefined') {
  runBasicSimulation().catch(console.error);
}

export { runBasicSimulation };
