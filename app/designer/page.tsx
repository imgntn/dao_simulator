'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDAODesigner } from '@/lib/hooks/useDAODesigner';
import { useSimulationSocket } from '@/lib/hooks/useSimulationSocket';
import { TEMPLATE_METADATA } from '@/lib/dao-designer/templates';
import { GOVERNANCE_FEATURE_TOOLTIPS } from '@/lib/dao-designer/glossary';
import { TemplateCard } from '@/components/designer/TemplateCard';
import { ModeToggle } from '@/components/designer/ModeToggle';
import { FeatureToggle } from '@/components/designer/FeatureToggle';
import { SectionAccordion } from '@/components/designer/SectionAccordion';
import { ConfigPreview } from '@/components/designer/ConfigPreview';
import { VotingSystemSelector } from '@/components/designer/VotingSystemSelector';
import { MemberDistribution } from '@/components/designer/MemberDistribution';
import { GlossaryModal } from '@/components/designer/GlossaryModal';
import { ResearchExportModal } from '@/components/designer/ResearchExportModal';
import { LabelWithTooltip, InfoTooltip } from '@/components/designer/Tooltip';
import { AppHeader } from '@/components/layout/AppHeader';
import { SettingsModal } from '@/components/settings/SettingsModal';
import type { GovernanceFeatures, QuorumType, ProposalStageType } from '@/lib/dao-designer/types';

const FEATURE_INFO: Record<keyof GovernanceFeatures, { label: string; description: string }> = {
  bicameral: { label: 'Bicameral Governance', description: 'Two-house voting system (like Optimism)' },
  dualGovernance: { label: 'Dual Governance', description: 'Staker veto rights with dynamic timelocks (like Lido)' },
  timelockEnabled: { label: 'Timelock', description: 'Delay between vote passing and execution' },
  approvalVoting: { label: 'Approval Voting', description: 'Continuous approval for executive proposals (like MakerDAO)' },
  convictionVoting: { label: 'Conviction Voting', description: 'Time-weighted voting where conviction builds over time' },
  easyTrack: { label: 'Easy Track', description: 'Fast-track for routine decisions (like Lido)' },
  proposalGates: { label: 'Proposal Gates', description: 'Threshold requirements to create proposals' },
  ragequit: { label: 'Rage Quit', description: 'Allow members to exit with their share of treasury' },
  tokenLocking: { label: 'Token Locking', description: 'Lock tokens for increased voting power' },
  governanceCycles: { label: 'Governance Cycles', description: 'Structured seasons with submission/voting/execution phases' },
  retroPGF: { label: 'RetroPGF', description: 'Retroactive Public Goods Funding rounds' },
  securityCouncil: { label: 'Security Council', description: 'Emergency powers for critical decisions' },
  citizenHouse: { label: 'Citizen House', description: 'Non-token-based second chamber for veto rights' },
  bicameralConfig: { label: '', description: '' },
  dualGovernanceConfig: { label: '', description: '' },
  timelockConfig: { label: '', description: '' },
  approvalVotingConfig: { label: '', description: '' },
  convictionVotingConfig: { label: '', description: '' },
  easyTrackConfig: { label: '', description: '' },
  proposalGatesConfig: { label: '', description: '' },
  ragequitConfig: { label: '', description: '' },
  tokenLockingConfig: { label: '', description: '' },
  governanceCyclesConfig: { label: '', description: '' },
  retroPGFConfig: { label: '', description: '' },
  securityCouncilConfig: { label: '', description: '' },
  citizenHouseConfig: { label: '', description: '' },
};

const BOOLEAN_FEATURES: (keyof GovernanceFeatures)[] = [
  'bicameral',
  'dualGovernance',
  'timelockEnabled',
  'approvalVoting',
  'convictionVoting',
  'easyTrack',
  'proposalGates',
  'ragequit',
  'tokenLocking',
  'governanceCycles',
  'retroPGF',
  'securityCouncil',
  'citizenHouse',
];

const STAGE_TYPES: { value: ProposalStageType; label: string }[] = [
  { value: 'discussion', label: 'Discussion' },
  { value: 'temp_check', label: 'Temperature Check' },
  { value: 'voting', label: 'Voting' },
  { value: 'timelock', label: 'Timelock' },
  { value: 'veto_window', label: 'Veto Window' },
  { value: 'execution', label: 'Execution' },
];

export default function DesignerPage() {
  const router = useRouter();
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [researchExportOpen, setResearchExportOpen] = useState(false);
  const {
    config,
    mode,
    setMode,
    selectedTemplateId,
    applyTemplate,
    updateBasicInfo,
    updateVotingSystem,
    updateProposalProcess,
    updateQuorumConfig,
    updateFeatures,
    updateMemberDistribution,
    updateTreasury,
    updateSimulationParams,
    toggleFeature,
    addProposalStage,
    removeProposalStage,
    updateProposalStage,
    validationResult,
    isValid,
    errors,
    warnings,
    reset,
    exportConfig,
    getSimulationConfig,
  } = useDAODesigner();

  const { startSimulation, connected } = useSimulationSocket();

  const handleStartSimulation = () => {
    if (!isValid) return;
    const simConfig = getSimulationConfig();
    // Cast to Record<string, unknown> for socket compatibility
    startSimulation({ simulationConfig: simConfig as unknown as Record<string, unknown>, mode: 'single' });
    router.push('/dashboard');
  };

  const handleExport = () => {
    const json = exportConfig();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name.replace(/\s+/g, '-').toLowerCase()}-config.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <AppHeader
        title="Design Your DAO"
        showBackButton
        backHref="/dashboard"
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenGlossary={() => setGlossaryOpen(true)}
        actions={
          <>
            <ModeToggle mode={mode} onModeChange={setMode} />
            <button
              onClick={reset}
              className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Reset
            </button>
            <button
              onClick={handleExport}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Export
            </button>
            <button
              onClick={() => setResearchExportOpen(true)}
              className="px-3 py-2 text-sm border border-blue-500 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              Research CLI
            </button>
            <button
              onClick={handleStartSimulation}
              disabled={!isValid || !connected}
              className={`
                px-4 py-2 rounded-lg text-white font-medium
                ${isValid && connected
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-400 cursor-not-allowed'
                }
              `}
            >
              Start Simulation
            </button>
          </>
        }
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {mode === 'simple' ? (
              /* Simple Mode - Template Selection */
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Choose a Template
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(TEMPLATE_METADATA).map(([id, metadata]) => (
                      <TemplateCard
                        key={id}
                        template={metadata}
                        selected={selectedTemplateId === id}
                        onSelect={() => applyTemplate(id)}
                      />
                    ))}
                  </div>
                </div>

                {/* Quick Customization */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">Quick Customization</h3>
                    <InfoTooltip
                      content="Adjust basic settings without entering advanced mode. For full control, switch to Advanced mode above."
                      position="right"
                    />
                  </div>

                  <div>
                    <LabelWithTooltip
                      label="DAO Name"
                      tooltip="A memorable name for your DAO. This will be displayed throughout the simulation."
                      className="mb-2"
                    />
                    <input
                      type="text"
                      value={config.name}
                      onChange={(e) => updateBasicInfo({ name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="My DAO"
                    />
                  </div>

                  <div>
                    <LabelWithTooltip
                      label={`Members: ${config.memberDistribution.totalMembers}`}
                      tooltip="The total number of participants in your DAO. Larger DAOs face different challenges like lower participation rates and coordination difficulties."
                      className="mb-2"
                    />
                    <input
                      type="range"
                      min="10"
                      max="500"
                      step="10"
                      value={config.memberDistribution.totalMembers}
                      onChange={(e) =>
                        updateMemberDistribution({
                          ...config.memberDistribution,
                          totalMembers: parseInt(e.target.value),
                        })
                      }
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>10 (Intimate)</span>
                      <span>500 (Large)</span>
                    </div>
                  </div>

                  <div>
                    <LabelWithTooltip
                      label={`Quorum: ${config.quorumConfig.baseQuorumPercent}%`}
                      tooltip="The minimum percentage of voting power required to make a decision valid. Higher quorums need more participation but harder to reach."
                      className="mb-2"
                    />
                    <input
                      type="range"
                      min="1"
                      max="50"
                      step="1"
                      value={config.quorumConfig.baseQuorumPercent}
                      onChange={(e) =>
                        updateQuorumConfig({
                          ...config.quorumConfig,
                          baseQuorumPercent: parseInt(e.target.value),
                        })
                      }
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>1% (Easy)</span>
                      <span>50% (Strict)</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Advanced Mode - Full Configuration */
              <div className="space-y-4">
                {/* Basic Info */}
                <SectionAccordion title="Basic Info" description="Name, token, and supply" defaultOpen>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        DAO Name
                      </label>
                      <input
                        type="text"
                        value={config.name}
                        onChange={(e) => updateBasicInfo({ name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        value={config.description}
                        onChange={(e) => updateBasicInfo({ description: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Token Symbol
                      </label>
                      <input
                        type="text"
                        value={config.tokenSymbol}
                        onChange={(e) => updateBasicInfo({ tokenSymbol: e.target.value.toUpperCase() })}
                        maxLength={6}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Token Supply
                      </label>
                      <select
                        value={config.tokenSupply}
                        onChange={(e) => updateBasicInfo({ tokenSupply: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value={1000000}>1M</option>
                        <option value={10000000}>10M</option>
                        <option value={100000000}>100M</option>
                        <option value={1000000000}>1B</option>
                        <option value={10000000000}>10B</option>
                      </select>
                    </div>
                  </div>
                </SectionAccordion>

                {/* Voting System */}
                <SectionAccordion title="Voting System" description="How votes are counted">
                  <VotingSystemSelector
                    value={config.votingSystem}
                    onChange={updateVotingSystem}
                  />
                </SectionAccordion>

                {/* Quorum */}
                <SectionAccordion title="Quorum Requirements" description="Minimum participation for valid votes">
                  <div className="space-y-4">
                    <div>
                      <LabelWithTooltip
                        label="Quorum Type"
                        tooltip="How the minimum participation requirement is calculated. Fixed uses a constant percentage, Dynamic adjusts based on recent participation, and Per Category sets different thresholds for different proposal types."
                        className="mb-2"
                      />
                      <select
                        value={config.quorumConfig.type}
                        onChange={(e) =>
                          updateQuorumConfig({
                            ...config.quorumConfig,
                            type: e.target.value as QuorumType,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="fixed_percent">Fixed Percentage</option>
                        <option value="dynamic">Dynamic</option>
                        <option value="per_category">Per Category</option>
                      </select>
                    </div>
                    <div>
                      <LabelWithTooltip
                        label={`Base Quorum: ${config.quorumConfig.baseQuorumPercent}%`}
                        tooltip="The minimum percentage of voting power that must participate for a vote to be valid. Higher quorums ensure broader participation but can make it harder to pass proposals. Most DAOs use 4-10%."
                        className="mb-2"
                      />
                      <input
                        type="range"
                        min="1"
                        max="50"
                        step="1"
                        value={config.quorumConfig.baseQuorumPercent}
                        onChange={(e) =>
                          updateQuorumConfig({
                            ...config.quorumConfig,
                            baseQuorumPercent: parseInt(e.target.value),
                          })
                        }
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>1% (Easy to reach)</span>
                        <span>50% (Very high)</span>
                      </div>
                    </div>
                    {config.quorumConfig.type === 'per_category' && (
                      <div>
                        <LabelWithTooltip
                          label={`Constitutional Quorum: ${config.quorumConfig.constitutionalQuorumPercent || 5}%`}
                          tooltip="Higher quorum requirement for constitutional or high-impact proposals. Ensures broader consensus for fundamental changes to the DAO."
                          className="mb-2"
                        />
                        <input
                          type="range"
                          min="1"
                          max="50"
                          step="1"
                          value={config.quorumConfig.constitutionalQuorumPercent || 5}
                          onChange={(e) =>
                            updateQuorumConfig({
                              ...config.quorumConfig,
                              constitutionalQuorumPercent: parseInt(e.target.value),
                            })
                          }
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </SectionAccordion>

                {/* Proposal Process */}
                <SectionAccordion title="Proposal Process" description="Stages proposals go through">
                  <div className="space-y-4">
                    {/* Current Stages */}
                    <div className="space-y-2">
                      {config.proposalProcess.stages.map((stage, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <span className="text-gray-400 font-mono text-sm">{index + 1}</span>
                          <input
                            type="text"
                            value={stage.name}
                            onChange={(e) =>
                              updateProposalStage(index, { ...stage, name: e.target.value })
                            }
                            className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          />
                          <select
                            value={stage.type}
                            onChange={(e) =>
                              updateProposalStage(index, {
                                ...stage,
                                type: e.target.value as ProposalStageType,
                              })
                            }
                            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          >
                            {STAGE_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={stage.durationDays}
                              onChange={(e) =>
                                updateProposalStage(index, {
                                  ...stage,
                                  durationDays: parseInt(e.target.value) || 1,
                                })
                              }
                              min={1}
                              max={30}
                              className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            />
                            <span className="text-sm text-gray-500">days</span>
                          </div>
                          <button
                            onClick={() => removeProposalStage(index)}
                            className="text-red-500 hover:text-red-600 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                    {/* Add Stage */}
                    <button
                      onClick={() =>
                        addProposalStage({ name: 'New Stage', type: 'voting', durationDays: 7 })
                      }
                      className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                    >
                      + Add Stage
                    </button>
                  </div>
                </SectionAccordion>

                {/* Governance Features */}
                <SectionAccordion title="Governance Features" description="Advanced capabilities">
                  <div className="space-y-3">
                    {BOOLEAN_FEATURES.map((feature) => {
                      const info = FEATURE_INFO[feature];
                      if (!info.label) return null;
                      const tooltipData = GOVERNANCE_FEATURE_TOOLTIPS[feature];
                      return (
                        <FeatureToggle
                          key={feature}
                          label={info.label}
                          description={info.description}
                          enabled={config.features[feature] as boolean}
                          onToggle={(enabled) => toggleFeature(feature, enabled)}
                          tooltip={tooltipData?.longDescription}
                          example={tooltipData?.realWorldExample}
                        />
                      );
                    })}
                  </div>
                </SectionAccordion>

                {/* Member Distribution */}
                <SectionAccordion title="Member Distribution" description="Types and proportions of members">
                  <MemberDistribution
                    value={config.memberDistribution}
                    onChange={updateMemberDistribution}
                  />
                </SectionAccordion>

                {/* Treasury */}
                <SectionAccordion title="Treasury" description="Initial funds and assets">
                  <div className="space-y-4">
                    <div>
                      <LabelWithTooltip
                        label="Initial Balance"
                        tooltip="The starting amount in the DAO treasury. This represents the funds available for grants, operations, and proposals. Larger treasuries enable bigger initiatives but may attract more controversy."
                        className="mb-2"
                      />
                      <select
                        value={config.treasury.initialBalance}
                        onChange={(e) =>
                          updateTreasury({
                            ...config.treasury,
                            initialBalance: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value={100000}>100K</option>
                        <option value={1000000}>1M</option>
                        <option value={10000000}>10M</option>
                        <option value={50000000}>50M</option>
                        <option value={100000000}>100M</option>
                        <option value={500000000}>500M</option>
                      </select>
                    </div>
                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={config.treasury.diversified}
                          onChange={(e) =>
                            updateTreasury({
                              ...config.treasury,
                              diversified: e.target.checked,
                            })
                          }
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Diversified Treasury
                        </span>
                        <InfoTooltip
                          content="Hold multiple assets instead of just the native token. Diversified treasuries are more resilient to price volatility but require more complex management."
                          position="right"
                        />
                      </label>
                    </div>
                  </div>
                </SectionAccordion>

                {/* Simulation Settings */}
                <SectionAccordion title="Simulation Settings" description="Control simulation behavior">
                  <div className="space-y-4">
                    <div>
                      <LabelWithTooltip
                        label={`Proposal Frequency: ${config.simulationParams.proposalFrequency.toFixed(1)} per day`}
                        tooltip="How often new proposals are submitted in the simulation. Higher frequencies create a busier governance environment with potential for voter fatigue. Lower frequencies may feel slow but allow more deliberation."
                        className="mb-2"
                      />
                      <input
                        type="range"
                        min="0.1"
                        max="2"
                        step="0.1"
                        value={config.simulationParams.proposalFrequency}
                        onChange={(e) =>
                          updateSimulationParams({
                            ...config.simulationParams,
                            proposalFrequency: parseFloat(e.target.value),
                          })
                        }
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>0.1/day (Quiet)</span>
                        <span>2/day (Very Active)</span>
                      </div>
                    </div>
                    <div>
                      <LabelWithTooltip
                        label={`Voting Activity: ${(config.simulationParams.votingActivity * 100).toFixed(0)}%`}
                        tooltip="The percentage of members who actively participate in governance. Real DAOs typically see 10-30% active participation. Higher activity means more engaged governance but also more computation."
                        className="mb-2"
                      />
                      <input
                        type="range"
                        min="0.1"
                        max="0.9"
                        step="0.05"
                        value={config.simulationParams.votingActivity}
                        onChange={(e) =>
                          updateSimulationParams({
                            ...config.simulationParams,
                            votingActivity: parseFloat(e.target.value),
                          })
                        }
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>10% (Apathetic)</span>
                        <span>90% (Highly Engaged)</span>
                      </div>
                    </div>
                    <div>
                      <LabelWithTooltip
                        label={`Market Shock Probability: ${(config.simulationParams.externalShockProbability * 100).toFixed(0)}%`}
                        tooltip="The chance of external events affecting governance. Shocks can include market crashes, security incidents, or regulatory changes. Tests how well your governance handles crises."
                        className="mb-2"
                      />
                      <input
                        type="range"
                        min="0"
                        max="0.2"
                        step="0.01"
                        value={config.simulationParams.externalShockProbability}
                        onChange={(e) =>
                          updateSimulationParams({
                            ...config.simulationParams,
                            externalShockProbability: parseFloat(e.target.value),
                          })
                        }
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>0% (Stable)</span>
                        <span>20% (Chaotic)</span>
                      </div>
                    </div>
                  </div>
                </SectionAccordion>
              </div>
            )}
          </div>

          {/* Sidebar - Preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <ConfigPreview
                config={config}
                isValid={isValid}
                errors={errors}
                warnings={warnings}
              />

              {/* Connection Status */}
              <div className={`
                mt-4 px-3 py-2 rounded-lg text-sm text-center
                ${connected
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                }
              `}>
                {connected ? 'Connected to server' : 'Connecting...'}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Glossary Modal */}
      <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />

      {/* Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Research Export Modal */}
      <ResearchExportModal
        isOpen={researchExportOpen}
        onClose={() => setResearchExportOpen(false)}
        config={config}
      />
    </div>
  );
}
