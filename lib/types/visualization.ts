export interface DAOMember {
  unique_id: string;
  reputation: number;
  tokens: number;
  location?: string;
  representative?: string;
  delegations?: Record<string, number>;
}

export interface DAOProposal {
  id: string;
  title: string;
  type?: string;
  creator?: string;
  votes_for: number;
  votes_against: number;
  status: string;
}

export interface NetworkNode {
  id: string;
  type: 'member' | 'proposal' | 'cluster';
  position?: [number, number, number];
  size?: number;
}

export interface NetworkEdge {
  source: string;
  target: string;
  type: 'representative' | 'delegation' | 'created' | 'aggregated';
  weight?: number;
}

export interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  added_nodes?: NetworkNode[];
  removed_nodes?: NetworkNode[];
  added_edges?: NetworkEdge[];
  removed_edges?: NetworkEdge[];
  clusters?: Array<{
    id: string;
    members: string[];
    size: number;
    position: [number, number, number];
  }>;
  visible_nodes?: NetworkNode[];
  visible_edges?: NetworkEdge[];
}

export interface SimulationData {
  step: number;
  dao_token_price: number;
  treasury_balance: number;
  total_members: number;
  active_proposals: number;
  [key: string]: number;
}

export interface LeaderboardEntry {
  member: string;
  value: number;
}

export interface MarketShock {
  step: number;
  severity: number;
}

export interface DAOProject {
  id: string;
  title: string;
  status: string;
  progress: number;
  fundingGoal: number;
  currentFunding: number;
  duration: number;
  startTime: number;
  members: string[];
  skills: string[];
}

export interface DAOGuild {
  name: string;
  members: string[];
  treasury: number;
  reputation: number;
  creator: string | null;
}

export interface DAODispute {
  id: string;
  parties: string[];
  description: string;
  importance: number;
  resolved: boolean;
  relatedProject: string | null;
}

export interface DAOViolation {
  id: string;
  violator: string;
  description: string;
  penalty: number;
  detected: boolean;
}

export interface SimulationMetrics {
  gini: number;
  reputationGini: number;
  avgTokens: number;
  numProjects: number;
  numMembers: number;
  eventCounts: Record<string, number>;
}
