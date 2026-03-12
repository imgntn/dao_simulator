/**
 * /llms.txt — AI agent discovery file
 *
 * Serves a plain-text Markdown document that describes the DAO Simulator
 * project, author expertise, key findings, and links to all research artifacts.
 * This is the primary file AI agents (ChatGPT, Claude, Perplexity, Gemini)
 * use to understand a site at inference time.
 *
 * @see https://llmstxt.org
 */

import { NextResponse } from 'next/server';

const CONTENT = `# DAO Simulator

> Actionable governance findings from 16,370 simulation runs across 21 experiment configurations.

## Author

**James B. Pollack** — independent researcher specializing in DAO governance simulation, agent-based modeling, and decentralized coordination.

- Website: https://jamesbpollack.com
- GitHub: https://github.com/jamesbpollack
- Project: https://daosimulator.com

## About This Research

The DAO Simulator is a large-scale agent-based simulation study of decentralized governance.
It covers six research questions across participation dynamics, governance capture, proposal pipelines,
treasury resilience, inter-DAO cooperation, and LLM-augmented governance.

The simulation engine models autonomous agents (voters, delegates, whales, builders, proposal creators)
interacting under configurable governance rules. Digital twins of 14 real DAOs — including Uniswap,
Compound, Aave, Arbitrum, Optimism, ENS, Lido, Gitcoin, MakerDAO, Curve, Nouns, Balancer, dYdX,
and SushiSwap — are calibrated against on-chain data with an average accuracy score of 0.85.

### Key Findings

1. **Quorum cliff at 10%**: At 5% quorum, 99.9% of proposals reached quorum. At 20%, only 25.4% did. Set quorum from observed turnout, not aspiration.
2. **Quadratic voting cut whale power 43%**: Whale influence dropped from 0.449 to 0.256 under quadratic voting with a 250-token threshold. Capture risk fell 42%.
3. **Temp-check filtering lifts pass rate**: Raising temp-check pressure from 5% to 50% improved pass rate from 96.4% to 98.5%.
4. **Treasury stabilization halves volatility**: Stabilization mechanisms reduced treasury value swings from 0.45–0.50 to 0.24–0.27.
5. **Cross-DAO cooperation is fragile but real**: Inter-DAO success rate was 21–23% with designed coordination vs 0% in isolation. Specialized topology outperformed generic.
6. **Hybrid LLM governance halves latency**: Hybrid mode achieved 808 ms decision latency vs 1,381 ms all-LLM, with equivalent 50% pass rate.

### Methodology

- **Engine**: TypeScript agent-based simulator with Q-learning, policy gradient, and DQN agents
- **Scale**: 16,370 simulation runs, 21 experiment configurations, N=100 per config
- **Calibration**: 14 digital twins calibrated against on-chain governance data, Snapshot votes, forum activity, and token prices
- **Voting mechanisms tested**: Majority, token-weighted, quadratic, instant-runoff (IRV), futarchy (LMSR prediction markets), liquid democracy with decay
- **Governance rules**: 15 real governance rules modeled including dual governance, bicameral, category quorum, and approval voting

## Research Briefs

Six decision briefs summarize findings in plain language:

1. [Participation Dynamics](https://daosimulator.com/en#rq1) — How do we get more people to vote consistently?
2. [Governance Capture Mitigation](https://daosimulator.com/en#rq2) — How do we reduce whale control without freezing the DAO?
3. [Proposal Pipeline Effects](https://daosimulator.com/en#rq3) — How do we make proposals move faster without lowering quality?
4. [Treasury Resilience](https://daosimulator.com/en#rq4) — How do we protect treasury health through volatility?
5. [Inter-DAO Cooperation](https://daosimulator.com/en#rq5) — What kinds of cross-DAO coordination actually work?
6. [LLM Agent Reasoning](https://daosimulator.com/en#rq6) — Where do LLMs help governance, and where do they add risk?

## Papers

- [Core Governance Paper (PDF)](https://daosimulator.com/api/artifacts/paper/main.pdf) — Full synthesis across all research questions

## Digital Twins

14 major DAOs modeled as digital twins, each calibrated against real on-chain data:

| DAO | Governance Rule | Calibration Score |
|-----|----------------|-------------------|
| Gitcoin | Quorum | 0.922 |
| Lido | Dual Governance | 0.887 |
| Curve | Quorum | 0.878 |
| Aave | Token Quorum | 0.875 |
| Balancer | Quorum | 0.870 |
| SushiSwap | Majority | 0.867 |
| dYdX | Quorum | 0.864 |
| ENS | Token Quorum | 0.859 |
| MakerDAO | Approval Voting | 0.854 |
| Uniswap | Token Quorum | 0.850 |
| Arbitrum | Category Quorum | 0.846 |
| Optimism | Bicameral | 0.818 |
| Compound | Token Quorum | 0.818 |
| Nouns | Quorum | 0.780 |

## Technology

- TypeScript simulation engine with reinforcement learning (Q-learning, DQN, policy gradient)
- Next.js research site with i18n (en, es, zh, ja)
- Three.js 3D governance visualizations
- Python calibration pipeline for historical data ingestion

## Contact

For citations, collaborations, or questions about the research:
- Website: https://jamesbpollack.com
- GitHub: https://github.com/jamesbpollack
`;

export function GET() {
  return new NextResponse(CONTENT, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
