# PRESS RELEASE

## Study Reveals Which Anti-Whale Mechanisms Actually Work in DAOs

**Simulation research compares vote caps, quadratic voting, and velocity penalties—finds hybrid approaches most effective**

FOR IMMEDIATE RELEASE

---

**Key Findings:**
- Pure token voting allows top 10 addresses to control 50%+ of governance outcomes
- Quadratic voting cuts voting power inequality roughly in half
- Vote caps work but create incentives for "sybil attacks" (splitting into multiple wallets)
- Combining mechanisms provides strongest defense against capture

---

### The Problem: Decentralization in Name Only

In MakerDAO, researchers found that fewer than 20 addresses controlled over 50% of voting power. In Uniswap, the top 10 addresses dominate governance outcomes. Across the DAO ecosystem, a pattern repeats: despite promises of distributed decision-making, a small elite effectively controls most organizations.

This is governance capture—and new research provides the first systematic comparison of mechanisms designed to prevent it.

### Three Defense Strategies Tested

The study evaluated three approaches to limiting whale influence:

**1. Vote Caps**
Hard limits on how much voting power any single address can wield. Simple and direct, but whales can split holdings across multiple wallets to circumvent caps.

**2. Quadratic Voting**
Voting power scales as the square root of tokens held. A holder with 100x more tokens gets only 10x more voting power—dramatically compressing inequality without hard cutoffs.

**3. Velocity Penalties**
Recently-acquired tokens have reduced voting weight. This prevents "governance attacks" where actors rapidly buy tokens to influence a specific vote.

### What the Simulations Revealed

Across 675 simulation runs testing 27 different configurations, clear patterns emerged:

**Quadratic voting is the most effective single mechanism.** It roughly halves the Gini coefficient (a measure of inequality) of voting power without creating cliff effects or strong sybil incentives.

**Vote caps work but have sharp edges.** A 2% cap dramatically reduces whale influence, but creates strong incentives for address splitting. Caps work better when applied to delegation (limiting how much power any delegate can accumulate) rather than direct holdings.

**Velocity penalties address a specific threat.** They're most valuable as a complement to other mechanisms, preventing rapid accumulation attacks while other defenses handle existing concentration.

**The most robust configurations combine mechanisms.** The research recommends: quadratic voting as the base layer, plus delegation caps (5-10%), plus a 30-60 day velocity penalty for new tokens.

### The Tradeoff: Security vs. Efficiency

Every mitigation mechanism imposes some cost to governance efficiency. More aggressive caps mean less total voting power, potentially making quorum harder to reach. The research identifies configurations on the "Pareto frontier"—the best achievable tradeoffs between capture resistance and operational throughput.

### Real-World Implications

Several major protocols have already implemented mechanisms aligned with these findings:

- **Optimism** uses delegate voting power caps
- **Gitcoin** combines quadratic funding with identity verification
- **Compound** relies on pure token voting—and shows the concentration patterns the research predicts

The research suggests that capture mitigation is not optional for DAOs serious about decentralization. "The mechanisms exist," the paper notes. "The choice is not whether to implement them, but which combination best serves the DAO's values."

---

**Contact:**
James Pollack
Independent Researcher
james@jamesbpollack.com

**Paper:** "Mitigating Governance Capture in Decentralized Organizations: Comparing Vote Caps, Quadratic Mechanisms, and Velocity Penalties"

**Code:** https://github.com/imgntn/dao_simulator

---

*This research was conducted independently and is released to advance the field of decentralized governance.*
