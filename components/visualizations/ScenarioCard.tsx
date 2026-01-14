'use client';

import { useMemo } from 'react';
import { messages as m, format } from '@/lib/i18n';

type Mission = {
  id: string;
  title: string;
  description: string;
  progress: number;
  targetLabel: string;
  currentLabel: string;
};

interface ScenarioCardProps {
  scenarioName?: string;
  missions: Mission[];
  step: number;
  maxSteps?: number;
  status?: 'running' | 'paused';
  onMissionClick?: (missionId: string) => void;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

// Mission item component
function MissionItem({
  mission,
  onClick,
}: {
  mission: Mission;
  onClick?: () => void;
}) {
  const pct = clamp01(mission.progress);
  const completed = pct >= 1;
  const progressPercent = Math.round(pct * 100);

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`
        w-full text-left space-y-1 p-2 rounded-lg transition-all duration-200
        ${onClick ? 'hover:bg-gray-700/50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500' : ''}
        ${completed ? 'bg-green-900/10' : ''}
      `}
      aria-label={`${mission.title}: ${completed ? 'Completed' : `${progressPercent}% complete`}. ${mission.currentLabel} of ${mission.targetLabel}`}
    >
      <div className="flex items-center justify-between text-sm text-gray-200">
        <div className="flex items-center gap-2">
          {/* Status indicator with icon */}
          <span
            className={`
              inline-flex items-center justify-center h-5 w-5 rounded-full
              ${completed ? 'bg-green-500/20' : 'bg-blue-500/20'}
            `}
            aria-hidden="true"
          >
            {completed ? (
              <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
              </svg>
            )}
          </span>
          <span className="font-semibold">{mission.title}</span>
        </div>
        <span className="text-gray-400 flex items-center gap-2">
          {completed && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-500/20 text-green-300 uppercase font-medium">
              {m.common.done}
            </span>
          )}
          <span className="text-xs">
            {mission.currentLabel} / {mission.targetLabel}
          </span>
        </span>
      </div>

      {/* Progress bar with ARIA attributes */}
      <div
        className="w-full h-2 rounded-full bg-gray-700 overflow-hidden"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${mission.title} progress`}
      >
        <div
          className={`h-full transition-all duration-500 ease-out ${completed ? 'bg-green-500' : 'bg-blue-500'}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <p className="text-xs text-gray-400">{mission.description}</p>
    </button>
  );
}

// Empty state
function EmptyState() {
  return (
    <div className="p-4 rounded-xl bg-gray-800/60 border border-gray-700 shadow-lg">
      <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-700 rounded-lg">
        <div className="text-center px-4">
          <svg
            className="w-8 h-8 mx-auto mb-2 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="text-gray-400 text-sm">{m.missions.noMissions}</p>
          <p className="text-gray-500 text-xs">{m.missions.startWithObjectives}</p>
        </div>
      </div>
    </div>
  );
}

export function ScenarioCard({
  scenarioName = 'Default Run',
  missions,
  step,
  maxSteps,
  status = 'paused',
  onMissionClick,
}: ScenarioCardProps) {
  // Calculate overall progress
  const overallProgress = useMemo(() => {
    if (missions.length === 0) return 0;
    const totalProgress = missions.reduce((sum, m) => sum + clamp01(m.progress), 0);
    return totalProgress / missions.length;
  }, [missions]);

  const completedCount = missions.filter(m => m.progress >= 1).length;
  const overallPercent = Math.round(overallProgress * 100);

  if (missions.length === 0) {
    return <EmptyState />;
  }

  return (
    <div
      className="p-4 rounded-xl bg-gray-800/60 border border-gray-700 shadow-lg space-y-3"
      role="region"
      aria-label={`Scenario: ${scenarioName}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">{m.missions.scenario}</p>
          <h3 className="text-lg font-semibold text-white">{scenarioName}</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">{m.missions.status}</p>
          <p className={`text-sm font-semibold flex items-center gap-1 justify-end ${status === 'running' ? 'text-green-400' : 'text-orange-300'}`}>
            <span
              className={`inline-block w-2 h-2 rounded-full ${status === 'running' ? 'bg-green-400 animate-pulse' : 'bg-orange-400'}`}
              aria-hidden="true"
            />
            {status === 'running' ? m.common.running : m.common.paused}
          </p>
          <p className="text-xs text-gray-500">
            Step {step}
            {maxSteps && ` / ${maxSteps}`}
          </p>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-400">
          <span>{m.missions.overallProgress}</span>
          <span>{format(m.missions.missionsProgress, { completed: completedCount, total: missions.length, percent: overallPercent })}</span>
        </div>
        <div
          className="w-full h-1.5 rounded-full bg-gray-700 overflow-hidden"
          role="progressbar"
          aria-valuenow={overallPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Overall mission progress"
        >
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
            style={{ width: `${overallPercent}%` }}
          />
        </div>
      </div>

      {/* Mission list */}
      <div className="space-y-1" role="list" aria-label="Mission objectives">
        {missions.map((mission) => (
          <MissionItem
            key={mission.id}
            mission={mission}
            onClick={onMissionClick ? () => onMissionClick(mission.id) : undefined}
          />
        ))}
      </div>

      {/* Screen reader summary */}
      <div className="sr-only" role="status" aria-live="polite">
        Scenario {scenarioName}: {completedCount} of {missions.length} missions completed ({overallPercent}% overall).
        Currently at step {step}{maxSteps ? ` of ${maxSteps}` : ''}.
        Status: {status}.
      </div>
    </div>
  );
}
