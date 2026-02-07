# PRESS RELEASE

## Research Shows How DAOs Can Process Proposals Faster Without Sacrificing Quality

**Simulation study identifies optimal settings for temp-checks, fast-tracks, and voting windows**

FOR IMMEDIATE RELEASE

---

**Key Findings:**
- Temp-checks with 20-30% thresholds filter bad proposals while avoiding false rejections
- Fast-track mechanisms work best at 70% support threshold—higher is too restrictive
- 30-day proposal expiry windows cause excessive abandonment; 60 days is optimal
- Moderate pipeline settings consistently outperform both "no filtering" and "aggressive filtering"

---

### The Problem: Governance Bottlenecks

Every DAO proposal must traverse a pipeline—a series of stages from initial idea to final execution. Design this pipeline poorly, and you get either gridlock (proposals languishing indefinitely) or rubber-stamping (inadequate deliberation on important decisions).

New research provides the first systematic analysis of how pipeline parameters affect governance outcomes, offering evidence-based guidance for a fundamental operational challenge.

### The Pipeline Components Tested

The study examined three common pipeline mechanisms:

**Temp-Checks:** Preliminary "signal votes" (often off-chain via Snapshot) that filter proposals before formal governance. High temp-check thresholds reduce the load on formal voting but risk rejecting worthy proposals that lack initial awareness.

**Fast-Tracks:** Expedited paths for proposals with overwhelming early support. These accelerate uncontroversial decisions but may bypass deliberation on consequential issues.

**Expiry Windows:** Maximum time allowed for proposal resolution. Tight windows prevent stale proposals but may force premature decisions on complex initiatives.

### What the Simulations Revealed

Across 270 simulation runs testing different pipeline configurations, the research identified clear patterns:

**Temp-checks improve quality at acceptable cost.** A 20-30% support threshold filters most low-quality proposals while passing the vast majority of ultimately viable initiatives. Thresholds above 40% filter too aggressively.

**Fast-tracks should target clear consensus.** A 70% early support threshold effectively identifies uncontroversial proposals suitable for expedited processing. At 85%, almost no proposals qualify.

**Expiry windows need flexibility.** 30-day windows cause excessive abandonment—proposers give up on complex initiatives. 60-day windows provide adequate time while preventing indefinite accumulation.

**Moderate settings dominate extremes.** Both "no filtering" and "aggressive filtering" underperform balanced approaches.

### Design Principles for Practitioners

Based on the results, the research recommends:

1. **Filter early, filter gently:** Use temp-checks with moderate thresholds
2. **Accelerate consensus, not controversy:** Fast-track only proposals with clear supermajority support
3. **Bound but don't compress:** Set expiry windows that prevent accumulation but allow adequate deliberation
4. **Make stages meaningful:** Each pipeline stage should add information value

---

**Contact:**
James Pollack
Independent Researcher
james@jamesbpollack.com

**Paper:** "Proposal Pipeline Design in Decentralized Governance"

**Code:** https://github.com/imgntn/dao_simulator

---

*This research was conducted independently and is released to advance the field of decentralized governance.*
