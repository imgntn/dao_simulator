import type { AgentSnapshot, SimulationEvent } from './worker-protocol';

export interface VisualLayoutAgentInput {
  id: string;
  type: string;
  tokens: number;
  reputation: number;
  optimism: number;
  lastVote: boolean | null;
  lastVoteStep: number;
  delegateTo: string | null;
}

export interface VisualLayoutRequest {
  requestId: number;
  step: number;
  agents: VisualLayoutAgentInput[];
  events: SimulationEvent[];
  blackSwanActive: boolean;
  ceremonies: Array<[string, number]>;
  shelving: string[];
  selectedAgentId: string | null;
  labelsVisible: boolean;
  showDelegations: boolean;
  quality: VisualQuality;
  zoom: number;
  viewport: { x: number; y: number; width: number; height: number };
}

export interface VisualAgentDraw {
  id: string;
  type: string;
  archetype: VisualArchetype;
  x: number;
  y: number;
  idx: number;
  tokens: number;
  reputation: number;
  optimism: number;
  lastVote: boolean | null;
  lastVoteStep: number;
  highlighted: boolean;
  recentVote: boolean;
  inCeremony: boolean;
  isShelving: boolean;
  simplified: boolean;
  influenceRank: number;
  label: string;
  shortLabel: string;
}

export interface VisualDelegationDraw {
  sourceId: string;
  targetId: string;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  highlighted: boolean;
  archetype: VisualArchetype;
}

export interface VisualEventDraw {
  type: SimulationEvent['type'];
  x: number;
  y: number;
  color: string;
  label: string;
  age: number;
}

export interface VisualSceneDraw {
  requestId: number;
  step: number;
  agents: VisualAgentDraw[];
  delegations: VisualDelegationDraw[];
  events: VisualEventDraw[];
  blackSwanActive: boolean;
  stats: {
    fullAgents: number;
    simplifiedAgents: number;
    culledAgents: number;
    delegations: number;
    quality: VisualQuality;
  };
}

export type VisualArchetype = 'governance' | 'treasury' | 'craft' | 'council' | 'passive';
export type VisualQuality = 'high' | 'medium' | 'low';

export function toVisualAgentInput(agent: AgentSnapshot): VisualLayoutAgentInput {
  return {
    id: agent.id,
    type: agent.type,
    tokens: agent.tokens,
    reputation: agent.reputation,
    optimism: agent.optimism,
    lastVote: agent.lastVote,
    lastVoteStep: agent.lastVoteStep,
    delegateTo: agent.delegateTo,
  };
}
