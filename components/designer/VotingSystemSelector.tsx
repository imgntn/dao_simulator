'use client';

import type { VotingSystemConfig, VotingSystemType, VotingPowerModel } from '@/lib/dao-designer/types';

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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Voting Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {VOTING_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => updateField('type', type.value)}
              className={`
                p-3 rounded-lg border text-left transition-colors
                ${value.type === type.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              <p className="font-medium text-gray-900 dark:text-white text-sm">{type.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{type.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Passing Threshold */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Passing Threshold: {(value.passingThreshold * 100).toFixed(0)}%
        </label>
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
          <span>50%</span>
          <span>90%</span>
        </div>
      </div>

      {/* Voting Period */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Voting Period: {value.votingPeriodDays} days
        </label>
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
          <span>1 day</span>
          <span>14 days</span>
        </div>
      </div>

      {/* Voting Power Model */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Voting Power Model
        </label>
        <select
          value={value.votingPowerModel}
          onChange={(e) => updateField('votingPowerModel', e.target.value as VotingPowerModel)}
          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
        >
          {POWER_MODELS.map((model) => (
            <option key={model.value} value={model.value}>
              {model.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
