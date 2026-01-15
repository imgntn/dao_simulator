'use client';

import type { DAODesignerConfig } from '@/lib/dao-designer/types';

interface ConfigPreviewProps {
  config: DAODesignerConfig;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function ConfigPreview({ config, isValid, errors, warnings }: ConfigPreviewProps) {
  // Calculate total proposal duration
  const totalDurationDays = config.proposalProcess.stages.reduce(
    (sum, stage) => sum + stage.durationDays,
    0
  );

  // Count enabled features
  const enabledFeatures = Object.entries(config.features)
    .filter(([key, value]) => typeof value === 'boolean' && value)
    .map(([key]) => key);

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white">Preview</h3>
        <span className={`
          px-2 py-1 rounded text-xs font-medium
          ${isValid
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }
        `}>
          {isValid ? 'Valid' : 'Invalid'}
        </span>
      </div>

      {/* Basic Info */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏛️</span>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              {config.name || 'Unnamed DAO'}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ${config.tokenSymbol} • {(config.tokenSupply / 1000000).toFixed(1)}M supply
            </p>
          </div>
        </div>
      </div>

      {/* Governance Summary */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-white dark:bg-gray-900 rounded p-2">
          <p className="text-gray-500 dark:text-gray-400 text-xs">Voting</p>
          <p className="font-medium text-gray-900 dark:text-white capitalize">
            {config.votingSystem.type.replace('_', ' ')}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded p-2">
          <p className="text-gray-500 dark:text-gray-400 text-xs">Quorum</p>
          <p className="font-medium text-gray-900 dark:text-white">
            {config.quorumConfig.baseQuorumPercent}%
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded p-2">
          <p className="text-gray-500 dark:text-gray-400 text-xs">Voting Period</p>
          <p className="font-medium text-gray-900 dark:text-white">
            {config.votingSystem.votingPeriodDays} days
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded p-2">
          <p className="text-gray-500 dark:text-gray-400 text-xs">Proposal Duration</p>
          <p className="font-medium text-gray-900 dark:text-white">
            {totalDurationDays} days
          </p>
        </div>
      </div>

      {/* Proposal Stages */}
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Proposal Stages</p>
        <div className="flex gap-1 flex-wrap">
          {config.proposalProcess.stages.map((stage, i) => (
            <div
              key={i}
              className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded"
            >
              {stage.name} ({stage.durationDays}d)
            </div>
          ))}
        </div>
      </div>

      {/* Enabled Features */}
      {enabledFeatures.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Enabled Features ({enabledFeatures.length})
          </p>
          <div className="flex gap-1 flex-wrap">
            {enabledFeatures.map((feature) => (
              <span
                key={feature}
                className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 rounded"
              >
                {feature.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Members */}
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Members: {config.memberDistribution.totalMembers}
        </p>
        <div className="flex gap-1 flex-wrap">
          {config.memberDistribution.distribution.map((entry, i) => (
            <span
              key={i}
              className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
            >
              {entry.percentage}% {entry.archetype.replace('_', ' ')}
            </span>
          ))}
        </div>
      </div>

      {/* Treasury */}
      <div className="bg-white dark:bg-gray-900 rounded p-2">
        <p className="text-gray-500 dark:text-gray-400 text-xs">Treasury</p>
        <p className="font-medium text-gray-900 dark:text-white">
          {(config.treasury.initialBalance / 1000000).toFixed(1)}M {config.treasury.tokenSymbol}
        </p>
      </div>

      {/* Errors & Warnings */}
      {errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded p-2">
          <p className="text-xs font-medium text-red-800 dark:text-red-400 mb-1">Errors</p>
          <ul className="text-xs text-red-700 dark:text-red-300 space-y-0.5">
            {errors.slice(0, 3).map((error, i) => (
              <li key={i}>• {error}</li>
            ))}
            {errors.length > 3 && <li>...and {errors.length - 3} more</li>}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-2">
          <p className="text-xs font-medium text-yellow-800 dark:text-yellow-400 mb-1">Warnings</p>
          <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-0.5">
            {warnings.slice(0, 2).map((warning, i) => (
              <li key={i}>• {warning}</li>
            ))}
            {warnings.length > 2 && <li>...and {warnings.length - 2} more</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
