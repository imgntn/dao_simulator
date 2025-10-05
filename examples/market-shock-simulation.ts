// Market Shock Simulation Example
// Demonstrates market volatility and treasury mechanisms

import { DAOSimulation } from '../lib/engine/simulation';

async function runMarketShockSimulation() {
  console.log('📉📈 Market Shock Simulation\n');

  const simulation = new DAOSimulation({
    num_developers: 15,
    num_investors: 10,
    num_traders: 5,
    num_adaptive_investors: 3,
    market_shock_frequency: 20, // Shock every ~20 steps
    marketShockSchedule: {
      50: -0.3, // 30% crash at step 50
      75: 0.5,  // 50% pump at step 75
    },
    eventLogging: true,
  });

  console.log('Initial token price:', simulation.dao.treasury.getTokenPrice('DAO_TOKEN'));

  const priceHistory: number[] = [];

  // Run for 100 steps
  for (let i = 0; i < 100; i++) {
    simulation.step();

    const price = simulation.dao.treasury.getTokenPrice('DAO_TOKEN');
    priceHistory.push(price);

    // Log significant price changes
    if (i > 0) {
      const priceDiff = price - priceHistory[i - 1];
      const pctChange = (priceDiff / priceHistory[i - 1]) * 100;

      if (Math.abs(pctChange) > 10) {
        console.log(
          `Step ${i}: Price ${pctChange > 0 ? '📈' : '📉'} ${pctChange.toFixed(1)}% → ${price.toFixed(2)}`
        );
      }
    }
  }

  // Analysis
  const maxPrice = Math.max(...priceHistory);
  const minPrice = Math.min(...priceHistory);
  const avgPrice = priceHistory.reduce((a, b) => a + b, 0) / priceHistory.length;

  console.log('\n📊 Price Analysis:');
  console.log(`- Initial: ${priceHistory[0].toFixed(2)}`);
  console.log(`- Final: ${priceHistory[priceHistory.length - 1].toFixed(2)}`);
  console.log(`- Max: ${maxPrice.toFixed(2)}`);
  console.log(`- Min: ${minPrice.toFixed(2)}`);
  console.log(`- Average: ${avgPrice.toFixed(2)}`);
  console.log(`- Volatility: ${((maxPrice - minPrice) / avgPrice * 100).toFixed(1)}%`);

  return simulation;
}

if (typeof window === 'undefined') {
  runMarketShockSimulation().catch(console.error);
}

export { runMarketShockSimulation };
