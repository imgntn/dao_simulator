'use client';

import type { MemberDistributionConfig, MemberArchetype, ArchetypeDistribution } from '@/lib/dao-designer/types';
import { MEMBER_ARCHETYPE_TOOLTIPS } from '@/lib/dao-designer/glossary';
import { InfoTooltip, LabelWithTooltip } from './Tooltip';

interface MemberDistributionProps {
  value: MemberDistributionConfig;
  onChange: (config: MemberDistributionConfig) => void;
}

const ARCHETYPES: { value: MemberArchetype; label: string; description: string }[] = [
  { value: 'passive_holder', label: 'Passive Holders', description: 'Hold tokens but rarely vote' },
  { value: 'active_voter', label: 'Active Voters', description: 'Participate in most votes' },
  { value: 'delegate', label: 'Delegates', description: 'Accept delegations and vote on behalf of others' },
  { value: 'whale', label: 'Whales', description: 'Large token holders with significant influence' },
  { value: 'governance_expert', label: 'Governance Experts', description: 'Deep understanding of governance' },
  { value: 'builder', label: 'Builders', description: 'Contribute code and projects' },
  { value: 'steward', label: 'Stewards', description: 'Grant oversight and proposal review' },
  { value: 'staker', label: 'Stakers', description: 'Stake tokens and participate in security' },
  { value: 'citizen', label: 'Citizens', description: 'Non-token-based voting members' },
  { value: 'security_council', label: 'Security Council', description: 'Emergency powers and oversight' },
];

export function MemberDistribution({ value, onChange }: MemberDistributionProps) {
  const updateTotalMembers = (total: number) => {
    onChange({ ...value, totalMembers: total });
  };

  const updateArchetypePercentage = (archetype: MemberArchetype, percentage: number) => {
    const newDistribution = value.distribution.map((entry) =>
      entry.archetype === archetype ? { ...entry, percentage } : entry
    );
    onChange({ ...value, distribution: newDistribution });
  };

  const addArchetype = (archetype: MemberArchetype) => {
    if (value.distribution.find((d) => d.archetype === archetype)) return;
    const newDistribution: ArchetypeDistribution[] = [
      ...value.distribution,
      { archetype, percentage: 0 },
    ];
    onChange({ ...value, distribution: newDistribution });
  };

  const removeArchetype = (archetype: MemberArchetype) => {
    const newDistribution = value.distribution.filter((d) => d.archetype !== archetype);
    onChange({ ...value, distribution: newDistribution });
  };

  const totalPercentage = value.distribution.reduce((sum, d) => sum + d.percentage, 0);
  const isValid = Math.abs(totalPercentage - 100) < 0.01;

  const availableArchetypes = ARCHETYPES.filter(
    (a) => !value.distribution.find((d) => d.archetype === a.value)
  );

  return (
    <div className="space-y-4">
      {/* Total Members */}
      <div>
        <LabelWithTooltip
          label={`Total Members: ${value.totalMembers}`}
          tooltip="The total number of governance participants in the simulation. Larger DAOs have different dynamics than smaller ones - participation rates often decrease as size increases."
          className="mb-2"
        />
        <input
          type="range"
          min="10"
          max="1000"
          step="10"
          value={value.totalMembers}
          onChange={(e) => updateTotalMembers(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>10 (Small DAO)</span>
          <span>1000 (Large DAO)</span>
        </div>
      </div>

      {/* Distribution Status */}
      <div className={`
        px-3 py-2 rounded-lg text-sm flex items-center gap-2
        ${isValid
          ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400'
          : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400'
        }
      `}>
        <span>Total: {totalPercentage.toFixed(1)}%</span>
        {!isValid && <span>(must equal 100%)</span>}
        <InfoTooltip
          content="The percentages must add up to exactly 100%. Adjust the sliders to balance your member distribution."
          position="right"
        />
      </div>

      {/* Archetype Sliders */}
      <div className="space-y-3">
        {value.distribution.map((entry) => {
          const archetypeInfo = ARCHETYPES.find((a) => a.value === entry.archetype);
          const tooltipData = MEMBER_ARCHETYPE_TOOLTIPS[entry.archetype];
          return (
            <div key={entry.archetype} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-gray-900 dark:text-white text-sm">
                    {archetypeInfo?.label || entry.archetype}
                  </span>
                  {tooltipData && (
                    <InfoTooltip content={tooltipData.longDescription} position="right" />
                  )}
                  <span className="ml-2 text-gray-600 dark:text-gray-400 text-sm">
                    {entry.percentage}%
                  </span>
                </div>
                <button
                  onClick={() => removeArchetype(entry.archetype)}
                  className="text-red-500 hover:text-red-600 text-sm"
                >
                  Remove
                </button>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={entry.percentage}
                onChange={(e) => updateArchetypePercentage(entry.archetype, parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {archetypeInfo?.description}
              </p>
              {tooltipData?.realWorldExample && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {tooltipData.realWorldExample}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Archetype */}
      {availableArchetypes.length > 0 && (
        <div>
          <LabelWithTooltip
            label="Add Archetype"
            tooltip="Add more member types to your simulation. Each archetype has different voting behavior, participation rates, and governance priorities."
            className="mb-2"
          />
          <select
            onChange={(e) => {
              if (e.target.value) {
                addArchetype(e.target.value as MemberArchetype);
                e.target.value = '';
              }
            }}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
          >
            <option value="">Select an archetype to add...</option>
            {availableArchetypes.map((a) => {
              const tooltipData = MEMBER_ARCHETYPE_TOOLTIPS[a.value];
              return (
                <option key={a.value} value={a.value} title={tooltipData?.shortDescription}>
                  {a.label} - {a.description}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {/* Preview */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
        <div className="flex items-center gap-1 mb-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">Member Preview</p>
          <InfoTooltip
            content="This shows how many of each member type will be created based on your distribution settings."
            position="right"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {value.distribution.map((entry) => {
            const count = Math.round(value.totalMembers * (entry.percentage / 100));
            if (count === 0) return null;
            const archetypeInfo = ARCHETYPES.find((a) => a.value === entry.archetype);
            return (
              <span
                key={entry.archetype}
                className="text-xs px-2 py-1 bg-white dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
                title={MEMBER_ARCHETYPE_TOOLTIPS[entry.archetype]?.shortDescription}
              >
                {count} {archetypeInfo?.label || entry.archetype.replace('_', ' ')}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
