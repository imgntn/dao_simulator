/**
 * The Living Archive — solarpunk library palette.
 *
 * Wider saturation range than Banner Saga's muted register: warm parchment,
 * real moss green, saturated terracotta, aged honey brass, cool slate indigo.
 * Warm + cool sit side by side so nothing feels muddy; accents are bright
 * where focal attention belongs.
 */

export const PALETTE = {
  // Surfaces
  parchment: '#F2E8D0',           // primary page background (lighter, cleaner)
  parchmentWarm: '#E9D9B2',       // weathered edge
  parchmentCool: '#DCD2BA',       // shadow zones
  stone: '#3E3528',               // deep carved shadow, borders
  stoneSoft: '#5A4E3C',           // secondary stone
  ink: '#1F1912',                 // text, outlines

  // Life / solarpunk
  moss: '#7A9458',                // living walls, vines
  mossDeep: '#4F6A3A',            // shadowed plants
  teal: '#2F5F5C',                // water, cool plant shadow
  chlorophyll: '#A8C47E',         // sunlit leaves

  // Vote + lantern states
  voteFor: '#C45A2E',             // terracotta — FOR-vote lamp glow
  voteForGlow: '#F4C572',         // honey bloom around FOR lamps
  voteAgainst: '#3B4A6B',         // slate indigo — AGAINST lamp
  voteAgainstGlow: '#5C6E94',     // indigo aura
  voteAbstain: '#8A7F6A',         // cool grey — no-vote, unlit lamp
  voteGlass: '#D9E1DB',           // unlit lamp glass (pale jade)

  // Illumination / highlight
  honey: '#D4A447',               // aged brass, illumination, treasury accents
  gold: '#E8B84A',                // bright focal gold
  lampBloom: '#FFE0A3',           // warmest halo

  // Events / warnings
  blood: '#8C2D2D',               // oxblood — black swan, errors
  flame: '#E16C2E',               // hearth glow, warm event tint
  iron: '#5A544A',                // neutral metal

  // Archetype family colors (cleaner, more saturated than before)
  fGovernance: '#5A4E85',          // plum indigo — scholars, experts
  fTreasury:   '#C79137',          // honey-gold — traders, investors
  fCraft:      '#4F6F8A',          // steel blue — binders, copyists
  fCouncil:    '#9B4A2A',          // umber — regulators, arbitrators
  fPassive:    '#6E7460',          // sage — quiet presences

  // Creature palette — fur / body / accent per species
  // Owls (governance, plum)
  owlBody:   '#6B5A8F',
  owlBreast: '#C8BCD8',
  owlEyes:   '#F2C14E',
  // Badgers (council, umber)
  badgerBody:   '#5A4A38',
  badgerStripe: '#F2EAD5',
  badgerEyes:   '#1F1912',
  // Foxes (treasury, gold)
  foxBody:   '#B86A2F',
  foxBelly:  '#EAD5B0',
  foxEyes:   '#3B2A18',
  // Beavers (craft, blue)
  beaverBody: '#6F4E32',
  beaverBelly: '#B89870',
  beaverApron: '#4F6F8A',
  // Moth-wyrms (passive, sage)
  mothBody: '#8A8470',
  mothWing: '#DAD5C2',
  mothEye:  '#6B4A78',
} as const;

/**
 * Agent archetype families. The 25 agent types inherit their family's
 * color/sigil; individual distinctions come through the in-world role
 * name + description (see roles.ts).
 */
export type Archetype = 'governance' | 'treasury' | 'craft' | 'council' | 'passive';

export const AGENT_ARCHETYPE: Record<string, Archetype> = {
  // The Chamber (governance)
  ProposalCreator: 'governance',
  GovernanceExpert: 'governance',
  GovernanceWhale: 'governance',
  Delegator: 'governance',
  LiquidDelegator: 'governance',
  Validator: 'governance',

  // The Cambium (treasury / market)
  Trader: 'treasury',
  Investor: 'treasury',
  AdaptiveInvestor: 'treasury',
  Speculator: 'treasury',
  RLTrader: 'treasury',
  MarketMaker: 'treasury',

  // The Workshop (craft)
  Developer: 'craft',
  ServiceProvider: 'craft',
  BountyHunter: 'craft',
  Artist: 'craft',
  Auditor: 'craft',

  // The Long Table (council)
  Regulator: 'council',
  Arbitrator: 'council',
  RiskManager: 'council',
  Whistleblower: 'council',
  ExternalPartner: 'council',

  // The Stacks (passive)
  Collector: 'passive',
  StakerAgent: 'passive',
  PassiveMember: 'passive',
};

export const ARCHETYPE_COLOR: Record<Archetype, string> = {
  governance: PALETTE.fGovernance,
  treasury: PALETTE.fTreasury,
  craft: PALETTE.fCraft,
  council: PALETTE.fCouncil,
  passive: PALETTE.fPassive,
};

/** In-world section names for each archetype family. */
export const ARCHETYPE_HALL: Record<Archetype, string> = {
  governance: 'The Chamber',
  treasury: 'The Cambium',
  craft: 'The Workshop',
  council: 'The Long Table',
  passive: 'The Stacks',
};

/** One-line description of each hall. */
export const ARCHETYPE_HALL_DESC: Record<Archetype, string> = {
  governance: 'Scribes, translators, curators — those who shape the record',
  treasury: 'Ink-merchants, patrons, cambists — those who sustain the work',
  craft: 'Binders, copyists, illuminators — those who make it lasting',
  council: 'Stewards, mediators, firebreak-keepers — those who protect it',
  passive: 'Accumulators, lamplighters, sleepers — those who hold the quiet',
};

export function getArchetype(agentType: string): Archetype {
  return AGENT_ARCHETYPE[agentType] ?? 'passive';
}
