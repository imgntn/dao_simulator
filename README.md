# 🎉 DAO Simulator

**Production-ready TypeScript/Next.js DAO simulation engine**

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the simulator.

## 📊 What's Included

### **61 TypeScript Files**

- **Agents**: 22 types (Developer, Investor, Trader, Validator, etc.)
- **Data Structures**: 13 structures (DAO, Proposals, Treasury, NFT Marketplace, etc.)
- **Engine**: 4 core components
- **Utilities**: 15 modules
- **API Routes**: 2 endpoints
- **Examples**: 3 demonstration scripts

### ✅ Complete DAO Ecosystem
- DAO with full treasury system (AMM, staking, pools)
- Proposals (Funding, Governance, Membership, Quadratic, Bounty)
- Projects and Guilds
- NFT Marketplace
- Disputes and Violations
- Cross-DAO Bridge
- Prediction Markets
- Reputation Tracking
- Market Shocks
- Marketing Campaigns

### ✅ Governance & Voting
- 7 Governance Rules (Majority, Quorum, Supermajority, etc.)
- 4 Voting Strategies (Default, Quadratic, Reputation, Token-weighted)
- Plugin system for custom rules

### ✅ Modern Web Features
- Full TypeScript with strict type safety
- IndexedDB event logging (persistent storage)
- Next.js API routes for remote control
- Parallel and async schedulers
- Real-time data collection
- CSV/JSON export functionality

## 🎯 Usage Examples

### Basic Simulation
```typescript
import { DAOSimulation } from '@/lib';

const sim = new DAOSimulation({
  num_developers: 15,
  num_investors: 10,
  governance_rule: 'quorum',
  eventLogging: true,
});

sim.run(200);
console.log(`Final price: ${sim.dao.treasury.getTokenPrice('DAO_TOKEN')}`);
```

### Market Shock Testing
```typescript
const sim = new DAOSimulation({
  market_shock_frequency: 20,
  marketShockSchedule: {
    50: -0.3,  // 30% crash at step 50
    100: 0.5,  // 50% pump at step 100
  },
});
```

### API Control
```bash
# Create simulation
POST /api/simulation
{
  "num_developers": 10,
  "governance_rule": "majority"
}

# Step forward
PUT /api/simulation
{
  "id": "sim_123",
  "action": "step"
}

# Get state
GET /api/simulation?id=sim_123
```

## 📖 Documentation

See `/examples` folder for runnable demos:
- `basic-simulation.ts` - Simple 100-step simulation
- `market-shock-simulation.ts` - Price volatility demo
- `governance-simulation.ts` - Rule comparison

## 📂 Project Structure

```
/app              - Next.js pages and routes
/components       - React components
/lib              - Core simulation engine
  /agents         - All agent types
  /data_structures - DAO, Treasury, Proposals, etc.
  /engine         - Simulation orchestration
  /utils          - Helpers and utilities
/examples         - Usage examples
/types            - TypeScript definitions
/legacy-python    - Original Python implementation (archived)
```

## 🛠 Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **IndexedDB** - Event persistence

## 🚀 Deploy on Railway

This project is configured for deployment on [Railway](https://railway.app).

```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
railway up
```

## 📝 Legacy Python Code

The original Python implementation has been moved to `/legacy-python` for reference.

---

**Run `npm run dev` and start simulating! 🚀**
