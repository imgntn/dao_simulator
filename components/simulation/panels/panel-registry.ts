import type { ComponentType } from 'react';

export interface PanelDefinition {
  id: string;
  label: string;
  icon: string;
  component: ComponentType<Record<string, unknown>>;
  defaultCollapsed: boolean;
  defaultVisible: boolean;
  category: 'controls' | 'visualization' | 'advanced';
  priority: number;
}

/**
 * Panel registry — lazy-populated at runtime via registerPanel().
 * This avoids circular imports since panel components import from the store.
 */
const panels = new Map<string, PanelDefinition>();

export function registerPanel(def: PanelDefinition) {
  panels.set(def.id, def);
}

export function getPanel(id: string): PanelDefinition | undefined {
  return panels.get(id);
}

export function getAllPanels(): PanelDefinition[] {
  return Array.from(panels.values()).sort((a, b) => a.priority - b.priority);
}

export function getPanelsByCategory(category: PanelDefinition['category']): PanelDefinition[] {
  return getAllPanels().filter(p => p.category === category);
}

/** Default panel IDs and their order */
export const DEFAULT_PANEL_ORDER = [
  'transport',
  'floor-nav',
  'agent-guide',
  'delegation-graph',
  'scenario-builder',
  'custom-agent',
  'metric-alerts',
  'voting-heatmap',
  'metrics-dashboard',
  'event-feed',
  'time-scrubber',
] as const;

/** Mode → visible panel sets */
export type SimMode = 'interactive' | 'compare' | 'branch' | 'multirun' | 'research';

export const MODE_PANELS: Record<SimMode, readonly string[]> = {
  interactive: DEFAULT_PANEL_ORDER,
  compare: ['transport', 'comparison'],
  branch: ['transport', 'branch'],
  multirun: ['multirun'],
  research: ['research'],
};
