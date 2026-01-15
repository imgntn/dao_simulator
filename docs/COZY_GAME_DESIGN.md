# Cozy Governance Game Design Document

## Vision

Transform the DAO Simulator into a **cozy town-building governance game** where players guide a small community through collective decision-making. Think *Stardew Valley* meets *Democracy* meets *Townscaper* — relaxing, charming, and quietly educational about how communities govern themselves.

**Working Title Ideas:**
- *Little Council*
- *Town Voices*
- *The Consensus Garden*
- *Harmony Hall*
- *Village Assembly*
- *Common Ground*

---

## Core Fantasy

> *"You're the facilitator of a small, growing community. Your job isn't to rule — it's to help everyone find common ground. Watch your village flourish as neighbors debate, compromise, and build something together."*

The player doesn't "win" by imposing their will. They succeed by creating conditions where the community thrives through good governance.

---

## What Makes It Cozy

### Cozy Game Pillars

| Pillar | How We Achieve It |
|--------|-------------------|
| **Low stress** | No fail states, no time pressure, gentle consequences |
| **Warm aesthetics** | Soft colors, cute characters, pleasant music |
| **Satisfying loops** | Watch proposals pass, buildings rise, community grow |
| **Player expression** | Customize town, governance style, character |
| **Gentle progression** | Unlock features naturally, no grinding |
| **Meaningful choices** | Decisions matter but aren't punishing |

### What We Remove/Hide

- Complex terminology (quorum → "enough voices")
- Failure/punishment framing
- Time pressure
- Adversarial mechanics (initially)
- Numbers-heavy UI
- Blockchain/crypto references

### What We Add

- Character personalities and stories
- Decorating and customization
- Seasonal events
- Ambient sounds and music
- Gentle humor
- Collectibles and achievements
- Relationship building

---

## Game Concept

### The Setup

You arrive in a small village that's just formed its first **Village Council**. The previous facilitator has retired, and the townsfolk need someone to help them make decisions together. You'll guide the community from a handful of neighbors to a thriving town.

### Core Loop

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DAILY LOOP                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐             │
│   │   Morning   │     │  Afternoon  │     │   Evening   │             │
│   │             │     │             │     │             │             │
│   │ Check mail  │────▶│ Town Hall   │────▶│  Reflect    │             │
│   │ Talk to     │     │ sessions    │     │  Results    │             │
│   │ neighbors   │     │ Proposals   │     │  Plan next  │             │
│   │             │     │ Discussions │     │  day        │             │
│   └─────────────┘     └─────────────┘     └─────────────┘             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Seasonal Loop

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       SEASONAL PROGRESSION                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   🌸 SPRING          ☀️ SUMMER          🍂 AUTUMN          ❄️ WINTER    │
│   New villagers     Big projects      Harvest fest      Reflection     │
│   Plant ideas       Build together    Celebrate wins    Plan ahead     │
│   Fresh starts      Peak activity     Give thanks       Cozy inside    │
│                                                                         │
│   Each season: ~7 in-game days                                         │
│   Each year unlocks new governance features                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Reframing Governance Concepts

### Terminology Translation

| Technical Term | Cozy Translation | In-Game Representation |
|---------------|------------------|------------------------|
| Proposal | Village Idea / Town Project | Scroll with cute icon |
| Voting | Gathering Voices / Showing Support | Colored stones in jars |
| Quorum | "Enough Voices" / Community Interest | Glowing participation meter |
| Delegate | Town Elder / Trusted Voice | Special villager role |
| Treasury | Community Chest / Village Fund | Physical chest that grows |
| Token | Reputation / Trust | Hearts or stars |
| Timelock | "Thinking Period" / Reflection Time | Hourglass animation |
| Veto | "Hold On" / Second Thoughts | Yellow flag |
| Quorum failure | "Not Enough Interest" | Gentle "maybe later" message |
| Proposal rejected | "Community Said No" | Villagers shake heads kindly |

### Governance Systems as Game Features

| Real System | Game Feature | Unlock Condition |
|-------------|--------------|------------------|
| Simple majority | Basic voting | Start of game |
| Delegation | Elder system | 10+ villagers |
| Quorum rules | Interest threshold | First failed vote |
| Timelock | Reflection garden | Build garden |
| Bicameral | Elders + Newcomers councils | 30+ villagers |
| Conviction voting | Passion meter | Year 2 |
| Quadratic voting | Fair voice tokens | Build library |
| Security council | Emergency bell | First crisis event |

---

## Characters & Villagers

### Villager Archetypes (Based on Agent Types)

| Archetype | Personality | Visual Style | Behavior |
|-----------|-------------|--------------|----------|
| **The Enthusiast** | Always votes yes! Loves new ideas | Bright colors, bouncy | High participation, supports everything |
| **The Skeptic** | "Let's think about this..." | Muted colors, arms crossed | Votes carefully, asks questions |
| **The Elder** | Wise, trusted by many | Gray hair, warm smile | Others follow their lead |
| **The Newcomer** | Eager but unsure | Young, curious expression | Learns from others, growing influence |
| **The Busy Bee** | "I'd vote but I'm so busy!" | Always carrying something | Low participation, occasional surprise votes |
| **The Passionate** | Strong opinions on specific topics | Expressive, animated | Votes strongly on pet issues |
| **The Peacemaker** | Wants everyone to get along | Soft features, calming colors | Votes for compromise |
| **The Builder** | Loves construction projects | Work clothes, tools | Always supports building proposals |

### Named Characters

Create ~20 memorable named villagers with:
- Unique appearance and home
- Personal story/background
- Favorite types of proposals
- Relationships with other villagers
- Unlock conditions
- Special dialogue

**Example Character:**
> **Maple** 🍁
> *"I've lived here longest, so folks tend to listen to me. But honestly? I just want what's best for everyone."*
>
> - Role: Elder (delegate)
> - Likes: Garden projects, traditions
> - Dislikes: Rushed decisions
> - Home: Cottage by the old oak
> - Special: Teaches you about delegation

---

## Gameplay Systems

### 1. Town Hall Sessions

The heart of the game — where proposals are discussed and voted on.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TOWN HALL                                        │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  TODAY'S TOPIC: "Should we build a community garden?"           │   │
│  │                                                                  │   │
│  │  🌱 Proposed by: Maple                                          │   │
│  │  💰 Cost: 50 coins from Community Chest                         │   │
│  │  ⏰ Thinking time: 2 days                                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  VOICES SO FAR:                                                        │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │  💚 Yes: ████████████░░░░░░  12 voices                        │     │
│  │  ❤️ No:  ████░░░░░░░░░░░░░░   4 voices                        │     │
│  │  💛 Hmm: ██░░░░░░░░░░░░░░░░   2 voices                        │     │
│  │                                                                │     │
│  │  Need 15 voices for "Enough Interest" ✨                      │     │
│  └──────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  [Talk to villagers]  [Check opinions]  [Wait for tomorrow]            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. Villager Conversations

Talk to villagers to:
- Learn their opinions on proposals
- Build relationships (affects their trust in you)
- Discover their stories
- Get hints about upcoming proposals
- Influence (gently) their thinking

**Conversation Example:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  🧑‍🌾 TALKING TO: Basil                                                 │
│                                                                         │
│  "A community garden? Hmm, I'm not sure we need one.                   │
│   I already grow plenty of vegetables in my own patch.                 │
│   But... I suppose it would be nice for folks without gardens."        │
│                                                                         │
│  [That's a kind thought!] → +relationship, might change vote           │
│  [What would convince you?] → learn their concerns                     │
│  [I understand.] → neutral, no change                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3. Building & Decorating

As proposals pass, the town grows and changes:

**Buildable Structures:**
- Town Hall (upgradeable)
- Community Garden
- Library (unlocks new governance)
- Meeting Pavilion
- Fountain (decorative)
- Notice Board
- Elder's Lodge
- Festival Grounds
- Bridge
- Marketplace

**Decoration System:**
- Place benches, flowers, trees
- Customize Town Hall interior
- Seasonal decorations
- Unlockable items from achievements

### 4. The Community Chest

Visual representation of the treasury:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      COMMUNITY CHEST                                     │
│                                                                         │
│                    ┌─────────────────┐                                  │
│                    │   💰💰💰💰💰    │                                  │
│                    │   💰💰💰💰      │  347 coins                       │
│                    │   💰💰💰        │                                  │
│                    └─────────────────┘                                  │
│                                                                         │
│  Recent activity:                                                       │
│  + 25 coins: Marketplace earnings                                      │
│  - 50 coins: Garden construction                                       │
│  + 10 coins: Festival donations                                        │
│                                                                         │
│  Pending proposals would cost: 75 coins                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5. Progression & Unlocks

**Year 1: Foundations**
- Basic voting
- First 10 villagers
- Town Hall, Garden, paths

**Year 2: Growth**
- Delegation (Elders)
- 20 villagers
- Library, Marketplace

**Year 3: Complexity**
- Multiple councils
- 35 villagers
- Festival grounds, specialized buildings

**Year 4+: Mastery**
- Advanced governance options
- 50+ villagers
- Full town customization
- Optional challenges

### 6. Events & Festivals

**Seasonal Events:**
- 🌸 Spring Planting Festival
- ☀️ Summer Solstice Celebration
- 🍂 Harvest Moon Feast
- ❄️ Winter Lights Festival

**Special Events:**
- New villager arrivals
- Visiting traders (special proposals)
- Weather events (community response)
- Anniversaries (reflect on past decisions)

### 7. The Scrapbook

A collectible journal that records:
- Passed proposals (with stamps)
- Villager profiles (as you meet them)
- Town milestones
- Governance systems unlocked
- Seasonal memories
- Player's governance philosophy

---

## Gentle Challenge System

### Instead of Failure

| Traditional Game | Our Approach |
|------------------|--------------|
| Game over | "The town continues..." |
| Failed proposal | "The village isn't ready for this yet" |
| Low participation | "Folks seem distracted — try again?" |
| Bad outcome | "That didn't go as planned, but we learned something" |
| Conflict | "The community needs time to heal" |

### Optional Challenges (For Players Who Want Them)

Unlockable after Year 2, entirely optional:

- **Scenario Mode:** Historical governance challenges
- **What-If Mode:** "What if a big investor moved to town?"
- **Speedrun Seeds:** Timed community building
- **Harmony Mode:** Keep everyone happy (harder than it sounds)
- **Chaos Mode:** Random events, unpredictable villagers

---

## Visual Style

### Art Direction

**Overall Aesthetic:** Warm, hand-painted, slightly whimsical
- Inspired by: *Spiritfarer*, *Unpacking*, *A Short Hike*, *Cozy Grove*
- Color palette: Soft pastels with warm accents
- Characters: Simple, expressive, diverse
- Buildings: Cozy, slightly wonky, lots of character

### Color Palette

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PRIMARY PALETTE                                                        │
│                                                                         │
│  ██████  Warm Cream    #F5E6D3  (backgrounds)                          │
│  ██████  Soft Sage     #A8C5A8  (yes votes, nature)                    │
│  ██████  Dusty Rose    #D4A5A5  (no votes, buildings)                  │
│  ██████  Warm Brown    #8B6B4A  (wood, earth)                          │
│  ██████  Sky Blue      #A5C4D4  (accents, water)                       │
│  ██████  Sunset Orange #E8B87D  (highlights, warmth)                   │
│                                                                         │
│  SEASONAL VARIATIONS                                                    │
│  🌸 Spring: More greens and pinks                                      │
│  ☀️ Summer: Brighter, more saturated                                   │
│  🍂 Autumn: Oranges, reds, golds                                       │
│  ❄️ Winter: Cool blues, warm interior lights                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### UI Style

- Rounded corners everywhere
- Paper/parchment textures
- Hand-drawn icons
- Gentle animations (things sway, bounce softly)
- No harsh lines or alerts
- Tooltips feel like helpful notes

---

## Audio Design

### Music

- **Main Theme:** Gentle acoustic guitar and piano
- **Town Hall:** Slightly more "official" but still warm
- **Conversations:** Soft background ambience
- **Festivals:** Upbeat folk music
- **Night:** Peaceful, minimal
- **Seasons:** Subtle variations on themes

**Inspiration:** *Stardew Valley*, *Animal Crossing*, *Spiritfarer*

### Sound Effects

- Soft UI sounds (paper shuffling, gentle chimes)
- Villager "voices" (cute mumbles, not words)
- Nature ambience (birds, wind, water)
- Building sounds (satisfying but not harsh)
- Vote counting (pleasant tally sounds)
- Celebration sounds (gentle cheering)

---

## Technical Approach

### Platform: Steam (PC/Mac/Linux)

**Framework Options:**

| Option | Pros | Cons |
|--------|------|------|
| **Electron + Web** | Reuse existing code | Large bundle, performance |
| **Tauri + Web** | Smaller, faster | Less mature |
| **Godot** | Native performance, great 2D | Rebuild from scratch |
| **Unity** | Industry standard, tools | Overkill for 2D? |
| **Phaser (web)** | JavaScript, familiar | Still needs wrapper |

**Recommended:** **Godot 4** or **Tauri + Canvas/WebGL**

- Godot gives us native performance and Steam integration
- Can port simulation logic from TypeScript
- Great for 2D games with this aesthetic
- Active community, good documentation

### Steam Integration Requirements

- [ ] Steamworks SDK integration
- [ ] Achievements (30-50 achievements)
- [ ] Cloud saves
- [ ] Steam Deck verification
- [ ] Trading cards (optional)
- [ ] Controller support
- [ ] Workshop support (custom scenarios, later)

### Save System

```typescript
interface SaveData {
  // Town state
  townName: string;
  day: number;
  season: Season;
  year: number;

  // Villagers
  villagers: VillagerState[];
  relationships: RelationshipMap;

  // Governance
  governanceUnlocks: string[];
  currentProposals: Proposal[];
  proposalHistory: ProposalRecord[];

  // Resources
  communityChest: number;
  buildings: Building[];
  decorations: Decoration[];

  // Progress
  scrapbook: ScrapbookEntry[];
  achievements: string[];
  settings: PlayerSettings;
}
```

---

## Content Scope

### Minimum Viable Game (MVP)

**For Early Access / Initial Release:**

- 1 village map
- 20 unique villagers
- 4 seasons (1 year cycle)
- 15 building types
- 30 proposal types
- 5 governance systems
- 3 hours of core content
- 10-15 hour completion time
- 20 achievements
- Full audio (music + SFX)
- English language

### Full Release Additions

- 3 village map variations
- 40 unique villagers
- Special events calendar
- 25 building types
- 50 proposal types
- 10 governance systems
- 30+ hours for completionists
- 50 achievements
- Multiple languages (5+)
- Accessibility options
- Steam Workshop (custom scenarios)

### Post-Launch DLC Ideas

- **New Horizons:** Different biomes (coastal, mountain, desert villages)
- **Bigger Picture:** Inter-village governance (federation mechanics)
- **Seasons of Change:** Extended event system
- **The Archives:** Historical governance scenarios

---

## Monetization

### Pricing Strategy

| Model | Price Point | Notes |
|-------|-------------|-------|
| Base Game | $14.99 - $19.99 | Standard indie cozy game pricing |
| Launch Discount | 10-15% off | First week |
| Seasonal Sales | Up to 50% off | Steam sales |
| DLC (if any) | $4.99 - $7.99 | Substantial content additions |

### No Microtransactions

The game should be:
- One-time purchase
- No in-game purchases
- No premium currency
- No battle pass
- Complete experience at base price

---

## Development Phases

### Phase 1: Prototype (4-6 weeks)

**Goal:** Prove the core loop is fun

- [ ] Basic town view (placeholder art)
- [ ] Simple proposal system
- [ ] 5 test villagers with basic AI
- [ ] Voting mechanic
- [ ] One building that can be built
- [ ] Day/night cycle

**Deliverable:** Playable prototype for feedback

### Phase 2: Vertical Slice (8-10 weeks)

**Goal:** One complete "year" experience

- [ ] Art style established
- [ ] 10 villagers with full dialogue
- [ ] All 4 seasons
- [ ] 10 proposal types
- [ ] 5 buildings
- [ ] Basic audio
- [ ] Save/load

**Deliverable:** Demo-quality build

### Phase 3: Content Production (12-16 weeks)

**Goal:** Full game content

- [ ] All 20 villagers
- [ ] All buildings and decorations
- [ ] All governance systems
- [ ] Full audio implementation
- [ ] UI polish
- [ ] Tutorials and onboarding
- [ ] Achievements

**Deliverable:** Content-complete build

### Phase 4: Polish & QA (6-8 weeks)

**Goal:** Ship-ready quality

- [ ] Bug fixing
- [ ] Balance tuning
- [ ] Performance optimization
- [ ] Steam integration testing
- [ ] Localization
- [ ] Accessibility features
- [ ] Steam Deck testing

**Deliverable:** Release candidate

### Phase 5: Launch & Post-Launch (Ongoing)

- [ ] Launch marketing
- [ ] Community management
- [ ] Bug fix patches
- [ ] Quality of life updates
- [ ] Plan DLC based on feedback

---

## Team Requirements

### Minimum Team

| Role | Responsibility | FTE |
|------|----------------|-----|
| Game Designer / Developer | Core gameplay, systems | 1 |
| Artist | Characters, environments, UI | 1 |
| Writer | Dialogue, lore, flavor text | 0.5 |
| Composer / Sound | Music and SFX | 0.25 (contract) |
| QA | Testing, feedback | 0.5 |

**Total:** ~3.25 FTE for ~8-10 months

### Solo Developer Approach

If going solo:
- Use asset packs for initial art
- AI-assisted writing for drafts
- Licensed music initially
- Community QA (beta testers)
- Extend timeline to 12-18 months

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Governance not fun | Medium | High | Extensive prototyping, playtesting early |
| Too complex for cozy | Medium | Medium | Aggressive simplification, optional depth |
| Art style mismatch | Low | Medium | Establish style early, mood boards |
| Scope creep | High | High | Strict MVP definition, cut features |
| Steam visibility | High | Medium | Build community pre-launch, demo |
| Technical issues | Medium | Medium | Choose proven tech stack |

---

## Success Metrics

### Launch Targets

| Metric | Target |
|--------|--------|
| Wishlist pre-launch | 10,000+ |
| First week sales | 5,000+ |
| Steam review score | 80%+ positive |
| Refund rate | < 10% |
| Average playtime | 5+ hours |

### Long-term Goals

| Metric | Target (Year 1) |
|--------|-----------------|
| Total sales | 50,000+ |
| Review score | 90%+ positive |
| Community Discord | 5,000+ members |
| Steam Workshop items | 100+ (if implemented) |

---

## Appendix: Sample Proposals

### Early Game Proposals

```
🌱 PLANT SOME FLOWERS
"Rosa thinks the town square looks bare."
Cost: 10 coins | Difficulty: Easy
Result: Flowers appear in town square

🪑 BUILD A BENCH
"Old Thomas needs somewhere to rest his legs."
Cost: 15 coins | Difficulty: Easy
Result: Unlocks bench decoration

📫 INSTALL A NOTICE BOARD
"How will folks know what's happening?"
Cost: 20 coins | Difficulty: Easy
Result: Shows upcoming proposals
```

### Mid Game Proposals

```
📚 BUILD A LIBRARY
"Knowledge should be shared!"
Cost: 100 coins | Difficulty: Medium
Requires: 15+ villagers
Result: Unlocks advanced governance options

🎪 ESTABLISH A FESTIVAL
"We should celebrate our community!"
Cost: 75 coins | Difficulty: Medium
Result: Seasonal festivals begin

👥 CREATE AN ELDER COUNCIL
"Some voices carry more weight..."
Cost: 50 coins | Difficulty: Medium
Controversial: Some oppose giving power to few
Result: Delegation system unlocked
```

### Late Game Proposals

```
🏛️ BUILD A SECOND COUNCIL CHAMBER
"Newcomers and long-timers see things differently."
Cost: 200 coins | Difficulty: Hard
Requires: 30+ villagers, Elder Council
Result: Bicameral governance unlocked

⚖️ ADOPT FAIR VOICE TOKENS
"Every voice should count more equally."
Cost: 150 coins | Difficulty: Hard
Requires: Library
Result: Quadratic voting unlocked

🔔 INSTALL THE EMERGENCY BELL
"What if we need to act fast?"
Cost: 100 coins | Difficulty: Medium
Controversial: Some fear misuse
Result: Emergency governance unlocked
```

---

## Appendix: Dialogue Samples

### Tutorial (First Day)

```
MAPLE: Oh! You must be the new facilitator!
       Welcome to our little village.

       We're just a small group, but we've got big dreams.
       And a lot of opinions. *chuckles*

       Your job isn't to make decisions FOR us.
       It's to help us make decisions TOGETHER.

       Come, let me show you the Town Hall.
       We've got our first proposal to discuss!
```

### Proposal Discussion

```
BASIL: A community garden? I don't know...
       I already have my own vegetables.

       [It would help those without gardens.]

BASIL: Hmm. That's true. Old Thomas has no yard at all.
       Maybe I was being selfish.
       You've given me something to think about.

       (Basil's opinion shifts from NO to UNCERTAIN)
```

### After a Passed Proposal

```
MAPLE: The garden proposal passed!
       Look at everyone coming together to build it.

       This is what community is all about.
       Different opinions, but shared purpose.

       *You feel a warm sense of accomplishment*

       +10 coins added to Community Chest (donations)
       🏆 Achievement Unlocked: "Green Thumbs"
```

### After a Failed Proposal

```
MAPLE: Well, the village wasn't ready for that one.
       And that's okay! Not every idea is right for every time.

       The important thing is we listened to each other.
       Maybe we'll revisit it someday.

       *The sun sets on another day in the village*
```

---

## Next Steps

1. **Validate the concept** - Share with potential players, get feedback
2. **Create mood boards** - Visual style exploration
3. **Build prototype** - Prove the core loop
4. **Playtest extensively** - Is governance actually cozy?
5. **Establish scope** - Lock MVP feature set
6. **Choose tech stack** - Godot vs. web-based
7. **Plan production** - Timeline, milestones, budget

---

## References & Inspiration

### Games
- *Stardew Valley* - Cozy loop, progression
- *Animal Crossing* - Community building, no fail state
- *Spiritfarer* - Emotional depth, cozy management
- *Townscaper* - Satisfying building
- *A Short Hike* - Gentle exploration
- *Unpacking* - Cozy mundane activities
- *Dorfromantik* - Relaxing puzzle building
- *Democracy 4* - Governance simulation (not cozy, but systems)

### Visual Style References
- *Cozy Grove* - Hand-painted aesthetic
- *Garden Story* - Cute characters, soft colors
- *Ooblets* - Charming character design
- *Wylde Flowers* - Warm village aesthetic

### Audio References
- *Stardew Valley OST* - Seasonal acoustic music
- *Animal Crossing OST* - Hourly ambient music
- *Spiritfarer OST* - Emotional, warm
