# RQ7 Counterfactual Governance

## The Plain English Version

What if your DAO used a different governance rule? We ran 5 calibrated digital twins under alternative voting mechanisms to find out.

Source experiment: `Counterfactual Governance Experiments`
DAOs tested: **Optimism, Uniswap, Compound, Nouns, Lido**
Alternative rules: majority, quadratic, conviction, tokenquorum, bicameral
Episodes: 5 per configuration, 720 steps each

## Key Takeaways

### Conviction Voting Universally Collapsed Pass Rates
- Lido: 100% -> 0% (score delta: -0.204)
- Compound: 80.9% -> 0% (score delta: -0.185)
- Nouns: 47.5% -> 0% (score delta: -0.155)
- Optimism: 83.3% -> 10% (score delta: -0.115)
- Uniswap: 80% -> 20% (score delta: -0.111)

Conviction voting's continuous-signal design doesn't survive discrete proposal cycles. It was designed for streaming budget allocation (like Gitcoin Grants), not binary yes/no governance votes.

### Most Governance Rules Are Interchangeable
For each DAO, majority, quadratic, token-quorum, and bicameral produced **identical or near-identical scores**:

| DAO | Baseline Rule | Score | Alt Rules Score |
|-----|-------------|-------|-----------------|
| Lido | Dual Governance | 0.898 | 0.898-0.899 |
| Optimism | Bicameral | 0.842 | 0.827-0.842 |
| Compound | Token Quorum | 0.840 | 0.840 |
| Uniswap | Token Quorum | 0.804 | 0.804 |
| Nouns | Quorum | 0.736 | 0.736-0.765 |

The vote-counting mechanism matters far less than the participation dynamics, opposition structure, and proposal frequency underneath it.

### Quadratic Voting Helps Contentious DAOs (Slightly)
Only Nouns showed measurable improvement under quadratic voting:
- Score: 0.736 -> 0.765 (+0.029)
- Pass rate: 47.5% -> 48.1% (+0.6%)
- Throughput: +8.3%

Nouns is the most contentious DAO in the study (45% historical pass rate, 33% of agents with opposition bias). Quadratic voting's power-compression effect gives small holders more relative voice in contested votes.

## Experiment Details

### Methodology
Each DAO was modeled using its calibrated digital twin (historical participation, voter clusters, market oracle, forum activity). The baseline used the DAO's real governance rule. Alternatives swapped only the vote-counting rule, keeping everything else identical.

### Results by DAO

**Optimism** (baseline: bicameral, score 0.842)
- Majority: 0.842 (no change)
- Quadratic: 0.827 (-0.015) — slightly lower, pass rate rose to 90%
- Conviction: 0.726 (-0.115) — pass rate collapsed to 10%
- Token Quorum: 0.842 (no change)

**Uniswap** (baseline: tokenquorum, score 0.804)
- Majority: 0.804 (no change)
- Quadratic: 0.804 (no change)
- Conviction: 0.692 (-0.111) — pass rate collapsed to 20%
- Bicameral: 0.804 (no change)

**Compound** (baseline: tokenquorum, score 0.840)
- Majority: 0.840 (no change)
- Quadratic: 0.840 (no change)
- Conviction: 0.656 (-0.185) — pass rate collapsed to 0%
- Bicameral: 0.840 (no change)

**Nouns** (baseline: quorum, score 0.736)
- Majority: 0.736 (no change)
- Quadratic: 0.765 (+0.029) — small improvement
- Conviction: 0.581 (-0.155) — pass rate collapsed to 0%
- Token Quorum: 0.736 (no change)

**Lido** (baseline: dualgovernance, score 0.898)
- Majority: 0.898 (no change)
- Quadratic: 0.899 (+0.002) — negligible
- Conviction: 0.694 (-0.204) — pass rate collapsed to 0%
- Token Quorum: 0.898 (no change)

## Bottom Line

Don't expect switching governance rules to fix fundamental participation or pass-rate issues. The counterfactual evidence shows that, for standard proposal governance, most vote-counting mechanisms produce equivalent outcomes. The one exception: conviction voting is actively harmful in discrete-proposal contexts. Save it for continuous budget allocation where it was designed to work.
