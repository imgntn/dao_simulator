'use client';

interface ModeToggleProps {
  mode: 'simple' | 'advanced';
  onModeChange: (mode: 'simple' | 'advanced') => void;
}

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-1 bg-gray-100 dark:bg-gray-800">
      <button
        onClick={() => onModeChange('simple')}
        className={`
          px-4 py-2 text-sm font-medium rounded-md transition-colors
          ${mode === 'simple'
            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }
        `}
      >
        Simple
      </button>
      <button
        onClick={() => onModeChange('advanced')}
        className={`
          px-4 py-2 text-sm font-medium rounded-md transition-colors
          ${mode === 'advanced'
            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }
        `}
      >
        Advanced
      </button>
    </div>
  );
}
