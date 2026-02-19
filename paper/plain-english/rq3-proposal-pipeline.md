# How Should DAOs Process Proposals?

## The Plain English Version

### The problem

Every DAO proposal goes through a pipeline: someone writes it up, people discuss it, there's a vote, and then it either passes or doesn't. Design this pipeline wrong and you get one of two bad outcomes:
- **Gridlock**: proposals pile up, nothing gets decided, people lose interest
- **Rubber-stamping**: everything passes too quickly without real deliberation

### What we did

We tested different pipeline configurations across 270 simulations, varying three things:

1. **Temp-checks** -- a quick preliminary vote ("does anyone even want to discuss this?") before the real vote
2. **Fast-tracks** -- an express lane for proposals with overwhelming early support
3. **Expiry windows** -- how long a proposal can sit before it's automatically killed

### What we found

**Temp-checks are the most important pipeline feature.** Without them, the system gets flooded with low-quality proposals that clog up the voting queue. With a modest 20-30% support threshold, temp-checks filter out the noise while letting good proposals through. Removing temp-checks entirely causes near-complete governance failure.

**Fast-tracks should have a high bar.** Setting the fast-track threshold at 70% early support works well -- it catches truly uncontroversial items (routine treasury requests, minor parameter changes) without bypassing debate on anything important. At 85%, almost nothing qualifies and the mechanism is pointless.

**Don't set expiry windows too tight.** 30-day windows cause too many proposals to expire before they can build support -- especially complex ones that need discussion. 60 days gives enough breathing room while still preventing zombie proposals from lingering forever.

**Moderation beats extremes.** Both "no filtering at all" and "aggressive filtering" performed worse than balanced middle-ground approaches. This came through consistently across every metric we measured.

### The bottom line

- Add a temp-check stage if you don't have one -- it's the highest-impact pipeline improvement
- Set temp-check thresholds at 20-30% support
- Offer a fast-track path at 70% support for consensus items
- Give proposals at least 60 days to resolve
- Each stage should add real information value, not just add bureaucracy
