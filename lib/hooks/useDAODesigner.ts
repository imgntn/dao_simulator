'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  DAODesignerConfig,
  VotingSystemConfig,
  ProposalProcessConfig,
  QuorumConfig,
  GovernanceFeatures,
  MemberDistributionConfig,
  TreasuryConfig,
  SimulationParamsConfig,
  ValidationResult,
  ProposalStageConfig,
} from '../dao-designer/types';

import {
  DEFAULT_DAO_DESIGNER_CONFIG,
  DEFAULT_GOVERNANCE_FEATURES,
} from '../dao-designer/types';

import {
  DAO_TEMPLATES,
  TEMPLATE_METADATA,
  getTemplate,
} from '../dao-designer/templates';

import {
  validateConfig,
  toSimulationConfig,
  getRecommendations,
} from '../dao-designer/builder';

const STORAGE_KEY = 'dao-designer-config';
const MODE_STORAGE_KEY = 'dao-designer-mode';

export type DesignerMode = 'simple' | 'advanced';

interface UseDAODesignerReturn {
  // Configuration state
  config: DAODesignerConfig;
  setConfig: (config: DAODesignerConfig) => void;

  // Mode
  mode: DesignerMode;
  setMode: (mode: DesignerMode) => void;

  // Template selection
  selectedTemplateId: string | null;
  applyTemplate: (templateId: string) => void;
  clearTemplate: () => void;

  // Section updates
  updateBasicInfo: (updates: Partial<Pick<DAODesignerConfig, 'name' | 'description' | 'tokenSymbol' | 'tokenSupply'>>) => void;
  updateVotingSystem: (votingSystem: VotingSystemConfig) => void;
  updateProposalProcess: (proposalProcess: ProposalProcessConfig) => void;
  updateQuorumConfig: (quorumConfig: QuorumConfig) => void;
  updateFeatures: (features: Partial<GovernanceFeatures>) => void;
  updateMemberDistribution: (memberDistribution: MemberDistributionConfig) => void;
  updateTreasury: (treasury: TreasuryConfig) => void;
  updateSimulationParams: (simulationParams: SimulationParamsConfig) => void;

  // Feature toggles
  toggleFeature: (feature: keyof GovernanceFeatures, enabled: boolean) => void;

  // Proposal stage management
  addProposalStage: (stage: ProposalStageConfig) => void;
  removeProposalStage: (index: number) => void;
  updateProposalStage: (index: number, stage: ProposalStageConfig) => void;
  reorderProposalStages: (fromIndex: number, toIndex: number) => void;

  // Validation
  validationResult: ValidationResult;
  isValid: boolean;
  errors: string[];
  warnings: string[];

  // Actions
  reset: () => void;
  exportConfig: () => string;
  importConfig: (json: string) => boolean;
  getSimulationConfig: () => ReturnType<typeof toSimulationConfig>;

  // Recommendations
  applyRecommendations: (memberCount: number, complexity: 'beginner' | 'intermediate' | 'advanced') => void;
}

/**
 * Hook for managing DAO Designer state
 */
export function useDAODesigner(): UseDAODesignerReturn {
  // Load initial state from localStorage
  const loadInitialConfig = (): DAODesignerConfig => {
    if (typeof window === 'undefined') {
      return { ...DEFAULT_DAO_DESIGNER_CONFIG };
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load designer config from localStorage:', e);
    }
    return { ...DEFAULT_DAO_DESIGNER_CONFIG };
  };

  const loadInitialMode = (): DesignerMode => {
    if (typeof window === 'undefined') {
      return 'simple';
    }
    try {
      const stored = localStorage.getItem(MODE_STORAGE_KEY);
      if (stored === 'simple' || stored === 'advanced') {
        return stored;
      }
    } catch (e) {
      console.warn('Failed to load designer mode from localStorage:', e);
    }
    return 'simple';
  };

  const [config, setConfigState] = useState<DAODesignerConfig>(loadInitialConfig);
  const [mode, setModeState] = useState<DesignerMode>(loadInitialMode);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Persist config to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }
  }, [config]);

  // Persist mode to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(MODE_STORAGE_KEY, mode);
    }
  }, [mode]);

  // Validation
  const validationResult = useMemo(() => validateConfig(config), [config]);
  const isValid = validationResult.isValid;
  const errors = useMemo(
    () => validationResult.errors.map(e => `${e.field}: ${e.message}`),
    [validationResult.errors]
  );
  const warnings = useMemo(
    () => validationResult.warnings.map(w => `${w.field}: ${w.message}`),
    [validationResult.warnings]
  );

  // Config setter
  const setConfig = useCallback((newConfig: DAODesignerConfig) => {
    setConfigState(newConfig);
    setSelectedTemplateId(null); // Clear template selection when manually editing
  }, []);

  // Mode setter
  const setMode = useCallback((newMode: DesignerMode) => {
    setModeState(newMode);
  }, []);

  // Template management
  const applyTemplate = useCallback((templateId: string) => {
    const template = getTemplate(templateId);
    if (template) {
      setConfigState({ ...template });
      setSelectedTemplateId(templateId);
    }
  }, []);

  const clearTemplate = useCallback(() => {
    setSelectedTemplateId(null);
  }, []);

  // Section updates
  const updateBasicInfo = useCallback(
    (updates: Partial<Pick<DAODesignerConfig, 'name' | 'description' | 'tokenSymbol' | 'tokenSupply'>>) => {
      setConfigState(prev => ({ ...prev, ...updates }));
      setSelectedTemplateId(null);
    },
    []
  );

  const updateVotingSystem = useCallback((votingSystem: VotingSystemConfig) => {
    setConfigState(prev => ({ ...prev, votingSystem }));
    setSelectedTemplateId(null);
  }, []);

  const updateProposalProcess = useCallback((proposalProcess: ProposalProcessConfig) => {
    setConfigState(prev => ({ ...prev, proposalProcess }));
    setSelectedTemplateId(null);
  }, []);

  const updateQuorumConfig = useCallback((quorumConfig: QuorumConfig) => {
    setConfigState(prev => ({ ...prev, quorumConfig }));
    setSelectedTemplateId(null);
  }, []);

  const updateFeatures = useCallback((features: Partial<GovernanceFeatures>) => {
    setConfigState(prev => ({
      ...prev,
      features: { ...prev.features, ...features },
    }));
    setSelectedTemplateId(null);
  }, []);

  const updateMemberDistribution = useCallback((memberDistribution: MemberDistributionConfig) => {
    setConfigState(prev => ({ ...prev, memberDistribution }));
    setSelectedTemplateId(null);
  }, []);

  const updateTreasury = useCallback((treasury: TreasuryConfig) => {
    setConfigState(prev => ({ ...prev, treasury }));
    setSelectedTemplateId(null);
  }, []);

  const updateSimulationParams = useCallback((simulationParams: SimulationParamsConfig) => {
    setConfigState(prev => ({ ...prev, simulationParams }));
    setSelectedTemplateId(null);
  }, []);

  // Feature toggle
  const toggleFeature = useCallback((feature: keyof GovernanceFeatures, enabled: boolean) => {
    setConfigState(prev => ({
      ...prev,
      features: { ...prev.features, [feature]: enabled },
    }));
    setSelectedTemplateId(null);
  }, []);

  // Proposal stage management
  const addProposalStage = useCallback((stage: ProposalStageConfig) => {
    setConfigState(prev => ({
      ...prev,
      proposalProcess: {
        ...prev.proposalProcess,
        stages: [...prev.proposalProcess.stages, stage],
      },
    }));
    setSelectedTemplateId(null);
  }, []);

  const removeProposalStage = useCallback((index: number) => {
    setConfigState(prev => ({
      ...prev,
      proposalProcess: {
        ...prev.proposalProcess,
        stages: prev.proposalProcess.stages.filter((_, i) => i !== index),
      },
    }));
    setSelectedTemplateId(null);
  }, []);

  const updateProposalStage = useCallback((index: number, stage: ProposalStageConfig) => {
    setConfigState(prev => ({
      ...prev,
      proposalProcess: {
        ...prev.proposalProcess,
        stages: prev.proposalProcess.stages.map((s, i) => (i === index ? stage : s)),
      },
    }));
    setSelectedTemplateId(null);
  }, []);

  const reorderProposalStages = useCallback((fromIndex: number, toIndex: number) => {
    setConfigState(prev => {
      const stages = [...prev.proposalProcess.stages];
      const [removed] = stages.splice(fromIndex, 1);
      stages.splice(toIndex, 0, removed);
      return {
        ...prev,
        proposalProcess: { ...prev.proposalProcess, stages },
      };
    });
    setSelectedTemplateId(null);
  }, []);

  // Actions
  const reset = useCallback(() => {
    setConfigState({ ...DEFAULT_DAO_DESIGNER_CONFIG });
    setSelectedTemplateId(null);
  }, []);

  const exportConfig = useCallback(() => {
    return JSON.stringify(config, null, 2);
  }, [config]);

  const importConfig = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      const result = validateConfig(parsed);
      if (result.isValid) {
        setConfigState(parsed);
        setSelectedTemplateId(null);
        return true;
      }
    } catch (e) {
      console.error('Failed to import config:', e);
    }
    return false;
  }, []);

  const getSimulationConfig = useCallback(() => {
    return toSimulationConfig(config);
  }, [config]);

  const applyRecommendations = useCallback(
    (memberCount: number, complexity: 'beginner' | 'intermediate' | 'advanced') => {
      const recommendations = getRecommendations(memberCount, complexity);
      setConfigState(prev => ({
        ...prev,
        ...recommendations,
        features: {
          ...prev.features,
          ...(recommendations.features || {}),
        },
      }));
      setSelectedTemplateId(null);
    },
    []
  );

  return {
    // Configuration state
    config,
    setConfig,

    // Mode
    mode,
    setMode,

    // Template selection
    selectedTemplateId,
    applyTemplate,
    clearTemplate,

    // Section updates
    updateBasicInfo,
    updateVotingSystem,
    updateProposalProcess,
    updateQuorumConfig,
    updateFeatures,
    updateMemberDistribution,
    updateTreasury,
    updateSimulationParams,

    // Feature toggles
    toggleFeature,

    // Proposal stage management
    addProposalStage,
    removeProposalStage,
    updateProposalStage,
    reorderProposalStages,

    // Validation
    validationResult,
    isValid,
    errors,
    warnings,

    // Actions
    reset,
    exportConfig,
    importConfig,
    getSimulationConfig,

    // Recommendations
    applyRecommendations,
  };
}
