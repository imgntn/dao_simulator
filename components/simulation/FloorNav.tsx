'use client';

import { useSimulationStore } from '@/lib/browser/simulation-store';
import { FLOORS } from './scene/constants';

export function FloorNav() {
  const setTargetFloor = useSimulationStore(s => s.setTargetFloor);
  const targetFloor = useSimulationStore(s => s.targetFloor);

  return (
    <div className="flex gap-1 px-4 py-2 border-b border-[var(--sim-border)]">
      <span className="text-[10px] text-[var(--sim-text-dim)] uppercase tracking-wider self-center mr-1">
        Floor
      </span>
      {FLOORS.map(floor => (
        <button
          key={floor.id}
          onClick={() => setTargetFloor(floor.id)}
          className={`px-2 py-1 rounded text-[10px] font-mono font-medium transition-all ${
            targetFloor === floor.id
              ? 'ring-1 ring-offset-1 ring-offset-[var(--sim-bg)]'
              : 'opacity-70 hover:opacity-100'
          }`}
          style={{
            backgroundColor: `${floor.color}25`,
            color: floor.color,
            borderColor: floor.color,
            ...(targetFloor === floor.id ? { ringColor: floor.color } : {}),
          }}
          title={floor.name}
        >
          {floor.id}
        </button>
      ))}
    </div>
  );
}
