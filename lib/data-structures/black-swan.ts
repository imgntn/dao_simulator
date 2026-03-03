// Black Swan / Exogenous Shock Events
// Models sudden external events that disrupt DAO operations

export type BlackSwanCategory =
  | 'exploit'          // Smart contract hack / bridge exploit
  | 'regulatory'       // Sudden regulation (ban, sanctions)
  | 'key_person_exit'  // Founder/core team departure
  | 'trust_collapse'   // Rug pull revelation, fraud discovery
  | 'market_contagion' // External protocol failure cascading in
  | 'social_attack';   // Governance takeover attempt, Sybil attack

export const ALL_BLACK_SWAN_CATEGORIES: BlackSwanCategory[] = [
  'exploit',
  'regulatory',
  'key_person_exit',
  'trust_collapse',
  'market_contagion',
  'social_attack',
];

export interface BlackSwanEffects {
  /** Multiplier on token price (e.g. -0.3 = -30%) */
  priceShock?: number;
  /** Fraction of treasury lost (0-1) */
  treasuryDrain?: number;
  /** Added to all agents' belief (-1 to 1) */
  beliefShift?: number;
  /** Added to all agents' voterFatigue (0-1) */
  fatigueSpike?: number;
  /** Subtracted from agents' optimism (0-1) */
  optimismDamage?: number;
  /** Temporary voting activity reduction (0-1) */
  participationDrop?: number;
  /** Push forum sentiment negative (-1 to 0) */
  forumSentimentShock?: number;
  /** Fraction of members that leave (0-1) */
  memberExitFraction?: number;
}

export interface BlackSwanEvent {
  id: string;
  category: BlackSwanCategory;
  name: string;
  /** Step when the event fires */
  step: number;
  /** Intensity 0-1 */
  severity: number;
  /** Steps the effect persists */
  duration: number;
  effects: BlackSwanEffects;
}

/**
 * Preset severity profiles per category.
 * Values are base multipliers — actual effects scale by event severity.
 */
export const CATEGORY_PROFILES: Record<BlackSwanCategory, BlackSwanEffects> = {
  exploit: {
    priceShock: -0.4,
    treasuryDrain: 0.3,
    beliefShift: -0.2,
    optimismDamage: 0.15,
  },
  regulatory: {
    priceShock: -0.25,
    participationDrop: 0.3,
    memberExitFraction: 0.1,
    beliefShift: -0.15,
  },
  key_person_exit: {
    priceShock: -0.15,
    beliefShift: -0.25,
    optimismDamage: 0.2,
    participationDrop: 0.15,
  },
  trust_collapse: {
    priceShock: -0.5,
    beliefShift: -0.35,
    optimismDamage: 0.3,
    memberExitFraction: 0.15,
    forumSentimentShock: -0.4,
  },
  market_contagion: {
    priceShock: -0.35,
    treasuryDrain: 0.1,
    fatigueSpike: 0.2,
    participationDrop: 0.2,
  },
  social_attack: {
    beliefShift: -0.2,
    fatigueSpike: 0.25,
    forumSentimentShock: -0.3,
    participationDrop: 0.25,
    optimismDamage: 0.1,
  },
};

/** Default duration range per category [min, max] in steps */
export const CATEGORY_DURATION: Record<BlackSwanCategory, [number, number]> = {
  exploit: [10, 30],
  regulatory: [15, 30],
  key_person_exit: [10, 25],
  trust_collapse: [10, 30],
  market_contagion: [5, 20],
  social_attack: [8, 20],
};

/** Human-readable event names per category */
export const CATEGORY_NAMES: Record<BlackSwanCategory, string[]> = {
  exploit: ['Bridge Exploit', 'Smart Contract Hack', 'Flash Loan Attack', 'Oracle Manipulation'],
  regulatory: ['Regulatory Ban', 'SEC Enforcement', 'Sanctions Imposed', 'Tax Ruling'],
  key_person_exit: ['Founder Departure', 'Core Team Exodus', 'Lead Dev Resignation', 'CTO Exit'],
  trust_collapse: ['Rug Pull Revealed', 'Fraud Discovery', 'Insider Trading Exposed', 'Audit Failure'],
  market_contagion: ['Protocol Collapse', 'Stablecoin Depeg', 'Exchange Bankruptcy', 'Liquidity Crisis'],
  social_attack: ['Governance Takeover', 'Sybil Attack', '51% Vote Attack', 'Hostile Proposal Flood'],
};
