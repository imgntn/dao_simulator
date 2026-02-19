# DAO Governance Simulator: What We Built and What We Found

## The Plain English Version

### What is this?

We built a computer simulation that models how DAOs (Decentralized Autonomous Organizations) work. Think of a DAO like a company where every decision is voted on by the people who hold its tokens, and the rules are enforced by code instead of managers.

Our simulator creates hundreds of virtual "members" with different personalities -- some vote all the time, some barely show up, some hold tons of tokens, some hold very little. Then we run thousands of simulated elections under different rules and see what happens.

### Why does it matter?

DAOs manage over $25 billion in real money, but nobody really knows the best way to set up their voting rules. Should you need 5% of people to vote for a decision to count, or 20%? Should a person with 100x more tokens get 100x more voting power? What happens when a rich player tries to take over?

Right now, DAO designers mostly guess. We wanted to give them a lab where they could test ideas before putting real money at risk.

### What did we test?

We ran 9,191 simulations across 20 different experiments, looking at five big questions:

1. **Why don't people vote, and can we fix it?** (Spoiler: there's a natural ceiling, and pushing too hard backfires)
2. **Can we stop rich players from taking over?** (Yes, but it takes a combination of tools)
3. **How should proposals move through the system?** (Filter early and gently, don't rush)
4. **How do we keep the treasury safe?** (Keep 10-20% in reserve, set spending limits)
5. **Can DAOs work together?** (Yes, but it's hard -- similar DAOs cooperate easily but gain little; different DAOs gain a lot but struggle to agree)

### The biggest takeaways

- **Quorum (minimum voter turnout) should be set low** -- around 4-5%. Setting it higher doesn't get more people to vote; it just means nothing gets done.
- **Quadratic voting works** -- it cuts the power gap between whales and small holders roughly in half.
- **Temp-checks save governance** -- having a quick "does anyone even want this?" vote before the real vote prevents the system from getting clogged.
- **Treasury buffers are cheap insurance** -- setting aside 15-20% of funds makes a DAO dramatically more resilient to market crashes.
- **Bigger DAOs pass more proposals but have lower individual participation** -- there's a fundamental tradeoff between scale and engagement.

### Who is this for?

- **DAO founders** who want evidence-based guidance on setting up governance
- **Researchers** who want a tool to test governance theories
- **Anyone curious** about how digital democracy actually works at scale

### How to use it

The whole thing is open source. You can run any of our experiments yourself, change the parameters, or build your own. It's a TypeScript project -- `npm install`, then `npm run experiment`.
