# SSRN Preprint Submission Materials

## Paper Metadata

**Title:** DAO Simulator: Agent-Based Modeling of Decentralized Governance Dynamics with Calibrated Digital Twins

**Authors:** James B. Pollack

**Abstract:**
We present DAO Simulator, an open-source agent-based modeling framework for studying decentralized autonomous organization (DAO) governance. The system models 25+ agent archetypes operating under configurable governance rules including majority voting, supermajority, quadratic voting, conviction voting, futarchy via prediction markets, and instant-runoff voting. We construct calibrated digital twins of 14 major DAOs — including Uniswap, Compound, Aave, Arbitrum, Optimism, and Gitcoin — by fitting simulation parameters to historical on-chain data, Snapshot votes, forum activity, and token prices. Calibration accuracy averages 85.6% across all twins. Through 21,919 simulation runs across 18 experiment configurations addressing 7 research questions, we find: (1) quorum-passage relationships follow a sigmoid curve with hidden governance cliffs where small parameter changes cause catastrophic failure; (2) scale is the dominant factor in governance resilience — scaling from 50 to 500 members reduces capture risk by 18% and single-entity control by 60%; (3) quadratic voting reduces whale influence by 43% while simultaneously increasing pass rates; (4) advanced voting mechanisms (instant-runoff voting, futarchy, liquid democracy with delegation decay) produce null results versus simple majority voting, suggesting governance complexity does not improve outcomes; (5) conviction voting universally collapses governance throughput (0% pass rate) across all 14 calibrated twins; (6) LLM-powered agents with chain-of-thought reasoning and enriched context improve governance quality (+6.7pt pass rate above heuristic baseline), reversing a prior finding where impoverished prompts caused degradation; and (7) reinforcement learning exhibits 95% diminishing returns — basic tabular Q-learning captures nearly all learnable governance behavior, with advanced methods (DQN, policy gradient, hierarchical RL) adding marginal improvement. The framework includes a browser-based 3D visualization, multi-run statistical analysis with confidence intervals, and a research console for parameter sweep experiments. All code, data, and digital twin configurations are open-source under AGPL-3.0.

**Keywords:** DAO governance, agent-based modeling, digital twins, quadratic voting, conviction voting, futarchy, decentralized governance, simulation, reinforcement learning, multi-agent systems

**JEL Classification:** D71 (Social Choice; Clubs; Committees), D85 (Network Formation and Analysis), C63 (Computational Techniques; Simulation Modeling), G34 (Mergers; Acquisitions; Restructuring; Corporate Governance), O33 (Technological Change)

## SSRN Categories

**Primary Network:** Computer Science Research Network (CompSciRN)
- Subject: Artificial Intelligence & Machine Learning

**Secondary Networks:**
- Governance Studies Research Network
  - Subject: Corporate Governance
- Political Economy Research Network
  - Subject: Voting & Elections

## Submission Checklist

- [ ] Convert main paper from LaTeX/Markdown to PDF (use `npm run paper:compile`)
- [ ] Ensure all figures are embedded (not linked)
- [ ] Add page numbers and line numbers for reviewer convenience
- [ ] Include appendix with digital twin calibration tables
- [ ] Include appendix with full experiment configurations
- [ ] Verify all references are formatted consistently
- [ ] Add ORCID if available
- [ ] Prepare supplementary materials ZIP:
  - [ ] Experiment configuration YAML files
  - [ ] Calibration profile summaries (14 DAOs)
  - [ ] Key result CSVs (summary statistics, not raw runs)

## Suggested Reviewers / Related Work to Cite

### Key Citations
1. Fritsch, R. et al. (2022). "Analyzing Voting Power in Decentralized Governance." arXiv:2208.03852
2. Barbereau, T. et al. (2022). "Decentralised Finance's Unregulated Governance." Journal of Financial Regulation
3. Feichtinger, R. et al. (2023). "The Hidden Shortcomings of (D)AO Governance." arXiv:2302.12125
4. El Faqir, Y. et al. (2020). "An overview of decentralized autonomous organizations on the blockchain." CSCW
5. Ng, A. Y. et al. (1999). "Policy invariance under reward transformations." ICML (for RL reward shaping)

### Related Simulation Work
6. Epstein, J. M. & Axtell, R. (1996). "Growing Artificial Societies." MIT Press
7. Wilensky, U. & Rand, W. (2015). "An Introduction to Agent-Based Modeling." MIT Press

### DAO Governance Analysis
8. Sharma, T. et al. (2023). "Unpacking How Decentralized Autonomous Organizations (DAOs) Work in Practice." arXiv:2304.09822
9. Sun, X. et al. (2023). "Decentralization Illusion in Decentralized Finance." arXiv:2203.16612

## Cover Letter Template

Dear Editors,

I am pleased to submit "DAO Simulator: Agent-Based Modeling of Decentralized Governance Dynamics with Calibrated Digital Twins" for consideration as a preprint on SSRN.

This paper introduces the first comprehensive agent-based simulation framework with calibrated digital twins for studying DAO governance. Unlike prior work that analyzes governance outcomes from static snapshots, our approach generates dynamic counterfactual scenarios — allowing researchers and practitioners to test "what-if" governance changes before deploying them on-chain.

Key contributions include:
- A calibrated simulation engine with 14 real-world DAO digital twins (avg. 85.6% accuracy)
- Discovery of governance cliffs in quorum-passage relationships
- Evidence that scale is the #1 factor in governance resilience (50→500 members: -18% capture risk, -60% single-entity control)
- Evidence that quadratic voting improves both fairness and efficiency simultaneously
- A null result for advanced voting mechanisms (IRV, futarchy, liquid democracy) vs. majority voting
- Evidence that LLM-powered agents with thinking mode improve governance quality vs. heuristic agents (+6.7pt pass rate)
- First systematic counterfactual comparison of 7 governance mechanisms across 14 DAOs, totaling 21,919 simulation runs
- An open-source, browser-based research platform for reproducible governance experiments

The paper and all supporting code are available at https://daosimulator.com and https://github.com/imgntn/dao_simulator under AGPL-3.0.

Sincerely,
James B. Pollack

## File Naming Convention

```
pollack-dao-simulator-2026.pdf          # Main paper
pollack-dao-simulator-2026-appendix.pdf # Appendices
pollack-dao-simulator-2026-supp.zip     # Supplementary materials
```
