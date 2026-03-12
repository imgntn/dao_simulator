'use client';

import { create } from 'zustand';
import { DEFAULT_PANEL_ORDER, MODE_PANELS, type SimMode } from '@/components/simulation/panels/panel-registry';

// =============================================================================
// STATE TYPES
// =============================================================================

export interface LayoutState {
  // Panel ordering & visibility
  panelOrder: string[];
  panelCollapsed: Record<string, boolean>;
  panelVisible: Record<string, boolean>;

  // Sidebar
  sidebarOpen: boolean;
  sidebarWidth: number;

  // Drag state (ephemeral, not persisted)
  draggedPanel: string | null;

  // Current mode
  mode: SimMode;

  // Actions
  setPanelOrder: (order: string[]) => void;
  togglePanelCollapsed: (id: string) => void;
  setPanelCollapsed: (id: string, collapsed: boolean) => void;
  togglePanelVisible: (id: string) => void;
  setPanelVisible: (id: string, visible: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setDraggedPanel: (id: string | null) => void;
  setMode: (mode: SimMode) => void;
  resetLayout: () => void;
}

// =============================================================================
// PERSISTENCE
// =============================================================================

const STORAGE_KEY = 'dao-sim-layout';

interface PersistedLayout {
  panelOrder: string[];
  panelCollapsed: Record<string, boolean>;
  panelVisible: Record<string, boolean>;
  sidebarWidth: number;
}

function loadPersistedLayout(): Partial<PersistedLayout> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function persistLayout(state: LayoutState) {
  try {
    const data: PersistedLayout = {
      panelOrder: state.panelOrder,
      panelCollapsed: state.panelCollapsed,
      panelVisible: state.panelVisible,
      sidebarWidth: state.sidebarWidth,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // noop
  }
}

// =============================================================================
// DEFAULT STATE
// =============================================================================

function getDefaultState() {
  const persisted = loadPersistedLayout();

  const defaultCollapsed: Record<string, boolean> = {
    'agent-guide': true,
    'delegation-graph': true,
    'scenario-builder': true,
    'custom-agent': true,
    'metric-alerts': true,
    'voting-heatmap': true,
  };

  const defaultVisible: Record<string, boolean> = {};
  for (const id of DEFAULT_PANEL_ORDER) {
    defaultVisible[id] = true;
  }

  return {
    panelOrder: persisted.panelOrder ?? [...DEFAULT_PANEL_ORDER],
    panelCollapsed: persisted.panelCollapsed ?? defaultCollapsed,
    panelVisible: persisted.panelVisible ?? defaultVisible,
    sidebarOpen: true,
    sidebarWidth: persisted.sidebarWidth ?? 380,
    draggedPanel: null,
    mode: 'interactive' as SimMode,
  };
}

// =============================================================================
// STORE
// =============================================================================

export const useLayoutStore = create<LayoutState>((set, get) => ({
  ...getDefaultState(),

  setPanelOrder: (order) => {
    set({ panelOrder: order });
    persistLayout(get());
  },

  togglePanelCollapsed: (id) => {
    set(prev => {
      const next = { ...prev.panelCollapsed, [id]: !prev.panelCollapsed[id] };
      return { panelCollapsed: next };
    });
    persistLayout(get());
  },

  setPanelCollapsed: (id, collapsed) => {
    set(prev => ({
      panelCollapsed: { ...prev.panelCollapsed, [id]: collapsed },
    }));
    persistLayout(get());
  },

  togglePanelVisible: (id) => {
    set(prev => {
      const next = { ...prev.panelVisible, [id]: !prev.panelVisible[id] };
      return { panelVisible: next };
    });
    persistLayout(get());
  },

  setPanelVisible: (id, visible) => {
    set(prev => ({
      panelVisible: { ...prev.panelVisible, [id]: visible },
    }));
    persistLayout(get());
  },

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setSidebarWidth: (width) => {
    const clamped = Math.max(280, Math.min(600, width));
    set({ sidebarWidth: clamped });
    persistLayout(get());
  },

  setDraggedPanel: (id) => set({ draggedPanel: id }),

  setMode: (mode) => {
    const modePanels = MODE_PANELS[mode];
    if (modePanels) {
      // Update visibility based on mode
      const panelVisible: Record<string, boolean> = {};
      for (const id of get().panelOrder) {
        panelVisible[id] = modePanels.includes(id);
      }
      // Also include mode-specific panels not in panelOrder
      for (const id of modePanels) {
        panelVisible[id] = true;
      }
      set({ mode, panelVisible });
    } else {
      set({ mode });
    }
  },

  resetLayout: () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
    set(getDefaultState());
  },
}));
