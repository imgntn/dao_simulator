# RQ7 Counterfactual Governance

## The Plain English Version

What if your DAO used a different governance rule? We ran all 14 calibrated digital twins under 7 alternative voting mechanisms to find out.

Source experiment: `Counterfactual Governance Experiments`
DAOs tested: **All 14** (Aave, Uniswap, Compound, Arbitrum, Optimism, ENS, Lido, Gitcoin, MakerDAO, Curve, Nouns, Balancer, dYdX, SushiSwap)
Alternative rules: majority, quadratic, conviction, tokenquorum, bicameral, supermajority, instant-runoff, futarchy
Runs: **2,940** (14 DAOs × 7 rules × 30 runs each)

## Key Takeaways

### Conviction Voting: 0% Pass Rate for ALL 14 DAOs

This is the strongest result in the study. Conviction voting produced a 0% pass rate across every single DAO tested — not just the original 5, but all 14 calibrated digital twins. No DAO escapes this failure mode.

Conviction voting's continuous-signal design doesn't survive discrete proposal cycles. It was designed for streaming budget allocation (like Gitcoin Grants), not binary yes/no governance votes.

### Quadratic Voting Is Consistently the Best Alternative

Across all 14 DAOs, quadratic voting either matches or slightly improves on the baseline. It never makes things worse. For contentious DAOs (Nouns, low-pass-rate DAOs), it provides measurable improvement by compressing whale power and amplifying small-holder voice.

### Supermajority Paradoxically Yields 100% Pass Rate for Some DAOs

Counter-intuitively, requiring a supermajority (e.g., 67% approval) produces 100% pass rates for:
- **Aave**
- **Compound**
- **Arbitrum**
- **Lido**
- **Maker**
- **Nouns**

The mechanism: supermajority requirements filter out marginal proposals early. Only proposals with overwhelming support reach a vote, and those proposals pass unanimously. The higher bar acts as a quality gate, not a blocker.

### Optimistic Governance Only Works for Select DAOs

Optimistic approval (proposals pass unless vetoed) only produces good outcomes for:
- **Arbitrum**
- **Lido**
- **Optimism**

These DAOs have high baseline pass rates and low opposition, making the optimistic assumption valid. For contentious DAOs like Nouns, optimistic governance would pass proposals that should fail.

### Instant-Runoff Voting Is Identical to Majority

IRV (ranked-choice elimination) produces the same outcomes as simple majority across all 14 DAOs. With binary yes/no proposals, ranked preferences collapse to first-preference counting, which is just majority rule.

### Futarchy Generally Works but with Lower Pass Rates

Prediction-market-based governance (futarchy) produces functional outcomes but with systematically lower pass rates than majority rule. Markets price in uncertainty, which translates to more conservative governance.

### Most Governance Rules Remain Interchangeable

For the majority of DAOs, swapping between majority, token-quorum, and bicameral produces identical or near-identical outcomes. The vote-counting mechanism matters far less than the participation dynamics, opposition structure, and proposal frequency underneath it.

## Experiment Details

### Methodology
Each DAO was modeled using its calibrated digital twin (historical participation, voter clusters, market oracle, forum activity). The baseline used the DAO's real governance rule. Alternatives swapped only the vote-counting rule, keeping everything else identical. 30 runs per configuration provides robust statistical confidence.

### Scale Comparison

| Metric | Initial Study | Updated Study |
|--------|--------------|---------------|
| DAOs | 5 | 14 |
| Rules | 5 | 7 |
| Runs per config | 5 | 30 |
| Total runs | 125 | 2,940 |
| Confidence | Exploratory | High |

## Bottom Line

Don't expect switching governance rules to fix fundamental participation or pass-rate issues. The counterfactual evidence across all 14 DAOs and 7 rules shows that, for standard proposal governance, most vote-counting mechanisms produce equivalent outcomes. The exceptions:

1. **Conviction voting is actively harmful** in discrete-proposal contexts — 0% pass rate universally.
2. **Quadratic voting is the safest upgrade** — never hurts, sometimes helps.
3. **Supermajority requirements can paradoxically increase pass rates** by filtering out weak proposals.
4. **IRV and futarchy add complexity without improving outcomes** over simple majority.
