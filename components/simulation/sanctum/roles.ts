/**
 * The Living Archive — in-world role mapping for the 25 agent types.
 *
 * Each agent type gets:
 *   - `name`     — poetic role title shown in the UI
 *   - `short`    — 2-letter glyph for small spaces
 *   - `flavor`   — one-sentence evocation of what they do in the Archive
 *   - `realRole` — plain description of what the agent type does in the sim
 *
 * Tooltips use `flavor` + `realRole` so users see both the fiction and
 * the mechanics at a glance.
 */

export interface AgentRole {
  name: string;
  short: string;
  flavor: string;
  realRole: string;
}

export const AGENT_ROLES: Record<string, AgentRole> = {
  // ── The Chamber (governance) ────────────────────────────────────────────
  ProposalCreator: {
    name: 'The Scribe',
    short: 'Sc',
    flavor: 'Young hands, ink-stained fingers — drafts fresh proposals on new vellum.',
    realRole: 'Drafts and submits governance proposals',
  },
  GovernanceExpert: {
    name: 'The Chief Translator',
    short: 'Tr',
    flavor: 'Fluent in seven dead indices, reads old law the way others read weather.',
    realRole: 'Analyzes proposals with deep governance knowledge',
  },
  GovernanceWhale: {
    name: 'The Curator',
    short: 'Cu',
    flavor: 'Keeper of the rarest collections; their voice carries the weight of their shelves.',
    realRole: 'Large token holder with outsized voting power',
  },
  Delegator: {
    name: 'The Apprentice',
    short: 'Ap',
    flavor: 'Reads on behalf of a chosen master; their mark bears another hand.',
    realRole: 'Delegates voting power to a trusted representative',
  },
  LiquidDelegator: {
    name: 'The Wandering Student',
    short: 'Ws',
    flavor: 'Changes mentors by the season — follows the best reader of the hour.',
    realRole: 'Dynamically re-delegates based on performance',
  },
  Validator: {
    name: 'The Archivist-Witness',
    short: 'Aw',
    flavor: 'Seals what is true, marks what is forged; every stamp irrevocable.',
    realRole: 'Validates transactions and secures the network',
  },

  // ── The Cambium (treasury / market) ─────────────────────────────────────
  Trader: {
    name: 'The Ink Merchant',
    short: 'Im',
    flavor: 'Barters dyes and pigments between scriptoria — knows which colour commands the market.',
    realRole: 'Swaps tokens based on price momentum',
  },
  Investor: {
    name: 'The Patron',
    short: 'Pa',
    flavor: 'Funds copying projects; dignified, rarely attends — but the work bears their crest.',
    realRole: 'Allocates capital across the DAO treasury',
  },
  AdaptiveInvestor: {
    name: 'The Almanac-Keeper',
    short: 'Ak',
    flavor: 'Adjusts sponsorship by moon-phase and bookshop rumour.',
    realRole: 'Adjusts investment strategy to market conditions',
  },
  Speculator: {
    name: 'The Rumor-Monger',
    short: 'Rm',
    flavor: 'Trades on what is whispered to be in the next binding — sometimes right.',
    realRole: 'Makes high-risk bets on token price swings',
  },
  RLTrader: {
    name: 'The Pattern-Reader',
    short: 'Pr',
    flavor: 'Studies the shape of past ledgers; each decision refines an internal rune.',
    realRole: 'Uses reinforcement learning to optimize trades',
  },
  MarketMaker: {
    name: 'The Cambist',
    short: 'Cm',
    flavor: 'Sets the going rate of quill-parchment-ink between houses; keeps the flow alive.',
    realRole: 'Provides liquidity and stabilizes token price',
  },

  // ── The Workshop (craft) ────────────────────────────────────────────────
  Developer: {
    name: 'The Binder',
    short: 'Bi',
    flavor: 'Hands rough with glue and hemp; also tends the living walls of the shelves.',
    realRole: 'Builds and maintains protocol infrastructure',
  },
  ServiceProvider: {
    name: 'The Copyist',
    short: 'Cp',
    flavor: 'Finishes what others began — paid by the folio, steady as a metronome.',
    realRole: 'Offers specialized services to the DAO',
  },
  BountyHunter: {
    name: 'The Seeker',
    short: 'Sk',
    flavor: 'Commissioned to recover lost volumes; returns with strange rewards.',
    realRole: 'Completes tasks and bounties for rewards',
  },
  Artist: {
    name: 'The Illuminator',
    short: 'Il',
    flavor: 'Paints the gilded capitals and marginal marvels; irreplaceable.',
    realRole: 'Creates visual and cultural assets for the DAO',
  },
  Auditor: {
    name: 'The Cataloguer',
    short: 'Ct',
    flavor: 'Walks the stacks by lamplight, ticking off what is and what should be.',
    realRole: 'Reviews code and finances for security risks',
  },

  // ── The Long Table (council) ────────────────────────────────────────────
  Regulator: {
    name: 'The Steward of Shelves',
    short: 'St',
    flavor: 'Enforces borrowing rules; a grudge-keeper with a kind face.',
    realRole: 'Monitors compliance with DAO rules and norms',
  },
  Arbitrator: {
    name: 'The Mediator',
    short: 'Md',
    flavor: 'Sits at the Long Table when scholars grow heated — settles disputes with parchment and parry.',
    realRole: 'Resolves disputes between DAO members',
  },
  RiskManager: {
    name: 'The Firebreak-Keeper',
    short: 'Fk',
    flavor: 'Guards against rot, flood, fire — the archive survives only because they do.',
    realRole: 'Assesses and mitigates financial and protocol risks',
  },
  Whistleblower: {
    name: 'The Heretic-Scholar',
    short: 'He',
    flavor: 'Reads banned indices and comes back with truths no one asked for.',
    realRole: 'Flags suspicious activity and governance attacks',
  },
  ExternalPartner: {
    name: 'The Emissary',
    short: 'Em',
    flavor: 'Arrives from the Southern Library with news, loans, and polite questions.',
    realRole: 'Represents outside organizations collaborating with the DAO',
  },

  // ── The Stacks (passive) ────────────────────────────────────────────────
  Collector: {
    name: 'The Accumulator',
    short: 'Ac',
    flavor: 'Hoards volumes they may never read; their collection grows regardless.',
    realRole: 'Accumulates governance tokens and NFTs',
  },
  StakerAgent: {
    name: 'The Lamplighter',
    short: 'Ll',
    flavor: 'Tends the bioluminescent jars — the entire archive stays lit because of them.',
    realRole: 'Stakes tokens to earn yield and secure the network',
  },
  PassiveMember: {
    name: 'The Sleeper',
    short: 'Sl',
    flavor: 'Dozes among the books; a presence more than a voice.',
    realRole: 'Holds tokens but rarely participates in governance',
  },
};

export function getRole(agentType: string): AgentRole {
  return AGENT_ROLES[agentType] ?? {
    name: agentType,
    short: agentType.slice(0, 2),
    flavor: '',
    realRole: agentType,
  };
}
