import React from 'react';

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
  status?: 'running' | 'paused';
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function ScenarioCard({ scenarioName = 'Default Run', missions, step, status = 'paused' }: ScenarioCardProps) {
  return (
    <div className="p-4 rounded-xl bg-gray-800/60 border border-gray-700 shadow-lg space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">Scenario</p>
          <h3 className="text-lg font-semibold text-white">{scenarioName}</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Status</p>
          <p className={`text-sm font-semibold ${status === 'running' ? 'text-green-400' : 'text-orange-300'}`}>
            {status === 'running' ? 'Running' : 'Paused'}
          </p>
          <p className="text-xs text-gray-500">Step {step}</p>
        </div>
      </div>

      <div className="space-y-3">
        {missions.map((mission) => {
          const pct = clamp01(mission.progress);
          const completed = pct >= 1;
          return (
            <div key={mission.id} className={`space-y-1 ${completed ? 'animate-[pulse_1.5s_ease-in-out_1]' : ''}`}>
              <div className="flex items-center justify-between text-sm text-gray-200">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${completed ? 'bg-green-400' : 'bg-blue-400'}`} />
                  <span className="font-semibold">{mission.title}</span>
                </div>
                <span className="text-gray-400 flex items-center gap-2">
                  {completed && <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-500/20 text-green-300 uppercase">Done</span>}
                  {mission.currentLabel} / {mission.targetLabel}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-700 overflow-hidden">
                <div
                  className={`h-full ${completed ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${pct * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-400">{mission.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
