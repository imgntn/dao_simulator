'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AgentSnapshot } from '@/lib/browser/worker-protocol';
import { AGENT_FLOOR_MAP, AGENT_FLOORS, BUILDING } from './constants';

interface Props {
  agents: AgentSnapshot[];
}

interface BeamEdge {
  from: THREE.Vector3;
  to: THREE.Vector3;
}

/** Compute grid position for an agent at its index within its floor group */
function agentPosition(agent: AgentSnapshot, indexInFloor: number, floorAgentCount: number): THREE.Vector3 {
  const floorId = AGENT_FLOOR_MAP[agent.type] ?? 'F1';
  const floor = AGENT_FLOORS.find(f => f.id === floorId);
  if (!floor) return new THREE.Vector3(0, 3, 0);

  const cols = Math.ceil(Math.sqrt(floorAgentCount));
  const spacing = 0.55;
  const row = Math.floor(indexInFloor / cols);
  const col = indexInFloor % cols;
  const totalRows = Math.ceil(floorAgentCount / cols);
  const floorWidth = BUILDING.width - 1.0;
  const floorDepth = BUILDING.depth - 1.0;

  let ox = (col - (cols - 1) / 2) * spacing;
  let oz = (row - (totalRows - 1) / 2) * spacing;
  ox = Math.max(-floorWidth / 2, Math.min(floorWidth / 2, ox));
  oz = Math.max(-floorDepth / 2, Math.min(floorDepth / 2, oz));

  const y = floor.yBase + floor.height * 0.3;
  return new THREE.Vector3(ox, y, oz);
}

/** Purple delegation beams connecting delegating agents to their delegates */
export function DelegationBeams({ agents }: Props) {
  const lineRef = useRef<THREE.LineSegments>(null);
  const opacityRef = useRef(0.3);

  // Build position map and edge list
  const { edges, positions } = useMemo(() => {
    // Group agents by floor to compute per-floor indices
    const floorGroups = new Map<string, AgentSnapshot[]>();
    for (const a of agents) {
      const fid = AGENT_FLOOR_MAP[a.type] ?? 'F1';
      if (!floorGroups.has(fid)) floorGroups.set(fid, []);
      floorGroups.get(fid)!.push(a);
    }

    // Build position map
    const posMap = new Map<string, THREE.Vector3>();
    for (const [, floorAgents] of floorGroups) {
      for (let i = 0; i < floorAgents.length; i++) {
        posMap.set(floorAgents[i].id, agentPosition(floorAgents[i], i, floorAgents.length));
      }
    }

    // Build edges
    const edgeList: BeamEdge[] = [];
    for (const a of agents) {
      if (a.delegateTo && posMap.has(a.delegateTo)) {
        const from = posMap.get(a.id);
        const to = posMap.get(a.delegateTo);
        if (from && to) {
          edgeList.push({ from, to });
        }
      }
    }

    // Flatten to Float32Array for BufferGeometry
    const posArray = new Float32Array(edgeList.length * 6);
    for (let i = 0; i < edgeList.length; i++) {
      const e = edgeList[i];
      posArray[i * 6] = e.from.x;
      posArray[i * 6 + 1] = e.from.y;
      posArray[i * 6 + 2] = e.from.z;
      posArray[i * 6 + 3] = e.to.x;
      posArray[i * 6 + 4] = e.to.y;
      posArray[i * 6 + 5] = e.to.z;
    }

    return { edges: edgeList, positions: posArray };
  }, [agents]);

  // Animate pulse opacity
  useFrame(({ clock }) => {
    if (!lineRef.current) return;
    const t = clock.elapsedTime;
    const mat = lineRef.current.material as THREE.LineBasicMaterial;
    mat.opacity = 0.3 + Math.sin(t * 2) * 0.15;
  });

  if (edges.length === 0) return null;

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial
        color="#8b5cf6"
        transparent
        opacity={0.3}
        linewidth={1}
        depthWrite={false}
      />
    </lineSegments>
  );
}
