// Cute and fun name generators for DAOs and members

const DAO_PREFIXES = [
  'Cosmic', 'Neon', 'Pixel', 'Quantum', 'Solar', 'Lunar', 'Crystal', 'Thunder',
  'Velvet', 'Golden', 'Silver', 'Iron', 'Cyber', 'Meta', 'Hyper', 'Ultra',
  'Mystic', 'Ethereal', 'Radiant', 'Shadow', 'Phoenix', 'Dragon', 'Tiger', 'Wolf',
];

const DAO_SUFFIXES = [
  'Collective', 'Guild', 'Alliance', 'Federation', 'Council', 'Assembly', 'Union',
  'Network', 'Protocol', 'Labs', 'Studio', 'Forge', 'Nexus', 'Hub', 'Syndicate',
  'Realm', 'Kingdom', 'Empire', 'Republic', 'Nation', 'Society', 'Order', 'Circle',
];

const DAO_TOKENS = [
  'GLOW', 'SPARK', 'WAVE', 'PULSE', 'FLOW', 'BEAM', 'CORE', 'NODE',
  'VIBE', 'SYNC', 'LINK', 'MESH', 'GRID', 'FLUX', 'BOLT', 'RUSH',
  'DRIFT', 'BLOOM', 'FROST', 'BLAZE', 'STORM', 'SHADE', 'PRISM', 'ECHO',
];

const FIRST_NAMES = [
  'Luna', 'Nova', 'Aria', 'Kai', 'Zara', 'Milo', 'Sage', 'River',
  'Phoenix', 'Atlas', 'Cleo', 'Jasper', 'Ivy', 'Felix', 'Ruby', 'Leo',
  'Stella', 'Orion', 'Willow', 'Finn', 'Hazel', 'Oscar', 'Violet', 'Max',
  'Aurora', 'Theo', 'Iris', 'Axel', 'Freya', 'Hugo', 'Nora', 'Zeke',
  'Elara', 'Cyrus', 'Lyra', 'Remy', 'Cora', 'Jude', 'Maya', 'Nash',
];

const LAST_NAMES = [
  'Storm', 'Frost', 'Vale', 'Cross', 'Knight', 'Stone', 'Wolf', 'Fox',
  'Blake', 'Chase', 'Reid', 'Cole', 'Gray', 'Lane', 'West', 'North',
  'Swift', 'Bright', 'Sharp', 'Bold', 'True', 'Kind', 'Fair', 'Wise',
  'Moon', 'Star', 'Sky', 'Cloud', 'Rain', 'Snow', 'Wind', 'Fire',
];

const HANDLE_SUFFIXES = [
  '.eth', '.dao', '', '_nft', '_web3', '.sol', '', '.xyz', '',
  '_defi', '', '.lens', '', '_anon', '', '.id', '',
];

// Seeded random number generator for reproducible results
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function pick<T>(arr: T[], random: () => number): T {
  return arr[Math.floor(random() * arr.length)];
}

export interface DAOIdentity {
  name: string;
  tokenSymbol: string;
  tokenName: string;
  motto: string;
}

export interface MemberIdentity {
  handle: string;
  displayName: string;
  avatar: string; // emoji
}

const MOTTOS = [
  'Building the future, together',
  'Decentralized by design',
  'Community first, always',
  'Governance for all',
  'Power to the people',
  'Transparent and trustless',
  'One token, one voice',
  'Stronger together',
  'Innovation through collaboration',
  'The future is collective',
];

const AVATARS = [
  '🦊', '🐼', '🦁', '🐯', '🐸', '🦉', '🦋', '🐙',
  '🦄', '🐲', '🦅', '🐺', '🦈', '🐬', '🦩', '🦚',
  '🤖', '👾', '🎭', '🎨', '🚀', '💎', '🔮', '⚡',
];

export function generateDAOIdentity(seed?: number): DAOIdentity {
  const random = seededRandom(seed ?? Date.now());

  const prefix = pick(DAO_PREFIXES, random);
  const suffix = pick(DAO_SUFFIXES, random);
  const tokenSymbol = pick(DAO_TOKENS, random);

  return {
    name: `${prefix} ${suffix}`,
    tokenSymbol: `$${tokenSymbol}`,
    tokenName: `${prefix} Token`,
    motto: pick(MOTTOS, random),
  };
}

export function generateMemberIdentity(memberId: string, daoSeed?: number): MemberIdentity {
  // Use member ID to create consistent identity
  let hash = 0;
  for (let i = 0; i < memberId.length; i++) {
    hash = ((hash << 5) - hash + memberId.charCodeAt(i)) | 0;
  }
  if (daoSeed) hash = hash ^ daoSeed;

  const random = seededRandom(Math.abs(hash));

  const firstName = pick(FIRST_NAMES, random);
  const lastName = pick(LAST_NAMES, random);
  const suffix = pick(HANDLE_SUFFIXES, random);
  const avatar = pick(AVATARS, random);

  // Generate handle variations
  const handleStyles = [
    () => `${firstName.toLowerCase()}${suffix}`,
    () => `${firstName.toLowerCase()}_${lastName.toLowerCase()}${suffix}`,
    () => `${firstName.toLowerCase()}${Math.floor(random() * 99)}${suffix}`,
    () => `${firstName[0].toLowerCase()}${lastName.toLowerCase()}${suffix}`,
  ];

  const handle = pick(handleStyles, random)();

  return {
    handle,
    displayName: `${firstName} ${lastName}`,
    avatar,
  };
}

// Generate identities for multiple members at once
export function generateMemberIdentities(
  memberIds: string[],
  daoSeed?: number
): Map<string, MemberIdentity> {
  const identities = new Map<string, MemberIdentity>();
  for (const id of memberIds) {
    identities.set(id, generateMemberIdentity(id, daoSeed));
  }
  return identities;
}
