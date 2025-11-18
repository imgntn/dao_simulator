import { runBasicSimulation } from './basic-simulation';
import { runMarketShockSimulation } from './market-shock-simulation';
import { runGovernanceSimulation } from './governance-simulation';

type ScenarioName = 'basic' | 'market-shock' | 'governance' | 'all';

const scenarios: Record<Exclude<ScenarioName, 'all'>, () => Promise<any>> = {
  'basic': runBasicSimulation,
  'market-shock': runMarketShockSimulation,
  'governance': runGovernanceSimulation,
};

function parseScenario(): ScenarioName {
  const argPair = process.argv.slice(2).find(arg => arg.startsWith('--scenario='));
  if (!argPair) {
    return 'basic';
  }
  const value = argPair.split('=')[1] as ScenarioName;
  if (value && (value in scenarios || value === 'all')) {
    return value;
  }
  console.warn(`Unknown scenario "${value}", defaulting to basic.`);
  return 'basic';
}

async function main() {
  const scenario = parseScenario();
  if (scenario === 'all') {
    for (const key of Object.keys(scenarios) as Array<Exclude<ScenarioName, 'all'>>) {
      console.log(`\n\u2728 Running ${key} scenario \u2728\n`);
      await scenarios[key]();
    }
    return;
  }

  await scenarios[scenario]();
}

main().catch((error) => {
  console.error('Example runner failed:', error);
  process.exitCode = 1;
});
