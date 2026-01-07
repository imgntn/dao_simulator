'use client';

interface EventAlertProps {
  lastCompleted: string | null;
  recentShock: { severity: number; step: number } | null;
}

export function EventAlert({ lastCompleted, recentShock }: EventAlertProps) {
  if (!lastCompleted && !recentShock) return null;

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-green-500/10 blur-xl rounded-2xl" />
      <div className="relative p-4 rounded-xl border border-gray-700 bg-gray-800/70 text-sm text-white flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
          <p className="font-semibold">
            {lastCompleted
              ? `Mission completed: ${lastCompleted}`
              : recentShock
              ? `Market shock: severity ${recentShock.severity.toFixed(2)} (step ${recentShock.step})`
              : ''}
          </p>
        </div>
        <p className="text-xs text-gray-300">
          Celebrate wins and prepare for shocks; adjust speed or strategy as needed.
        </p>
      </div>
    </div>
  );
}

interface MissionCompletedBannerProps {
  missionName: string | null;
}

export function MissionCompletedBanner({ missionName }: MissionCompletedBannerProps) {
  if (!missionName) return null;

  return (
    <div className="p-3 rounded-lg bg-green-900/40 border border-green-700 text-green-200 text-sm">
      Mission completed: <span className="font-semibold">{missionName}</span>
    </div>
  );
}
