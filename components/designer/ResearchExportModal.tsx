'use client';

import { useState, useMemo } from 'react';
import type { DAODesignerConfig } from '@/lib/dao-designer/types';
import * as yaml from 'yaml';

interface ResearchExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DAODesignerConfig;
}

interface ExperimentSettings {
  name: string;
  description: string;
  runsPerConfig: number;
  stepsPerRun: number;
  sweepEnabled: boolean;
  sweepParameter: string;
  sweepValues: string;
  outputDir: string;
}

const SWEEP_PARAMETERS = [
  { value: 'quorumConfig.baseQuorumPercent', label: 'Quorum Percentage', defaultValues: '2, 5, 10, 15, 20' },
  { value: 'memberDistribution.totalMembers', label: 'Total Members', defaultValues: '30, 50, 100, 200' },
  { value: 'simulationParams.votingActivity', label: 'Voting Activity', defaultValues: '0.2, 0.4, 0.6, 0.8' },
  { value: 'simulationParams.proposalFrequency', label: 'Proposal Frequency', defaultValues: '0.3, 0.5, 1.0, 1.5' },
  { value: 'treasury.initialBalance', label: 'Initial Treasury', defaultValues: '100000, 1000000, 10000000' },
];

export function ResearchExportModal({ isOpen, onClose, config }: ResearchExportModalProps) {
  const [settings, setSettings] = useState<ExperimentSettings>({
    name: `${config.name} Experiment`,
    description: `Research experiment based on ${config.name} configuration`,
    runsPerConfig: 10,
    stepsPerRun: 500,
    sweepEnabled: false,
    sweepParameter: 'quorumConfig.baseQuorumPercent',
    sweepValues: '2, 5, 10, 15, 20',
    outputDir: `results/${config.name.toLowerCase().replace(/\s+/g, '-')}`,
  });

  const [copied, setCopied] = useState(false);

  const experimentYaml = useMemo(() => {
    const experiment: Record<string, unknown> = {
      name: settings.name,
      description: settings.description,
      baseConfig: {
        inline: config,
      },
      execution: {
        runsPerConfig: settings.runsPerConfig,
        stepsPerRun: settings.stepsPerRun,
        seedStrategy: 'sequential',
        baseSeed: 42,
      },
      metrics: [
        { name: 'Proposal Pass Rate', type: 'builtin', builtin: 'proposal_pass_rate' },
        { name: 'Average Turnout', type: 'builtin', builtin: 'average_turnout' },
        { name: 'Final Treasury', type: 'builtin', builtin: 'final_treasury' },
        { name: 'Final Gini', type: 'builtin', builtin: 'final_gini' },
        { name: 'Total Proposals', type: 'builtin', builtin: 'total_proposals' },
      ],
      output: {
        directory: settings.outputDir,
        formats: ['json', 'csv'],
        includeRawRuns: true,
        includeManifest: true,
      },
    };

    if (settings.sweepEnabled) {
      const values = settings.sweepValues
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v)
        .map((v) => {
          const num = parseFloat(v);
          return isNaN(num) ? v : num;
        });

      experiment.sweep = {
        parameter: settings.sweepParameter,
        values,
      };
    }

    return yaml.stringify(experiment, { indent: 2 });
  }, [config, settings]);

  const handleDownload = () => {
    const blob = new Blob([experimentYaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${settings.name.toLowerCase().replace(/\s+/g, '-')}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCommand = () => {
    const filename = `${settings.name.toLowerCase().replace(/\s+/g, '-')}.yaml`;
    navigator.clipboard.writeText(`npm run experiment -- experiments/${filename}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Export for Research CLI
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Generate an experiment config file to run batch simulations
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Settings */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Experiment Settings</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Experiment Name
                </label>
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={settings.description}
                  onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Runs per Config
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={settings.runsPerConfig}
                    onChange={(e) => setSettings({ ...settings, runsPerConfig: parseInt(e.target.value) || 10 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Steps per Run
                  </label>
                  <input
                    type="number"
                    min={100}
                    max={5000}
                    step={100}
                    value={settings.stepsPerRun}
                    onChange={(e) => setSettings({ ...settings, stepsPerRun: parseInt(e.target.value) || 500 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Output Directory
                </label>
                <input
                  type="text"
                  value={settings.outputDir}
                  onChange={(e) => setSettings({ ...settings, outputDir: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Parameter Sweep */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.sweepEnabled}
                    onChange={(e) => setSettings({ ...settings, sweepEnabled: e.target.checked })}
                    className="rounded"
                  />
                  <span className="font-medium text-gray-900 dark:text-white">
                    Enable Parameter Sweep
                  </span>
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Test how changing a parameter affects outcomes
                </p>
              </div>

              {settings.sweepEnabled && (
                <div className="space-y-3 pl-6 border-l-2 border-blue-500">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Parameter to Sweep
                    </label>
                    <select
                      value={settings.sweepParameter}
                      onChange={(e) => {
                        const param = SWEEP_PARAMETERS.find((p) => p.value === e.target.value);
                        setSettings({
                          ...settings,
                          sweepParameter: e.target.value,
                          sweepValues: param?.defaultValues || settings.sweepValues,
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {SWEEP_PARAMETERS.map((param) => (
                        <option key={param.value} value={param.value}>
                          {param.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Values (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={settings.sweepValues}
                      onChange={(e) => setSettings({ ...settings, sweepValues: e.target.value })}
                      placeholder="2, 5, 10, 15, 20"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Generated YAML</h3>
              <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-auto max-h-80 text-sm font-mono text-gray-800 dark:text-gray-200">
                {experimentYaml}
              </pre>
            </div>
          </div>

          {/* CLI Instructions */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              How to Run
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <li>Download the YAML file using the button below</li>
              <li>Save it to the <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">experiments/</code> folder in the project</li>
              <li>Run the experiment from your terminal:</li>
            </ol>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 bg-gray-800 text-green-400 px-4 py-2 rounded font-mono text-sm">
                npm run experiment -- experiments/{settings.name.toLowerCase().replace(/\s+/g, '-')}.yaml
              </code>
              <button
                onClick={handleCopyCommand}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="mt-3 text-sm text-blue-800 dark:text-blue-200">
              <strong>Options:</strong> Add <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">-c 4</code> to run 4 simulations concurrently,
              or <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">--resume</code> to continue from a checkpoint.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Download YAML
          </button>
        </div>
      </div>
    </div>
  );
}
