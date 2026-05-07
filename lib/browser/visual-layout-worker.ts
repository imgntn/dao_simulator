import type {
  VisualAgentDraw,
  VisualArchetype,
  VisualEventDraw,
  VisualLayoutAgentInput,
  VisualLayoutRequest,
  VisualSceneDraw,
} from './visual-layout-protocol';
import type { SimulationEvent } from './worker-protocol';

const ROOM_STATIONS: Record<VisualArchetype, Array<[number, number]>> = {
  governance: [
    [-390, -207], [-310, -207], [-230, -207], [-150, -207], [-70, -207],
    [10, -207], [90, -207], [170, -207], [250, -207], [330, -207],
    [410, -207], [-350, -207], [130, -207],
  ],
  council: [
    [-415, -87], [-345, -87], [-275, -87], [-205, -87], [-135, -87],
    [-65, -87], [-25, -87], [-380, -87], [-170, -87],
  ],
  treasury: [
    [25, -87], [95, -87], [165, -87], [235, -87], [305, -87],
    [375, -87], [60, -87], [200, -87], [340, -87],
  ],
  craft: [
    [-415, 153], [-345, 153], [-275, 153], [-205, 153], [-135, 153],
    [-65, 153], [-25, 153], [-380, 153], [-170, 153],
  ],
  passive: [
    [25, 153], [105, 153], [185, 153], [265, 153], [345, 153],
    [415, 153], [65, 153], [225, 153], [385, 153],
  ],
};

const LECTERN_POS: [number, number] = [0, 43];
const SHELF_TARGET_POS: [number, number] = [340, 153];
const FAR_FULL_AGENT_LIMIT = 18;

const ROLE_NAMES: Record<string, { name: string; short: string }> = {
  developer: { name: 'Builder', short: 'DEV' },
  investor: { name: 'Backer', short: 'INV' },
  trader: { name: 'Trader', short: 'TRD' },
  delegator: { name: 'Delegate', short: 'DEL' },
  proposal_creator: { name: 'Author', short: 'PROP' },
  validator: { name: 'Validator', short: 'VAL' },
  passive_member: { name: 'Member', short: 'MEM' },
  governance_expert: { name: 'Counsel', short: 'GOV' },
  governance_whale: { name: 'Whale', short: 'WHALE' },
  risk_manager: { name: 'Risk', short: 'RISK' },
  speculator: { name: 'Speculator', short: 'SPEC' },
  staker: { name: 'Staker', short: 'STK' },
};

const EVENT_VISUALS: Record<SimulationEvent['type'], { x: number; y: number; color: string; label: string }> = {
  proposal_created: { x: 0, y: 43, color: '#40E8FF', label: 'NEW PROPOSAL' },
  proposal_approved: { x: 0, y: 43, color: '#9DFF80', label: 'APPROVED' },
  proposal_rejected: { x: 0, y: 43, color: '#A82818', label: 'REJECTED' },
  proposal_expired: { x: 0, y: 43, color: '#6D6A75', label: 'EXPIRED' },
  vote_cast: { x: 0, y: 43, color: '#E8C050', label: 'VOTE CAST' },
  black_swan: { x: 0, y: -160, color: '#A82818', label: 'BLACK SWAN' },
  treasury_change: { x: 250, y: -87, color: '#20D8C0', label: 'TREASURY' },
  member_joined: { x: 320, y: 153, color: '#A888E8', label: 'JOINED' },
  member_left: { x: 320, y: 153, color: '#6D6A75', label: 'LEFT' },
  delegation: { x: -120, y: -207, color: '#B068F8', label: 'DELEGATION' },
  forum_topic: { x: -260, y: 153, color: '#FF9040', label: 'FORUM' },
  price_change: { x: 250, y: -87, color: '#20D8C0', label: 'MARKET' },
};

const BASE_CACHE = new Map<string, Array<{ id: string; x: number; y: number; idx: number }>>();

function getArchetype(type: string): VisualArchetype {
  const t = type.toLowerCase();
  if (t.includes('governance') || t.includes('validator') || t.includes('delegator')) return 'governance';
  if (t.includes('investor') || t.includes('trader') || t.includes('staker') || t.includes('speculator')) return 'treasury';
  if (t.includes('developer') || t.includes('proposal')) return 'craft';
  if (t.includes('risk')) return 'council';
  return 'passive';
}

function role(type: string) {
  return ROLE_NAMES[type] ?? ROLE_NAMES[type.toLowerCase()] ?? { name: type.replaceAll('_', ' '), short: type.slice(0, 4).toUpperCase() };
}

function baseKey(agents: VisualLayoutAgentInput[]) {
  return agents.map(agent => `${agent.id}:${agent.type}`).join('|');
}

function basePlacements(agents: VisualLayoutAgentInput[]) {
  const key = baseKey(agents);
  const cached = BASE_CACHE.get(key);
  if (cached) return cached;

  const grouped: Record<VisualArchetype, VisualLayoutAgentInput[]> = {
    governance: [], treasury: [], craft: [], council: [], passive: [],
  };
  for (const agent of agents) grouped[getArchetype(agent.type)].push(agent);

  const placements: Array<{ id: string; x: number; y: number; idx: number }> = [];
  for (const arch of ['governance', 'council', 'treasury', 'craft', 'passive'] as VisualArchetype[]) {
    const bucket = grouped[arch];
    const stations = ROOM_STATIONS[arch];
    bucket.forEach((agent, i) => {
      const [x, y] = stations[i % stations.length];
      const seed = (agent.id.length * 7 + i * 13) % 997;
      placements.push({
        id: agent.id,
        x: x + ((seed % 7) - 3) * 5,
        y: y + ((seed % 5) - 2) * 3,
        idx: i,
      });
    });
  }

  BASE_CACHE.set(key, placements);
  if (BASE_CACHE.size > 8) {
    const oldest = BASE_CACHE.keys().next().value;
    if (oldest) BASE_CACHE.delete(oldest);
  }
  return placements;
}

function inViewport(x: number, y: number, viewport: VisualLayoutRequest['viewport']) {
  const pad = 96;
  return x >= viewport.x - pad && x <= viewport.x + viewport.width + pad
    && y >= viewport.y - pad && y <= viewport.y + viewport.height + pad;
}

function buildVisualScene(req: VisualLayoutRequest): VisualSceneDraw {
  const agentById = new Map(req.agents.map(agent => [agent.id, agent]));
  const ceremonies = new Map(req.ceremonies);
  const shelving = new Set(req.shelving);
  const influenceIds = [...req.agents].sort((a, b) => b.tokens - a.tokens).slice(0, 5).map(a => a.id);
  const influenceRank = new Map(influenceIds.map((id, index) => [id, Math.max(1, 5 - index)]));
  const far = req.zoom < 1.8;
  const fullIds = new Set<string>();

  const raw = basePlacements(req.agents).map(base => {
    const agent = agentById.get(base.id);
    if (!agent) return null;
    let x = base.x;
    let y = base.y;
    const ceremonyStep = ceremonies.get(agent.id);
    const inCeremony = ceremonyStep !== undefined && req.step - ceremonyStep <= 1;
    const isShelving = shelving.has(agent.id);

    if (inCeremony) {
      const code = agent.id.charCodeAt(agent.id.length - 1);
      x = LECTERN_POS[0] + ((code % 9) - 4) * 30;
      y = LECTERN_POS[1] + ((code % 3) - 1) * 10;
    } else if (isShelving) {
      const code = agent.id.charCodeAt(0);
      x = SHELF_TARGET_POS[0] + ((code % 5) - 2) * 18;
      y = SHELF_TARGET_POS[1] + ((code % 3) - 1) * 5;
    }

    const recentVote = agent.lastVote !== null && req.step - agent.lastVoteStep < 8;
    if (agent.id === req.selectedAgentId || inCeremony || isShelving || recentVote || influenceRank.has(agent.id)) {
      fullIds.add(agent.id);
    }
    return { agent, x, y, idx: base.idx, inCeremony, isShelving, recentVote };
  }).filter((item): item is NonNullable<typeof item> => item !== null).sort((a, b) => a.y - b.y);

  if (far) {
    for (const item of raw) {
      if (fullIds.size >= FAR_FULL_AGENT_LIMIT) break;
      fullIds.add(item.agent.id);
    }
  }

  let culledAgents = 0;
  const agents: VisualAgentDraw[] = [];
  for (const item of raw) {
    const visible = inViewport(item.x, item.y, req.viewport);
    if (!visible && item.agent.id !== req.selectedAgentId) {
      culledAgents += 1;
      continue;
    }
    const r = role(item.agent.type);
    agents.push({
      id: item.agent.id,
      type: item.agent.type,
      archetype: getArchetype(item.agent.type),
      x: item.x,
      y: item.y,
      idx: item.idx,
      tokens: item.agent.tokens,
      reputation: item.agent.reputation,
      optimism: item.agent.optimism,
      lastVote: item.agent.lastVote,
      lastVoteStep: item.agent.lastVoteStep,
      highlighted: item.agent.id === req.selectedAgentId,
      recentVote: item.recentVote,
      inCeremony: item.inCeremony,
      isShelving: item.isShelving,
      simplified: far && !fullIds.has(item.agent.id),
      influenceRank: influenceRank.get(item.agent.id) ?? 0,
      label: r.name,
      shortLabel: r.short,
    });
  }

  const byId = new Map(agents.map(agent => [agent.id, agent]));
  const delegations = req.showDelegations
    ? req.agents.flatMap(agent => {
      if (!agent.delegateTo) return [];
      const source = byId.get(agent.id);
      const target = byId.get(agent.delegateTo);
      if (!source || !target) return [];
      return [{
        sourceId: source.id,
        targetId: target.id,
        sx: source.x,
        sy: source.y + 10,
        tx: target.x,
        ty: target.y + 10,
        highlighted: source.id === req.selectedAgentId || target.id === req.selectedAgentId,
        archetype: source.archetype,
      }];
    })
    : [];

  const events: VisualEventDraw[] = req.events
    .filter(event => req.step - event.step >= 0 && req.step - event.step <= 2)
    .slice(0, 3)
    .map(event => {
      const visual = EVENT_VISUALS[event.type] ?? EVENT_VISUALS.price_change;
      return { type: event.type, ...visual, age: req.step - event.step };
    });

  return {
    requestId: req.requestId,
    step: req.step,
    agents,
    delegations,
    events,
    blackSwanActive: req.blackSwanActive,
    stats: {
      fullAgents: agents.filter(agent => !agent.simplified).length,
      simplifiedAgents: agents.filter(agent => agent.simplified).length,
      culledAgents,
      delegations: delegations.length,
    },
  };
}

self.onmessage = (event: MessageEvent<VisualLayoutRequest>) => {
  self.postMessage(buildVisualScene(event.data));
};
