/**
 * Shared types for dashboard components
 * Centralizes type definitions to avoid duplication across files
 */

// Outcome causes for simulation endings
export type OutcomeCause =
  | 'missions_completed'
  | 'treasury_insolvency'
  | 'price_collapse'
  | 'governance_backlog'
  | 'unknown';

// Operations log entry
export interface OpsLogEntry {
  label: string;
  value: string | number;
  step?: number;
  severity?: 'info' | 'warning' | 'incident' | 'critical';
}

// Organization statistics
export interface OrgStats {
  memberCount: number;
  proposalCount: number;
  activeProposals: number;
  treasury: number;
  tokenPrice: number;
  totalStaked: number;
  averageReputation: number;
  guildCount: number;
}

// Run history entry
export interface RunHistoryEntry {
  id: string;
  outcome: 'won' | 'lost';
  steps: number;
  treasury: number;
  seed: number | string;
  preset: string;
  strategyName: string;
  outcomeCause: OutcomeCause;
  timestamp: number;
  missions?: MissionSummary[];
}

// Mission summary
export interface MissionSummary {
  id: string;
  title: string;
  achieved: boolean;
  currentLabel: string;
  targetLabel: string;
  current?: number;
  target?: number;
}

// Challenge definition
export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  preset?: string;
  objectives: ChallengeObjective[];
}

// Challenge objective
export interface ChallengeObjective {
  id: string;
  description: string;
  type: 'reach' | 'maintain' | 'avoid';
  metric: string;
  target: number;
  duration?: number;
}

// Strategy preset
export interface StrategyPreset {
  id: string;
  name: string;
  description?: string;
  params: Record<string, number | string | boolean>;
  isDefault?: boolean;
}

// Tutorial step
export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS selector for highlighting
  position?: 'top' | 'bottom' | 'left' | 'right';
}

// Connection status
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// Alert/notification
export interface Alert {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: number;
  autoHide?: boolean;
  duration?: number;
}

// Market shock event
export interface MarketShockEvent {
  step: number;
  severity: number;
  type: 'positive' | 'negative';
  impact?: string;
}

// Simulation data point (for charts)
export interface SimulationDataPoint {
  step: number;
  price: number;
  treasury: number;
  memberCount: number;
  proposalCount: number;
  activeProposals: number;
  totalStaked: number;
  averageReputation: number;
  timestamp?: number;
}

// Network node for visualization
export interface NetworkNode {
  id: string;
  label?: string;
  type: 'member' | 'proposal' | 'guild' | 'project';
  x?: number;
  y?: number;
  z?: number;
  tokens?: number;
  reputation?: number;
  color?: string;
  size?: number;
}

// Network link for visualization
export interface NetworkLink {
  source: string;
  target: string;
  type: 'delegation' | 'vote' | 'membership' | 'funding';
  weight?: number;
  color?: string;
}

// Heatmap data
export interface HeatmapCell {
  x: number;
  y: number;
  value: number;
  label?: string;
}

// Chart configuration
export interface ChartConfig {
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  animate?: boolean;
  height?: number;
  colors?: string[];
}

// Dashboard view mode
export type ViewMode = 'overview' | 'network' | 'analytics' | 'history';

// Keyboard shortcut
export interface KeyboardShortcut {
  key: string;
  modifiers?: ('ctrl' | 'shift' | 'alt' | 'meta')[];
  action: string;
  description: string;
}

// Export all types
export type {
  OutcomeCause as DashboardOutcomeCause,
  OpsLogEntry as DashboardOpsLogEntry,
  OrgStats as DashboardOrgStats,
  RunHistoryEntry as DashboardRunHistoryEntry,
};
