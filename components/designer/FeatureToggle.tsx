'use client';

import { useState } from 'react';
import { InfoTooltip } from './Tooltip';

interface FeatureToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children?: React.ReactNode; // Config panel when enabled
  /** Optional detailed tooltip explanation */
  tooltip?: string;
  /** Optional real-world example */
  example?: string;
}

export function FeatureToggle({
  label,
  description,
  enabled,
  onToggle,
  children,
  tooltip,
  example,
}: FeatureToggleProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`
      border rounded-lg overflow-hidden transition-colors
      ${enabled
        ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10'
        : 'border-gray-200 dark:border-gray-700'
      }
    `}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-gray-900 dark:text-white">
                {label}
              </h4>
              {tooltip && <InfoTooltip content={tooltip} position="right" />}
              {enabled && children && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {expanded ? 'Hide config' : 'Configure'}
                </button>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {description}
            </p>
            {example && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {example}
              </p>
            )}
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="
              w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer
              peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500
              peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800
              after:content-[''] after:absolute after:top-0.5 after:start-[2px]
              after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all
              peer-checked:after:translate-x-full
            "></div>
          </label>
        </div>
      </div>
      {enabled && expanded && children && (
        <div className="px-4 pb-4 pt-2 border-t border-blue-200 dark:border-blue-800">
          {children}
        </div>
      )}
    </div>
  );
}
