'use client';

import { Suspense, useState, useCallback, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulationStore } from '@/lib/browser/simulation-store';
import type { AgentSnapshot } from '@/lib/browser/worker-protocol';
import { Environment } from './scene/Environment';
import { Building } from './scene/Building';
import { TreasuryIndicator } from './scene/TreasuryIndicator';
import { TokenPriceIndicator } from './scene/TokenPriceIndicator';
import { AgentGroups } from './scene/AgentGroups';
import { AgentTooltip } from './scene/AgentTooltip';
import { ProposalBoard } from './scene/ProposalBoard';
import { BlackSwanEffect } from './scene/BlackSwanEffect';
import { FloorLabels } from './scene/FloorLabel';
import { CameraController } from './scene/CameraController';
import { AGENT_FLOOR_MAP } from './scene/constants';

export function SimulationCanvas() {
  const snapshot = useSimulationStore(s => s.snapshot);
  const status = useSimulationStore(s => s.status);

  // Interaction state
  const [hoveredAgent, setHoveredAgent] = useState<AgentSnapshot | null>(null);
  const [hoveredPos, setHoveredPos] = useState<THREE.Vector3 | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentSnapshot | null>(null);
  const [selectedPos, setSelectedPos] = useState<THREE.Vector3 | null>(null);
  const buildingRef = useRef<THREE.Group>(null);

  const handleHover = useCallback(
    (agent: AgentSnapshot | null, position: THREE.Vector3 | null) => {
      if (!selectedAgent) {
        setHoveredAgent(agent);
        setHoveredPos(position);
      }
    },
    [selectedAgent]
  );

  const handleSelect = useCallback(
    (agent: AgentSnapshot | null) => {
      if (agent && selectedAgent?.id === agent.id) {
        // Deselect on re-click
        setSelectedAgent(null);
        setSelectedPos(null);
      } else if (agent) {
        setSelectedAgent(agent);
        // Position tooltip above agent
        const floorId = AGENT_FLOOR_MAP[agent.type] ?? 'F1';
        setSelectedPos(new THREE.Vector3(0, 6, 0)); // fallback
        setHoveredAgent(null);
        setHoveredPos(null);
      } else {
        setSelectedAgent(null);
        setSelectedPos(null);
      }
    },
    [selectedAgent]
  );

  const handleCanvasClick = useCallback(() => {
    // Clicking on empty space deselects
    // (Agent clicks call stopPropagation, so this only fires on background)
  }, []);

  // Compute active floor IDs and floor counts
  const { activeFloorIds, floorCounts } = useMemo(() => {
    if (!snapshot) return { activeFloorIds: new Set<string>(), floorCounts: new Map<string, number>() };
    const ids = new Set<string>();
    const counts = new Map<string, number>();
    for (const a of snapshot.agents) {
      const fid = AGENT_FLOOR_MAP[a.type] ?? 'F1';
      ids.add(fid);
      counts.set(fid, (counts.get(fid) ?? 0) + 1);
    }
    return { activeFloorIds: ids, floorCounts: counts };
  }, [snapshot]);

  if (!snapshot && status !== 'running') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[var(--sim-bg)]">
        <p className="text-[var(--sim-text-dim)] text-sm font-mono">
          Press Play to begin
        </p>
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: [14, 10, 14], fov: 50, near: 0.1, far: 500 }}
      dpr={[1, 2]}
      className="bg-[var(--sim-bg)]"
      onClick={handleCanvasClick}
    >
      <Suspense fallback={null}>
        <Environment />
        <CameraController />

        {snapshot && (
          <>
            {/* Building group (shakeable via ref) */}
            <group ref={buildingRef}>
              <Building activeFloorIds={activeFloorIds} />
              <FloorLabels floorCounts={floorCounts} />
              <AgentGroups
                agents={snapshot.agents}
                onHover={handleHover}
                onSelect={handleSelect}
              />
              <TreasuryIndicator treasuryFunds={snapshot.treasuryFunds} />
              <TokenPriceIndicator tokenPrice={snapshot.tokenPrice} />
              <ProposalBoard proposals={snapshot.proposals} />
            </group>

            {/* Black swan effect (outside building group so overlay isn't shaken) */}
            <BlackSwanEffect
              blackSwan={snapshot.blackSwan}
              buildingRef={buildingRef}
            />

            {/* Hover tooltip */}
            {hoveredAgent && hoveredPos && !selectedAgent && (
              <AgentTooltip agent={hoveredAgent} position={hoveredPos} />
            )}

            {/* Selected tooltip (detailed, persistent) */}
            {selectedAgent && selectedPos && (
              <AgentTooltip
                agent={selectedAgent}
                position={selectedPos}
                detailed
                onClose={() => {
                  setSelectedAgent(null);
                  setSelectedPos(null);
                }}
              />
            )}
          </>
        )}
      </Suspense>
    </Canvas>
  );
}
