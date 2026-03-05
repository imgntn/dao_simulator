'use client';

import { useState } from 'react';
import { AGENT_FLOORS, AGENT_TYPE_INFO, TYPE_COLOR_MAP } from './scene/constants';

export function AgentGuide() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-[var(--sim-border)]">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-[var(--sim-text-secondary)] hover:text-[var(--sim-text)] transition-colors"
      >
        <span>Agent Guide</span>
        <span
          className="text-xs transition-transform"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ▼
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-3">
          {AGENT_FLOORS.map(floor => (
            <div key={floor.id}>
              {/* Floor header */}
              <div
                className="text-xs font-semibold mb-1 flex items-center gap-1.5"
                style={{ color: floor.color }}
              >
                <span
                  className="inline-block w-2 h-2 rounded-sm"
                  style={{ background: floor.color }}
                />
                {floor.id} — {floor.name}
              </div>

              {/* Agent list */}
              <div className="space-y-0.5 ml-3.5">
                {floor.agentTypes.map(type => {
                  const info = AGENT_TYPE_INFO[type];
                  const color = TYPE_COLOR_MAP[type] ?? '#888';
                  return (
                    <div key={type} className="flex items-start gap-1.5 text-[11px] leading-tight">
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full mt-[3px] shrink-0"
                        style={{ background: color }}
                      />
                      <span>
                        <span className="text-[var(--sim-text)]" style={{ fontWeight: 600 }}>
                          {info?.displayName ?? type}
                        </span>
                        {info && (
                          <span className="text-[var(--sim-text-muted)]"> — {info.description}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
