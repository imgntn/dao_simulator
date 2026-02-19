# How Do You Stop Whales From Taking Over a DAO?

## The Plain English Version

### The problem

In most DAOs, voting power equals token holdings. If you own 10% of the tokens, you get 10% of the voting power. Sounds fair -- until you realize that in many DAOs, fewer than 20 wallets control more than half of all voting power. That's not decentralized governance; it's an oligarchy with extra steps.

### What we did

We tested three ways to limit whale power across 810 simulations with 27 different configurations:

1. **Vote caps** -- Nobody can use more than X% of total voting power, no matter how many tokens they hold
2. **Quadratic voting** -- Voting power equals the square root of tokens held (100x more tokens = only 10x more votes)
3. **Velocity penalties** -- Tokens you just bought count for less (prevents buy-vote-sell attacks)

### What we found

**Quadratic voting is the single best tool.** It roughly halves the inequality of voting power without creating weird edge cases. A whale with 1,000,000 tokens gets 1,000 votes instead of 1,000,000 -- still influential, but not dominant.

**Vote caps work but are easy to game.** If you cap voting power at 2%, a whale just splits their tokens into 50 wallets. Caps work better when applied to delegates (people voting on behalf of others) since delegate identities are public and harder to fake.

**Velocity penalties solve a specific attack.** They're less about everyday governance and more about preventing someone from buying a bunch of tokens, voting on something self-serving, then selling. Think of them as a 30-60 day "cooling off" period for new token holders.

**The best defense is layered.** No single mechanism is bulletproof. The strongest configurations we found combine quadratic voting as the base, plus delegate caps at 5-10%, plus velocity penalties for newly acquired tokens.

### The bottom line

- Pure token voting leads to plutocracy -- this isn't a theory, it's a mathematical certainty
- Quadratic voting is the most effective single fix
- Combine multiple mechanisms for real protection
- Every anti-whale mechanism has a cost to efficiency -- there's always a tradeoff between security and speed
- The tools exist today; the question is whether DAOs choose to use them
