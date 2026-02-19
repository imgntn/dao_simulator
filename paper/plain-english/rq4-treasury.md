# How Do DAOs Keep Their Money Safe?

## The Plain English Version

### The problem

DAOs collectively hold over $25 billion. During the 2022 crypto crash, many lost 80-90% of their treasury value. Some ran out of money entirely and couldn't pay developers, fund grants, or keep the lights on. Most DAOs have no formal treasury policy -- no reserves, no spending limits, no plan for what to do when the market tanks.

### What we did

We simulated 360 treasury scenarios under different market conditions, testing:
- **Buffer reserves** -- setting aside a percentage of the treasury as a rainy-day fund (0%, 20%, 40%)
- **Spending limits** -- capping how much can flow out in any given period (10% vs 20% max)
- **Stabilization on/off** -- whether the DAO actively manages its treasury or just lets it ride

### What we found

**A 10-20% buffer is the sweet spot.** Below 10%, the treasury is dangerously exposed to market swings. Above 20%, you're locking up capital for diminishing returns. Think of it like an emergency fund for a household -- 3-6 months of expenses, not more.

**Spending limits dramatically extend runway.** Without limits, a few big proposals in a bear market can drain the treasury. With limits, even bad market conditions don't cause existential crises. But limits need override mechanisms for genuine emergencies.

**Active stabilization cuts volatility in half.** DAOs with stabilization enabled saw treasury volatility of ~23% compared to ~40-55% without it. The tradeoff is less flexibility -- you can't do as many big spends.

**The value of buffers is highest when you need them most.** During bear markets (exactly when treasuries are under the most pressure), having reserves makes the biggest difference. It's insurance that pays off precisely when it matters.

### The bottom line

- Set aside 15-20% of your treasury as an untouchable reserve
- Cap periodic spending at a sustainable burn rate
- Define emergency triggers (e.g., "if reserves drop below 50% of target, freeze non-essential spending")
- Diversify holdings -- don't keep everything in your own governance token
- Monitor runway, volatility, and drawdown as key health metrics

**The takeaway:** Treasury management isn't exciting governance work, but it's what keeps DAOs alive through downturns. The DAOs that survive the next bear market will be the ones that planned for it.
