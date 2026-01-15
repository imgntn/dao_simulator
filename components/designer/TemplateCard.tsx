'use client';

import { TemplateMetadata } from '@/lib/dao-designer/types';

interface TemplateCardProps {
  template: TemplateMetadata;
  selected: boolean;
  onSelect: () => void;
}

export function TemplateCard({ template, selected, onSelect }: TemplateCardProps) {
  const complexityColors = {
    beginner: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    advanced: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <button
      onClick={onSelect}
      className={`
        w-full p-4 rounded-lg border-2 text-left transition-all
        hover:shadow-md hover:border-blue-400
        ${selected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl">{template.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {template.name}
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${complexityColors[template.complexity]}`}>
              {template.complexity}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
            {template.description}
          </p>
          <div className="flex flex-wrap gap-1">
            {template.features.slice(0, 4).map((feature, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
              >
                {feature}
              </span>
            ))}
            {template.features.length > 4 && (
              <span className="text-xs px-2 py-0.5 text-gray-500">
                +{template.features.length - 4} more
              </span>
            )}
          </div>
          {template.realWorldDAO && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Based on {template.realWorldDAO}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
