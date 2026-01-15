'use client';

import type { VotingSystemConfig, VotingSystemType, VotingPowerModel } from '@/lib/dao-designer/types';
import { VOTING_SYSTEM_TOOLTIPS, VOTING_POWER_TOOLTIPS } from '@/lib/dao-designer/glossary';
import { InfoTooltip, LabelWithTooltip } from './Tooltip';

interface VotingSystemSelectorProps {
  value: VotingSystemConfig;
  onChange: (config: VotingSystemConfig) => void;
}

const VOTING_TYPES: { value: VotingSystemType; label: string; description: string }[] = [
  { value: 'simple_majority', label: 'Simple Majority', description: 'More than 50% of votes wins' },
  { value: 'supermajority', label: 'Supermajority', description: 'Requires 66%+ to pass' },
  { value: 'quadratic', label: 'Quadratic', description: 'Square root of tokens for votes' },
  { value: 'conviction', label: 'Conviction', description: 'Time-weighted voting power' },
  { value: 'approval', label: 'Approval', description: 'Continuous approval voting' },
  { value: 'ranked_choice', label: 'Ranked Choice', description: 'Ranked preferences' },
];

const POWER_MODELS: { value: VotingPowerModel; label: string }[] = [
  { value: 'token_weighted', label: 'Token Weighted (1 token = 1 vote)' },
  { value: 'quadratic', label: 'Quadratic (sqrt of tokens)' },
  { value: 'one_person_one_vote', label: 'One Person One Vote' },
];

export function VotingSystemSelector({ value, onChange }: VotingSystemSelectorProps) {
  const updateField = <K extends keyof VotingSystemConfig>(field: K, fieldValue: VotingSystemConfig[K]) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-4">
      {/* Voting Type */}
      <div>
        <LabelWithTooltip
          label="Voting Type"
          tooltip="The method used to count votes and determine if a proposal passes. Different systems have different trade-offs for democracy, efficiency, and whale resistance."
          className="mb-2"
        />
        <div className="grid grid-cols-2 gap-2">
          {VOTING_TYPES.map((type) => {
            const tooltipData = VOTING_SYSTEM_TOOLTIPS[type.value];
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => updateField('type', type.value)}
                className={`
                  p-3 rounded-lg border text-left transition-colors relative group
                  ${value.type === type.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <div className="flex items-start justify-between gap-1">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{type.label}</p>
                  {tooltipData && (
                    <InfoTooltip content={tooltipData.longDescription} position="left" />
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{type.description}</p>
                {tooltipData?.realWorldExample && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    e.g., {tooltipData.realWorldExample.split(' ').slice(0, 3).join(' ')}...
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Passing Threshold */}
      <div>
        <LabelWithTooltip
          label={`Passing Threshold: ${(value.passingThreshold * 100).toFixed(0)}%`}
          tooltip="The percentage of 'Yes' votes required for a proposal to pass. Higher thresholds require broader consensus but make passing proposals harder."
          className="mb-2"
        />
        <input
          type="range"
          min="0.5"
          max="0.9"
          step="0.01"
          value={value.passingThreshold}
          onChange={(e) => updateField('passingThreshold', parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>50% (Majority)</span>
          <span>90% (Near-unanimous)</span>
        </div>
      </div>

      {/* Voting Period */}
      <div>
        <LabelWithTooltip
          label={`Voting Period: ${value.votingPeriodDays} day${value.votingPeriodDays !== 1 ? 's' : ''}`}
          tooltip="How long proposals are open for voting. Longer periods allow more participation but slow down decision-making. Consider timezone differences and weekends."
          className="mb-2"
        />
        <input
          type="range"
          min="1"
          max="14"
          step="1"
          value={value.votingPeriodDays}
          onChange={(e) => updateField('votingPeriodDays', parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>1 day (Fast)</span>
          <span>14 days (Thorough)</span>
        </div>
      </div>

      {/* Voting Power Model */}
      <div>
        <LabelWithTooltip
          label="Voting Power Model"
          tooltip="How voting power is calculated from token holdings. Token-weighted gives whales more power; quadratic reduces their influence; one-person-one-vote requires identity verification."
          className="mb-2"
        />
        <div className="space-y-2">
          {POWER_MODELS.map((model) => {
            const tooltipData = VOTING_POWER_TOOLTIPS[model.value];
            return (
              <label
                key={model.value}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                  ${value.votingPowerModel === model.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <input
                  type="radio"
                  name="votingPowerModel"
                  value={model.value}
                  checked={value.votingPowerModel === model.value}
                  onChange={(e) => updateField('votingPowerModel', e.target.value as VotingPowerModel)}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {model.label}
                    </span>
                    {tooltipData && (
                      <InfoTooltip content={tooltipData.longDescription} position="right" />
                    )}
                  </div>
                  {tooltipData && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {tooltipData.shortDescription}
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
